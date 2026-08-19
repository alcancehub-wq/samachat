const guardMock = jest.fn();
const reconcileContactMock = jest.fn();
const reconcileMessageMock = jest.fn();

jest.mock(
  "../WhatsAppReconciliationRuntime",
  () => ({
    runWithWhatsAppReconciliationGuard:
      (...args: any[]) =>
        guardMock(...args)
  })
);

jest.mock(
  "../ReconcileWhatsAppContactMetadataService",
  () => ({
    __esModule: true,
    default: (...args: any[]) =>
      reconcileContactMock(...args)
  })
);

jest.mock(
  "../ReconcileWhatsAppMessageService",
  () => ({
    __esModule: true,
    default: (...args: any[]) =>
      reconcileMessageMock(...args)
  })
);

import RunWhatsAppReconciliationService from "../RunWhatsAppReconciliationService";

describe(
  "RunWhatsAppReconciliationService finalizeWork",
  () => {
    const createSignal = () => ({
      aborted: false,
      throwIfAborted: jest.fn()
    });

    beforeEach(() => {
      jest.clearAllMocks();

      guardMock.mockImplementation(
        async ({ task }: any) =>
          task(createSignal())
      );

      reconcileContactMock.mockResolvedValue({
        contactCreated: false,
        contactUpdated: false
      });

      reconcileMessageMock.mockResolvedValue({
        classification: "new",
        messageProcessed: true,
        metadataReconciled: true
      });
    });

    it(
      "runs finalizeWork after collected contacts and messages",
      async () => {
        const order: string[] = [];
        let capturedSignal: any;

        reconcileContactMock.mockImplementation(
          async ({ signal }: any) => {
            capturedSignal = signal;
            order.push("contact");
          }
        );

        reconcileMessageMock.mockImplementation(
          async () => {
            order.push("message");

            return {
              classification: "new",
              messageProcessed: true,
              metadataReconciled: true
            };
          }
        );

        const collectWork =
          jest.fn(async () => {
            order.push("collect");

            return {
              contacts: [
                {
                  metadata: {
                    name: "Contato",
                    number: "5511999999999",
                    isGroup: false
                  }
                }
              ],

              messages: [
                {
                  messageId: "message-1",

                  metadata: {
                    name: "Contato",
                    number: "5511999999999",
                    isGroup: false
                  },

                  processNewMessage:
                    async () => undefined
                }
              ]
            };
          });

        const finalizeWork =
          jest.fn(async signal => {
            order.push("finalize");
            expect(signal).toBe(capturedSignal);
          });

        await RunWhatsAppReconciliationService({
          whatsappId: 101,
          trigger: "automatic",
          collectWork,
          finalizeWork
        });

        expect(order).toEqual([
          "collect",
          "contact",
          "message",
          "finalize"
        ]);

        expect(finalizeWork).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "runs finalizeWork after a successful empty run",
      async () => {
        const finalizeWork =
          jest.fn(async () => undefined);

        await RunWhatsAppReconciliationService({
          whatsappId: 101,
          trigger: "automatic",
          collectWork: async () => ({
            contacts: [],
            messages: []
          }),
          finalizeWork
        });

        expect(finalizeWork).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "does not finalize when collectWork fails",
      async () => {
        const error = new Error("collect failed");
        const finalizeWork = jest.fn();

        await expect(
          RunWhatsAppReconciliationService({
            whatsappId: 101,
            trigger: "automatic",
            collectWork: async () => {
              throw error;
            },
            finalizeWork
          })
        ).rejects.toBe(error);

        expect(finalizeWork).not.toHaveBeenCalled();
      }
    );

    it(
      "does not finalize when contact reconciliation fails",
      async () => {
        const error = new Error("contact failed");

        reconcileContactMock.mockRejectedValueOnce(error);

        const finalizeWork = jest.fn();

        await expect(
          RunWhatsAppReconciliationService({
            whatsappId: 101,
            trigger: "automatic",

            contacts: [
              {
                metadata: {
                  name: "Contato",
                  number: "5511888888888",
                  isGroup: false
                }
              }
            ],

            finalizeWork
          })
        ).rejects.toBe(error);

        expect(finalizeWork).not.toHaveBeenCalled();
      }
    );

    it(
      "does not finalize when message reconciliation fails",
      async () => {
        const error = new Error("message failed");

        reconcileMessageMock.mockRejectedValueOnce(error);

        const finalizeWork = jest.fn();

        await expect(
          RunWhatsAppReconciliationService({
            whatsappId: 101,
            trigger: "automatic",

            messages: [
              {
                messageId: "message-2",

                metadata: {
                  name: "Contato",
                  number: "5511777777777",
                  isGroup: false
                },

                processNewMessage:
                  async () => undefined
              }
            ],

            finalizeWork
          })
        ).rejects.toBe(error);

        expect(finalizeWork).not.toHaveBeenCalled();
      }
    );

    it(
      "checks cancellation immediately before finalizeWork",
      async () => {
        const cancellationError =
          new Error("ownership lost");

        const finalizeWork = jest.fn();

        guardMock.mockImplementationOnce(
          async ({ task }: any) => {
            let checks = 0;

            const signal = {
              aborted: false,

              throwIfAborted: jest.fn(() => {
                checks += 1;

                if (checks === 3) {
                  throw cancellationError;
                }
              })
            };

            return task(signal);
          }
        );

        await expect(
          RunWhatsAppReconciliationService({
            whatsappId: 101,
            trigger: "automatic",
            collectWork: async () => ({
              contacts: [],
              messages: []
            }),
            finalizeWork
          })
        ).rejects.toBe(cancellationError);

        expect(finalizeWork).not.toHaveBeenCalled();
      }
    );

    it(
      "propagates finalizeWork failure",
      async () => {
        const error = new Error("finalize failed");

        const finalizeWork =
          jest.fn(async () => {
            throw error;
          });

        await expect(
          RunWhatsAppReconciliationService({
            whatsappId: 101,
            trigger: "automatic",
            finalizeWork
          })
        ).rejects.toBe(error);

        expect(finalizeWork).toHaveBeenCalledTimes(1);
      }
    );

    it(
      "checks cancellation again after finalizeWork",
      async () => {
        const cancellationError =
          new Error("ownership lost during finalize");

        const finalizeWork =
          jest.fn(async () => undefined);

        guardMock.mockImplementationOnce(
          async ({ task }: any) => {
            let checks = 0;

            const signal = {
              aborted: false,

              throwIfAborted: jest.fn(() => {
                checks += 1;

                if (checks === 4) {
                  throw cancellationError;
                }
              })
            };

            return task(signal);
          }
        );

        await expect(
          RunWhatsAppReconciliationService({
            whatsappId: 101,
            trigger: "automatic",
            finalizeWork
          })
        ).rejects.toBe(cancellationError);

        expect(finalizeWork).toHaveBeenCalledTimes(1);
      }
    );
  }
);