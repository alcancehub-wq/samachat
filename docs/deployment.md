# Deployment

## Build
- Install dependencies from the repository root with `pnpm install`.
- Build all packages and apps with `pnpm build`.

## Docker Compose (Production)
- Use the production compose file at the repo root.
- Example: `docker compose -f docker-compose.prod.yml up -d`.
- Ensure all required environment variables are set before starting the stack.

## Environment Variables
- API and worker require database, Redis, and provider credentials.
- Web requires public API URL and auth configuration.
- Provide environment variables via `.env` files or your orchestration system.
- Validate critical env vars on startup; deployment should fail fast if missing.

## Notes
- Migrations should be applied before serving traffic.
- Run health checks and readiness probes on startup to confirm service health.
