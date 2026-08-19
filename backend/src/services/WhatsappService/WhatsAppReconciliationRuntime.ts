import {
  acquireWhatsAppReconciliationLock,
  getManualWhatsAppResyncRetryAfterMs,
  getWhatsAppReconciliationLockRetryAfterMs,
  MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS,
  releaseWhatsAppReconciliationLock,
  renewWhatsAppReconciliationLock,
  startManualWhatsAppResyncCooldown,
  WHATSAPP_RECONCILIATION_LOCK_HEARTBEAT_MS,
  WhatsAppReconciliationDistributedLock
} from "./WhatsAppReconciliationRuntimeStore";

export {
  MANUAL_WHATSAPP_RESYNC_COOLDOWN_MS
} from "./WhatsAppReconciliationRuntimeStore";

export type WhatsAppReconciliationTrigger = "automatic" | "manual";

export interface WhatsAppReconciliationResult {
  whatsappId: number;
  trigger: WhatsAppReconciliationTrigger;
  checkedMessages: number;
  importedMessages: number;
  existingMessages: number;
  skippedMessages: number;
  contactsChecked: number;
  contactsCreated: number;
  contactsUpdated: number;
  startedAt: Date;
  finishedAt: Date;
}

export interface WhatsAppReconciliationCancellationSignal {
  readonly aborted: boolean;
  throwIfAborted: () => void;
}

export type WhatsAppReconciliationBlockReason =
  | "in_progress"
  | "manual_cooldown";

export class WhatsAppReconciliationBlockedError extends Error {
  reason: WhatsAppReconciliationBlockReason;
  retryAfterMs: number;

  constructor(
    reason: WhatsAppReconciliationBlockReason,
    retryAfterMs = 0
  ) {
    super(
      reason === "in_progress"
        ? "ERR_WHATSAPP_RECONCILIATION_IN_PROGRESS"
        : "ERR_WHATSAPP_RECONCILIATION_COOLDOWN"
    );

    this.name = "WhatsAppReconciliationBlockedError";
    this.reason = reason;
    this.retryAfterMs = Math.max(Number(retryAfterMs) || 0, 0);
  }
}

export class WhatsAppReconciliationLockLostError extends Error {
  constructor() {
    super("ERR_WHATSAPP_RECONCILIATION_LOCK_LOST");
    this.name = "WhatsAppReconciliationLockLostError";
  }
}

const normalizeWhatsappId = (whatsappId: number): number => {
  const normalized = Number(whatsappId);

  if (!Number.isInteger(normalized) || normalized <= 0) {
    throw new Error("ERR_INVALID_WHATSAPP_ID");
  }

  return normalized;
};

const createCancellationController = (): {
  signal: WhatsAppReconciliationCancellationSignal;
  abort: () => void;
} => {
  let aborted = false;

  const signal: WhatsAppReconciliationCancellationSignal = {
    get aborted() {
      return aborted;
    },
    throwIfAborted: () => {
      if (aborted) {
        throw new WhatsAppReconciliationLockLostError();
      }
    }
  };

  return {
    signal,
    abort: () => {
      aborted = true;
    }
  };
};

const startLockHeartbeat = (
  lock: WhatsAppReconciliationDistributedLock,
  onLockLost: () => void
): (() => void) => {
  let stopped = false;
  let renewing = false;

  let timer: ReturnType<typeof setInterval>;

  const markLockLost = () => {
    if (stopped) {
      return;
    }

    stopped = true;
    clearInterval(timer);
    onLockLost();
  };

  timer = setInterval(() => {
    if (stopped || renewing) {
      return;
    }

    renewing = true;

    void renewWhatsAppReconciliationLock(lock)
      .then(renewed => {
        if (!renewed) {
          markLockLost();
        }
      })
      .catch(() => {
        markLockLost();
      })
      .finally(() => {
        renewing = false;
      });
  }, WHATSAPP_RECONCILIATION_LOCK_HEARTBEAT_MS);

  return () => {
    stopped = true;
    clearInterval(timer);
  };
};

export const getWhatsAppReconciliationRuntimeState = async (
  whatsappId: number
): Promise<{
  running: boolean;
  runningRetryAfterMs: number;
  manualCooldownUntil: number | null;
  manualRetryAfterMs: number;
}> => {
  const normalizedWhatsappId = normalizeWhatsappId(whatsappId);

  const [runningRetryAfterMs, manualRetryAfterMs] =
    await Promise.all([
      getWhatsAppReconciliationLockRetryAfterMs(
        normalizedWhatsappId
      ),
      getManualWhatsAppResyncRetryAfterMs(
        normalizedWhatsappId
      )
    ]);

  return {
    running: runningRetryAfterMs > 0,
    runningRetryAfterMs,
    manualCooldownUntil:
      manualRetryAfterMs > 0
        ? Date.now() + manualRetryAfterMs
        : null,
    manualRetryAfterMs
  };
};

export const runWithWhatsAppReconciliationGuard = async <T>({
  whatsappId,
  trigger,
  task
}: {
  whatsappId: number;
  trigger: WhatsAppReconciliationTrigger;
  task: (
    signal: WhatsAppReconciliationCancellationSignal
  ) => Promise<T>;
}): Promise<T> => {
  const normalizedWhatsappId = normalizeWhatsappId(whatsappId);

  if (trigger === "manual") {
    const retryAfterMs =
      await getManualWhatsAppResyncRetryAfterMs(
        normalizedWhatsappId
      );

    if (retryAfterMs > 0) {
      throw new WhatsAppReconciliationBlockedError(
        "manual_cooldown",
        retryAfterMs
      );
    }
  }

  const lock =
    await acquireWhatsAppReconciliationLock(
      normalizedWhatsappId
    );

  if (!lock) {
    throw new WhatsAppReconciliationBlockedError(
      "in_progress"
    );
  }

  const cancellation = createCancellationController();

  let rejectLockLost:
    | ((reason?: unknown) => void)
    | undefined;

  const lockLostPromise = new Promise<never>(
    (_resolve, reject) => {
      rejectLockLost = reject;
    }
  );

  const stopHeartbeat = startLockHeartbeat(
    lock,
    () => {
      cancellation.abort();

      rejectLockLost?.(
        new WhatsAppReconciliationLockLostError()
      );
    }
  );

  try {
    const taskPromise = task(cancellation.signal);

    const result = await Promise.race([
      taskPromise,
      lockLostPromise
    ]);

    cancellation.signal.throwIfAborted();

    if (trigger === "manual") {
      await startManualWhatsAppResyncCooldown(
        normalizedWhatsappId
      );
    }

    return result;
  } finally {
    stopHeartbeat();

    try {
      await releaseWhatsAppReconciliationLock(lock);
    } catch (_err) {
      // Token ownership + TTL prevent this process from
      // deleting a lock currently owned by another process.
    }
  }
};
