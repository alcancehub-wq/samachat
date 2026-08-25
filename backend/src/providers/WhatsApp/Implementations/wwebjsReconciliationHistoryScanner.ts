export interface WWebJsHistoryScannerMessage {
  id?: {
    id?: string;
    _serialized?: string;
  };

  timestamp?: number;

  _data?: {
    id?: {
      id?: string;
      _serialized?: string;
    };
  };
}

export type WWebJsHistoryScanStopReason =
  | "known-message"
  | "history-exhausted";

export interface WWebJsHistoryScanResult<TMessage> {
  messages: TMessage[];
  upperAnchorId: string;
  stopReason: WWebJsHistoryScanStopReason;
  knownBoundaryId?: string;
  requestedLimit: number;
  fetchedCount: number;
  temporalBoundaryApplied: boolean;
}

interface Request<TMessage extends WWebJsHistoryScannerMessage> {
  upperAnchorId: string;

  lowerBoundAt: Date;

  fetchMessages: (
    limit: number
  ) => Promise<TMessage[]>;

  resolveMessageId: (
    message: TMessage
  ) => string;

  resolveRawMessageTimestamp: (
    message: TMessage
  ) => number;

  isKnownMessage: (
    messageId: string
  ) => Promise<boolean>;

  findKnownMessageIds?: (
    messageIds: string[]
  ) => Promise<Set<string>>;

  initialLimit?: number;
  growthFactor?: number;
  maxLimit?: number;
}

const normalizePositiveInteger = (
  value: number | undefined,
  fallback: number,
  errorCode: string
): number => {
  const resolved =
    value === undefined ? fallback : value;

  if (
    !Number.isInteger(resolved) ||
    resolved <= 0
  ) {
    throw new Error(errorCode);
  }

  return resolved;
};

const assertValidLowerBound = (
  lowerBoundAt: Date
): void => {
  if (
    !(lowerBoundAt instanceof Date) ||
    Number.isNaN(lowerBoundAt.getTime())
  ) {
    throw new Error(
      "ERR_INVALID_RECONCILIATION_LOWER_BOUND"
    );
  }
};

const assertValidRawTimestamp = (
  timestamp: number
): void => {
  if (
    !Number.isFinite(timestamp) ||
    !Number.isInteger(timestamp) ||
    timestamp <= 0
  ) {
    throw new Error(
      "ERR_INVALID_RECONCILIATION_RAW_TIMESTAMP"
    );
  }
};

const ScanWWebJsReconciliationHistory = async <
  TMessage extends WWebJsHistoryScannerMessage
>({
  upperAnchorId,
  lowerBoundAt,
  fetchMessages,
  resolveMessageId,
  resolveRawMessageTimestamp,
  isKnownMessage,
  findKnownMessageIds,
  initialLimit,
  growthFactor,
  maxLimit
}: Request<TMessage>): Promise<
  WWebJsHistoryScanResult<TMessage>
