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

describe("wwebjsReconciliationBridge", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    runReconciliationMock.mockResolvedValue({
      whatsappId: 101,
      trigger: "automatic",
      checkedMessages: 1,
      importedMessages: 1,
      existingMessages: 0,
      skippedMessages: 0,
      contactsChecked: 1,
      contactsCreated: 0,
      contactsUpdated: 0,
      startedAt: new Date(),
      finishedAt: new Date()
    });

    handleMessageMock.mockResolvedValue(undefined);
  });

  it("maps WWebJS payloads into the unified reconciliation engine", async () => {
    const prepared = {
      messagePayload: {
        id: "msg-1",
        body: "Ola",
        fromMe: false,
        hasMedia: false,
        type: "chat",
        timestamp: 123,
        from: "5511999999999@c.us",
        to: "5511888888888@c.us"
      },

      contactPayload: {
        name: "Maria",
        number: "5511999999999",
        lid: "179473865519257@lid",
        profilePicUrl:
          "https://example.com/maria.jpg",
        isGroup: false
      },

      contextPayload: {
        whatsappId: 101,
        unreadMessages: 1,
        isGroupMessage: false
      },

      mediaPayload: undefined
    };

    await RunWWebJsReconciliationBridge({
      whatsappId: 101,
      trigger: "automatic",
      preparedMessages: [prepared as any]
    });

    expect(
      runReconciliationMock
    ).toHaveBeenCalledTimes(1);

    const request =
      runReconciliationMock.mock.calls[0][0];

    expect(request.whatsappId).toBe(101);
    expect(request.trigger).toBe("automatic");
    expect(request.messages).toHaveLength(1);

    expect(request.messages[0]).toEqual(
      expect.objectContaining({
        messageId: "msg-1",

        metadata: {
          name: "Maria",
          number: "5511999999999",
          lid: "179473865519257@lid",
          profilePicUrl:
            "https://example.com/maria.jpg",
          isGroup: false
        },

        processNewMessage:
          expect.any(Function)
      })
    );
  });

  it("injects canonical handleMessage only as the new-message callback", async () => {
    const prepared = {
      messagePayload: {
        id: "msg-2",
        body: "Teste",
        fromMe: false,
        hasMedia: false,
        type: "chat",
        timestamp: 456,
        from: "551100000001@c.us",
        to: "551100000002@c.us"
      },

      contactPayload: {
        name: "Joao",
        number: "551100000001",
        isGroup: false
      },

      contextPayload: {
        whatsappId: 101,
        unreadMessages: 1
      },

      mediaPayload: undefined
    };

    await RunWWebJsReconciliationBridge({
      whatsappId: 101,
      trigger: "manual",
      preparedMessages: [prepared as any]
    });

    expect(
      handleMessageMock
    ).not.toHaveBeenCalled();

    const request =
      runReconciliationMock.mock.calls[0][0];

    await request.messages[0].processNewMessage();

    expect(
      handleMessageMock
    ).toHaveBeenCalledTimes(1);

    expect(
      handleMessageMock
    ).toHaveBeenCalledWith(
      prepared.messagePayload,
      prepared.contactPayload,
      prepared.contextPayload,
      prepared.mediaPayload
    );
  });

  it("does not expose any read or seen operation", async () => {
    await RunWWebJsReconciliationBridge({
      whatsappId: 101,
      trigger: "automatic",
      preparedMessages: []
    });

    expect(
      runReconciliationMock
    ).toHaveBeenCalledWith({
      whatsappId: 101,
      trigger: "automatic",
      messages: []
    });
  });
});
