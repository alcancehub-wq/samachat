import CollectWWebJsRawReconciliationHistory from "../wwebjsReconciliationRawCollector";

interface FakeMessage {
  id: {
    id: string;
  };
  timestamp?: number;
}

const unix = (iso: string): number =>
  Math.floor(
    new Date(iso).getTime() / 1000
  );

const msg = (
  id: string,
  timestamp?: number
): FakeMessage => ({
  id: { id },
  timestamp
});

const resolveMessageId = (
  message: FakeMessage
): string => message.id.id;

describe(
  "wwebjsReconciliationRawCollector",
  () => {
    it(
      "captures chat.lastMessage as immutable upper anchor before fetching history",
      async () => {
        const originalAnchor = msg(
          "anchor-original",
          unix(
            "2026-08-13T20:10:00.000Z"
          )
        );

        const arrivedLater = msg(
          "arrived-later",
          unix(
            "2026-08-13T20:11:00.000Z"
          )
        );

        const chat: any = {
          lastMessage: originalAnchor
        };

        chat.fetchMessages =
          jest.fn(async () => {
            /*
             * Simulates a new realtime arrival while the
             * historical fetch is running.
             */
            chat.lastMessage = arrivedLater;

            return [
              msg(
                "known",
                unix(
                  "2026-08-13T20:00:00.000Z"
                )
              ),
              msg(
                "new",
                unix(
                  "2026-08-13T20:05:00.000Z"
                )
              ),
              originalAnchor,
              arrivedLater
            ];
          });

        const result =
          await CollectWWebJsRawReconciliationHistory({
            chat,
            lowerBoundAt:
              new Date(
                "2026-08-13T19:00:00.000Z"
              ),
            resolveMessageId,
            isKnownMessage: async id =>
              id === "known",
            initialLimit: 10,
            maxLimit: 100
          });

        expect(result.upperAnchorId)
          .toBe("anchor-original");

        expect(
          result.scan.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "new",
          "anchor-original"
        ]);

        expect(
          result.scan.messages.map(
            item => item.id.id
          )
        ).not.toContain("arrived-later");
      }
    );

    it(
      "delegates progressive fetch using raw chat.fetchMessages",
      async () => {
        const anchor = msg(
          "anchor",
          unix(
            "2026-08-13T20:20:00.000Z"
          )
        );

        const fetchMessages =
          jest.fn(
            async ({
              limit
            }: {
              limit: number;
            }) => {
              if (limit === 2) {
                return [
                  msg(
                    "new",
                    unix(
                      "2026-08-13T20:10:00.000Z"
                    )
                  ),
                  anchor
                ];
              }

              return [
                msg(
                  "known",
                  unix(
                    "2026-08-13T20:00:00.000Z"
                  )
                ),
                msg(
                  "new",
                  unix(
                    "2026-08-13T20:10:00.000Z"
                  )
                ),
                anchor
              ];
            }
          );

        const result =
          await CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: anchor,
              fetchMessages
            },
            lowerBoundAt:
              new Date(
                "2026-08-13T19:00:00.000Z"
              ),
            resolveMessageId,
            isKnownMessage: async id =>
              id === "known",
            initialLimit: 2,
            growthFactor: 2,
            maxLimit: 8
          });

        expect(fetchMessages)
          .toHaveBeenNthCalledWith(
            1,
            { limit: 2 }
          );

        expect(fetchMessages)
          .toHaveBeenNthCalledWith(
            2,
            { limit: 4 }
          );

        expect(result.scan.stopReason)
          .toBe("known-message");

        expect(result.scan.knownBoundaryId)
          .toBe("known");
      }
    );

    it(
      "preserves raw timestamp semantics for temporal bootstrap",
      async () => {
        const anchor = msg(
          "anchor",
          unix(
            "2026-08-13T20:10:00.000Z"
          )
        );

        const result =
          await CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: anchor,

              fetchMessages: async () => [
                msg(
                  "old",
                  unix(
                    "2026-08-13T19:59:59.000Z"
                  )
                ),
                msg(
                  "eligible",
                  unix(
                    "2026-08-13T20:00:00.000Z"
                  )
                ),
                anchor
              ]
            },
            lowerBoundAt:
              new Date(
                "2026-08-13T20:00:00.000Z"
              ),
            resolveMessageId,
            isKnownMessage: async () =>
              false,
            initialLimit: 10,
            maxLimit: 100
          });

        expect(
          result.scan.temporalBoundaryApplied
        ).toBe(true);

        expect(
          result.scan.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "eligible",
          "anchor"
        ]);
      }
    );

    it(
      "fails closed when temporal collection needs an invalid raw timestamp",
      async () => {
        const anchor = msg(
          "anchor",
          unix(
            "2026-08-13T20:10:00.000Z"
          )
        );

        await expect(
          CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: anchor,

              fetchMessages: async () => [
                msg("invalid"),
                anchor
              ]
            },
            lowerBoundAt:
              new Date(
                "2026-08-13T20:00:00.000Z"
              ),
            resolveMessageId,
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
      "does not require raw timestamps when a durable Message.id boundary exists",
      async () => {
        const anchor = msg("anchor");

        const result =
          await CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: anchor,

              fetchMessages: async () => [
                msg("known"),
                msg("new"),
                anchor
              ]
            },
            lowerBoundAt:
              new Date(
                "2026-08-13T23:00:00.000Z"
              ),
            resolveMessageId,
            isKnownMessage: async id =>
              id === "known",
            initialLimit: 10,
            maxLimit: 100
          });

        expect(result.scan.stopReason)
          .toBe("known-message");

        expect(
          result.scan.temporalBoundaryApplied
        ).toBe(false);

        expect(
          result.scan.messages.map(
            item => item.id.id
          )
        ).toEqual([
          "new",
          "anchor"
        ]);
      }
    );

    it(
      "fails closed when chat has no upper anchor",
      async () => {
        const fetchMessages = jest.fn();

        await expect(
          CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: null,
              fetchMessages
            },
            lowerBoundAt:
              new Date(
                "2026-08-13T20:00:00.000Z"
              ),
            resolveMessageId,
            isKnownMessage: async () =>
              false
          })
        ).rejects.toThrow(
          "ERR_RECONCILIATION_CHAT_WITHOUT_UPPER_ANCHOR"
        );

        expect(fetchMessages)
          .not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when upper anchor has no canonical identity",
      async () => {
        const fetchMessages = jest.fn();

        await expect(
          CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: msg(""),
              fetchMessages
            },
            lowerBoundAt:
              new Date(
                "2026-08-13T20:00:00.000Z"
              ),
            resolveMessageId,
            isKnownMessage: async () =>
              false
          })
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_MESSAGE_ID"
        );

        expect(fetchMessages)
          .not.toHaveBeenCalled();
      }
    );
  }
);