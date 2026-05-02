FROM node:20-alpine AS build
WORKDIR /app
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages

RUN pnpm install --frozen-lockfile --prod=false
RUN pnpm --filter @samachat/db generate
RUN pnpm --filter @samachat/api build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json apps/api/package.json
COPY --from=build /app/packages /app/packages

RUN pnpm install --prod --frozen-lockfile
COPY --from=build /app/apps/api/dist /app/apps/api/dist

CMD ["sh", "-c", "pnpm --filter @samachat/api exec prisma migrate deploy --schema ../../packages/db/prisma/schema.prisma && node apps/api/dist/main.js"]
