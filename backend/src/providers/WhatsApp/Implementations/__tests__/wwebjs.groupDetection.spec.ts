import { deriveWwebjsGroupContext } from "../wwebjsGroupContext";

const buildMessage = (overrides: Record<string, unknown> = {}) => ({
  from: "5511999999999@c.us",
  to: "5511888888888@c.us",
  ...overrides
});

const buildChat = (overrides: Record<string, unknown> = {}) => ({
  isGroup: false,
  id: { _serialized: "5511999999999@c.us" },
  name: "Direct Chat",
  ...overrides
});

describe("wwebjs group detection", () => {
  it("marks group messages when msg.from is a group jid", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({ from: "120363000000000000@g.us" }) as any,
      buildChat() as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000000@g.us",
      fallbackContactPayload: expect.objectContaining({
        number: "120363000000000000",
        isGroup: true
      })
    });
  });

  it("marks group messages when msg.to is a group jid", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({ to: "120363000000000001@g.us" }) as any,
      buildChat() as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000001@g.us"
    });
  });

  it("marks group messages when chat.id._serialized is a group jid", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage() as any,
      buildChat({
        id: { _serialized: "120363000000000002@g.us" },
        name: "Equipe Comercial"
      }) as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000002@g.us",
      fallbackContactPayload: expect.objectContaining({
        name: "Equipe Comercial",
        isGroup: true
      })
    });
  });

  it("marks group messages when _data.id.remote is a group jid", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({
        _data: {
          id: { remote: "120363000000000003@g.us" }
        }
      }) as any,
      buildChat() as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000003@g.us"
    });
  });

  it("marks group messages when _data.from is a group jid", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({
        _data: {
          from: "120363000000000004@g.us"
        }
      }) as any,
      buildChat() as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000004@g.us"
    });
  });

  it("keeps the group context when author is individual but the remote chat is a group", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({
        author: "5511999999999@c.us",
        _data: {
          author: "5511999999999@c.us",
          id: { remote: "120363000000000005@g.us" }
        }
      }) as any,
      buildChat() as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000005@g.us",
      fallbackContactPayload: expect.objectContaining({
        isGroup: true
      })
    });
  });

  it("marks fromMe group messages when the raw remote context is a group", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({
        from: "5511888888888@c.us",
        to: "5511888888888@c.us",
        _data: {
          id: { remote: "120363000000000006@g.us" },
          to: "120363000000000006@g.us"
        }
      }) as any,
      buildChat({ isGroup: false }) as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000006@g.us"
    });
  });

  it("marks participant replies in a group when raw remote context stays on the group jid", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({
        author: "5511977777777@c.us",
        _data: {
          from: "5511977777777@c.us",
          author: "5511977777777@c.us",
          id: { remote: "120363000000000007@g.us" }
        }
      }) as any,
      buildChat({ isGroup: false }) as any
    );

    expect(result).toMatchObject({
      isGroupMessage: true,
      groupChatId: "120363000000000007@g.us"
    });
  });

  it("keeps normal individual messages as individual when only author is present", () => {
    const result = deriveWwebjsGroupContext(
      buildMessage({
        author: "5511999999999@c.us",
        _data: {
          author: "5511999999999@c.us",
          from: "5511999999999@c.us",
          to: "5511888888888@c.us"
        }
      }) as any,
      buildChat() as any
    );

    expect(result).toEqual({ isGroupMessage: false });
  });
});