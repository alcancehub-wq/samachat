import createWWebJsReconciliationAdapter from "../wwebjsReconciliationAdapter";

describe(
  "wwebjs reconciliation invalid contact isolation",
  () => {
    it(
      "skips provider contact without phone or LID instead of aborting collection",
      async () => {
        const saveCheckpoint = jest.fn();

        const adapter =
          createWWebJsReconciliationAdapter({
            whatsappId: 38,

            session: {
              getChats: jest
                .fn()
                .mockResolvedValue([]),

              getContacts: jest
                .fn()
                .mockResolvedValue([
                  {
                    id: {},
                    name: "Sem identidade",
                    isGroup: false
                  }
                ])
            },

            resolveMessageId: () =>
              "provider-message-id",

            shouldHandleMessage: () =>
              true,

            resolveMessageMetadata:
              jest.fn(),

            processNewMessage:
              jest.fn(),

            captureBoundaryAt: () =>
              new Date(
                "2026-08-20T17:00:00.000Z"
              ),

            services: {
              getCheckpoint:
                jest
                  .fn()
                  .mockResolvedValue(null),

              saveCheckpoint,

              classifyMessage:
                jest
                  .fn()
                  .mockResolvedValue("new")
            }
          });

        const signal = {
          throwIfAborted:
            jest.fn()
        };

        await expect(
          adapter.collectWork(
            signal as any
          )
        ).resolves.toEqual({
          messages: [],
          contacts: []
        });

        expect(
          saveCheckpoint
        ).not.toHaveBeenCalled();
      }
    );
  }
);
