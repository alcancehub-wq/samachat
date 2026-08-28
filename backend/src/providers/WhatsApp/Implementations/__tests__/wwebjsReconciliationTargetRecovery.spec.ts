import createWWebJsReconciliationAdapter from "../wwebjsReconciliationAdapter";
import BuildWWebJsTargetRecoveryContact from "../wwebjsReconciliationTargetRecovery";

const signal = {
  aborted: false,
  throwIfAborted:
    jest.fn()
};

describe(
  "wwebjs targeted recovery contract",
  () => {
    it(
      "recovers history when targeted chat exists without lastMessage envelope",
      async () => {
        const message: any = {
          id: {
            id: "fernanda-history-1"
          },
          timestamp: 1700000000,
          type: "chat",
          body: "historico",
          from:
            "5551982438188@c.us",
          to:
            "5511999999999@c.us",
          fromMe: false
        };

        const fetchMessages =
          jest.fn(
            async () => [message]
          );

        const adapter =
          createWWebJsReconciliationAdapter({
            whatsappId: 38,

            targetChatIds: [
              "5551982438188@c.us"
            ],

            session: {
              getChats:
                async () => [
                  {
                    id: {
                      _serialized:
                        "5551982438188@c.us"
                    },
                    lastMessage: null,
                    fetchMessages
                  }
                ],

              getContactById:
                async () => null
            } as any,

            captureBoundaryAt:
              () =>
                new Date(
                  1700001000 * 1000
                ),

            resolveMessageId:
              item =>
                (item as any).id.id,

            shouldHandleMessage:
              () => true,

            resolveMessageMetadata:
              async () => ({
                number:
                  "5551982438188",
                isGroup: false
              }),

            processNewMessage:
              async () => undefined,

            services: {
              getCheckpoint:
                async () => null,

              saveCheckpoint:
                async () => undefined,

              classifyMessage:
                async () =>
                  "new" as const,

              classifyMessages:
                async () =>
                  new Set<string>(),

              resolveBoundary:
                ({ capturedBoundaryAt }) => ({
                  mode:
                    "recovery" as const,
                  lowerBoundAt:
                    new Date(1),
                  checkpointCandidateAt:
                    capturedBoundaryAt
                })
            }
          });

        const work =
          await adapter.collectWork(
            signal as any
          );

        expect(fetchMessages)
          .toHaveBeenCalled();

        expect(work.messages)
          .toHaveLength(1);

        expect(
          work.messages?.[0].messageId
        ).toBe(
          "fernanda-history-1"
        );
      }
    );

    it(
      "converts provider LID evidence into explicit contact reconciliation work",
      () => {
        expect(
          BuildWWebJsTargetRecoveryContact({
            number:
              "5551982438188",
            storedLid: null,
            providerAliases: [
              "5551982438188@c.us",
              "123456789012345@lid"
            ],
            profilePicUrl:
              "https://example.invalid/photo.jpg"
          })
        ).toEqual({
          metadata: {
            name:
              "5551982438188",
            number:
              "5551982438188",
            lid:
              "123456789012345@lid",
            profilePicUrl:
              "https://example.invalid/photo.jpg",
            isGroup: false
          }
        });
      }
    );

    it(
      "does not manufacture provider contact work without provider evidence",
      () => {
        expect(
          BuildWWebJsTargetRecoveryContact({
            number:
              "5551982438188",
            storedLid: null,
            providerAliases: []
          })
        ).toBeNull();
      }
    );
  }
);
