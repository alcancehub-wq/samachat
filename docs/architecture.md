# Architecture

## Overview
Samachat is a multi-service platform composed of a web app, API, and worker, with Redis-backed queues and pluggable provider integrations. The system follows a request/command pattern for user-facing flows and asynchronous background processing for long-running tasks.

## Web
- Next.js application served from apps/web.
- Handles UI, session management, and client-side routing.
- Talks to the API over HTTP(S).
- Uses middleware for request gating and tenant-aware routing.

## API
- NestJS service in apps/api.
- Exposes REST endpoints for auth, conversations, campaigns, webhooks, and admin APIs.
- Owns validation, authorization, and tenant isolation at the request boundary.
- Publishes background jobs to queues for async processing.

## Worker
- Node service in apps/worker.
- Consumes jobs from queues and executes integrations, message dispatch, and scheduled tasks.
- Implements retries and backoff for transient failures.
- Emits metrics and tracing spans for async workloads.

## Redis
- Central cache and queue backend.
- Stores ephemeral state (rate limits, sessions, locks) and queue data.
- Shared by API and worker.

## Queue System
- Queue abstraction is implemented in apps/worker/src/queues and packages/messaging.
- Job producers are typically in the API layer.
- Job consumers live in the worker layer.
- Provides retry, visibility timeouts, and dead-letter behavior (provider dependent).

## Provider Layer
- Provider implementations are in packages/messaging/providers.
- The provider interface standardizes send, status, and webhook handling.
- Providers are selected per tenant/channel at runtime.
- Provider errors are wrapped and normalized for consistent handling upstream.
