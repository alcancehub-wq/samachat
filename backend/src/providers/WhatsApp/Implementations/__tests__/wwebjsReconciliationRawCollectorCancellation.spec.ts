import CollectWWebJsRawReconciliationHistory from "../wwebjsReconciliationRawCollector";

describe(
  "wwebjsReconciliationRawCollector cancellation",
  () => {
    const upperMessage = {
      id: {
        id: "upper-message"
      },
      timestamp: 1000
    };

    const resolveMessageId = (
      message: any
    ): string =>
      message.id.id;

    it(
      "stops before provider fetch when already cancelled",
      async () => {
        const error =
          new Error("ownership lost");

        const fetchMessages =
          jest.fn(async () => [
            upperMessage
          ]);

        const signal = {
          aborted: true,

          throwIfAborted:
            jest.fn(() => {
              throw error;
            })
        };

        await expect(
          CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: upperMessage,
              fetchMessages
            },

            lowerBoundAt:
              new Date(0),

            resolveMessageId,

            isKnownMessage:
              async () => false,

            signal: signal as any
          })
        ).rejects.toBe(error);

        expect(
          fetchMessages
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "stops immediately after provider fetch if ownership is lost",
      async () => {
        const error =
          new Error(
            "ownership lost during fetch"
          );

        let cancelled = false;

        const fetchMessages =
          jest.fn(async () => {
            cancelled = true;

            return [
              upperMessage
            ];
          });

        const signal = {
          aborted: false,

          throwIfAborted:
            jest.fn(() => {
              if (cancelled) {
                throw error;
              }
            })
        };

        await expect(
          CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: upperMessage,
              fetchMessages
            },

            lowerBoundAt:
              new Date(0),

            resolveMessageId,

            isKnownMessage:
              async () => false,

            signal: signal as any
          })
        ).rejects.toBe(error);

        expect(
          fetchMessages
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "remains backward compatible without a signal",
      async () => {
        const fetchMessages =
          jest.fn(async () => [
            upperMessage
          ]);

        const result =
          await CollectWWebJsRawReconciliationHistory({
            chat: {
              lastMessage: upperMessage,
              fetchMessages
            },

            lowerBoundAt:
              new Date(1000 * 1000),

            resolveMessageId,

            isKnownMessage:
              async () => false
          });

        expect(
          result.upperAnchorId
        ).toBe("upper-message");

        expect(
          fetchMessages
        ).toHaveBeenCalled();
      }
    );
  }
);