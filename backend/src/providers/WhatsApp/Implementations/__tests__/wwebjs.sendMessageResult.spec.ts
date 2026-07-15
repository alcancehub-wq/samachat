import BuildAcceptedWwebjsMessageResult from "../wwebjsSendResult";

describe("BuildAcceptedWwebjsMessageResult", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("preserves the real provider result when a message id exists", () => {
    const result = BuildAcceptedWwebjsMessageResult({
      sessionId: 36,
      to: "5541978378390@c.us",
      body: "teste",
      sentMessage: {
        id: {
          id: "REAL-MESSAGE-ID"
        },
        body: "teste",
        fromMe: true,
        hasMedia: false,
        type: "chat",
        timestamp: 1784117696,
        from: "5511999999999@c.us",
        to: "5541978378390@c.us",
        hasQuotedMsg: false,
        ack: 1
      }
    });

    expect(result).toEqual(
      expect.objectContaining({
        id: "REAL-MESSAGE-ID",
        body: "teste",
        fromMe: true,
        to: "5541978378390@c.us"
      })
    );
  });

  it("returns an accepted fallback when wwebjs resolves undefined", () => {
    jest.spyOn(Date, "now").mockReturnValue(1784117696000);

    const result = BuildAcceptedWwebjsMessageResult({
      sessionId: 36,
      to: "5541978378390@c.us",
      body: "TESTE-UNICO-ERRO-POS-ENVIO",
      sentMessage: undefined
    });

    expect(result).toEqual({
      id: "wwebjs-accepted-36-1784117696000",
      body: "TESTE-UNICO-ERRO-POS-ENVIO",
      fromMe: true,
      hasMedia: false,
      type: "chat",
      timestamp: 1784117696,
      from: "",
      to: "5541978378390@c.us",
      hasQuotedMsg: false,
      ack: 0
    });
  });

  it("returns an accepted fallback when the object exists without an id", () => {
    const result = BuildAcceptedWwebjsMessageResult({
      sessionId: 36,
      to: "5541978378390@c.us",
      body: "mensagem aceita",
      sentMessage: {
        body: "mensagem aceita",
        fromMe: true
      }
    });

    expect(result.id).toMatch(/^wwebjs-accepted-36-\d+$/);
    expect(result.body).toBe("mensagem aceita");
    expect(result.to).toBe("5541978378390@c.us");
  });
});
