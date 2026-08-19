import fs from "fs";
import path from "path";

describe(
  "wwebjs reconciliation collector wiring",
  () => {
    const sourcePath = path.resolve(
      __dirname,
      "..",
      "wwebjs.ts"
    );

    const source = fs.readFileSync(
      sourcePath,
      "utf8"
    );

    it(
      "wires the raw collector without exposing it through the generic provider",
      () => {
        expect(source).toContain(
          'import CollectWWebJsRawReconciliationHistory from "./wwebjsReconciliationRawCollector";'
        );

        expect(source).toContain(
          'import ClassifyWhatsAppReconciliationMessageService from "../../../services/WhatsappService/ClassifyWhatsAppReconciliationMessageService";'
        );

        expect(source).toContain(
          "export const collectWWebJsReconciliationHistoryForSession"
        );
      }
    );

    it(
      "uses the real session and raw chat",
      () => {
        expect(source).toContain(
          "const wbot = getWbot(sessionId);"
        );

        expect(source).toContain(
          "const chat = await wbot.getChatById(chatId);"
        );

        expect(source).toContain(
          "CollectWWebJsRawReconciliationHistory({"
        );
      }
    );

    it(
      "uses the same canonical message id resolver as realtime",
      () => {
        expect(source).toContain(
          "resolveEventMessageId(message as any)"
        );
      }
    );

    it(
      "uses the existing durable Message.id classifier",
      () => {
        expect(source).toContain(
          "ClassifyWhatsAppReconciliationMessageService(messageId)"
        );

        expect(source).toContain(
          'return classification === "existing";'
        );
      }
    );

    it(
      "does not activate processing or checkpoint persistence inside the wiring function",
      () => {
        const start = source.indexOf(
          "export const collectWWebJsReconciliationHistoryForSession"
        );

        const end = source.indexOf(
          "const hasSession",
          start
        );

        expect(start).toBeGreaterThanOrEqual(0);
        expect(end).toBeGreaterThan(start);

        const wiring = source.slice(
          start,
          end
        );

        expect(wiring).not.toContain(
          "handleMessage("
        );

        expect(wiring).not.toContain(
          "getMessageData("
        );

        expect(wiring).not.toContain(
          "sendSeen("
        );

        expect(wiring).not.toContain(
          "saveWhatsappReconciliationCheckpoint"
        );

        expect(wiring).not.toContain(
          "registerReadySession"
        );

        expect(wiring).not.toContain(
          'wbot.on("ready"'
        );
      }
    );

    it(
      "does not add the raw collector to WhatsappWebJsProvider",
      () => {
        const providerStart = source.indexOf(
          "export const WhatsappWebJsProvider"
        );

        expect(providerStart)
          .toBeGreaterThanOrEqual(0);

        const providerBlock =
          source.slice(providerStart);

        expect(providerBlock).not.toContain(
          "collectWWebJsReconciliationHistoryForSession"
        );
      }
    );
  }
);