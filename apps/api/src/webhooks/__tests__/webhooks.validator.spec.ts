import { validateWebhookPayload } from '../webhooks.validator';

describe('webhooks.validator', () => {
  it('accepts the base schema for qr', () => {
    const result = validateWebhookPayload('qr', { anything: 'ok' });
    expect(result.ok).toBe(true);
  });

  it('rejects waba payloads missing entries', () => {
    const result = validateWebhookPayload('waba', { entry: [] });
    expect(result.ok).toBe(false);
    expect(result.error).toBe('invalid-payload');
  });

  it('accepts waba payloads with entries', () => {
    const result = validateWebhookPayload('waba', { entry: [{ id: '1' }] });
    expect(result.ok).toBe(true);
  });
});
