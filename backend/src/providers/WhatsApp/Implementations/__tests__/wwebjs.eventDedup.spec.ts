import fs from "fs";
import path from "path";

const sourcePath = path.resolve(__dirname, "../wwebjs.ts");
const source = fs.readFileSync(sourcePath, "utf8");

const extractListener = (eventName: string): string => {
  const marker = `wbot.on("${eventName}"`;
  const start = source.indexOf(marker);

  if (start === -1) {
    throw new Error(`Listener ${eventName} not found`);
  }

  const nextListener = source.indexOf(
    '\n    wbot.on("',
    start + marker.length
  );

  return source.slice(
    start,
    nextListener === -1 ? source.length : nextListener
  );
};

describe("wwebjs outbound event deduplication", () => {
  it("deduplicates outbound message_create events, including fromMe messages", () => {
    const listener = extractListener("message_create");

    expect(listener).toContain("shouldProcessIncomingEvent(");
    expect(listener).toContain('"message_create"');
    expect(listener).not.toMatch(
      /!msg\.fromMe\s*&&\s*!shouldProcessIncomingEvent/
    );
  });

  it("deduplicates media_uploaded using the shared event cache", () => {
    const listener = extractListener("media_uploaded");

    expect(listener).toContain("shouldProcessIncomingEvent(");
    expect(listener).toContain('"media_uploaded"');
  });

  it("keeps the cache key shared across event names", () => {
    expect(source).toContain(
      'const cacheKey = `${sessionId}:${messageId}:${message?.from || ""}:${message?.to || ""}`;'
    );

    expect(source).not.toContain(
      'const cacheKey = `${sessionId}:${eventName}:'
    );
  });
});