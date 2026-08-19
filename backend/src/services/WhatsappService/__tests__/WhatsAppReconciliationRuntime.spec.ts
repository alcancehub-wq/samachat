const storeMock = {
  acquire: jest.fn(),
  release: jest.fn(),
  renew: jest.fn(),
  lockRetryAfter: jest.fn(),
  retryAfter: jest.fn(),
  startCooldown: jest.fn()
};

jest.mock("../WhatsAppReconciliationRuntimeStore", () => ({
  MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS: 15 * 60 * 1000,

  // Test-only interval.
  // Production remains 20 seconds in RuntimeStore.
  WHATSAPP_RECONCILIATION_LOCK_HEARTBEAT_MS: 10,

  acquireWhatsAppReconciliationLock: (...args: any[]) =>
    storeMock.acquire(...args),

  releaseWhatsAppReconciliationLock: (...args: any[]) =>
    storeMock.release(...args),

  renewWhatsAppReconciliationLock: (...args: any[]) =>
    storeMock.renew(...args),

  getWhatsAppReconciliationLockRetryAfterMs: (...args: any[]) =>
    storeMock.lockRetryAfter(...args),

  getManualWhatsAppResyncRetryAfterMs: (...args: any[]) =>
    storeMock.retryAfter(...args),

  startManualWhatsAppResyncCooldown: (...args: any[]) =>
    storeMock.startCooldown(...args)
}));

import {
  MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS,
  WhatsAppReconciliationCancellationSignal,
  WhatsAppReconciliationLockLostError,
  getWhatsAppReconciliationRuntimeState,
  runWithWhatsAppReconciliationGuard
} from "../WhatsAppReconciliationRuntime";

describe("WhatsAppReconciliationRuntime distributed guard", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    storeMock.acquire.mockResolvedValue({
      whatsappId: 101,
      token: "token-101"
    });

    storeMock.release.mockResolvedValue(undefined);
    storeMock.renew.mockResolvedValue(true);
    storeMock.lockRetryAfter.mockResolvedValue(0);
    storeMock.retryAfter.mockResolvedValue(0);
    storeMock.startCooldown.mockResolvedValue(undefined);
  });

  it("blocks when the distributed lock is already owned", async () => {
    storeMock.acquire.mockResolvedValue(null);

    await expect(
      runWithWhatsAppReconciliationGuard({
        whatsappId: 101,
        trigger: "automatic",
        task: async () => undefined
      })
    ).rejects.toMatchObject({
      reason: "in_progress"
    });
  });

  it("blocks a manual run during distributed cooldown", async () => {
    storeMock.retryAfter.mockResolvedValue(120000);

    await expect(
      runWithWhatsAppReconciliationGuard({
        whatsappId: 101,
        trigger: "manual",
        task: async () => undefined
      })
    ).rejects.toMatchObject({
      reason: "manual_cooldown",
      retryAfterMs: 120000
    });

    expect(storeMock.acquire).not.toHaveBeenCalled();
  });

  it("starts cooldown only after successful manual task", async () => {
    await expect(
      runWithWhatsAppReconciliationGuard({
        whatsappId: 101,
        trigger: "manual",
        task: async () => "ok"
      })
    ).resolves.toBe("ok");

    expect(storeMock.startCooldown).toHaveBeenCalledWith(101);
  });

  it("does not start cooldown when the task fails", async () => {
    await expect(
      runWithWhatsAppReconciliationGuard({
        whatsappId: 101,
        trigger: "manual",
        task: async () => {
          throw new Error("provider failure");
        }
      })
    ).rejects.toThrow("provider failure");

    expect(storeMock.startCooldown).not.toHaveBeenCalled();
  });

  it("reports a real active distributed lock in runtime state", async () => {
    storeMock.lockRetryAfter.mockResolvedValue(45000);

    const state =
      await getWhatsAppReconciliationRuntimeState(101);

    expect(state.running).toBe(true);
    expect(state.runningRetryAfterMs).toBe(45000);
  });

  it("reports no running reconciliation when lock is absent", async () => {
    storeMock.lockRetryAfter.mockResolvedValue(0);

    const state =
      await getWhatsAppReconciliationRuntimeState(101);

    expect(state.running).toBe(false);
  });

  it("aborts the task and fails closed when heartbeat loses the lock", async () => {
    let signalReceived:
      | WhatsAppReconciliationCancellationSignal
      | undefined;

    let resolveRenewCalled:
      | (() => void)
      | undefined;

    const renewCalled = new Promise<void>(resolve => {
      resolveRenewCalled = resolve;
    });

    storeMock.renew.mockImplementation(async () => {
      resolveRenewCalled?.();
      return false;
    });

    const runPromise =
      runWithWhatsAppReconciliationGuard({
        whatsappId: 101,
        trigger: "automatic",
        task: async signal => {
          signalReceived = signal;

          await new Promise<void>(() => undefined);
        }
      });

    await renewCalled;

    await expect(runPromise).rejects.toBeInstanceOf(
      WhatsAppReconciliationLockLostError
    );

    expect(storeMock.renew).toHaveBeenCalled();

    expect(signalReceived?.aborted).toBe(true);

    expect(() =>
      signalReceived?.throwIfAborted()
    ).toThrow(
      "ERR_WHATSAPP_RECONCILIATION_LOCK_LOST"
    );

    expect(storeMock.release).toHaveBeenCalled();
  });

  it("passes a healthy cancellation signal to a successful task", async () => {
    await expect(
      runWithWhatsAppReconciliationGuard({
        whatsappId: 101,
        trigger: "automatic",
        task: async signal => {
          expect(signal.aborted).toBe(false);

          expect(() =>
            signal.throwIfAborted()
          ).not.toThrow();

          return "ok";
        }
      })
    ).resolves.toBe("ok");
  });

  it("does not make automatic reconciliation consume manual cooldown", async () => {
    await runWithWhatsAppReconciliationGuard({
      whatsappId: 101,
      trigger: "automatic",
      task: async () => undefined
    });

    expect(storeMock.startCooldown).not.toHaveBeenCalled();
  });

  it("preserves task success if final release fails", async () => {
    storeMock.release.mockRejectedValue(
      new Error("redis release failure")
    );

    await expect(
      runWithWhatsAppReconciliationGuard({
        whatsappId: 101,
        trigger: "automatic",
        task: async () => "done"
      })
    ).resolves.toBe("done");
  });

  it("keeps the 15 minute manual cooldown contract", () => {
    expect(MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS).toBe(
      15 * 60 * 1000
    );
  });
});
