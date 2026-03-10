import {
  checkAndSetReplayProtection,
  computeReplayFingerprint,
} from '../idempotency';

const redis = {
  set: jest.fn(),
} as any;

describe('webhooks.idempotency', () => {
  beforeEach(() => {
    redis.set.mockReset();
  });

  it('computes deterministic replay fingerprints', () => {
    const first = computeReplayFingerprint('waba', '{"a":1}', 1000, 'sig');
    const second = computeReplayFingerprint('waba', '{"a":1}', 1000, 'sig');
    expect(first).toBe(second);
  });

  it('returns true when replay protection key is set', async () => {
    redis.set.mockResolvedValueOnce('OK');
    const ok = await checkAndSetReplayProtection(
      redis,
      'waba',
      '{"a":1}',
      1000,
      'sig',
      60,
    );
    expect(ok).toBe(true);
  });

  it('returns false when replay protection key already exists', async () => {
    redis.set.mockResolvedValueOnce(null);
    const ok = await checkAndSetReplayProtection(
      redis,
      'waba',
      '{"a":1}',
      1000,
      'sig',
      60,
    );
    expect(ok).toBe(false);
  });
});
