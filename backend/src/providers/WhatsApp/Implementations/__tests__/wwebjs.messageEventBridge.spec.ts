import WwebjsMessageEventBridge, {
  buildWwebjsMessageEventKey,
  buildWwebjsOutgoingFingerprint
} from "../wwebjsMessageEventBridge";

describe("WwebjsMessageEventBridge", () => {
  it("deduplicates message and message_create with the same provider id", async () => {
    const bridge = new WwebjsMessageEventBridge();
    const process = jest.fn().mockResolvedValue(undefined);

    const request = {
      sessionId: 36,
      eventId: "REAL-MESSAGE-ID",
      fromMe: false,
      from: "5511999999999@c.us",
      to: "5511981901577@c.us",
      body: "mensagem recebida",
      timestamp: 1784125000,
      process
    };

    await expect(
      bridge.processEvent(request)
    ).resolves.toBe("processed");

    await expect(
      bridge.processEvent(request)
    ).resolves.toBe("duplicate");

    expect(process).toHaveBeenCalledTimes(1);
  });

  it("does not persist a synthetic echo when the real event was processed", async () => {
    const bridge = new WwebjsMessageEventBridge();
    const state = bridge.beginOutgoing(
      36,
      "5541978378390@c.us",
      "mensagem enviada"
    );

    await bridge.processEvent({
      sessionId: 36,
      eventId: "OUTGOING-ID",
      fromMe: true,
      from: "5511981901577@c.us",
      to: "5541978378390@c.us",
      body: "mensagem enviada",
      timestamp: 1784125000,
      process: jest.fn().mockResolvedValue(undefined)
    });

    await expect(
      bridge.shouldPersistSynthetic(state, 0)
    ).resolves.toBe(false);
  });

  it("persists a synthetic echo when no provider event arrives", async () => {
    const bridge = new WwebjsMessageEventBridge();
    const state = bridge.beginOutgoing(
      36,
      "5541978378390@c.us",
      "mensagem enviada"
    );

    await expect(
      bridge.shouldPersistSynthetic(state, 0)
    ).resolves.toBe(true);
  });

  it("suppresses a late provider event after the synthetic echo", async () => {
    const bridge = new WwebjsMessageEventBridge();
    const state = bridge.beginOutgoing(
      36,
      "5541978378390@c.us",
      "mensagem enviada"
    );

    await bridge.shouldPersistSynthetic(state, 0);

    const process = jest.fn().mockResolvedValue(undefined);

    await expect(
      bridge.processEvent({
        sessionId: 36,
        eventId: "LATE-OUTGOING-ID",
        fromMe: true,
        from: "5511981901577@c.us",
        to: "5541978378390@c.us",
        body: "mensagem enviada",
        timestamp: 1784125001,
        process
      })
    ).resolves.toBe("suppressed");

    expect(process).not.toHaveBeenCalled();
  });

  it("allows another event source to retry after processing fails", async () => {
    const bridge = new WwebjsMessageEventBridge();

    const request = {
      sessionId: 36,
      eventId: "RETRY-MESSAGE-ID",
      fromMe: false,
      from: "5511999999999@c.us",
      to: "5511981901577@c.us",
      body: "mensagem recebida",
      timestamp: 1784125000
    };

    await expect(
      bridge.processEvent({
        ...request,
        process: jest
          .fn()
          .mockRejectedValue(new Error("temporary failure"))
      })
    ).rejects.toThrow("temporary failure");

    const retryProcess = jest.fn().mockResolvedValue(undefined);

    await expect(
      bridge.processEvent({
        ...request,
        process: retryProcess
      })
    ).resolves.toBe("processed");

    expect(retryProcess).toHaveBeenCalledTimes(1);
  });

  it("builds stable fingerprints and event keys", () => {
    expect(
      buildWwebjsOutgoingFingerprint(
        36,
        "5541978378390@c.us",
        "teste"
      )
    ).toBe("36|5541978378390@c.us|teste");

    expect(
      buildWwebjsMessageEventKey({
        sessionId: 36,
        eventId: "ABC",
        fromMe: false,
        from: "a",
        to: "b",
        body: "teste",
        timestamp: 1
      })
    ).toBe("36|ABC");
  });
});
