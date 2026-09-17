-- 話題ガチャを廃止し、「いつ・どこで・だれが・なにを・どうした」ゲームのテーブルに置き換える
--
-- 設計方針
-- - サーバーは持たず、supabase-js から RPC（下の関数）を呼ぶだけで進行する
-- - ログインは無し。参加時に発行するトークン（player_secrets.token）で本人確認する
-- - rooms / players / rounds / round_themes は誰でも読める（Realtime で画面同期するため）
-- - entries（回答）と player_secrets は直接読めない。回答は発表時に rounds.sentences として公開される

drop table if exists public.topics;
drop type if exists public.situation_type;
drop type if exists public.university_type;

-- ---------------------------------------------------------------------------
-- 型
-- ---------------------------------------------------------------------------
-- 5 つの枠。enum の順番 = 文にしたときの順番
create type public.slot_type as enum ('when', 'where', 'who', 'what', 'how');
create type public.room_phase as enum ('lobby', 'playing', 'finished');
-- rolling: ホストがお題を決めている / writing: 入力中 / revealed: 発表済み
create type public.round_phase as enum ('rolling', 'writing', 'revealed');
-- single: 1 人 1 枠（MVP） / everyone: 1 人 5 枠（拡張）
create type public.round_mode as enum ('single', 'everyone');

-- ---------------------------------------------------------------------------
-- テーブル
-- ---------------------------------------------------------------------------
-- 小テーマ（アプリ側で用意。data/themes.csv → scripts/seed-themes.mjs で投入）
create table public.themes (
  id uuid primary key default gen_random_uuid(),
  slot public.slot_type not null,
  text text not null,
  created_at timestamptz not null default now(),
  unique (slot, text)
);

create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  host_player_id uuid,
  phase public.room_phase not null default 'lobby',
  created_at timestamptz not null default now()
);
-- 終了した部屋のコードは再利用できる
create unique index rooms_code_active_key on public.rooms (code) where phase <> 'finished';

create table public.players (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  name text not null,
  joined_at timestamptz not null default now()
);
alter table public.rooms
  add constraint rooms_host_player_id_fkey
  foreign key (host_player_id) references public.players (id) on delete set null;

-- 本人確認用トークン。RPC の引数でだけ使い、テーブルとしては公開しない
create table public.player_secrets (
  player_id uuid primary key references public.players (id) on delete cascade,
  token uuid not null default gen_random_uuid()
);

create table public.rounds (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms (id) on delete cascade,
  number int not null,
  mode public.round_mode not null default 'single',
  phase public.round_phase not null default 'rolling',
  submitted_count int not null default 0,
  total_count int not null default 0,
  -- 発表時に組み立てた文。[[{slot, text}, ...], ...]（文が複数できることがある）
  sentences jsonb,
  created_at timestamptz not null default now(),
  unique (room_id, number)
);

-- ホストのガチャ結果（枠ごとの小テーマ）
create table public.round_themes (
  round_id uuid not null references public.rounds (id) on delete cascade,
  slot public.slot_type not null,
  theme_id uuid not null references public.themes (id),
  primary key (round_id, slot)
);

-- 「誰が・どの枠を・どの小テーマで・何と書いたか」。text が null なら未入力
create table public.entries (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  player_id uuid not null references public.players (id) on delete cascade,
  slot public.slot_type not null,
  theme_id uuid not null references public.themes (id),
  text text,
  submitted_at timestamptz,
  unique (round_id, player_id, slot)
);
create index entries_round_id_idx on public.entries (round_id);
create index players_room_id_idx on public.players (room_id);
create index rounds_room_id_idx on public.rounds (room_id);

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.themes enable row level security;
alter table public.rooms enable row level security;
alter table public.players enable row level security;
alter table public.player_secrets enable row level security;
alter table public.rounds enable row level security;
alter table public.round_themes enable row level security;
alter table public.entries enable row level security;

create policy "themes are viewable by everyone" on public.themes for select using (true);
create policy "rooms are viewable by everyone" on public.rooms for select using (true);
create policy "players are viewable by everyone" on public.players for select using (true);
create policy "rounds are viewable by everyone" on public.rounds for select using (true);
create policy "round_themes are viewable by everyone" on public.round_themes for select using (true);
-- entries / player_secrets にはポリシーを作らない = 直接は一切読み書きできない

-- ---------------------------------------------------------------------------
-- Realtime（画面同期のトリガーに使う。entries は流さない）
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.rooms, public.players, public.rounds, public.round_themes;
alter table public.players replica identity full;
alter table public.rounds replica identity full;
alter table public.round_themes replica identity full;

-- ---------------------------------------------------------------------------
-- 内部ヘルパー（クライアントからは呼べない）
-- ---------------------------------------------------------------------------
create function public._player_from_token(p_token uuid)
returns public.players
language sql
security definer
set search_path = public
stable
as $$
  select p.*
  from public.players p
  join public.player_secrets s on s.player_id = p.id
  where s.token = p_token;
