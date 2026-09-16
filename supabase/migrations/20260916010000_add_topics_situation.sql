-- 話題のシチュエーション区分
-- 値を追加するときは `alter type public.situation_type add value '...'` のマイグレーションを足す
create type public.situation_type as enum ('グループワーク', 'サークルの新歓', '合コン');

-- 既存の話題は未分類のため null を許可する
alter table public.topics
  add column situation public.situation_type;
