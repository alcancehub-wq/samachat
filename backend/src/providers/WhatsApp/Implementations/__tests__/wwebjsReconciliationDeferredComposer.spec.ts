import ComposeWWebJsDeferredReconciliationMessages from "../wwebjsReconciliationDeferredComposer";

describe(
  "wwebjsReconciliationDeferredComposer",
  () => {
    it(
      "builds minimal deferred work items without executing message processing",
      async () => {
        const rawMessage = {
          id: "raw-object-1",
          body: "hello"
        };

        const resolveMessageId =
          jest.fn(() => " provider-message-1 ");

        const resolveMetadata =
          jest.fn(async () => ({
            name: "Contato",
            number: "5511999999999",
            lid: undefined,
            profilePicUrl: undefined,
            isGroup: false
          }));

        const processNewMessage =
          jest.fn(async () => undefined);

        const result =
          await ComposeWWebJsDeferredReconciliationMessages({
            messages: [rawMessage],
            resolveMessageId,
            resolveMetadata,
            processNewMessage
          });

        expect(result).toHaveLength(1);

        expect(result[0]).toEqual({
          messageId: "provider-message-1",
          metadata: {
            name: "Contato",
            number: "5511999999999",
            lid: undefined,
            profilePicUrl: undefined,
            isGroup: false
          },
          processNewMessage:
            expect.any(Function)
        });

        expect(
          resolveMessageId
        ).toHaveBeenCalledWith(
          rawMessage
        );

        expect(
          resolveMetadata
        ).toHaveBeenCalledWith(
          rawMessage
        );

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "preserves the exact raw message object inside the deferred closure",
      async () => {
        const rawMessage = {
          id: "same-object"
        };

        const processNewMessage =
          jest.fn(async () => undefined);

        const [workItem] =
          await ComposeWWebJsDeferredReconciliationMessages({
            messages: [rawMessage],

            resolveMessageId:
              () => "message-2",

            resolveMetadata:
              async () => ({
                name: "Pessoa",
                number: "5511888888888",
                isGroup: false
              }),

            processNewMessage
          });

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();

        await workItem.processNewMessage();

        expect(
          processNewMessage
        ).toHaveBeenCalledTimes(1);

        expect(
          processNewMessage
        ).toHaveBeenCalledWith(
          rawMessage
        );
      }
    );

    it(
      "does not execute processing while resolving metadata",
      async () => {
        const order: string[] = [];

        const [workItem] =
          await ComposeWWebJsDeferredReconciliationMessages({
            messages: [{}],

            resolveMessageId: () => {
              order.push("id");
              return "message-3";
            },

            resolveMetadata: async () => {
              order.push("metadata");

              return {
                name: "Contato",
                number: "5511777777777",
                isGroup: false
              };
            },

            processNewMessage:
              async () => {
                order.push("process");
              }
          });

        expect(order).toEqual([
          "id",
          "metadata"
        ]);

        await workItem.processNewMessage();

        expect(order).toEqual([
          "id",
          "metadata",
          "process"
        ]);
      }
    );

    it(
      "preserves source message ordering",
      async () => {
        const messages = [
          { id: "one" },
          { id: "two" },
          { id: "three" }
        ];

        const result =
          await ComposeWWebJsDeferredReconciliationMessages({
            messages,

            resolveMessageId:
              message => message.id,

            resolveMetadata:
              async message => ({
                name: message.id,
                number: "5511999999999",
                isGroup: false
              }),

            processNewMessage:
              async () => undefined
          });

        expect(
          result.map(item => item.messageId)
        ).toEqual([
          "one",
          "two",
          "three"
        ]);
      }
    );

    it(
      "rejects blank messageId before metadata or processing",
      async () => {
        const resolveMetadata =
          jest.fn();

        const processNewMessage =
          jest.fn();

        await expect(
          ComposeWWebJsDeferredReconciliationMessages({
            messages: [{}],

            resolveMessageId:
              () => "   ",

            resolveMetadata,

            processNewMessage
          })
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_MESSAGE_ID"
        );

        expect(
          resolveMetadata
        ).not.toHaveBeenCalled();

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "propagates metadata failure without creating processing side effects",
      async () => {
        const metadataError =
          new Error("metadata failed");

        const processNewMessage =
          jest.fn();

        await expect(
          ComposeWWebJsDeferredReconciliationMessages({
            messages: [{}],

            resolveMessageId:
              () => "message-4",

            resolveMetadata:
              async () => {
                throw metadataError;
              },

            processNewMessage
          })
        ).rejects.toBe(
          metadataError
        );

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "propagates deferred processing failure only when closure is executed",
      async () => {
        const processingError =
          new Error("processing failed");

        const processNewMessage =
          jest.fn(
            async () => {
              throw processingError;
            }
          );

        const [workItem] =
          await ComposeWWebJsDeferredReconciliationMessages({
            messages: [{}],

            resolveMessageId:
              () => "message-5",

            resolveMetadata:
              async () => ({
                name: "Contato",
                number: "5511666666666",
                isGroup: false
              }),

            processNewMessage
          });

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();

        await expect(
          workItem.processNewMessage()
        ).rejects.toBe(
          processingError
        );

        expect(
          processNewMessage
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "accepts an empty raw message list",
      async () => {
        const resolveMessageId =
          jest.fn();

        const resolveMetadata =
          jest.fn();

        const processNewMessage =
          jest.fn();

        await expect(
          ComposeWWebJsDeferredReconciliationMessages({
            messages: [],
            resolveMessageId,
            resolveMetadata,
            processNewMessage
          })
        ).resolves.toEqual([]);

        expect(
          resolveMessageId
        ).not.toHaveBeenCalled();

        expect(
          resolveMetadata
        ).not.toHaveBeenCalled();

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects a non-array message collection",
      async () => {
        await expect(
          ComposeWWebJsDeferredReconciliationMessages({
            messages: null as any,
            resolveMessageId:
              () => "message",
            resolveMetadata:
              async () => ({
                name: "Contato",
                number: "5511555555555",
                isGroup: false
              }),
            processNewMessage:
              async () => undefined
          })
        ).rejects.toThrow(
          "ERR_INVALID_RECONCILIATION_MESSAGES"
        );
      }
    );
  }
);