import ScanWWebJsReconciliationHistory from "../wwebjsReconciliationHistoryScanner";

interface FakeMessage {
  id: {
    id: string;
  };
  timestamp: number;
}

const unix = (iso: string): number =>
  Math.floor(
    new Date(iso).getTime() / 1000
  );

const msg = (
  id: string,
  timestamp = unix(
    "2026-08-13T21:00:00.000Z"
  )
): FakeMessage => ({
  id: { id },
  timestamp
});

const resolveMessageId = (
  message: FakeMessage
): string => message.id.id;

const resolveRawMessageTimestamp = (
  message: FakeMessage
): number => message.timestamp;

const defaultLowerBound =
  new Date("2026-08-13T20:00:00.000Z");

describe(
  "wwebjsReconciliationHistoryScanner",
  () => {
    it(
      "stops at the nearest durable known message and returns only newer messages",
      async () => {
        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              new Date(
                "2026-08-13T17:00:00.000Z"
              ),
            fetchMessages: async () => [
              msg(
                "known-1",
                unix(
                  "2026-08-13T18:00:00.000Z"
                )
              ),
              msg(
                "new-1",
                unix(
                  "2026-08-13T18:01:00.000Z"
                )
              ),
              msg(
                "new-2",
                unix(
                  "2026-08-13T18:02:00.000Z"
                )
              ),
              msg(
                "anchor",
                unix(
                  "2026-08-13T18:03:00.000Z"
                )
              )
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async id =>
              id === "known-1",
            initialLimit: 10,
            maxLimit: 100
          });

        expect(result.stopReason)
          .toBe("known-message");

        expect(
          result.temporalBoundaryApplied
        ).toBe(false);

        expect(result.knownBoundaryId)
          .toBe("known-1");

        expect(
          result.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "new-1",
          "new-2",
          "anchor"
        ]);
      }
    );

    it(
      "resolves durable continuity in one batch per fetched page",
      async () => {
        const findKnownMessageIds =
          jest.fn(
            async (messageIds: string[]) =>
              new Set(
                messageIds.filter(
                  id => id === "known-1"
                )
              )
          );

        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages: async () => [
              msg("known-1"),
              msg("new-1"),
              msg("anchor")
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () => {
              throw new Error(
                "scalar resolver must not run when batch resolver exists"
              );
            },
            findKnownMessageIds,
            initialLimit: 10,
            maxLimit: 100
          });

        expect(findKnownMessageIds)
          .toHaveBeenCalledTimes(1);

        expect(findKnownMessageIds)
          .toHaveBeenCalledWith([
            "known-1",
            "new-1"
          ]);

        expect(result.knownBoundaryId)
          .toBe("known-1");
      }
    );
    it(
      "uses durable Message.id continuity when the known boundary is inside the temporal window",
      async () => {
        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              new Date(
                "2026-08-13T17:00:00.000Z"
              ),
            fetchMessages: async () => [
              msg(
                "known-1",
                unix(
                  "2026-08-13T18:00:00.000Z"
                )
              ),
              msg(
                "new-1",
                unix(
                  "2026-08-13T18:01:00.000Z"
                )
              ),
              msg(
                "anchor",
                unix(
                  "2026-08-13T18:02:00.000Z"
                )
              )
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async id =>
              id === "known-1",
            initialLimit: 10,
            maxLimit: 100
          });

        expect(result.stopReason)
          .toBe("known-message");

        expect(
          result.temporalBoundaryApplied
        ).toBe(false);

        expect(
          result.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "new-1",
          "anchor"
        ]);
      }
    );
    it(
      "ignores messages newer than the captured upper anchor",
      async () => {
        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages: async () => [
              msg("known-1"),
              msg("new-1"),
              msg("anchor"),
              msg("arrived-during-scan-1"),
              msg("arrived-during-scan-2")
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async id =>
              id === "known-1",
            initialLimit: 10,
            maxLimit: 100
          });

        expect(
          result.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "new-1",
          "anchor"
        ]);
      }
    );

    it(
      "grows history progressively until a durable boundary is found",
      async () => {
        const fetchMessages = jest.fn(
          async (limit: number) => {
            if (limit === 2) {
              return [
                msg("new-2"),
                msg("anchor")
              ];
            }

            return [
              msg("known-1"),
              msg("new-1"),
              msg("new-2"),
              msg("anchor")
            ];
          }
        );

        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages,
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async id =>
              id === "known-1",
            initialLimit: 2,
            growthFactor: 2,
            maxLimit: 16
          });

        expect(fetchMessages)
          .toHaveBeenNthCalledWith(1, 2);

        expect(fetchMessages)
          .toHaveBeenNthCalledWith(2, 4);

        expect(result.stopReason)
          .toBe("known-message");
      }
    );


    it(
      "stops growing as soon as the temporal floor is reached",
      async () => {
        const fetchMessages =
          jest.fn(
            async (limit: number) => {
              if (limit === 2) {
                return [
                  msg(
                    "new-2",
                    unix(
                      "2026-08-13T20:10:00.000Z"
                    )
                  ),
                  msg(
                    "anchor",
                    unix(
                      "2026-08-13T20:20:00.000Z"
                    )
                  )
                ];
              }

              return [
                msg(
                  "too-old",
                  unix(
                    "2026-08-13T19:00:00.000Z"
                  )
                ),
                msg(
                  "new-1",
                  unix(
                    "2026-08-13T20:00:00.000Z"
                  )
                ),
                msg(
                  "new-2",
                  unix(
                    "2026-08-13T20:10:00.000Z"
                  )
                ),
                msg(
                  "anchor",
                  unix(
                    "2026-08-13T20:20:00.000Z"
                  )
                )
              ];
            }
          );

        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              new Date(
                "2026-08-13T20:00:00.000Z"
              ),
            fetchMessages,
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage:
              async () => false,
            findKnownMessageIds:
              async () =>
                new Set<string>(),
            initialLimit: 2,
            growthFactor: 2,
            maxLimit: 5000
          });

        expect(fetchMessages)
          .toHaveBeenCalledTimes(2);

        expect(result.stopReason)
          .toBe("time-window");

        expect(
          result.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "new-1",
          "new-2",
          "anchor"
        ]);
      }
    );
    it(
      "stops at lowerBoundAt once the temporal window is reached without a durable known message",
      async () => {
        const lowerBoundAt =
          new Date(
            "2026-08-13T20:00:00.000Z"
          );

        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt,
            fetchMessages: async () => [
              msg(
                "old-1",
                unix(
                  "2026-08-13T19:00:00.000Z"
                )
              ),
              msg(
                "old-2",
                unix(
                  "2026-08-13T19:59:59.000Z"
                )
              ),
              msg(
                "eligible-1",
                unix(
                  "2026-08-13T20:00:00.000Z"
                )
              ),
              msg(
                "eligible-2",
                unix(
                  "2026-08-13T20:10:00.000Z"
                )
              ),
              msg(
                "anchor",
                unix(
                  "2026-08-13T20:20:00.000Z"
                )
              )
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false,
            initialLimit: 10,
            maxLimit: 100
          });

        expect(result.stopReason)
          .toBe("time-window");

        expect(
          result.temporalBoundaryApplied
        ).toBe(true);

        expect(
          result.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "eligible-1",
          "eligible-2",
          "anchor"
        ]);
      }
    );

    it(
      "floors a millisecond boundary to provider-second precision to avoid same-second loss",
      async () => {
        const result =
          await ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              new Date(
                "2026-08-13T20:00:00.900Z"
              ),
            fetchMessages: async () => [
              msg(
                "same-second",
                unix(
                  "2026-08-13T20:00:00.000Z"
                )
              ),
              msg(
                "anchor",
                unix(
                  "2026-08-13T20:00:01.000Z"
                )
              )
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false,
            initialLimit: 10,
            maxLimit: 100
          });

        expect(
          result.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "same-second",
          "anchor"
        ]);
      }
    );

    it(
      "fails closed on an invalid raw timestamp when temporal eligibility is required",
      async () => {
        await expect(
          ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages: async () => [
              msg(
                "unknown",
                Number.NaN
              ),
              msg("anchor")
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false,
            initialLimit: 10,
            maxLimit: 100
          })
        ).rejects.toThrow(
          "ERR_INVALID_RECONCILIATION_RAW_TIMESTAMP"
        );
      }
    );

    it.each([
      0,
      -1,
      Number.POSITIVE_INFINITY,
      1.5
    ])(
      "rejects invalid raw provider timestamp %p on temporal path",
      async invalidTimestamp => {
        await expect(
          ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages: async () => [
              msg(
                "unknown",
                invalidTimestamp
              ),
              msg("anchor")
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false,
            initialLimit: 10,
            maxLimit: 100
          })
        ).rejects.toThrow(
          "ERR_INVALID_RECONCILIATION_RAW_TIMESTAMP"
        );
      }
    );

    it(
      "fails closed when the captured upper anchor disappears",
      async () => {
        await expect(
          ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages: async () => [
              msg("other-1"),
              msg("other-2")
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false
          })
        ).rejects.toThrow(
          "ERR_RECONCILIATION_UPPER_ANCHOR_NOT_FOUND"
        );
      }
    );

    it(
      "fails closed when the configured safety limit is reached without continuity",
      async () => {
        const fetchMessages = jest.fn(
          async (limit: number) => {
            if (limit === 2) {
              return [
                msg("new-1"),
                msg("anchor")
              ];
            }

            return [
              msg("new-3"),
              msg("new-2"),
              msg("new-1"),
              msg("anchor")
            ];
          }
        );

        await expect(
          ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages,
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false,
            initialLimit: 2,
            growthFactor: 2,
            maxLimit: 4
          })
        ).rejects.toThrow(
          "ERR_RECONCILIATION_HISTORY_LIMIT_REACHED"
        );
      }
    );

    it(
      "rejects an invalid upper anchor before fetching history",
      async () => {
        const fetchMessages = jest.fn();

        await expect(
          ScanWWebJsReconciliationHistory({
            upperAnchorId: " ",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages,
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false
          })
        ).rejects.toThrow(
          "ERR_INVALID_RECONCILIATION_UPPER_ANCHOR"
        );

        expect(fetchMessages)
          .not.toHaveBeenCalled();
      }
    );

    it(
      "rejects an invalid temporal lower bound before fetching history",
      async () => {
        const fetchMessages = jest.fn();

        await expect(
          ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              new Date("invalid"),
            fetchMessages,
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false
          })
        ).rejects.toThrow(
          "ERR_INVALID_RECONCILIATION_LOWER_BOUND"
        );

        expect(fetchMessages)
          .not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a provider message without canonical identity",
      async () => {
        await expect(
          ScanWWebJsReconciliationHistory({
            upperAnchorId: "anchor",
            lowerBoundAt:
              defaultLowerBound,
            fetchMessages: async () => [
              msg(""),
              msg("anchor")
            ],
            resolveMessageId,
            resolveRawMessageTimestamp,
            isKnownMessage: async () =>
              false
          })
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_MESSAGE_ID"
        );
      }
    );
  }
);