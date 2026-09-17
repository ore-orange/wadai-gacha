# T.S.Revolution

[![CI](https://github.com/ore-orange/wadai-gacha/actions/workflows/ci.yml/badge.svg)](https://github.com/ore-orange/wadai-gacha/actions/workflows/ci.yml)

「いつ・どこで・だれが・なにを・どうした」の 5 つの枠を、みんなで 1 つずつ埋めて 1 つの文を作るゲーム。
各枠には毎回ガチャで「小テーマ」（例: いつ → 高校生の頃）が付き、本当の出来事を書くことでお互いを知るきっかけになる。

### 遊び方
ホストが部屋を作り、4 桁のコードを共有。参加者は各自のスマホで名前とコードを入れて参加する。ロビーでホストが遊び方を選ぶ。

**みんなで 1 文**
1. ホストがガチャを回して 5 枠の質問を決める（枠ごとに引き直し可）→ 配る
2. 各参加者にランダムに枠が配られる（5 枠は必ず全部埋まる。人数が少なければ 1 人複数枠、多ければ 1 枠複数人）
3. 自分の枠だけ答えて送信。全員分が揃うと自動で発表
4. 全員の答えを枠順につなげた文が表示される（誰が書いたかは伏せる）

**1 人 5 枠**
1. ホストがガチャを回して 5 枠の質問を決める（全員共通）→ 配る
2. 全員が 5 枠すべてに答えて送信（枠ごとに送信）
3. 全員分が揃うと、枠ごとにシャッフルして人数分の文ができる（全員の答えが必ず 1 回ずつ使われる）
4. ホストが 1 文ずつめくって発表。最後まで見ると一覧。「もう一度シャッフル」で組み直せる

どちらもホストが「次のラウンドへ」または「終了」で進行する。1 人でも遊べる。

### 仕組み
- サーバーは無く、supabase-js から Postgres 関数（RPC）を呼ぶだけで進行する。関数は `supabase/migrations` にある
- ログイン無し。参加時に発行されるトークン（localStorage に保存）で本人確認する
- 画面同期は Supabase Realtime（`rooms` / `players` / `rounds` / `round_themes` の変更を購読）+ 5 秒ごとのポーリング
- 回答（`entries`）はクライアントから直接読めない。発表時に DB 側で文に組み立てて `rounds.sentences` として公開する

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
| ホスティング           | Cloudflare Workers（静的アセット配信）                                                                        |
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
- スキーマを変更した後に作り直す: `npx supabase db reset` → `docker compose exec app pnpm db:seed:themes`（小テーマを入れ直す）
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

### 質問（小テーマ）を追加するとき

質問は `data/themes.csv` で管理する（ダッシュボードの Table Editor / SQL Editor で直接触らない）。
`main` にマージされると GitHub Actions が本番 DB に自動投入するので、ローカルと本番で同じデータになる。

1. `data/themes.csv` に `枠,質問,答えの例` の形式で 1 行 1 件追記する（質問は「〜は？」の形。答えの「〜」だけをユーザーが書き、助詞は自動で付く。答えの例は入力欄に薄く表示されるので助詞なしで書く）
   - 枠は `when`（いつ）/ `where`（どこで）/ `who`（だれが）/ `what`（なにを）/ `how`（どうした）
   - 答えが 時期（when）/ 場所（where）/ 人（who）/ もの（what）/ 「〜した」（how）になる質問にする
   - `#` から始まる行はコメント
2. ローカル DB に反映して動作確認: `docker compose exec app pnpm db:seed:themes`（app コンテナ起動中に実行）
   - 初回は `.env` の `SUPABASE_SERVICE_ROLE_KEY` に、`npx supabase status` で表示される **Secret key**（`sb_secret_...`）を設定しておく
   - 同じ枠・同じ質問は答えの例だけ更新されるので何度実行しても安全
3. `data/themes.csv` の差分をコミットして PR を出す
4. `main` にマージ → **Actions の「Seed themes (production)」が本番に投入する**（結果は Actions のログで確認）

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
