const redisMock = {
  status: "ready",
  set: jest.fn(),
  eval: jest.fn(),
  pttl: jest.fn()
};

jest.mock("../../../libs/redisStore", () => ({
  getRedisClient: jest.fn(() => redisMock)
}));

import { getRedisClient } from "../../../libs/redisStore";
import {
  acquireWhatsAppReconciliationLock,
  getManualWhatsAppResyncRetryAfterMs,
  getWhatsAppReconciliationLockRetryAfterMs,
  MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS,
  releaseWhatsAppReconciliationLock,
  renewWhatsAppReconciliationLock,
  startManualWhatsAppResyncCooldown,
  WHATSAPP_RECONCILIATION_LOCK_TTL_MS
} from "../WhatsAppReconciliationRuntimeStore";

const getRedisClientMock = getRedisClient as jest.Mock;

describe("WhatsAppReconciliationRuntimeStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    redisMock.status = "ready";
    getRedisClientMock.mockReturnValue(redisMock);
  });

  it("acquires a distributed lock using NX and PX", async () => {
    redisMock.set.mockResolvedValue("OK");

    const lock =
      await acquireWhatsAppReconciliationLock(101);

    expect(lock).toEqual(
      expect.objectContaining({
        whatsappId: 101,
        token: expect.any(String)
      })
    );

    expect(redisMock.set).toHaveBeenCalledWith(
      "samachat:whatsapp-reconciliation:lock:101",
      expect.any(String),
      "PX",
      WHATSAPP_RECONCILIATION_LOCK_TTL_MS,
      "NX"
    );
  });

  it("returns null when another process already owns the lock", async () => {
    redisMock.set.mockResolvedValue(null);

    await expect(
      acquireWhatsAppReconciliationLock(101)
    ).resolves.toBeNull();
  });

  it("releases and renews only through token-aware scripts", async () => {
    redisMock.eval.mockResolvedValue(1);

    const lock = {
      whatsappId: 101,
      token: "owner-token"
    };

    await expect(
      renewWhatsAppReconciliationLock(lock)
    ).resolves.toBe(true);

    await releaseWhatsAppReconciliationLock(lock);

    expect(redisMock.eval).toHaveBeenCalledTimes(2);
  });

  it("reads active distributed lock TTL for runtime UI state", async () => {
    redisMock.pttl.mockResolvedValue(45000);

    await expect(
      getWhatsAppReconciliationLockRetryAfterMs(101)
    ).resolves.toBe(45000);

    expect(redisMock.pttl).toHaveBeenCalledWith(
      "samachat:whatsapp-reconciliation:lock:101"
    );
  });

  it("stores and reads the manual cooldown in Redis", async () => {
    redisMock.set.mockResolvedValue("OK");
    redisMock.pttl.mockResolvedValue(
      MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS
    );

    await startManualWhatsAppResyncCooldown(101);

    expect(redisMock.set).toHaveBeenCalledWith(
      "samachat:whatsapp-reconciliation:manual-cooldown:101",
      "1",
      "PX",
      MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS
    );

    await expect(
      getManualWhatsAppResyncRetryAfterMs(101)
    ).resolves.toBe(
      MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS
    );
  });

  it("fails closed when Redis is unavailable", async () => {
    getRedisClientMock.mockReturnValue(null);

    await expect(
      acquireWhatsAppReconciliationLock(101)
    ).rejects.toThrow(
      "ERR_WHATSAPP_RECONCILIATION_RUNTIME_UNAVAILABLE"
    );
  });

  it("fails closed while Redis is not ready", async () => {
    redisMock.status = "connecting";

    await expect(
      acquireWhatsAppReconciliationLock(101)
    ).rejects.toThrow(
      "ERR_WHATSAPP_RECONCILIATION_RUNTIME_UNAVAILABLE"
    );
  });
});
