# Samachat

Base do Samachat (white label premium) em monorepo pnpm.

## Setup local

1) Instalar dependencias:

```
pnpm install
```

2) Copiar os arquivos de exemplo de ambiente e preencher:

- `.env.example` (root)
- `packages/db/.env.example`
- `apps/web/.env.example`
- `apps/api/.env.example`
- `apps/worker/.env.example`

3) Subir infraestrutura local (Redis via Docker):

```
pnpm infra:up
```

4) Validar ambiente:

```
pnpm doctor
```

5) Rodar em desenvolvimento:

```
pnpm dev
```

## Reset

- Reset seguro:

```
pnpm reset
```

- Reset hard (remove node_modules):

```
pnpm reset:hard
```

## Portas padrao

- Web: 3000
- API: 3001
- Redis: 6379

## Infra

- `pnpm infra:up` (sobe Redis)
- `pnpm infra:down` (derruba Redis)

## Troubleshooting

- Redis nao responde: `pnpm infra:up`
- Porta 3000/3001 ocupada: finalize o processo e rode `pnpm dev` novamente
- Prisma falha no reset: verifique `packages/db/.env`

## Variaveis de ambiente

### Root

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_JWT_SECRET`
- `REDIS_URL` (default: redis://127.0.0.1:6379)
- `WABA_VERIFY_TOKEN`
- `WABA_APP_SECRET`

### Web

- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### API

- `PORT`
- `SUPABASE_JWT_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `WABA_VERIFY_TOKEN`
- `WABA_APP_SECRET`

### Worker

- `REDIS_URL`

## Supabase

- Criar o projeto no Supabase e copiar `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_JWT_SECRET`.
- Configurar as politicas de RLS conforme o modelo em `packages/db/prisma/schema.prisma`.

## Scripts

- `pnpm infra:up`
- `pnpm infra:down`
- `pnpm doctor`
- `pnpm reset`
- `pnpm reset:hard`
- `pnpm dev`
- `pnpm build`
- `pnpm lint`
- `pnpm typecheck`
