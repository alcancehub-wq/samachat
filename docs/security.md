# Security

## Rate Limiting
- Apply per-tenant and per-IP rate limits at the API boundary.
- Use Redis-backed counters for consistency across replicas.
- Return standard 429 responses with retry hints.

## Tenant Isolation
- Enforce tenant scoping in all API queries and writes.
- Derive tenant context from authenticated sessions or API keys.
- Use row-level filtering in data access layers.

## Webhook Security
- Validate provider signatures on inbound webhooks.
- Reject stale timestamps and unknown provider sources.
- Store webhook secrets per tenant/provider.

## Environment Validation
- Validate required environment variables on startup.
- Use strict schemas to prevent running with partial config.
- Log config validation failures without exposing secrets.
