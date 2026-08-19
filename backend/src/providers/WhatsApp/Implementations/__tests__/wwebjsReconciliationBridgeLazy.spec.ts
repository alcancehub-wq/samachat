const runReconciliationMock = jest.fn();
const handleMessageMock = jest.fn();

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
    handleMessage: (...args: any[]) =>
      handleMessageMock(...args)
  })
);

import RunWWebJsReconciliationBridge from "../wwebjsReconciliationBridge";

describe(
  "wwebjsReconciliationBridge lazy seam",
  () => {
    beforeEach(() => {
      jest.clearAllMocks();

      runReconciliationMock.mockResolvedValue({
        whatsappId: 101,
        trigger: "manual",
        checkedMessages: 1,
        importedMessages: 1,
        existingMessages: 0,
        skippedMessages: 0,
        contactsChecked: 1,
        contactsCreated: 0,
        contactsUpdated: 0,
        startedAt: new Date(0),
        finishedAt: new Date(0)
      });
    });

    it(
      "passes deferred work items directly without eager handleMessage",
      async () => {
        const processNewMessage =
          jest.fn(async () => undefined);

        const deferred = {
          messageId: "provider-message-1",

          metadata: {
            name: "Contato",
            number: "5511999999999",
            lid: undefined,
            profilePicUrl: undefined,
            isGroup: false
          },

          processNewMessage
        };

        await RunWWebJsReconciliationBridge({
          whatsappId: 101,
          trigger: "manual" as any,
          deferredMessages: [deferred]
        });

        expect(
          handleMessageMock
        ).not.toHaveBeenCalled();

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();

        expect(
          runReconciliationMock
        ).toHaveBeenCalledTimes(1);

        expect(
          runReconciliationMock
        ).toHaveBeenCalledWith({
          whatsappId: 101,
          trigger: "manual",
          messages: [deferred]
        });
      }
    );

    it(
      "accepts an empty deferred collection without eager processing",
      async () => {
        await RunWWebJsReconciliationBridge({
          whatsappId: 101,
          trigger: "manual" as any,
          deferredMessages: []
        });

        expect(
          handleMessageMock
        ).not.toHaveBeenCalled();

        expect(
          runReconciliationMock
        ).toHaveBeenCalledWith({
          whatsappId: 101,
          trigger: "manual",
          messages: []
        });
      }
    );
  }
);