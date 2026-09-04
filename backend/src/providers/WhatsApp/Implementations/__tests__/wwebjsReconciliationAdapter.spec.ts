import createWWebJsReconciliationAdapter, {
  getWWebJsReconciliationContactIdentityKey,
  isEligibleWWebJsReconciliationChat,
  resolveWWebJsReconciliationChatId
} from "../wwebjsReconciliationAdapter";

const makeSignal = () => ({
  aborted: false,
  throwIfAborted: jest.fn()
});

describe(
  "wwebjsReconciliationAdapter",
  () => {
    it(
      "maps serialized chat identity without inventing archive or mute filtering",
      () => {
        const chat: any = {
          id: {
            _serialized:
              "5511999999999@c.us"
          },
          lastMessage: {
            id: {
              id: "m1"
            },
            timestamp: 1000
          }
        };

        expect(
          resolveWWebJsReconciliationChatId(
            chat
          )
        ).toBe(
          "5511999999999@c.us"
        );

        expect(
          isEligibleWWebJsReconciliationChat(
            chat,
            "5511999999999@c.us"
          )
        ).toBe(true);

        expect(
          isEligibleWWebJsReconciliationChat(
            {
              ...chat,
              archived: true,
              isMuted: true,
              isReadOnly: true
            } as any,
            "5511999999999@c.us"
          )
        ).toBe(true);
      }
    );

    it(
      "rejects status broadcast and chats without an upper message anchor",
      () => {
        const withMessage: any = {
          lastMessage: {
            id: {
              id: "m1"
            },
            timestamp: 1000
          }
        };

        expect(
          isEligibleWWebJsReconciliationChat(
            withMessage,
            "status@broadcast"
          )
        ).toBe(false);

        expect(
          isEligibleWWebJsReconciliationChat(
            {
              id: {
                _serialized:
                  "5511999999999@c.us"
              },
              lastMessage: null
            } as any,
            "5511999999999@c.us"
          )
        ).toBe(false);
      }
    );

    it(
      "derives contact dedupe identity from normalized number and lid metadata",
      () => {
        expect(
          getWWebJsReconciliationContactIdentityKey({
            metadata: {
              name: "Contato",
              number:
                " 5511999999999 ",
              lid: " abc@lid ",
              isGroup: false
            }
          })
        ).toBe(
          "number:5511999999999|lid:abc@lid"
        );
      }
    );

    it(
      "collects global contacts independently of bounded chat history",
      async () => {
        const rawMessage: any = {
          id: {
            id: "message-1"
          },
          timestamp: 1000,
          type: "chat",
          body: "teste",
          from:
            "5511999999999@c.us",
          to:
            "5511888888888@c.us",
          fromMe: false
        };

        const chat: any = {
          id: {
            _serialized:
              "5511999999999@c.us"
          },
          lastMessage:
            rawMessage,
          fetchMessages:
            jest.fn(
              async () => [
                rawMessage
              ]
            )
        };

        const contact: any = {
          id: {
            user:
              "5511999999999",
            _serialized:
              "5511999999999@c.us"
          },
          name: "Contato",
          pushname: "Contato",
          isGroup: false
        };

        const session = {
          getChats:
            jest.fn(
              async () => [
                chat
              ]
            ),

          getContacts:
            jest.fn(
              async () => [
                contact
              ]
            )
        };

        const processNewMessage =
          jest.fn(
            async () => undefined
          );

        const saveCheckpoint =
          jest.fn(
            async () => undefined
          );

        const capturedBoundaryAt =
          new Date(
            2000 * 1000
          );

        const orchestrator =
          createWWebJsReconciliationAdapter({
            whatsappId: 101,
            session,

            captureBoundaryAt:
              () =>
                capturedBoundaryAt,

            resolveMessageId:
              message => {
                const messageId =
                  message.id?.id;

                if (!messageId) {
                  throw new Error(
                    "missing message id"
                  );
                }

                return messageId;
              },

            shouldHandleMessage:
              () => true,

            resolveMessageMetadata:
              async () => ({
                name: "Contato",
                number:
                  "5511999999999",
                isGroup: false
              }),

            processNewMessage,

            services: {
              getCheckpoint:
                async () =>
                  new Date(0),

              saveCheckpoint,

              classifyMessage:
                async () =>
                  "new"
            }
          });

        const signal =
          makeSignal();

        const work =
          await orchestrator.collectWork(
            signal as any
          );

        expect(
          session.getChats
        ).toHaveBeenCalledTimes(1);

        expect(
          session.getContacts
        ).toHaveBeenCalledTimes(1);

        expect(
          chat.fetchMessages
        ).toHaveBeenCalled();

        expect(
          work.messages
        ).toHaveLength(1);

        expect(
          work.contacts
        ).toHaveLength(1);

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();

        await work.messages![0]
          .processNewMessage();

        expect(
          processNewMessage
        ).toHaveBeenCalledTimes(1);

        expect(
          saveCheckpoint
        ).not.toHaveBeenCalled();

        await orchestrator.finalizeWork(
          signal as any
        );

        expect(
          saveCheckpoint
        ).toHaveBeenCalledTimes(1);

        expect(
          saveCheckpoint
        ).toHaveBeenCalledWith(
          101,
          capturedBoundaryAt
        );
      }
    );


    it(
      "skips provider history fetch when the chat upper anchor predates the bounded window",
      async () => {
        const oldMessage: any = {
          id: {
            id: "old-message"
          },
          timestamp:
            Math.floor(
              new Date(
                "2026-08-01T12:00:00.000Z"
              ).getTime() / 1000
            ),
          type: "chat",
          body: "old"
        };

        const fetchMessages =
          jest.fn(
            async () => [
              oldMessage
            ]
          );

        const getContacts =
          jest.fn(
            async () => []
          );

        const orchestrator =
          createWWebJsReconciliationAdapter({
            whatsappId: 101,

            session: {
              getChats:
                async () => [
                  {
                    id: {
                      _serialized:
                        "5511999999999@c.us"
                    },
                    lastMessage:
                      oldMessage,
                    fetchMessages
                  }
                ],

              getContacts
            },

            captureBoundaryAt:
              () =>
                new Date(
                  "2026-08-25T12:00:00.000Z"
                ),

            resolveMessageId:
              message =>
                (message as any).id.id,

            shouldHandleMessage:
              () => true,

            resolveMessageMetadata:
              async () => ({
                number:
                  "5511999999999",
                isGroup: false
              }),

            processNewMessage:
              async () =>
                undefined,

            services: {
              getCheckpoint:
                async () =>
                  new Date(
                    "2026-08-01T00:00:00.000Z"
                  ),

              saveCheckpoint:
                async () =>
                  undefined,

              classifyMessage:
                async () =>
                  "new"
            }
          });

        const work =
          await orchestrator.collectWork(
            makeSignal() as any
          );

        expect(fetchMessages)
          .not.toHaveBeenCalled();

        expect(getContacts)
          .toHaveBeenCalledTimes(1);

        expect(work.messages)
          .toHaveLength(0);

        expect(work.contacts)
          .toHaveLength(0);
      }
    );

    it(
      "uses the raw browser chat collection without calling session.getChats",
      async () => {
        const getChats =
          jest.fn(
            async () => {
              throw new Error(
                "CLASSIC_GET_CHATS_FAILURE"
              );
            }
          );

        const getContacts =
          jest.fn(
            async () => []
          );

        const rawMessageModel = {
          id: {
            id: "message-direct-1",
            _serialized:
              "false_5511999999999@c.us_message-direct-1"
          },
          timestamp: 2000,
          t: 2000,
          type: "chat",
          body: "teste",
          from:
            "5511999999999@c.us",
          to:
            "5511888888888@c.us",
          fromMe: false,
          isNotification: false
        };

        const evaluate =
          jest.fn(
            async (
              fn: Function,
              ...args: any[]
            ) => {
              /*
               * First evaluate = direct chat envelopes.
               */
              if (args.length === 0) {
                return [
                  {
                    chatId:
                      "5511999999999@c.us",
                    lastMessage: {
                      id: {
                        id:
                          "message-direct-1",
                        _serialized:
                          "false_5511999999999@c.us_message-direct-1"
                      },
                      timestamp:
                        2000
                    }
                  }
                ];
              }

              /*
               * Second evaluate = bounded history models.
               * We mock the browser result because this unit test
               * validates routing/bypass, not WhatsApp internals.
               */
              return [
                rawMessageModel
              ];
            }
          );

        const session: any = {
          getChats,
          getContacts,
          pupPage: {
            evaluate
          }
        };

        const processNewMessage =
          jest.fn(
            async () => undefined
          );

        const orchestrator =
          createWWebJsReconciliationAdapter({
            whatsappId: 101,
            session,

            captureBoundaryAt:
              () =>
                new Date(
                  2000 * 1000
                ),

            resolveMessageId:
              message =>
                (message as any)
                  .id.id,

            shouldHandleMessage:
              () => true,

            resolveMessageMetadata:
              async () => ({
                name: "Contato",
                number:
                  "5511999999999",
                isGroup: false
              }),

            processNewMessage,

            services: {
              getCheckpoint:
                async () =>
                  new Date(
                    1999 * 1000
                  ),

              saveCheckpoint:
                async () =>
                  undefined,

              classifyMessage:
                async () =>
                  "new",

              classifyMessages:
                async () =>
                  new Set<string>()
            }
          });

        const work =
          await orchestrator.collectWork(
            makeSignal() as any
          );

        expect(getChats)
          .not.toHaveBeenCalled();

        expect(getContacts)
          .toHaveBeenCalledTimes(1);

        expect(evaluate)
          .toHaveBeenCalled();

        expect(work.messages)
          .toHaveLength(1);

        expect(work.contacts)
          .toHaveLength(0);
      }
    );

    it(
      "keeps targeted contact lookup independent from the global catalog",
      async () => {
        const rawMessage: any = {
          id: { id: "targeted-message" },
          timestamp: 2000
        };

        const getContacts = jest.fn(async () => {
          throw new Error("GLOBAL_CATALOG_MUST_NOT_BE_USED");
        });

        const getContactById = jest.fn(async () => ({
          id: {
            user: "5511999999999",
            _serialized: "5511999999999@c.us"
          },
          name: "Targeted contact",
          isGroup: false
        }));

        const orchestrator = createWWebJsReconciliationAdapter({
          whatsappId: 101,
          session: {
            getChats: async () => [{
              id: { _serialized: "5511999999999@c.us" },
              lastMessage: rawMessage,
              fetchMessages: async () => [rawMessage]
            }],
            getContacts,
            getContactById
          } as any,
          targetChatIds: ["5511999999999@c.us"],
          captureBoundaryAt: () => new Date(2000 * 1000),
          resolveMessageId: message => (message as any).id.id,
          shouldHandleMessage: () => true,
          resolveMessageMetadata: async () => ({
            number: "5511999999999",
            isGroup: false
          }),
          processNewMessage: async () => undefined,
          services: {
            getCheckpoint: async () => new Date(0),
            saveCheckpoint: async () => undefined,
            classifyMessage: async () => "new"
          }
        });

        const work = await orchestrator.collectWork(makeSignal() as any);

        expect(getContacts).not.toHaveBeenCalled();
        expect(getContactById).toHaveBeenCalledWith("5511999999999@c.us");
        expect(work.contacts).toHaveLength(1);
      }
    );

    it(
      "returns no global contact work when the provider catalog is empty",
      async () => {
        const getContacts = jest.fn(async () => []);

        const orchestrator = createWWebJsReconciliationAdapter({
          whatsappId: 101,
          session: {
            getChats: async () => [],
            getContacts
          },
          captureBoundaryAt: () => new Date(2000 * 1000),
          resolveMessageId: () => "unused",
          shouldHandleMessage: () => true,
          resolveMessageMetadata: async () => ({
            number: "5511999999999",
            isGroup: false
          }),
          processNewMessage: async () => undefined,
          services: {
            getCheckpoint: async () => new Date(0),
            saveCheckpoint: async () => undefined,
            classifyMessage: async () => "new"
          }
        });

        const work = await orchestrator.collectWork(makeSignal() as any);

        expect(getContacts).toHaveBeenCalledTimes(1);
        expect(work.contacts).toEqual([]);
      }
    );
    it(
      "filters message work through the injected production eligibility policy",
      async () => {
        const rawMessage: any = {
          id: {
            id: "ignored"
          },
          timestamp: 1000
        };

        const processNewMessage =
          jest.fn(
            async () => undefined
          );

        const orchestrator =
          createWWebJsReconciliationAdapter({
            whatsappId: 101,

            session: {
              getChats:
                async () => [
                  {
                    id: {
                      _serialized:
                        "5511999999999@c.us"
                    },
                    lastMessage:
                      rawMessage,
                    fetchMessages:
                      async () => [
                        rawMessage
                      ]
                  }
                ],

              getContacts:
                async () => []
            },

            captureBoundaryAt:
              () =>
                new Date(
                  2000 * 1000
                ),

            resolveMessageId:
              message =>
                (message as any)
                  .id.id,

            shouldHandleMessage:
              () => false,

            resolveMessageMetadata:
              async () => ({
                number:
                  "5511999999999",
                isGroup: false
              }),

            processNewMessage,

            services: {
              getCheckpoint:
                async () =>
                  new Date(0),

              saveCheckpoint:
                async () =>
                  undefined,

              classifyMessage:
                async () =>
                  "new"
            }
          });

        const work =
          await orchestrator.collectWork(
            makeSignal() as any
          );

        expect(
          work.messages
        ).toHaveLength(0);

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();
      }
    );
  }
);