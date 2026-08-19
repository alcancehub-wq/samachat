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
  "wwebjsReconciliationBridge collectWork seam",
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
      "forwards collectWork without executing provider collection in the bridge",
      async () => {
        const collectWork =
          jest.fn(async () => ({
            messages: [],
            contacts: []
          }));

        await RunWWebJsReconciliationBridge({
          whatsappId: 101,
          trigger: "automatic",
          collectWork
        });

        expect(
          collectWork
        ).not.toHaveBeenCalled();

        expect(
          handleMessageMock
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
          collectWork
        });
      }
    );

    it(
      "forwards collectWork together with deferred messages without executing either closure",
      async () => {
        const processNewMessage =
          jest.fn(async () => undefined);

        const collectWork =
          jest.fn(async () => ({
            messages: [],
            contacts: []
          }));

        const deferred = {
          messageId: "message-1",

          metadata: {
            name: "Contato",
            number: "5511999999999",
            isGroup: false
          },

          processNewMessage
        };

        await RunWWebJsReconciliationBridge({
          whatsappId: 101,
          trigger: "manual",
          deferredMessages: [deferred],
          collectWork
        });

        expect(
          collectWork
        ).not.toHaveBeenCalled();

        expect(
          processNewMessage
        ).not.toHaveBeenCalled();

        expect(
          handleMessageMock
        ).not.toHaveBeenCalled();

        expect(
          runReconciliationMock
        ).toHaveBeenCalledWith({
          whatsappId: 101,
          trigger: "manual",
          messages: [deferred],
          collectWork
        });
      }
    );
  }
);