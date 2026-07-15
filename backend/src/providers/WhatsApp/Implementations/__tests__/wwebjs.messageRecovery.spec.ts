import {
  buildAcceptedWwebjsProviderMessage,
  buildWwebjsFallbackContactPayload,
  resolveWwebjsChatWithFallback,
  resolveWwebjsContactPayloadWithFallback
} from "../wwebjsMessageRecovery";

describe("wwebjs message recovery", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns an accepted result when WhatsApp sends but returns undefined", () => {
    jest.spyOn(Date, "now").mockReturnValue(1784124000000);

    expect(
      buildAcceptedWwebjsProviderMessage({
        sessionId: 36,
        to: "5541978378390@c.us",
        body: "mensagem unica"
      })
    ).toEqual({
      id: "wwebjs-accepted-36-1784124000000",
      body: "mensagem unica",
      fromMe: true,
      hasMedia: false,
      type: "chat",
      timestamp: 1784124000,
      from: "",
      to: "5541978378390@c.us",
      hasQuotedMsg: false,
      ack: 0
    });
  });

  it("uses message data when getChat fails", async () => {
    const logger = {
      warn: jest.fn()
    };

    const chat = await resolveWwebjsChatWithFallback(
      {
        fromMe: true,
        from: "5511981901577@c.us",
        to: "5541978378390@c.us",
        getChat: jest
          .fn()
          .mockRejectedValue(new Error("getChatById failed"))
      },
      logger
    );

    expect(chat).toEqual(
      expect.objectContaining({
        isGroup: false,
        unreadCount: 0,
        id: {
          _serialized: "5541978378390@c.us"
        }
      })
    );

    expect(logger.warn).toHaveBeenCalled();
  });

  it("recovers an outgoing contact when both provider lookups fail", async () => {
    const logger = {
      warn: jest.fn()
    };

    const msg = {
      fromMe: true,
      from: "5511981901577@c.us",
      to: "5541978378390@c.us",
      getContact: jest
        .fn()
        .mockRejectedValue(new Error("message contact failed"))
    };

    const wbot = {
      getContactById: jest
        .fn()
        .mockRejectedValue(new Error("contact by id failed"))
    };

    const convertContactPayload = jest.fn();

    const contact = await resolveWwebjsContactPayloadWithFallback({
      msg,
      wbot,
      convertContactPayload,
      logger
    });

    expect(contact).toEqual({
      name: "5541978378390",
      number: "5541978378390",
      lid: undefined,
      profilePicUrl: undefined,
      isGroup: false
    });

    expect(wbot.getContactById).toHaveBeenCalledWith(
      "5541978378390@c.us"
    );
    expect(msg.getContact).toHaveBeenCalled();
    expect(convertContactPayload).not.toHaveBeenCalled();
  });

  it("recovers an incoming contact name and number from raw message data", () => {
    const contact = buildWwebjsFallbackContactPayload({
      fromMe: false,
      from: "5511999999999@c.us",
      to: "5511981901577@c.us",
      _data: {
        notifyName: "Cliente WhatsApp"
      }
    });

    expect(contact).toEqual({
      name: "Cliente WhatsApp",
      number: "5511999999999",
      lid: undefined,
      profilePicUrl: undefined,
      isGroup: false
    });
  });

  it("preserves a lid when the message only exposes a lid destination", () => {
    const contact = buildWwebjsFallbackContactPayload({
      fromMe: true,
      from: "5511981901577@c.us",
      to: "179473865519257@lid"
    });

    expect(contact).toEqual({
      name: "179473865519257",
      number: "",
      lid: "179473865519257@lid",
      profilePicUrl: undefined,
      isGroup: false
    });
  });

  it("keeps the normal provider contact path when it is available", async () => {
    const expectedContact = {
      name: "Contato normal",
      number: "5511888888888",
      isGroup: false
    };

    const providerContact = {
      id: {
        user: "5511888888888"
      }
    };

    const convertContactPayload = jest
      .fn()
      .mockResolvedValue(expectedContact);

    const contact = await resolveWwebjsContactPayloadWithFallback({
      msg: {
        fromMe: false,
        from: "5511888888888@c.us",
        to: "5511981901577@c.us",
        getContact: jest.fn().mockResolvedValue(providerContact)
      },
      wbot: {
        getContactById: jest.fn()
      },
      convertContactPayload,
      logger: {
        warn: jest.fn()
      }
    });

    expect(contact).toEqual(expectedContact);
    expect(convertContactPayload).toHaveBeenCalledWith(providerContact);
  });
});
