# 開発用イメージ（Vite dev サーバーを動かす）
FROM node:22-slim

# corepack 経由で package.json の packageManager に指定した pnpm を使う
RUN corepack enable

WORKDIR /app

# 依存関係だけ先にコピーしてレイヤーキャッシュを効かせる
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 5173

CMD ["pnpm", "dev"]
