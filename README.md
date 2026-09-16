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
- スキーマを変更した後に作り直す: `npx supabase db reset` → `docker compose exec app pnpm db:seed:topics`（話題データを入れ直す）
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

話題は `data/topics.csv` で管理する（ダッシュボードの Table Editor / SQL Editor で直接触らない）。
`main` にマージされると GitHub Actions が本番 DB に自動投入するので、ローカルと本番で同じデータになる。

1. `data/topics.csv` に `タイトル,シチュエーション` の形式で 1 行 1 件追記する
   - シチュエーションは `グループワーク` / `サークルの新歓` / `合コン` のいずれか。空欄なら未分類
   - `#` から始まる行はコメント
2. ローカル DB に反映して動作確認: `docker compose exec app pnpm db:seed:topics`（app コンテナ起動中に実行）
   - 初回は `.env` の `SUPABASE_SERVICE_ROLE_KEY` に、`npx supabase status` で表示される **Secret key**（`sb_secret_...`）を設定しておく
   - 同じタイトルは自動でスキップされるので何度実行しても安全
   - シチュエーションを書いた行は既存行の値も更新する。空欄の行は既存行の値を変えない
3. `data/topics.csv` の差分をコミットして PR を出す
4. `main` にマージ → **Actions の「Seed topics (production)」が本番に投入する**（結果は Actions のログで確認）

手動で本番に投入したいときは Actions 画面から「Run workflow」で同じジョブを実行できる。

#### 初回だけ必要な設定（GitHub Secrets）
GitHub の Settings → Secrets and variables → Actions に以下を登録する。

| Name | 値 |
|---|---|
| `SUPABASE_URL` | `https://kbvnbglrysgjhnphlsgm.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API Keys → **Secret key**（`sb_secret_...`） |

Secret key は RLS を無視できる鍵なので、GitHub Secrets 以外（`.env`、`VITE_*`、チャット等）には置かない。

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
