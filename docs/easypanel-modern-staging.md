# Easypanel Modern Staging

## Goal
- Stage the modern stack (`apps/api`, `apps/web`, `apps/worker`) in a separate Easypanel project.
- Keep the current production stack (`backend/` + `frontend/`) untouched until staging is validated.

## Prerequisites
- A separate Easypanel project, for example `samachat-v2-staging`.
- One Postgres database for Prisma (`DATABASE_URL`).
- One Redis instance for queues (`REDIS_URL`).
- One Supabase project with these values:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `SUPABASE_JWT_SECRET`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- One provider secret for the API:
  - `PROVIDER_SECRET`

## Service Layout

### API
- Source: GitHub
- Repo: `alcancehub-wq/samachat`
- Branch: `main`
- Build path: `/`
- Builder: Dockerfile
- Dockerfile path: `apps/api/Dockerfile`
- Internal port: `3001`

Recommended environment:

```env
PORT=3001
DATABASE_URL=postgresql://postgres:password@staging-postgres:5432/samachat
REDIS_URL=redis://staging-redis:6379
PROVIDER_SECRET=change-me
PROVIDER_MODE=qr
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret
STORAGE_MODE=local
LOCAL_STORAGE_PATH=storage
LOG_LEVEL=info
WORKER_HEARTBEAT_REQUIRED=false
```

### Web
- Source: GitHub
- Repo: `alcancehub-wq/samachat`
- Branch: `main`
- Build path: `/`
- Builder: Dockerfile
- Dockerfile path: `apps/web/Dockerfile`
- Internal port: `3000`

Recommended environment:

```env
NEXT_PUBLIC_API_URL=https://api-staging.example.com
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_TERMS_VERSION=2026-02-22
NEXT_PUBLIC_PRIVACY_VERSION=2026-02-22
NEXT_PUBLIC_MAX_UPLOAD_MB=20
```

### Worker
- Only deploy after API, Postgres, and Redis are healthy.
- Source: GitHub
- Repo: `alcancehub-wq/samachat`
- Branch: `main`
- Build path: `/`
- Builder: Dockerfile
- Dockerfile path: `apps/worker/Dockerfile`

Recommended environment:

```env
DATABASE_URL=postgresql://postgres:password@staging-postgres:5432/samachat
REDIS_URL=redis://staging-redis:6379
PROVIDER_MODE=qr
STORAGE_MODE=local
LOCAL_STORAGE_PATH=storage
LOG_LEVEL=info
WORKER_ID=staging
```

After the worker is online, update the API service with:

```env
WORKER_HEARTBEAT_REQUIRED=true
WORKER_ID=staging
```

## Validation
- API liveness: `GET /liveness`
- API readiness: `GET /ready`
- API health: `GET /health`
- API version: `GET /version`
- Web: login page loads and requests go to the staging API URL.

## Safety Rules
- Do not reuse the live production domains during staging.
- Do not point the modern stack at the live MySQL database.
- Keep the legacy Easypanel `worker` service stopped while the legacy `backend` remains in production.
- Only switch traffic after staging passes auth, conversations, media, and webhook smoke tests.