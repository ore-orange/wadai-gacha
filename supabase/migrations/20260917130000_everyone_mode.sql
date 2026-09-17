-- 「1 人 5 枠」モード（rounds.mode = everyone）と、発表を 1 文ずつめくる仕組みを追加する
--
-- - start_round にモード引数を追加。everyone では全員が 5 枠すべてを書く
-- - 発表は rounds.reveal_index（今何文目か）を全端末が見て同じ文を表示する
-- - ホストは文を送る / 戻す / もう一度シャッフルできる

alter table public.rounds add column reveal_index int not null default 0;

-- ---------------------------------------------------------------------------
-- start_round: モード引数を追加（既存の 2 引数版は置き換え）
-- ---------------------------------------------------------------------------
drop function public.start_round(uuid, uuid);

create function public.start_round(p_room_id uuid, p_token uuid, p_mode public.round_mode default 'single')
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_last public.rounds;
  v_round_id uuid;
  v_slot public.slot_type;
begin
  v_room := public._assert_host(p_room_id, p_token);
  if v_room.phase = 'finished' then
    raise exception 'この部屋は終了しています';
  end if;
  select * into v_last from public.rounds where room_id = p_room_id order by number desc limit 1;
  if v_last.id is not null and v_last.phase <> 'revealed' then
    raise exception '進行中のラウンドがあります';
  end if;

  insert into public.rounds (room_id, number, mode)
  values (p_room_id, coalesce(v_last.number, 0) + 1, p_mode)
  returning id into v_round_id;

  foreach v_slot in array enum_range(null::public.slot_type) loop
    insert into public.round_themes (round_id, slot, theme_id)
    values (v_round_id, v_slot, public._random_theme(v_slot));
  end loop;

  update public.rooms set phase = 'playing' where id = p_room_id;
  return v_round_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- deal_slots: everyone モードでは 1 人 5 行
-- ---------------------------------------------------------------------------
create or replace function public.deal_slots(p_round_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds;
  v_players uuid[];
  v_slots public.slot_type[];
  v_n int;
  v_m int;
  v_i int;
  v_slot public.slot_type;
begin
  select * into v_round from public.rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'ラウンドが見つかりません';
  end if;
  perform public._assert_host(v_round.room_id, p_token);
  if v_round.phase <> 'rolling' then
    raise exception 'お題はもう配られています';
  end if;

  select array_agg(id order by random()) into v_players from public.players where room_id = v_round.room_id;
  v_n := coalesce(array_length(v_players, 1), 0);
  if v_n = 0 then
    raise exception '参加者がいません';
  end if;

  if v_round.mode = 'everyone' then
    -- 全員が 5 枠すべてを書く
    insert into public.entries (round_id, player_id, slot, theme_id)
    select p_round_id, p.id, rt.slot, rt.theme_id
    from unnest(v_players) as p(id)
    cross join public.round_themes rt
    where rt.round_id = p_round_id;
    v_m := v_n * 5;
  else
    -- 5 枠を必ず全部埋めつつ、誰がどの枠かはランダム
    select array_agg(s order by random()) into v_slots from unnest(enum_range(null::public.slot_type)) as s;
    v_m := greatest(v_n, 5);
    for v_i in 0 .. v_m - 1 loop
      v_slot := v_slots[(v_i % 5) + 1];
      insert into public.entries (round_id, player_id, slot, theme_id)
      select p_round_id, v_players[(v_i % v_n) + 1], v_slot, rt.theme_id
      from public.round_themes rt
      where rt.round_id = p_round_id and rt.slot = v_slot;
    end loop;
  end if;

  update public.rounds
  set phase = 'writing', total_count = v_m, submitted_count = 0
  where id = p_round_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 発表の操作（ホスト）
-- ---------------------------------------------------------------------------
create function public._assert_revealed_host(p_round_id uuid, p_token uuid)
returns public.rounds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds;
begin
  select * into v_round from public.rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'ラウンドが見つかりません';
  end if;
  perform public._assert_host(v_round.room_id, p_token);
  if v_round.phase <> 'revealed' then
    raise exception 'まだ発表になっていません';
  end if;
  return v_round;
end;
$$;
revoke execute on function public._assert_revealed_host(uuid, uuid) from public, anon, authenticated;

-- 表示する文を切り替える（0 始まり。範囲外は端に丸める）
create function public.set_reveal_index(p_round_id uuid, p_index int, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds;
  v_len int;
begin
  v_round := public._assert_revealed_host(p_round_id, p_token);
  v_len := coalesce(jsonb_array_length(v_round.sentences), 0);
  update public.rounds
  set reveal_index = greatest(0, least(p_index, greatest(v_len - 1, 0)))
  where id = p_round_id;
end;
$$;

-- 文を組み直す（枠ごとにシャッフルし直す）。1 文目に戻る
create function public.reshuffle_sentences(p_round_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._assert_revealed_host(p_round_id, p_token);
  update public.rounds
  set sentences = public._compose_sentences(p_round_id), reveal_index = 0
  where id = p_round_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- get_room_state: reveal_index を返す
-- ---------------------------------------------------------------------------
create or replace function public.get_room_state(p_room_id uuid, p_token uuid)
returns json
language plpgsql
security definer
set search_path = public
stable
as $$
declare
  v_player public.players;
  v_round public.rounds;
begin
  v_player := public._player_from_token(p_token);
  if v_player.id is null or v_player.room_id <> p_room_id then
    raise exception 'この部屋に参加していません';
  end if;

  select * into v_round from public.rounds where room_id = p_room_id order by number desc limit 1;

  return json_build_object(
    'room', (
      select json_build_object('id', r.id, 'code', r.code, 'phase', r.phase, 'host_player_id', r.host_player_id)
      from public.rooms r where r.id = p_room_id
    ),
    'players', (
      select coalesce(json_agg(json_build_object('id', p.id, 'name', p.name) order by p.joined_at), '[]'::json)
      from public.players p where p.room_id = p_room_id
    ),
    'me', json_build_object('player_id', v_player.id, 'name', v_player.name),
    'round', case when v_round.id is null then null else json_build_object(
      'id', v_round.id,
      'number', v_round.number,
      'mode', v_round.mode,
      'phase', v_round.phase,
      'submitted_count', v_round.submitted_count,
      'total_count', v_round.total_count,
      'sentences', v_round.sentences,
      'reveal_index', v_round.reveal_index,
      'themes', (
        select coalesce(json_object_agg(rt.slot, json_build_object('id', t.id, 'text', t.text)), '{}'::json)
        from public.round_themes rt join public.themes t on t.id = rt.theme_id
        where rt.round_id = v_round.id
      ),
      'my_entries', (
        select coalesce(json_agg(json_build_object(
          'id', e.id, 'slot', e.slot, 'theme', t.text, 'example', t.example,
          'text', e.text, 'submitted', e.submitted_at is not null
        ) order by e.slot), '[]'::json)
        from public.entries e join public.themes t on t.id = e.theme_id
        where e.round_id = v_round.id and e.player_id = v_player.id
      )
    ) end
  );
end;
$$;