$$;

create function public._assert_host(p_room_id uuid, p_token uuid)
returns public.rooms
language plpgsql
security definer
set search_path = public
as $$
declare
  v_room public.rooms;
  v_player public.players;
begin
  select * into v_room from public.rooms where id = p_room_id;
  if v_room.id is null then
    raise exception '部屋が見つかりません';
  end if;
  v_player := public._player_from_token(p_token);
  if v_player.id is null or v_player.id <> v_room.host_player_id then
    raise exception 'ホストだけが操作できます';
  end if;
  return v_room;
end;
$$;

create function public._random_theme(p_slot public.slot_type, p_exclude uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.themes
  where slot = p_slot and id is distinct from p_exclude
  order by random()
  limit 1;
  if v_id is null then
    -- 候補が 1 つしか無いときは同じものを返す
    select id into v_id from public.themes where slot = p_slot order by random() limit 1;
  end if;
  if v_id is null then
    raise exception '「%」の小テーマが登録されていません', p_slot;
  end if;
  return v_id;
end;
$$;

-- 枠ごとに回答をシャッフルして 1 つずつ取り、文にする。
-- 枠ごとの回答数が違うときは、多い方に合わせて複数の文を作り、少ない枠は使い回す
create function public._compose_sentences(p_round_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_slot public.slot_type;
  v_texts text[];
  v_by_slot jsonb := '{}'::jsonb;
  v_max int := 0;
  v_len int;
  v_i int;
  v_sentence jsonb;
  v_result jsonb := '[]'::jsonb;
begin
  foreach v_slot in array enum_range(null::public.slot_type) loop
    select coalesce(array_agg(e.text order by random()), '{}'::text[]) into v_texts
    from public.entries e
    where e.round_id = p_round_id and e.slot = v_slot and e.text is not null;
    v_by_slot := v_by_slot || jsonb_build_object(v_slot::text, to_jsonb(v_texts));
    v_max := greatest(v_max, coalesce(array_length(v_texts, 1), 0));
  end loop;

  for v_i in 0 .. v_max - 1 loop
    v_sentence := '[]'::jsonb;
    foreach v_slot in array enum_range(null::public.slot_type) loop
      v_len := jsonb_array_length(v_by_slot -> v_slot::text);
      v_sentence := v_sentence || jsonb_build_object(
        'slot', v_slot,
        'text', case when v_len = 0 then null else v_by_slot -> v_slot::text -> (v_i % v_len) end
      );
    end loop;
    v_result := v_result || jsonb_build_array(v_sentence);
  end loop;
  return v_result;
end;
$$;

revoke execute on function public._player_from_token(uuid) from public, anon, authenticated;
revoke execute on function public._assert_host(uuid, uuid) from public, anon, authenticated;
revoke execute on function public._random_theme(public.slot_type, uuid) from public, anon, authenticated;
revoke execute on function public._compose_sentences(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- RPC（クライアントが呼ぶ）
-- ---------------------------------------------------------------------------

-- 部屋を作ってホストとして参加する
create function public.create_room(p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_code text;
  v_room public.rooms;
  v_player public.players;
  v_token uuid;
begin
  if v_name = '' then
    raise exception '名前を入力してください';
  end if;

  -- 古い部屋の掃除（24 時間で消す）
  delete from public.rooms where created_at < now() - interval '24 hours';

  loop
    v_code := lpad((floor(random() * 10000))::int::text, 4, '0');
    exit when not exists (select 1 from public.rooms where code = v_code and phase <> 'finished');
  end loop;

  insert into public.rooms (code) values (v_code) returning * into v_room;
  insert into public.players (room_id, name) values (v_room.id, v_name) returning * into v_player;
  insert into public.player_secrets (player_id) values (v_player.id) returning token into v_token;
  update public.rooms set host_player_id = v_player.id where id = v_room.id;

  return json_build_object(
    'room_id', v_room.id,
    'code', v_code,
    'player_id', v_player.id,
    'token', v_token
  );
end;
$$;

-- コードで部屋に参加する（ロビーの間だけ）
create function public.join_room(p_code text, p_name text)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text := trim(coalesce(p_name, ''));
  v_room public.rooms;
  v_player public.players;
  v_token uuid;
begin
  if v_name = '' then
    raise exception '名前を入力してください';
  end if;
  select * into v_room from public.rooms where code = trim(p_code) and phase <> 'finished';
  if v_room.id is null then
    raise exception '部屋が見つかりません。コードを確認してください';
  end if;
  if v_room.phase <> 'lobby' then
    raise exception 'このゲームはもう始まっています';
  end if;

  insert into public.players (room_id, name) values (v_room.id, v_name) returning * into v_player;
  insert into public.player_secrets (player_id) values (v_player.id) returning token into v_token;

  return json_build_object(
    'room_id', v_room.id,
    'code', v_room.code,
    'player_id', v_player.id,
    'token', v_token
  );
end;
$$;

-- 部屋の状態をまとめて返す（画面はこれだけ見て描画する）
create function public.get_room_state(p_room_id uuid, p_token uuid)
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
      'themes', (
        select coalesce(json_object_agg(rt.slot, json_build_object('id', t.id, 'text', t.text)), '{}'::json)
        from public.round_themes rt join public.themes t on t.id = rt.theme_id
        where rt.round_id = v_round.id
      ),
      'my_entries', (
        select coalesce(json_agg(json_build_object(
          'id', e.id, 'slot', e.slot, 'theme', t.text, 'text', e.text, 'submitted', e.submitted_at is not null
        ) order by e.slot), '[]'::json)
        from public.entries e join public.themes t on t.id = e.theme_id
        where e.round_id = v_round.id and e.player_id = v_player.id
      )
    ) end
  );
end;
$$;

-- ラウンドを始める（ホスト）。5 枠の小テーマをガチャで決めた状態（rolling）にする
create function public.start_round(p_room_id uuid, p_token uuid)
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

  insert into public.rounds (room_id, number)
  values (p_room_id, coalesce(v_last.number, 0) + 1)
  returning id into v_round_id;

  foreach v_slot in array enum_range(null::public.slot_type) loop
    insert into public.round_themes (round_id, slot, theme_id)
    values (v_round_id, v_slot, public._random_theme(v_slot));
  end loop;

  update public.rooms set phase = 'playing' where id = p_room_id;
  return v_round_id;
end;
$$;

-- 1 枠だけ小テーマを引き直す（ホスト）
create function public.reroll_theme(p_round_id uuid, p_slot public.slot_type, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_round public.rounds;
  v_current uuid;
begin
  select * into v_round from public.rounds where id = p_round_id;
  if v_round.id is null then
    raise exception 'ラウンドが見つかりません';
  end if;
  perform public._assert_host(v_round.room_id, p_token);
  if v_round.phase <> 'rolling' then
    raise exception 'お題はもう配られています';
  end if;
  select theme_id into v_current from public.round_themes where round_id = p_round_id and slot = p_slot;
  update public.round_themes
  set theme_id = public._random_theme(p_slot, v_current)
  where round_id = p_round_id and slot = p_slot;
end;
$$;

-- 枠を配る（ホスト）。5 枠を必ず全部埋めつつ、誰がどの枠かはランダム
--   人数 < 5: 一部の人が複数枠 / 人数 > 5: 一部の枠が複数人（発表が複数文になる）
create function public.deal_slots(p_round_id uuid, p_token uuid)
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
  select array_agg(s order by random()) into v_slots from unnest(enum_range(null::public.slot_type)) as s;
  v_n := coalesce(array_length(v_players, 1), 0);
  if v_n = 0 then
    raise exception '参加者がいません';
  end if;
  v_m := greatest(v_n, 5);

  for v_i in 0 .. v_m - 1 loop
    v_slot := v_slots[(v_i % 5) + 1];
    insert into public.entries (round_id, player_id, slot, theme_id)
    select p_round_id, v_players[(v_i % v_n) + 1], v_slot, rt.theme_id
    from public.round_themes rt
    where rt.round_id = p_round_id and rt.slot = v_slot;
  end loop;

  update public.rounds
  set phase = 'writing', total_count = v_m, submitted_count = 0
  where id = p_round_id;
end;
$$;

-- 自分の枠に回答する。全員分が揃ったら文を組み立てて発表（revealed）にする
create function public.submit_entry(p_entry_id uuid, p_text text, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_player public.players;
  v_entry public.entries;
  v_round public.rounds;
  v_text text := trim(coalesce(p_text, ''));
  v_done int;
begin
  if v_text = '' then
    raise exception '内容を入力してください';
  end if;
  v_player := public._player_from_token(p_token);
  select * into v_entry from public.entries where id = p_entry_id;
  if v_entry.id is null or v_player.id is null or v_entry.player_id <> v_player.id then
    raise exception 'この枠には回答できません';
  end if;
  select * into v_round from public.rounds where id = v_entry.round_id for update;
  if v_round.phase <> 'writing' then
    raise exception '入力は締め切られています';
  end if;

  update public.entries set text = v_text, submitted_at = now() where id = p_entry_id;

  select count(*) into v_done from public.entries where round_id = v_round.id and text is not null;
  if v_done >= v_round.total_count then
    update public.rounds
    set submitted_count = v_done, phase = 'revealed', sentences = public._compose_sentences(v_round.id)
    where id = v_round.id;
  else
    update public.rounds set submitted_count = v_done where id = v_round.id;
  end if;
end;
$$;

-- 部屋を終了する（ホスト）
create function public.finish_room(p_room_id uuid, p_token uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public._assert_host(p_room_id, p_token);
  update public.rooms set phase = 'finished' where id = p_room_id;
end;
$$;
