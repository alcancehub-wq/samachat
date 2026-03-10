# P1 HARDENED

Status: in-progress

## Scope
- Webhook validation, normalization, and idempotency
- Queue hardening with retry/backoff/timeout and DLQ
- Structured logging with request/job context
- Media download storage and metadata persistence
- Centralized config defaults for webhook/queues

## What Changed
- Webhook controller/service now validate content-type, size, signature, and minimal payloads
- Webhook events normalized per provider and assigned a stable event id
- Idempotency uses Redis SET NX with TTL
- Worker queues use centralized options and DLQ on failure
- Media downloads use storage provider and persist metadata
- Logger helpers propagate requestId/correlationId/jobId

## Env
Root .env.example includes WEBHOOK_* and QUEUE_* defaults.
Apps .env.example updated with queue settings and webhook defaults for api.

## Pending
- Run prisma generate and db push/migrate for StorageAsset
- Run typechecks and dev gates
- Smoke tests for webhook, queues, and media download

## Smoke Checklist
- POST /webhooks with valid signature and content-type
- Duplicate webhook event is idempotent (second request ignored)
- Worker processes inbound, outbound, and media queues
- DLQ receives failed jobs
- Media download writes storage metadata
