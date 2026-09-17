-- 質問を引退させるためのフラグ。false の質問はガチャで選ばれない
-- （過去の回答から参照されている質問は削除できないため、フラグで外す）
alter table public.themes add column active boolean not null default true;

create or replace function public._random_theme(p_slot public.slot_type, p_exclude uuid default null)
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
  where slot = p_slot and active and id is distinct from p_exclude
  order by random()
  limit 1;
  if v_id is null then
    -- 候補が 1 つしか無いときは同じものを返す
    select id into v_id from public.themes where slot = p_slot and active order by random() limit 1;
  end if;
  if v_id is null then
    raise exception '「%」の小テーマが登録されていません', p_slot;
  end if;
  return v_id;
end;
$$;

-- 「どうした」の質問 2 問を、動詞 1 語で答えやすい文言に変える。
-- 新しい文言がまだ無ければ既存行を書き換え、既にあれば古い行を引退させる
do $$
declare
  v_pairs text[][] := array[
    ['最近、大笑いしたのはどんなこと？', '最近、大笑いしたとき、何が起きた？'],
    ['休みの日、だいたい何をしている？', '休みの日、だいたい何をした？']
  ];
  v_old text;
  v_new text;
  v_old_id uuid;
begin
  for i in 1 .. array_length(v_pairs, 1) loop
    v_old := v_pairs[i][1];
    v_new := v_pairs[i][2];
    select id into v_old_id from public.themes where slot = 'how' and text = v_old;
    if v_old_id is null then
      continue;
    end if;
    if not exists (select 1 from public.themes where slot = 'how' and text = v_new) then
      update public.themes set text = v_new where id = v_old_id;
    else
      update public.themes set active = false where id = v_old_id;
    end if;
  end loop;
end $$;
