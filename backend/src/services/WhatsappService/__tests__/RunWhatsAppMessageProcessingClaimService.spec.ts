import RunWhatsAppMessageProcessingClaimService from "../RunWhatsAppMessageProcessingClaimService";

import ClassifyWhatsAppReconciliationMessageService from "../ClassifyWhatsAppReconciliationMessageService";

import {
  runWithWhatsAppMessageProcessingClaimGuard
} from "../WhatsAppMessageProcessingClaimStore";

jest.mock(
  "../ClassifyWhatsAppReconciliationMessageService"
);

jest.mock(
  "../WhatsAppMessageProcessingClaimStore",
  () => ({
    runWithWhatsAppMessageProcessingClaimGuard:
      jest.fn()
  })
);

const classifierMock =
  ClassifyWhatsAppReconciliationMessageService as jest.Mock;

const guardMock =
  runWithWhatsAppMessageProcessingClaimGuard as jest.Mock;

const activeSignal = {
  aborted: false,
  throwIfAborted: jest.fn()
};

describe(
  "RunWhatsAppMessageProcessingClaimService",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      activeSignal.aborted = false;

      guardMock.mockImplementation(
        async ({
          task
        }: {
          task: (
            signal: typeof activeSignal
          ) => Promise<unknown>;
        }) => task(activeSignal)
      );
    });

    it(
      "normalizes messageId before acquiring the claim",
      async () => {
        classifierMock.mockResolvedValue("existing");

        await RunWhatsAppMessageProcessingClaimService({
          whatsappId: 101,
          messageId: "  provider-message-id  ",
          task: jest.fn()
        });

        expect(
          guardMock
        ).toHaveBeenCalledWith(
          expect.objectContaining({
            whatsappId: 101,
            messageId: "provider-message-id"
          })
        );
      }
    );

    it(
      "rejects an empty messageId before acquiring the claim",
      async () => {
        await expect(
          RunWhatsAppMessageProcessingClaimService({
            whatsappId: 101,
            messageId: "   ",
            task: jest.fn()
          })
        ).rejects.toThrow(
          "ERR_INVALID_WHATSAPP_MESSAGE_ID"
        );

        expect(
          guardMock
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "rechecks Message.id only from inside the acquired claim task",
      async () => {
        classifierMock.mockResolvedValue("existing");

        let guardTaskEntered = false;

        guardMock.mockImplementation(
          async ({
            task
          }: {
            task: (
              signal: typeof activeSignal
            ) => Promise<unknown>;
          }) => {
            expect(
              classifierMock
            ).not.toHaveBeenCalled();

            guardTaskEntered = true;

            return task(activeSignal);
          }
        );

        await RunWhatsAppMessageProcessingClaimService({
          whatsappId: 101,
          messageId: "message-1",
          task: jest.fn()
        });

        expect(guardTaskEntered).toBe(true);

        expect(
          classifierMock
        ).toHaveBeenCalledTimes(1);

        expect(
          classifierMock
        ).toHaveBeenCalledWith(
          "message-1"
        );
      }
    );

    it(
      "does not execute new-message task when inside-claim recheck finds existing",
      async () => {
        classifierMock.mockResolvedValue("existing");

        const task = jest.fn(
          async () => "must-not-run"
        );

        await expect(
          RunWhatsAppMessageProcessingClaimService({
            whatsappId: 101,
            messageId: "message-2",
            task
          })
        ).resolves.toEqual({
          messageId: "message-2",
          classification: "existing",
          messageProcessed: false
        });

        expect(task).not.toHaveBeenCalled();
      }
    );

    it(
      "executes new-message task when inside-claim recheck remains new",
      async () => {
        classifierMock.mockResolvedValue("new");

        const task = jest.fn(
          async () => "processed"
        );

        await expect(
          RunWhatsAppMessageProcessingClaimService({
            whatsappId: 101,
            messageId: "message-3",
            task
          })
        ).resolves.toEqual({
          messageId: "message-3",
          classification: "new",
          messageProcessed: true,
          result: "processed"
        });

        expect(task).toHaveBeenCalledTimes(1);

        expect(task).toHaveBeenCalledWith(
          activeSignal
        );
      }
    );

    it(
      "prevents stale NEW decisions from forcing duplicate processing",
      async () => {
        /*
         * Represents the TOCTOU case:
         *
         * an earlier observation said NEW, but by the time
         * ownership is acquired the durable Message.id barrier
         * says EXISTING.
         */
        classifierMock.mockResolvedValue("existing");

        const processNewMessage =
          jest.fn(async () => undefined);

        const result =
          await RunWhatsAppMessageProcessingClaimService({
            whatsappId: 101,
            messageId: "message-race",
            task: processNewMessage
          });

        expect(result.classification).toBe(
          "existing"
        );

        expect(result.messageProcessed).toBe(
          false
        );

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();
      }
    );

    it(
      "checks cancellation before Message.id recheck",
      async () => {
        classifierMock.mockResolvedValue("new");

        const order: string[] = [];

        activeSignal.throwIfAborted
          .mockImplementationOnce(() => {
            order.push("abort-before-recheck");
          })
          .mockImplementationOnce(() => {
            order.push("abort-after-recheck");
          })
          .mockImplementationOnce(() => {
            order.push("abort-after-task");
          });

        classifierMock.mockImplementation(
          async () => {
            order.push("classifier");
            return "new";
          }
        );

        const task = jest.fn(
          async () => {
            order.push("task");
            return "ok";
          }
        );

        await RunWhatsAppMessageProcessingClaimService({
          whatsappId: 101,
          messageId: "message-4",
          task
        });

        expect(order).toEqual([
          "abort-before-recheck",
          "classifier",
          "abort-after-recheck",
          "task",
          "abort-after-task"
        ]);
      }
    );

    it(
      "fails closed when classifier DB lookup fails",
      async () => {
        const classifierError =
          new Error("database lookup failure");

        classifierMock.mockRejectedValue(
          classifierError
        );

        const task = jest.fn();

        await expect(
          RunWhatsAppMessageProcessingClaimService({
            whatsappId: 101,
            messageId: "message-5",
            task
          })
        ).rejects.toBe(
          classifierError
        );

        expect(task).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when ownership is lost before recheck",
      async () => {
        const ownershipError =
          new Error("claim lost");

        activeSignal.throwIfAborted
          .mockImplementationOnce(() => {
            throw ownershipError;
          });

        const task = jest.fn();

        await expect(
          RunWhatsAppMessageProcessingClaimService({
            whatsappId: 101,
            messageId: "message-6",
            task
          })
        ).rejects.toBe(
          ownershipError
        );

        expect(
          classifierMock
        ).not.toHaveBeenCalled();

        expect(task).not.toHaveBeenCalled();
      }
    );

    it(
      "fails closed when ownership is lost after recheck and before processing",
      async () => {
        classifierMock.mockResolvedValue("new");

        const ownershipError =
          new Error("claim lost after recheck");

        activeSignal.throwIfAborted
          .mockImplementationOnce(() => undefined)
          .mockImplementationOnce(() => {
            throw ownershipError;
          });

        const task = jest.fn();

        await expect(
          RunWhatsAppMessageProcessingClaimService({
            whatsappId: 101,
            messageId: "message-7",
            task
          })
        ).rejects.toBe(
          ownershipError
        );

        expect(
          classifierMock
        ).toHaveBeenCalledTimes(1);

        expect(task).not.toHaveBeenCalled();
      }
    );
  }
);