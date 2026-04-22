# Provider Failure

## Symptoms
- Elevated send failures or webhook verification errors.
- Consistent provider-specific error codes.

## Diagnostics
- Confirm provider status and API health.
- Verify credentials and webhook secrets.
- Check rate limit headers and quota usage.

## Mitigation
- Fail over to alternate providers if supported.
- Pause outbound messages for affected tenants.
- Increase retry delay to reduce pressure.

## Recovery
- Resume normal processing once provider stability returns.
- Reprocess failed jobs with care.
