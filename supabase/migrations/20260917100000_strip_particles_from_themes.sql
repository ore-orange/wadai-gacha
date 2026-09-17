-- 小テーマから助詞を外す（助詞は画面側で枠ごとに自動で付けるようになった）
-- 「学校で」→「学校」、「自分が」→「自分」、「食べ物を」→「食べ物」
update public.themes set text = regexp_replace(text, 'で$', '')
where slot = 'where' and text ~ 'で$' and length(text) > 1
  and not exists (select 1 from public.themes t2 where t2.slot = 'where' and t2.text = regexp_replace(themes.text, 'で$', ''));
update public.themes set text = regexp_replace(text, 'が$', '')
where slot = 'who' and text ~ 'が$' and length(text) > 1
  and not exists (select 1 from public.themes t2 where t2.slot = 'who' and t2.text = regexp_replace(themes.text, 'が$', ''));
update public.themes set text = regexp_replace(text, 'を$', '')
where slot = 'what' and text ~ 'を$' and length(text) > 1
  and not exists (select 1 from public.themes t2 where t2.slot = 'what' and t2.text = regexp_replace(themes.text, 'を$', ''));
