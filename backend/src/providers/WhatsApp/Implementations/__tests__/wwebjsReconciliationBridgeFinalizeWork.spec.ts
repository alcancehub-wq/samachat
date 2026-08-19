const runReconciliationMock = jest.fn();

jest.mock(
  "../../../../services/WhatsappService/RunWhatsAppReconciliationService",
  () => ({
    __esModule: true,
    default: (...args: any[]) =>
      runReconciliationMock(...args)
  })
);

jest.mock(
  "../../../../handlers/handleWhatsappEvents",
  () => ({
    handleMessage: jest.fn()
  })
);

import RunWWebJsReconciliationBridge from "../wwebjsReconciliationBridge";

describe(
  "wwebjsReconciliationBridge finalizeWork",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      runReconciliationMock.mockResolvedValue({
        whatsappId: 101,
        trigger: "automatic",
        checkedMessages: 0,
        importedMessages: 0,
        existingMessages: 0,
        skippedMessages: 0,
        contactsChecked: 0,
        contactsCreated: 0,
        contactsUpdated: 0,
        startedAt: new Date(0),
        finishedAt: new Date(0)
      });
    });

    it(
      "forwards collectWork and finalizeWork without executing either in the bridge",
      async () => {
        const collectWork =
          jest.fn(
            async () => ({
              messages: [],
              contacts: []
            })
          );

        const finalizeWork =
          jest.fn(
            async () => undefined
          );

        await RunWWebJsReconciliationBridge({
          whatsappId: 101,
          trigger: "automatic",
          collectWork,
          finalizeWork
        });

        expect(
          collectWork
        ).not.toHaveBeenCalled();

        expect(
          finalizeWork
        ).not.toHaveBeenCalled();

        expect(
          runReconciliationMock
        ).toHaveBeenCalledTimes(1);

        expect(
          runReconciliationMock
        ).toHaveBeenCalledWith({
          whatsappId: 101,
          trigger: "automatic",
          messages: [],
          collectWork,
          finalizeWork
        });
      }
    );
  }
);