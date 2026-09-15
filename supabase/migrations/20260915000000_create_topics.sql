-- 話題（お題）テーブル
create table public.topics (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  created_at timestamptz not null default now()
);

-- バックエンド①方針: フロントから anon key で直接アクセスするため、必ず RLS を有効にする
alter table public.topics enable row level security;

-- 誰でも閲覧可（ガチャで引くため）
create policy "topics are viewable by everyone"
  on public.topics
  for select
  using (true);

-- 追加・更新・削除のポリシーは要件が固まってから追加する
