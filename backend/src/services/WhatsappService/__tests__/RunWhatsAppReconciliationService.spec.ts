const runtimeMock = jest.fn();
const reconcileMessageMock = jest.fn();
const reconcileContactMock = jest.fn();

jest.mock(
  "../WhatsAppReconciliationRuntime",
  () => ({
    runWithWhatsAppReconciliationGuard:
      (...args: any[]) =>
        runtimeMock(...args)
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

jest.mock(
  "../ReconcileWhatsAppContactMetadataService",
  () => ({
    __esModule: true,
    default: (...args: any[]) =>
      reconcileContactMock(...args)
  })
);

import RunWhatsAppReconciliationService from "../RunWhatsAppReconciliationService";

const healthySignal = {
  aborted: false,
  throwIfAborted: jest.fn()
};

describe("RunWhatsAppReconciliationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    runtimeMock.mockImplementation(
      async ({
        task
      }: {
        task: (signal: any) => Promise<any>;
      }) => task(healthySignal)
    );

    reconcileContactMock.mockResolvedValue({
      id: 501
    });

    reconcileMessageMock.mockResolvedValue({
      messageId: "msg",
      classification: "new",
      metadataReconciled: true,
      messageProcessed: true
    });
  });

  it("runs the whole reconciliation inside the distributed guard", async () => {
    await RunWhatsAppReconciliationService({
      whatsappId: 101,
      trigger: "manual"
    });

    expect(runtimeMock).toHaveBeenCalledTimes(1);

    expect(runtimeMock).toHaveBeenCalledWith(
      expect.objectContaining({
        whatsappId: 101,
        trigger: "manual",
        task: expect.any(Function)
      })
    );
  });

  it("executes provider work collection only after entering the distributed guard", async () => {
    let guardEntered = false;

    runtimeMock.mockImplementation(
      async ({ task }: any) => {
        guardEntered = true;
        return task(healthySignal);
      }
    );

    const collectWork = jest.fn(
      async () => {
        expect(guardEntered).toBe(true);

        return {
          messages: [],
          contacts: []
        };
      }
    );

    await RunWhatsAppReconciliationService({
      whatsappId: 101,
      trigger: "automatic",
      collectWork
    });

    expect(collectWork).toHaveBeenCalledWith(
      healthySignal
    );
  });

  it("does not execute collection when distributed guard rejects before task execution", async () => {
    runtimeMock.mockRejectedValue(
      new Error("ERR_WHATSAPP_RECONCILIATION_IN_PROGRESS")
    );

    const collectWork = jest.fn();

    await expect(
      RunWhatsAppReconciliationService({
        whatsappId: 101,
        trigger: "manual",
        collectWork
      })
    ).rejects.toThrow(
      "ERR_WHATSAPP_RECONCILIATION_IN_PROGRESS"
    );

    expect(collectWork).not.toHaveBeenCalled();
  });

  it("merges collected provider messages with explicitly supplied work", async () => {
    reconcileMessageMock
      .mockResolvedValueOnce({
        messageId: "explicit",
        classification: "existing",
        metadataReconciled: true,
        messageProcessed: false
      })
      .mockResolvedValueOnce({
        messageId: "collected",
        classification: "new",
        metadataReconciled: true,
        messageProcessed: true
      });

    const result =
      await RunWhatsAppReconciliationService({
        whatsappId: 101,
        trigger: "automatic",

        messages: [
          {
            messageId: "explicit",
            metadata: {
              number: "551100000001",
              isGroup: false
            },
            processNewMessage: jest.fn()
          }
        ],

        collectWork: async () => ({
          messages: [
            {
              messageId: "collected",
              metadata: {
                number: "551100000002",
                isGroup: false
              },
              processNewMessage: jest.fn()
            }
          ]
        })
      });

    expect(result.checkedMessages).toBe(2);
    expect(result.existingMessages).toBe(1);
    expect(result.importedMessages).toBe(1);
  });

  it("reconciles standalone contacts collected by the provider", async () => {
    const metadata = {
      name: "Contato",
      number: "5511999999999",
      isGroup: false
    };

    const result =
      await RunWhatsAppReconciliationService({
        whatsappId: 101,
        trigger: "manual",

        collectWork: async () => ({
          contacts: [
            {
              metadata
            }
          ]
        })
      });

    expect(
      reconcileContactMock
    ).toHaveBeenCalledWith({
      whatsappId: 101,
      metadata,
      signal: healthySignal
    });

    expect(result.contactsChecked).toBe(1);
  });

  it("passes contact metadata reconciliation into each collected message", async () => {
    reconcileMessageMock.mockImplementation(
      async ({
        messageId,
        reconcileMetadata
      }: any) => {
        await reconcileMetadata();

        return {
          messageId,
          classification: "existing",
          metadataReconciled: true,
          messageProcessed: false
        };
      }
    );

    const metadata = {
      name: "Maria",
      number: "5511987654321",
      isGroup: false
    };

    const result =
      await RunWhatsAppReconciliationService({
        whatsappId: 101,
        trigger: "automatic",

        collectWork: async () => ({
          messages: [
            {
              messageId: "m1",
              metadata,
              processNewMessage: jest.fn()
            }
          ]
        })
      });

    expect(
      reconcileContactMock
    ).toHaveBeenCalledWith({
      whatsappId: 101,
      metadata,
      signal: healthySignal
    });

    expect(result.contactsChecked).toBe(1);
  });

  it("stops before processing collected work when ownership is lost during collection", async () => {
    let aborted = false;

    const signal = {
      get aborted() {
        return aborted;
      },

      throwIfAborted: jest.fn(() => {
        if (aborted) {
          throw new Error(
            "ERR_WHATSAPP_RECONCILIATION_LOCK_LOST"
          );
        }
      })
    };

    runtimeMock.mockImplementation(
      async ({ task }: any) => task(signal)
    );

    await expect(
      RunWhatsAppReconciliationService({
        whatsappId: 101,
        trigger: "automatic",

        collectWork: async () => {
          aborted = true;

          return {
            messages: [
              {
                messageId: "must-not-run",
                metadata: {
                  number: "551100000001",
                  isGroup: false
                },
                processNewMessage: jest.fn()
              }
            ]
          };
        }
      })
    ).rejects.toThrow(
      "ERR_WHATSAPP_RECONCILIATION_LOCK_LOST"
    );

    expect(
      reconcileMessageMock
    ).not.toHaveBeenCalled();

    expect(
      reconcileContactMock
    ).not.toHaveBeenCalled();
  });

  it("returns a structured empty result when collector returns no work", async () => {
    const result =
      await RunWhatsAppReconciliationService({
        whatsappId: 101,
        trigger: "automatic",

        collectWork: async () => ({
          messages: [],
          contacts: []
        })
      });

    expect(result).toEqual(
      expect.objectContaining({
        whatsappId: 101,
        trigger: "automatic",
        checkedMessages: 0,
        importedMessages: 0,
        existingMessages: 0,
        skippedMessages: 0,
        contactsChecked: 0,
        contactsCreated: 0,
        contactsUpdated: 0,
        startedAt: expect.any(Date),
        finishedAt: expect.any(Date)
      })
    );
  });

  it("rejects invalid connection id before acquiring the distributed guard", async () => {
    await expect(
      RunWhatsAppReconciliationService({
        whatsappId: 0,
        trigger: "manual"
      })
    ).rejects.toThrow(
      "ERR_INVALID_WHATSAPP_ID"
    );

    expect(runtimeMock).not.toHaveBeenCalled();
  });
});
it(
  "propagates normalized whatsappId to ReconcileWhatsAppMessageService",
  () => {
    const fs = require("fs");

    const source = fs.readFileSync(
      require.resolve(
        "../RunWhatsAppReconciliationService"
      ),
      "utf8"
    );

    const callIndex =
      source.indexOf(
        "ReconcileWhatsAppMessageService({"
      );

    expect(callIndex).toBeGreaterThanOrEqual(0);

    const callWindow =
      source.slice(
        callIndex,
        callIndex + 250
      );

    expect(callWindow).toContain(
      "whatsappId: normalizedWhatsappId"
    );

    expect(callWindow).toContain(
      "messageId: messageItem.messageId"
    );
  }
);
