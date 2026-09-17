-- 質問ごとの答えの例（入力欄のプレースホルダーに使う）。助詞なしで書く（例: 図書館）
alter table public.themes add column example text;

-- get_room_state の my_entries に example を含める
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
