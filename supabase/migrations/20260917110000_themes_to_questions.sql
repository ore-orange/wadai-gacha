-- 小テーマを質問形式に変える。既存行は entries から参照されているので削除せず、文言を置き換える
-- （data/themes.csv の同じ質問は UNIQUE でスキップされ、重複しない）
update public.themes set text = v.question
from (values
  ('when'::public.slot_type,  '昨日',        '昨日、一番印象に残っている時間帯は？'),
  ('when'::public.slot_type,  '高校生の頃',  '高校時代で一番楽しかった時期は？'),
  ('when'::public.slot_type,  '子どもの頃',  '子どもの頃、一番ワクワクした日は？'),
  ('where'::public.slot_type, '家の外',      '家の外で、最近よく行く場所は？'),
  ('where'::public.slot_type, '学校',        '学校の中で一番落ち着く場所は？'),
  ('where'::public.slot_type, '旅行先',      '今まで行った旅行先で一番良かった場所は？'),
  ('who'::public.slot_type,   '自分',        '自分にあだ名を付けるなら？'),
  ('who'::public.slot_type,   '家族の誰か',  '家族の中で一番よく話す人は？'),
  ('who'::public.slot_type,   '友達',        '最近一番会っている友達は？（呼び方で）'),
  ('what'::public.slot_type,  '食べ物',      '最近食べておいしかったものは？'),
  ('what'::public.slot_type,  'スマホ',      'スマホで一番使っているアプリは？'),
  ('what'::public.slot_type,  '大事なもの',  '今、一番大事にしているものは？'),
  ('how'::public.slot_type,   '失敗した',    '最近やらかしたことは？'),
  ('how'::public.slot_type,   'なくした',    '最近なくしたものは、その後どうなった？'),
  ('how'::public.slot_type,   '大笑いした',  '最近、大笑いしたのはどんなこと？')
) as v(slot, old_text, question)
where themes.slot = v.slot and themes.text = v.old_text
  and not exists (select 1 from public.themes t2 where t2.slot = v.slot and t2.text = v.question);
