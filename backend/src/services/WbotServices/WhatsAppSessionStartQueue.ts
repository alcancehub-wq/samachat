import Whatsapp from "../../models/Whatsapp";
import { logger } from "../../utils/logger";

const DEFAULT_START_DELAY_MS = 0;
const MIN_START_DELAY_MS = 0;
const MAX_START_DELAY_MS = 15000;

const DEFAULT_START_TIMEOUT_MS = 60000;
const MIN_START_TIMEOUT_MS = 15000;
const MAX_START_TIMEOUT_MS = 180000;

const queuedSessionStarts = new Map<number, Promise<void>>();

let queueTail: Promise<void> = Promise.resolve();
let lastStartedAt = 0;

const delay = (ms: number): Promise<void> =>
  new Promise(resolve => setTimeout(resolve, ms));

const shouldThrottleStart = (reason: string): boolean =>
  reason === "boot" || reason.startsWith("boot:");

const getSessionStartDelayMs = (reason: string): number => {
  if (!shouldThrottleStart(reason)) {
    return 0;
  }

  const configuredDelay = Number(
    process.env.WWEBJS_SESSION_START_DELAY_MS ||
      process.env.WWEBJS_BOOT_START_DELAY_MS ||
      DEFAULT_START_DELAY_MS
  );

  if (!Number.isFinite(configuredDelay)) {
    return DEFAULT_START_DELAY_MS;
  }

  return Math.min(
    MAX_START_DELAY_MS,
    Math.max(MIN_START_DELAY_MS, configuredDelay)
  );
};

const getSessionStartTimeoutMs = (): number => {
  const configuredTimeout = Number(
    process.env.WWEBJS_SESSION_START_TIMEOUT_MS || DEFAULT_START_TIMEOUT_MS
  );

  if (!Number.isFinite(configuredTimeout)) {
    return DEFAULT_START_TIMEOUT_MS;
  }

  return Math.min(
    MAX_START_TIMEOUT_MS,
    Math.max(MIN_START_TIMEOUT_MS, configuredTimeout)
  );
};

class WhatsAppSessionStartTimeoutError extends Error {
  constructor() {
    super("WHATSAPP_SESSION_START_TIMEOUT");
    this.name = "WhatsAppSessionStartTimeoutError";
  }
}

const withSessionStartTimeout = async (
  whatsappId: number,
  sessionName: string,
  reason: string,
  task: () => Promise<void>,
  onTimeout?: () => Promise<void> | void
): Promise<void> => {
  const timeoutMs = getSessionStartTimeoutMs();

  let timeout: ReturnType<typeof setTimeout> | undefined;
  const taskPromise = Promise.resolve().then(task);

  try {
    await Promise.race([
      taskPromise,
      new Promise<void>((_, reject) => {
        timeout = setTimeout(() => {
          reject(new WhatsAppSessionStartTimeoutError());
        }, timeoutMs);
      })
    ]);
  } catch (err) {
    if (err instanceof WhatsAppSessionStartTimeoutError) {
      logger.error(
        {
          whatsappId,
          sessionName,
          reason,
          timeoutMs
        },
        "WhatsApp session start exceeded timeout threshold; cleaning up the stalled session and releasing the queue"
      );

      if (onTimeout) {
        const cleanupTimeoutMs = Math.min(10000, timeoutMs);

        const cleanupPromise = Promise.resolve().then(onTimeout);

        try {
          await Promise.race([
            cleanupPromise,
            new Promise<void>(resolve => {
              setTimeout(resolve, cleanupTimeoutMs);
            })
          ]);
        } catch (cleanupError) {
          logger.error(
            {
              err: cleanupError,
              whatsappId,
              sessionName,
              reason,
              timeoutMs,
              cleanupTimeoutMs
            },
            "WhatsApp session timeout cleanup failed"
          );
        }

        void cleanupPromise.catch(cleanupError => {
          logger.warn(
            {
              err: cleanupError,
              whatsappId,
              sessionName,
              reason
            },
            "WhatsApp session cleanup settled with an error after queue release"
          );
        });
      }

      void taskPromise.catch(taskError => {
        logger.warn(
          {
            err: taskError,
            whatsappId,
            sessionName,
            reason
          },
          "Timed-out WhatsApp session start settled with an error after queue release"
        );
      });

      return;
    }

    logger.error(
      {
        err,
        whatsappId,
        sessionName,
        reason,
        timeoutMs
      },
      "WhatsApp session start task failed"
    );
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
};

interface EnqueueSessionStartOptions {
  reason: string;
  sessionName?: string;
  onTimeout?: () => Promise<void> | void;
}

export const enqueueWhatsAppSessionStart = (
  whatsapp: Whatsapp,
  options: EnqueueSessionStartOptions,
  task: () => Promise<void>
): Promise<void> => {
  const existingStart = queuedSessionStarts.get(whatsapp.id);
  const sessionName = options.sessionName || whatsapp.name;

  if (existingStart) {
    logger.warn(
      {
        whatsappId: whatsapp.id,
        sessionName,
        reason: options.reason
      },
      "WhatsApp session start already queued"
    );
    return existingStart;
  }

  const delayMs = getSessionStartDelayMs(options.reason);

  logger.info(
    {
      whatsappId: whatsapp.id,
      sessionName,
      reason: options.reason,
      delayMs,
      throttled: delayMs > 0,
      queuedSessions: queuedSessionStarts.size + 1
    },
    "WhatsApp session queued for controlled start"
  );

  let queuedPromise: Promise<void> | undefined;
  queuedPromise = queueTail
    .catch(() => undefined)
    .then(async () => {
      const elapsedMs = Date.now() - lastStartedAt;
      const waitMs = Math.max(0, delayMs - elapsedMs);

      if (waitMs > 0) {
        logger.info(
          {
            whatsappId: whatsapp.id,
            sessionName,
            reason: options.reason,
            waitMs
          },
          "Waiting before starting queued WhatsApp session"
        );
        await delay(waitMs);
      }

      lastStartedAt = Date.now();
      logger.info(
        {
          whatsappId: whatsapp.id,
          sessionName,
          reason: options.reason
        },
        "Dequeued WhatsApp session start"
      );

      await withSessionStartTimeout(
        whatsapp.id,
        sessionName,
        options.reason,
        task,
        options.onTimeout
      );
    })
    .finally(() => {
      if (
        queuedPromise &&
        queuedSessionStarts.get(whatsapp.id) === queuedPromise
      ) {
        queuedSessionStarts.delete(whatsapp.id);
      }
    });

  queueTail = queuedPromise.catch(() => undefined);
  queuedSessionStarts.set(whatsapp.id, queuedPromise);

  return queuedPromise;
};
