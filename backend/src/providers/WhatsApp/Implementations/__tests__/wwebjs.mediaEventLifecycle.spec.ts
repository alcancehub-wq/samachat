import {
  resolveWwebjsIncomingEventFamily,
  shouldProcessWwebjsIncomingEvent
} from "../wwebjsEventDedup";

describe("wwebjs media event lifecycle deduplication", () => {
  const sessionId = 52;
  const messageId = "3EB0TESTMEDIA";
  const from = "5511992511492@c.us";
  const to = "5511999999999@c.us";
  const ttlMs = 30000;

  it("keeps message and message_create in the same deduplication family", () => {
    expect(resolveWwebjsIncomingEventFamily("message")).toBe("message");
    expect(resolveWwebjsIncomingEventFamily("message_create")).toBe("message");
  });

  it("blocks message_create after message for the same provider identity", () => {
    const cache = new Map<string, number>();

    const first = shouldProcessWwebjsIncomingEvent({
      cache,
      now: 100000,
      ttlMs,
      sessionId,
      eventName: "message",
      messageId,
      from,
      to
    });

    const second = shouldProcessWwebjsIncomingEvent({
      cache,
      now: 100100,
      ttlMs,
      sessionId,
      eventName: "message_create",
      messageId,
      from,
      to
    });

    expect(first).toBe(true);
    expect(second).toBe(false);
  });

  it("allows media_uploaded after message_create for the same provider identity", () => {
    const cache = new Map<string, number>();

    const created = shouldProcessWwebjsIncomingEvent({
      cache,
      now: 200000,
      ttlMs,
      sessionId,
      eventName: "message_create",
      messageId,
      from,
      to
    });

    const uploaded = shouldProcessWwebjsIncomingEvent({
      cache,
      now: 200100,
      ttlMs,
      sessionId,
      eventName: "media_uploaded",
      messageId,
      from,
      to
    });

    expect(created).toBe(true);
    expect(uploaded).toBe(true);
  });

  it("blocks repeated media_uploaded for the same provider identity", () => {
    const cache = new Map<string, number>();

    const first = shouldProcessWwebjsIncomingEvent({
      cache,
      now: 300000,
      ttlMs,
      sessionId,
      eventName: "media_uploaded",
      messageId,
      from,
      to
    });

    const repeated = shouldProcessWwebjsIncomingEvent({
      cache,
      now: 300100,
      ttlMs,
      sessionId,
      eventName: "media_uploaded",
      messageId,
      from,
      to
    });

    expect(first).toBe(true);
    expect(repeated).toBe(false);
  });
});