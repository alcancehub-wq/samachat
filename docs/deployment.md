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

## Environment Variables
- API and worker require database, Redis, and provider credentials.
- Web requires public API URL and auth configuration.
- Provide environment variables via `.env` files or your orchestration system.
- Validate critical env vars on startup; deployment should fail fast if missing.

## Notes
- Migrations should be applied before serving traffic.
- Run health checks and readiness probes on startup to confirm service health.
