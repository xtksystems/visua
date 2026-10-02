FROM node:22-bookworm-slim AS build

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/server/package.json apps/server/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/agents/package.json packages/agents/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/design/package.json packages/design/package.json
COPY packages/frameworks/package.json packages/frameworks/package.json
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

FROM node:22-bookworm-slim

WORKDIR /app
COPY --from=build --chown=node:node /app /app
RUN mkdir -p /app/data && chown node:node /app/data

USER node
EXPOSE 8787
CMD ["node", "--disable-warning=ExperimentalWarning", "apps/server/src/index.ts"]
