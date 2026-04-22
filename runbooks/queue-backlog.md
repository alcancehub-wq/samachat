# Queue Backlog

## Symptoms
- Increasing queue depth and processing latency.
- Worker CPU is saturated or idle due to failures.

## Diagnostics
- Check worker logs for repeated failures.
- Validate Redis connectivity and latency.
- Inspect provider rate limits and outages.

## Mitigation
- Scale worker replicas temporarily.
- Reduce incoming load or pause non-critical jobs.
- Increase retry backoff to avoid overload.

## Recovery
- Monitor backlog drain rate.
- Validate processing success rate before scaling back.
