# Deployment

## Build
- Install dependencies from the repository root with `pnpm install`.
- Build all packages and apps with `pnpm build`.

## Docker Compose (Production)
- For the Express backend + React frontend stack (samachat.com.br + app.samachat.com.br),
	use: `docker compose -f docker-compose.prod.yaml up -d`.
- The file `docker-compose.prod.yml` starts the Nest API + Next web stack and
	does not expose `POST /auth/login`.
- Ensure all required environment variables are set before starting the stack.

## Easypanel (VPS)
- The current VPS deployment is managed directly by Easypanel GitHub sources for the legacy root `backend/` and `frontend/` apps.
- When Easypanel is connected to `alcancehub-wq/samachat` on branch `main`, a push is enough for Easypanel to build and deploy those apps automatically.
- No GitHub deploy hook secret is required for the frontend in that setup.
- In the legacy root stack, the `backend` container already starts WhatsApp sessions, schedule polling, and campaign workers by default. Keep a separate Easypanel `worker` service only if it is intentionally running a distinct worker process.
- In Easypanel `backend` environment variables, set at least `BACKEND_URL=https://app.samachat.com.br`, `FRONTEND_URL=https://samachat.com.br`, and `PROXY_PORT=443` in addition to the database and Redis settings.
- In Easypanel `frontend`, keep `VITE_BACKEND_URL=https://app.samachat.com.br`.
- `.github/workflows/docker.yml` is now manual-only and no longer deploys to Fly.

## Environment Variables
- API and worker require database, Redis, and provider credentials.
- Web requires public API URL and auth configuration.
- Provide environment variables via `.env` files or your orchestration system.
- Validate critical env vars on startup; deployment should fail fast if missing.

## Notes
- Migrations should be applied before serving traffic.
- Run health checks and readiness probes on startup to confirm service health.
