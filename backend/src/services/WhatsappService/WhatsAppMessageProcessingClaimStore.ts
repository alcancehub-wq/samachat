import { randomBytes } from "crypto";

import { getRedisClient } from "../../libs/redisStore";

export const WHATSAPP_MESSAGE_PROCESSING_CLAIM_TTL_MS =
  60 * 1000;

export const WHATSAPP_MESSAGE_PROCESSING_CLAIM_HEARTBEAT_MS =
  20 * 1000;

const CLAIM_PREFIX =
  "samachat:whatsapp-message-processing:claim";

const RELEASE_CLAIM_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("del", KEYS[1])
end
return 0
`;

const RENEW_CLAIM_SCRIPT = `
if redis.call("get", KEYS[1]) == ARGV[1] then
  return redis.call("pexpire", KEYS[1], ARGV[2])
end
return 0
`;

const normalizeWhatsappId = (
  whatsappId: number
): number => {
  const normalized = Number(whatsappId);

  if (
    !Number.isInteger(normalized) ||
    normalized <= 0
  ) {
    throw new Error(
      "ERR_INVALID_WHATSAPP_ID"
    );
  }

  return normalized;
};

const normalizeMessageId = (
  messageId: string
): string => {
  const normalized =
    typeof messageId === "string"
      ? messageId.trim()
      : "";

  if (!normalized) {
    throw new Error(
      "ERR_INVALID_WHATSAPP_MESSAGE_ID"
    );
  }

  return normalized;
};

const encodeMessageIdForClaimKey = (
  messageId: string
): string =>
  Buffer.from(
    normalizeMessageId(messageId),
    "utf8"
  ).toString("base64url");

const getReadyRedisClient = () => {
  const client = getRedisClient();

  if (!client || client.status !== "ready") {
    throw new Error(
      "ERR_WHATSAPP_MESSAGE_PROCESSING_CLAIM_UNAVAILABLE"
    );
  }

  return client;
};

const buildClaimKey = (
  whatsappId: number,
  messageId: string
): string =>
  `${CLAIM_PREFIX}:${normalizeWhatsappId(
    whatsappId
  )}:${encodeMessageIdForClaimKey(messageId)}`;

export interface WhatsAppMessageProcessingClaim {
  whatsappId: number;
  messageId: string;
  token: string;
}

export const acquireWhatsAppMessageProcessingClaim =
  async (
    whatsappId: number,
    messageId: string
  ): Promise<
    WhatsAppMessageProcessingClaim | null
  > => {
    const normalizedWhatsappId =
      normalizeWhatsappId(whatsappId);

    const normalizedMessageId =
      normalizeMessageId(messageId);

    const client = getReadyRedisClient();

    const token =
      randomBytes(24).toString("hex");

    const result = await client.set(
      buildClaimKey(
        normalizedWhatsappId,
        normalizedMessageId
      ),
      token,
      "PX",
      WHATSAPP_MESSAGE_PROCESSING_CLAIM_TTL_MS,
      "NX"
    );

    if (result !== "OK") {
      return null;
    }

    return {
      whatsappId: normalizedWhatsappId,
      messageId: normalizedMessageId,
      token
    };
  };

export const renewWhatsAppMessageProcessingClaim =
  async (
    claim: WhatsAppMessageProcessingClaim
  ): Promise<boolean> => {
    const client = getReadyRedisClient();

    const result = await client.eval(
      RENEW_CLAIM_SCRIPT,
      1,
      buildClaimKey(
        claim.whatsappId,
        claim.messageId
      ),
      claim.token,
      String(
        WHATSAPP_MESSAGE_PROCESSING_CLAIM_TTL_MS
      )
    );

    return Number(result) === 1;
  };

export const startWhatsAppMessageProcessingClaimHeartbeat =
  (
    claim: WhatsAppMessageProcessingClaim,
    onClaimLost: () => void
  ): (() => void) => {
    let stopped = false;
    let renewing = false;

    let timer: ReturnType<typeof setInterval>;

    const markClaimLost = () => {
      if (stopped) {
        return;
      }

      stopped = true;
      clearInterval(timer);
      onClaimLost();
    };

    timer = setInterval(() => {
      if (stopped || renewing) {
        return;
      }

      renewing = true;

      void renewWhatsAppMessageProcessingClaim(
        claim
      )
        .then(renewed => {
          if (!renewed) {
            markClaimLost();
          }
        })
        .catch(() => {
          markClaimLost();
        })
        .finally(() => {
          renewing = false;
        });
    }, WHATSAPP_MESSAGE_PROCESSING_CLAIM_HEARTBEAT_MS);

    return () => {
      stopped = true;
      clearInterval(timer);
    };
  };
export const releaseWhatsAppMessageProcessingClaim =
  async (
    claim: WhatsAppMessageProcessingClaim
  ): Promise<void> => {
    const client = getReadyRedisClient();

    await client.eval(
      RELEASE_CLAIM_SCRIPT,
      1,
      buildClaimKey(
        claim.whatsappId,
        claim.messageId
      ),
      claim.token
    );
  };
export interface WhatsAppMessageProcessingClaimCancellationSignal {
  readonly aborted: boolean;
  throwIfAborted: () => void;
}

export class WhatsAppMessageProcessingClaimBlockedError extends Error {
  constructor() {
    super("ERR_WHATSAPP_MESSAGE_PROCESSING_IN_PROGRESS");
    this.name = "WhatsAppMessageProcessingClaimBlockedError";
  }
}

export class WhatsAppMessageProcessingClaimLostError extends Error {
  constructor() {
    super("ERR_WHATSAPP_MESSAGE_PROCESSING_CLAIM_LOST");
    this.name = "WhatsAppMessageProcessingClaimLostError";
  }
}

const createWhatsAppMessageProcessingClaimCancellationController =
  (): {
    signal: WhatsAppMessageProcessingClaimCancellationSignal;
    abort: () => void;
  } => {
    let aborted = false;

    const signal: WhatsAppMessageProcessingClaimCancellationSignal = {
      get aborted() {
        return aborted;
      },

      throwIfAborted: () => {
        if (aborted) {
          throw new WhatsAppMessageProcessingClaimLostError();
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

export const runWithWhatsAppMessageProcessingClaimGuard =
  async <T>({
    whatsappId,
    messageId,
    task
  }: {
    whatsappId: number;
    messageId: string;
    task: (
      signal: WhatsAppMessageProcessingClaimCancellationSignal
    ) => Promise<T>;
  }): Promise<T> => {
    const claim =
      await acquireWhatsAppMessageProcessingClaim(
        whatsappId,
        messageId
      );

    if (!claim) {
      throw new WhatsAppMessageProcessingClaimBlockedError();
    }

    const cancellation =
      createWhatsAppMessageProcessingClaimCancellationController();

    let rejectClaimLost:
      | ((reason?: unknown) => void)
      | undefined;

    const claimLostPromise = new Promise<never>(
      (_resolve, reject) => {
        rejectClaimLost = reject;
      }
    );

    const stopHeartbeat =
      startWhatsAppMessageProcessingClaimHeartbeat(
        claim,
        () => {
          cancellation.abort();

          rejectClaimLost?.(
            new WhatsAppMessageProcessingClaimLostError()
          );
        }
      );

    try {
      const taskPromise = task(cancellation.signal);

      const result = await Promise.race([
        taskPromise,
        claimLostPromise
      ]);

      cancellation.signal.throwIfAborted();

      return result;
    } finally {
      stopHeartbeat();

      try {
        await releaseWhatsAppMessageProcessingClaim(
          claim
        );
      } catch (_err) {
        // Token ownership + TTL guarantee that a failed final
        // release cannot delete a claim currently owned by
        // another process.
      }
    }
  };
