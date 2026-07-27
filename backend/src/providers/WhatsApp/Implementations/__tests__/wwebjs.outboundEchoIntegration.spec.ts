import fs from "fs";
import path from "path";

const sourcePath = path.resolve(__dirname, "../wwebjs.ts");
const source = fs.readFileSync(sourcePath, "utf8").replace(/\r\n/g, "\n");

const extractBetween = (
  startMarker: string,
  endMarker: string
): string => {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);

  if (start === -1) {
    throw new Error(`Start marker not found: ${startMarker}`);
  }

  if (end === -1) {
    throw new Error(`End marker not found: ${endMarker}`);
  }

  if (end <= start) {
    throw new Error(`Invalid marker order: ${startMarker}`);
  }

  return source.slice(start, end);
};

const extractListener = (eventName: string): string => {
  const marker = `wbot.on("${eventName}"`;
  const start = source.indexOf(marker);

  if (start === -1) {
    throw new Error(`Listener ${eventName} not found`);
  }

  const nextListener = source.indexOf('wbot.on("', start + marker.length);

  return source.slice(
    start,
    nextListener === -1 ? source.length : nextListener
  );
};

describe("wwebjs outbound echo integration", () => {
  it("imports the outbound echo guard explicitly", () => {
    expect(source).toContain(
      'from "./wwebjsOutboundEchoGuard";'
    );

    expect(source).toContain(
      "clearOutboundEchoReservationsForSession"
    );

    expect(source).toContain("reserveOutboundEcho");
    expect(source).toContain("shouldSuppressOutboundEcho");
  });

  it("reserves text echo before the physical provider send", () => {
    const sendText = extractBetween(
      "const sendMessage = async (",
      "const sendMedia = async ("
    );

    const reservePosition = sendText.indexOf(
      "const outboundReservation = reserveOutboundEcho(sessionId);"
    );

    const physicalSendPosition = sendText.indexOf(
      "await wbot.sendMessage(to, body"
    );

    expect(reservePosition).toBeGreaterThanOrEqual(0);
    expect(physicalSendPosition).toBeGreaterThan(reservePosition);
  });

  it("completes or cancels the text reservation deterministically", () => {
    const sendText = extractBetween(
      "const sendMessage = async (",
      "const sendMedia = async ("
    );

    expect(sendText).toContain(
      "outboundReservation.complete(providerMessage.id);"
    );

    expect(sendText).toContain(
      "if (!sentMessage) {\n      outboundReservation.cancel();"
    );

    expect(sendText).toContain(
      "} catch (err) {\n    outboundReservation.cancel();"
    );
  });

  it("reserves and settles media echo around the provider send", () => {
    const sendMedia = extractBetween(
      "const sendMedia = async (",
      "const checkNumberLookup = async ("
    );

    const reservePosition = sendMedia.indexOf(
      "const outboundReservation = reserveOutboundEcho(sessionId);"
    );

    const physicalSendPosition = sendMedia.indexOf(
      "await wbot.sendMessage(to, messageMedia, mediaOptions)"
    );

    const completePosition = sendMedia.indexOf(
      "outboundReservation.complete(providerMessage.id);"
    );

    expect(reservePosition).toBeGreaterThanOrEqual(0);
    expect(physicalSendPosition).toBeGreaterThan(reservePosition);
    expect(completePosition).toBeGreaterThan(physicalSendPosition);

    expect(sendMedia).toContain(
      "} catch (err) {\n    outboundReservation.cancel();"
    );
  });

  it("checks message_create suppression before message persistence", () => {
    const listener = extractListener("message_create");

    const suppressionPosition = listener.indexOf(
      "await shouldSuppressOutboundEcho(sessionId, eventMessageId)"
    );

    const payloadPosition = listener.indexOf(
      "await getMessageData(msg, wbot)"
    );

    const handlerPosition = listener.indexOf(
      "await handleMessage("
    );

    expect(suppressionPosition).toBeGreaterThanOrEqual(0);
    expect(payloadPosition).toBeGreaterThan(suppressionPosition);
    expect(handlerPosition).toBeGreaterThan(payloadPosition);
  });

  it("checks media_uploaded suppression before media persistence", () => {
    const listener = extractListener("media_uploaded");

    const suppressionPosition = listener.indexOf(
      "await shouldSuppressOutboundEcho(sessionId, eventMessageId)"
    );

    const payloadPosition = listener.indexOf(
      "await getMessageData(msg, wbot)"
    );

    const handlerPosition = listener.indexOf(
      "await handleMessage("
    );

    expect(suppressionPosition).toBeGreaterThanOrEqual(0);
    expect(payloadPosition).toBeGreaterThan(suppressionPosition);
    expect(handlerPosition).toBeGreaterThan(payloadPosition);
  });

  it("clears outbound reservations in both session-removal paths", () => {
    const removeSession = extractBetween(
      "const removeSession = async (",
      "const sendMessage = async ("
    );

    const matches =
      removeSession.match(
        /clearOutboundEchoReservationsForSession\(whatsappId\);/g
      ) || [];

    expect(matches).toHaveLength(2);
  });
});
