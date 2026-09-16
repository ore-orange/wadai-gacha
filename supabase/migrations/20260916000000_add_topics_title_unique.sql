-- 話題データの投入スクリプト（scripts/seed-topics.mjs）が
-- upsert(onConflict: "title") で冪等に動作するために必要
alter table public.topics
  add constraint topics_title_key unique (title);
