# Observability

## Health Endpoints
- API exposes readiness and liveness endpoints for probes.
- Worker exposes a basic health signal for queue connectivity.
- Use these for orchestration health checks and auto-restart policies.

## Metrics
- Metrics are exported from API and worker for request throughput, error rates, and queue depth.
- Scrape intervals should be tuned to your environment.
- Dashboards should include latency percentiles and job retry counts.

## OpenTelemetry Tracing
- API and worker emit OpenTelemetry spans for inbound requests and background jobs.
- Propagate trace context through queue payloads where possible.
- Configure OTLP exporter endpoints via environment variables.