> => {
  const normalizedUpperAnchorId =
    typeof upperAnchorId === "string"
      ? upperAnchorId.trim()
      : "";

  if (!normalizedUpperAnchorId) {
    throw new Error(
      "ERR_INVALID_RECONCILIATION_UPPER_ANCHOR"
    );
  }

  assertValidLowerBound(lowerBoundAt);

  /*
   * WWebJS Message.timestamp has second precision.
   *
   * Floor the durable Date boundary to the provider second.
   * This intentionally prefers a bounded overlap of less than
   * one second over losing a message created during the same
   * second as the cutover/checkpoint.
   */
  const lowerBoundUnixSeconds =
    Math.floor(lowerBoundAt.getTime() / 1000);

  const resolvedInitialLimit =
    normalizePositiveInteger(
      initialLimit,
      50,
      "ERR_INVALID_RECONCILIATION_INITIAL_LIMIT"
    );

  const resolvedGrowthFactor =
    normalizePositiveInteger(
      growthFactor,
      2,
      "ERR_INVALID_RECONCILIATION_GROWTH_FACTOR"
    );

  if (resolvedGrowthFactor < 2) {
    throw new Error(
      "ERR_INVALID_RECONCILIATION_GROWTH_FACTOR"
    );
  }

  const resolvedMaxLimit =
    normalizePositiveInteger(
      maxLimit,
      5000,
      "ERR_INVALID_RECONCILIATION_MAX_LIMIT"
    );

  if (resolvedMaxLimit < resolvedInitialLimit) {
    throw new Error(
      "ERR_INVALID_RECONCILIATION_MAX_LIMIT"
    );
  }

  let requestedLimit = resolvedInitialLimit;
  let previousFetchedCount = -1;
  const checkedMessageIds = new Set<string>();
  const knownMessageIds = new Set<string>();

  while (true) {
    const fetched =
      await fetchMessages(requestedLimit);

    if (!Array.isArray(fetched)) {
      throw new Error(
        "ERR_INVALID_RECONCILIATION_HISTORY_RESULT"
      );
    }

    const resolved = fetched.map(message => ({
      message,
      id: resolveMessageId(message)
    }));

    if (
      resolved.some(
        item =>
          typeof item.id !== "string" ||
          !item.id.trim()
      )
    ) {
      throw new Error(
        "ERR_INVALID_WHATSAPP_MESSAGE_ID"
      );
    }

    const upperAnchorIndex =
      resolved.findIndex(
        item =>
          item.id === normalizedUpperAnchorId
      );

    if (upperAnchorIndex === -1) {
      if (fetched.length < requestedLimit || requestedLimit >= resolvedMaxLimit) {
        throw new Error("ERR_RECONCILIATION_UPPER_ANCHOR_NOT_FOUND");
      }
      previousFetchedCount = fetched.length;
      requestedLimit = Math.min(requestedLimit * resolvedGrowthFactor, resolvedMaxLimit);
      continue;
    }

    /*
     * fetchMessages is earliest -> latest.
     *
     * Anything after the captured upper anchor may have arrived
     * while reconciliation was already scanning and must remain
     * eligible for a later run.
     */
    const bounded =
      resolved.slice(0, upperAnchorIndex + 1);

    let knownBoundaryIndex = -1;

    const candidateIdsToCheck =
      bounded
        .map(item => item.id)
        .filter(
          candidateId =>
            candidateId !== normalizedUpperAnchorId &&
            !checkedMessageIds.has(candidateId)
        );

    if (candidateIdsToCheck.length > 0) {
      if (findKnownMessageIds) {
        const resolvedKnownIds =
          await findKnownMessageIds(
            candidateIdsToCheck
          );

        for (const candidateId of candidateIdsToCheck) {
          checkedMessageIds.add(candidateId);
        }

        for (const knownId of resolvedKnownIds) {
          if (
            candidateIdsToCheck.includes(knownId)
          ) {
            knownMessageIds.add(knownId);
          }
        }
      } else {
        for (const candidateId of candidateIdsToCheck) {
          if (await isKnownMessage(candidateId)) {
            knownMessageIds.add(candidateId);
          }

          checkedMessageIds.add(candidateId);
        }
      }
    }

    for (
      let index = bounded.length - 1;
      index >= 0;
      index -= 1
    ) {
      if (
        knownMessageIds.has(
          bounded[index].id
        )
      ) {
        knownBoundaryIndex = index;
        break;
      }
    }

    if (knownBoundaryIndex >= 0) {
      /*
       * Durable Message.id continuity has precedence over the
       * temporal cutover. This safely allows recovery of older
       * messages when the SamaChat already owns a real boundary
       * for this conversation.
       *
       * Raw timestamps are intentionally NOT required here.
       */
      const unseenMessages =
        bounded
          .slice(knownBoundaryIndex + 1)
          .map(item => item.message);

      return {
        messages: unseenMessages,
        upperAnchorId:
          normalizedUpperAnchorId,
        stopReason: "known-message",
        knownBoundaryId:
          bounded[knownBoundaryIndex].id,
        requestedLimit,
        fetchedCount: fetched.length,
        temporalBoundaryApplied: false
      };
    }

    const historyExhaustedByShortPage =
      fetched.length < requestedLimit;

    const historyExhaustedByNoGrowth =
      previousFetchedCount >= 0 &&
      fetched.length <= previousFetchedCount;

    if (
      historyExhaustedByShortPage ||
      historyExhaustedByNoGrowth
    ) {
      /*
       * No durable Message.id was found.
       *
       * Only now may the temporal boundary decide eligibility.
       * The timestamp MUST come directly from the raw WWebJS
       * Message object. No local Date.now fallback is permitted.
       */
      const temporallyEligible =
        bounded.filter(item => {
          const rawTimestamp =
            resolveRawMessageTimestamp(
              item.message
            );

          assertValidRawTimestamp(
            rawTimestamp
          );

          return (
            rawTimestamp >=
            lowerBoundUnixSeconds
          );
        });

      return {
        messages: temporallyEligible.map(
          item => item.message
        ),
        upperAnchorId:
          normalizedUpperAnchorId,
        stopReason: "history-exhausted",
        requestedLimit,
        fetchedCount: fetched.length,
        temporalBoundaryApplied: true
      };
    }

    if (requestedLimit >= resolvedMaxLimit) {
      throw new Error(
        "ERR_RECONCILIATION_HISTORY_LIMIT_REACHED"
      );
    }

    previousFetchedCount = fetched.length;

    requestedLimit = Math.min(
      requestedLimit * resolvedGrowthFactor,
      resolvedMaxLimit
    );
  }
};

export default ScanWWebJsReconciliationHistory;