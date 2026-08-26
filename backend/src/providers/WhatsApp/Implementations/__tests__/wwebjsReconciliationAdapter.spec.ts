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
      "collects bounded chat history without enumerating the global contact catalog",
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
        ).not.toHaveBeenCalled();

        expect(
          chat.fetchMessages
        ).toHaveBeenCalled();

        expect(
          work.messages
        ).toHaveLength(1);

        expect(
          work.contacts
        ).toHaveLength(0);

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
          .not.toHaveBeenCalled();

        expect(work.messages)
          .toHaveLength(0);

        expect(work.contacts)
          .toHaveLength(0);
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