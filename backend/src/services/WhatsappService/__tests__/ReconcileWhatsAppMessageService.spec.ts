const claimServiceMock = jest.fn();

jest.mock(
  "../RunWhatsAppMessageProcessingClaimService",
  () => ({
    __esModule: true,
    default: (...args: any[]) =>
      claimServiceMock(...args)
  })
);

import ReconcileWhatsAppMessageService from "../ReconcileWhatsAppMessageService";

const outerSignal = {
  aborted: false,
  throwIfAborted: jest.fn()
};

const claimSignal = {
  aborted: false,
  throwIfAborted: jest.fn()
};

describe(
  "ReconcileWhatsAppMessageService",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      outerSignal.aborted = false;
      claimSignal.aborted = false;

      claimServiceMock.mockImplementation(
        async ({
          messageId,
          task
        }: {
          messageId: string;
          task: (
            signal: typeof claimSignal
          ) => Promise<void>;
        }) => {
          await task(claimSignal);

          return {
            messageId,
            classification: "new",
            messageProcessed: true
          };
        }
      );
    });

    it(
      "normalizes and forwards whatsappId and messageId to T1",
      async () => {
        await ReconcileWhatsAppMessageService({
          whatsappId: 101,
          messageId: "  provider-message-1  ",
          signal: outerSignal,
          reconcileMetadata:
            async () => undefined,
          processNewMessage:
            async () => undefined
        });

        expect(
          claimServiceMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            whatsappId: 101,
            messageId: "provider-message-1"
          })
        );
      }
    );

    it(
      "reconciles metadata before entering T1",
      async () => {
        const order: string[] = [];

        const reconcileMetadata =
          jest.fn(async () => {
            order.push("metadata");
          });

        claimServiceMock.mockImplementation(
          async ({
            messageId
          }: {
            messageId: string;
          }) => {
            order.push("claim");

            return {
              messageId,
              classification: "existing",
              messageProcessed: false
            };
          }
        );

        await ReconcileWhatsAppMessageService({
          whatsappId: 101,
          messageId: "message-2",
          signal: outerSignal,
          reconcileMetadata,
          processNewMessage:
            async () => undefined
        });

        expect(order).toEqual([
          "metadata",
          "claim"
        ]);
      }
    );

    it(
      "still reconciles metadata when T1 finds the message already existing",
      async () => {
        const reconcileMetadata =
          jest.fn(async () => undefined);

        const processNewMessage =
          jest.fn(async () => undefined);

        claimServiceMock.mockResolvedValue({
          messageId: "message-existing",
          classification: "existing",
          messageProcessed: false
        });

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId: 101,
            messageId: "message-existing",
            signal: outerSignal,
            reconcileMetadata,
            processNewMessage
          })
        ).resolves.toEqual({
          messageId: "message-existing",
          classification: "existing",
          metadataReconciled: true,
          messageProcessed: false
        });

        expect(
          reconcileMetadata
        ).toHaveBeenCalledTimes(1);

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "executes processNewMessage once when T1 recheck remains new",
      async () => {
        const processNewMessage =
          jest.fn(async () => undefined);

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId: 101,
            messageId: "message-new",
            signal: outerSignal,
            reconcileMetadata:
              async () => undefined,
            processNewMessage
          })
        ).resolves.toEqual({
          messageId: "message-new",
          classification: "new",
          metadataReconciled: true,
          messageProcessed: true
        });

        expect(
          processNewMessage
        ).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "checks outer cancellation before metadata",
      async () => {
        const error =
          new Error("outer-aborted-before");

        outerSignal.throwIfAborted
          .mockImplementationOnce(() => {
            throw error;
          });

        const reconcileMetadata =
          jest.fn();

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId: 101,
            messageId: "message-3",
            signal: outerSignal,
            reconcileMetadata,
            processNewMessage:
              async () => undefined
          })
        ).rejects.toBe(error);

        expect(
          reconcileMetadata
        ).not.toHaveBeenCalled();

        expect(
          claimServiceMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "does not start T1 when outer cancellation occurs after metadata",
      async () => {
        const error =
          new Error("outer-aborted-after-metadata");

        outerSignal.throwIfAborted
          .mockImplementationOnce(
            () => undefined
          )
          .mockImplementationOnce(() => {
            throw error;
          });

        const reconcileMetadata =
          jest.fn(async () => undefined);

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId: 101,
            messageId: "message-4",
            signal: outerSignal,
            reconcileMetadata,
            processNewMessage:
              async () => undefined
          })
        ).rejects.toBe(error);

        expect(
          reconcileMetadata
        ).toHaveBeenCalledTimes(1);

        expect(
          claimServiceMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when metadata reconciliation fails",
      async () => {
        const metadataError =
          new Error("metadata failure");

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId: 101,
            messageId: "message-5",
            signal: outerSignal,

            reconcileMetadata:
              async () => {
                throw metadataError;
              },

            processNewMessage:
              async () => undefined
          })
        ).rejects.toBe(
          metadataError
        );

        expect(
          claimServiceMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when T1 fails",
      async () => {
        const claimError =
          new Error("claim failure");

        claimServiceMock.mockRejectedValue(
          claimError
        );

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId: 101,
            messageId: "message-6",
            signal: outerSignal,
            reconcileMetadata:
              async () => undefined,
            processNewMessage:
              async () => undefined
          })
        ).rejects.toBe(
          claimError
        );
      }
    );

    it(
      "checks both outer and claim cancellation before processing",
      async () => {
        const order: string[] = [];

        outerSignal.throwIfAborted
          .mockImplementation(() => {
            order.push("outer");
          });

        claimSignal.throwIfAborted
          .mockImplementation(() => {
            order.push("claim");
          });

        claimServiceMock.mockImplementation(
          async ({
            messageId,
            task
          }: {
            messageId: string;
            task: (
              signal: typeof claimSignal
            ) => Promise<void>;
          }) => {
            await task(claimSignal);

            return {
              messageId,
              classification: "new",
              messageProcessed: true
            };
          }
        );

        await ReconcileWhatsAppMessageService({
          whatsappId: 101,
          messageId: "message-7",
          signal: outerSignal,

          reconcileMetadata:
            async () => {
              order.push("metadata");
            },

          processNewMessage:
            async () => {
              order.push("process");
            }
        });

        expect(
          order.indexOf("metadata")
        ).toBeLessThan(
          order.indexOf("process")
        );

        expect(
          claimSignal.throwIfAborted
        ).toHaveBeenCalled();

        expect(
          outerSignal.throwIfAborted
        ).toHaveBeenCalled();
      }
    );

    it.each([
      0,
      -1,
      1.5,
      Number.NaN
    ])(
      "rejects invalid whatsappId %p before side effects",
      async whatsappId => {
        const reconcileMetadata =
          jest.fn();

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId,
            messageId: "message-8",
            signal: outerSignal,
            reconcileMetadata,
            processNewMessage:
              async () => undefined
          })
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_ID"
        );

        expect(
          reconcileMetadata
        ).not.toHaveBeenCalled();

        expect(
          claimServiceMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rejects blank messageId before side effects",
      async () => {
        const reconcileMetadata =
          jest.fn();

        await expect(
          ReconcileWhatsAppMessageService({
            whatsappId: 101,
            messageId: "   ",
            signal: outerSignal,
            reconcileMetadata,
            processNewMessage:
              async () => undefined
          })
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_MESSAGE_ID"
        );

        expect(
          reconcileMetadata
        ).not.toHaveBeenCalled();

        expect(
          claimServiceMock
        ).not.toHaveBeenCalled();
      }
    );
  }
);