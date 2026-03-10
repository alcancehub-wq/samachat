# Incident Response

## Trigger Conditions
- Elevated error rates or sustained latency spikes.
- Queue backlog growth beyond normal thresholds.
- Provider outages or authentication failures.

## Immediate Actions
1. Declare incident and assign an incident lead.
2. Identify affected services (web, API, worker, Redis).
3. Check health endpoints and dashboards.
4. Stabilize by scaling or disabling non-critical features.

## Investigation
- Review recent deploys and config changes.
- Inspect logs around the incident start time.
- Check provider status pages and auth token validity.

## Resolution
- Apply rollback or hotfix if needed.
- Drain or requeue failed jobs carefully.
- Communicate impact and resolution timeline.

## Post-Incident
- Document timeline, root cause, and prevention actions.
- Add tests, alerts, or runbook updates.
