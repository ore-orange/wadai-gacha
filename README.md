# 話題ガチャ

[![CI](https://github.com/ore-orange/wadai-gacha/actions/workflows/ci.yml/badge.svg)](https://github.com/ore-orange/wadai-gacha/actions/workflows/ci.yml)

話題をガチャ形式で提案するアプリ

URL：https://wadai-gacha.hibiki6430code.workers.dev

## チーム名

おれオレンジ

<img width="350" alt="1E1B51A2-B99F-4401-8EC3-CC218B7F53EC" src="https://github.com/user-attachments/assets/085a1c3d-4ff6-41bc-b967-8f88345b9edf" />

## チームメンバー

- [tachikawa](https://github.com/TachikawaKaito)
- [ctaku](https://github.com/ki-mutaku)
- [糸洲](https://github.com/ItosuYuki)
- [ひびきたん](https://github.com/hibiki2gou)

## エレベータピッチ

<img width="5333" height="3000" alt="Agile Mini Camp 2026 - Copy of  チーム名  エレベーターピッチ" src="https://github.com/user-attachments/assets/62eff0e1-af89-4025-82d2-f259567a7b94" />

## 技術スタック

| 分類                   | 採用                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| 言語 / UI              | TypeScript / React 19                                                                                        |
| ビルド                 | Vite                                                                                                         |
| パッケージマネージャー | pnpm（corepack 経由）                                                                                        |
| バックエンド           | Supabase（Postgres）。フロントから supabase-js で直接アクセスし、データ保護は RLS で行う（専用サーバーなし） |
| ホスティング           | Cloudflare Pages                                                                                             |
| Lint / Format          | Biome                                                                                                        |
| テスト                 | Vitest                                                                                                       |

## 開発環境のセットアップ

### 必要なもの

- Docker Desktop
- Node.js 22 以上（`npx supabase` を使うため。アプリ自体は Docker 内で動く）

### 1. 環境変数

```bash
cp .env.example .env
```

`VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` を設定する（ローカル Supabase を使う場合は次の手順で表示される値、共有プロジェクトを使う場合はダッシュボードの値）。

### 2. Supabase（ローカル DB）を起動

```bash
npx supabase start
```

初回はイメージの取得に数分かかる。起動すると `API URL` と `anon key` が表示されるので `.env` に貼る。
`supabase/migrations` と `supabase/seed.sql` は起動時に自動で適用される。

- 停止: `npx supabase stop`
- スキーマを変更した後に作り直す: `npx supabase db reset`
- Studio（GUI）: http://127.0.0.1:54323

### 3. アプリを起動

```bash
docker compose up
```

http://localhost:5173 を開く。ソースはマウントしているのでホットリロードが効く。
ホットリロードが効かない場合は `.env` で `VITE_USE_POLLING=true` にする。

### よく使うコマンド

コンテナ内で実行する（起動していないときは `docker compose run --rm app <cmd>`）。

```bash
docker compose exec app pnpm lint        # Lint + フォーマットチェック
docker compose exec app pnpm lint:fix    # 自動修正
docker compose exec app pnpm typecheck   # 型チェック
docker compose exec app pnpm test        # テスト
docker compose exec app pnpm build       # 本番ビルド（dist/）
```

### 依存パッケージを追加したとき

```bash
docker compose exec app pnpm add <package>
```

`package.json` / `pnpm-lock.yaml` をコミットする。他のメンバーは `docker compose up` し直すだけで、起動時に自動で `pnpm install` が走って同期される。

### DB のスキーマを変更するとき

1. `supabase/migrations/` に `YYYYMMDDHHMMSS_xxx.sql` を追加する（`npx supabase migration new xxx` でひな形を作れる）
2. `npx supabase db reset` でローカル DB に適用する
3. `npx supabase gen types typescript --local > src/lib/database.types.ts` で TS の型を再生成する
4. **新しいテーブルには必ず `enable row level security` とポリシーを付ける**（anon key がブラウザに公開されるため）

### 話題データを追加するとき

`topics` テーブルは RLS で SELECT のみ許可しているため、anon key からは INSERT できない。
データの追加は `data/topics.txt` を編集し、投入スクリプトを実行する（ダッシュボードの SQL Editor で直接 INSERT する必要はない）。

1. `data/topics.txt` に話題を1行1件で追記する（`#` から始まる行はコメント）
2. ローカル DB に反映: `pnpm db:seed:topics`（`.env` の `SUPABASE_SERVICE_ROLE_KEY` を使う。ローカル Supabase の service_role key は `npx supabase start` の出力に表示される）
3. 既に存在するタイトルは自動でスキップされるので、同じファイルを何度実行しても安全（`title` に unique 制約あり）
4. 動作確認できたら `data/topics.txt` の差分をコミットして PR を出す
5. 本番へ反映する場合は、mainマージ後に本番の service_role key（Supabase ダッシュボード → Project Settings > API）を使って手元から一度だけ実行する。鍵は `.env` に書かず、コマンド実行時だけ環境変数で渡す。

```bash
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=xxxx \
  node scripts/seed-topics.mjs
```

## デプロイ

### 構成

- フロント: **Cloudflare Workers**（静的アセット配信）。`wrangler.jsonc` で `dist/` を配信する設定にしている
- DB: **Supabase**（クラウド）。GitHub 連携により `main` へのマージで `supabase/migrations` が本番 DB に自動適用される

### Cloudflare 側の設定（Workers & Pages → Create → Continue with GitHub）

| 項目                        | 値                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Build command               | `pnpm build`                                                                                             |
| Deploy command              | `npx wrangler deploy`                                                                                    |
| 環境変数（Build variables） | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`（本番 Supabase の Publishable key）, `NODE_VERSION=22` |

`main` に push / マージするたびに自動でビルド・デプロイされる。

### 手元からデプロイしたいとき

```bash
docker compose exec app pnpm wrangler login
docker compose exec app pnpm deploy
```
