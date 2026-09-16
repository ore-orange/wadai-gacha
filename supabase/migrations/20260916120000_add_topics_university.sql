-- 話題の大学区分（表示名はアプリ側 src/lib/universities.ts で管理）
-- 値を追加するときは `alter type public.university_type add value '...'` のマイグレーションを足す
create type public.university_type as enum ('ryukyu');

-- 大学に紐づかない話題は null（全大学で出る）
alter table public.topics
  add column university public.university_type;
