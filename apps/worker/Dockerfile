FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @samachat/db generate
RUN pnpm --filter @samachat/config --filter @samachat/logger --filter @samachat/shared --filter @samachat/messaging --filter @samachat/storage --filter @samachat/db build
RUN pnpm --filter @samachat/worker build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/worker/package.json apps/worker/package.json
COPY --from=build /app/packages /app/packages

RUN pnpm install --prod --frozen-lockfile
RUN pnpm dlx prisma@6.1.0 generate --schema packages/db/prisma/schema.prisma

COPY --from=build /app/apps/worker/dist /app/apps/worker/dist

CMD ["node", "apps/worker/dist/index.js"]
