import fs from "fs";
import path from "path";

describe(
  "wwebjs reconciliation dormant factory",
  () => {
    const sourcePath =
      path.resolve(
        __dirname,
        "../wwebjs.ts"
      );

    const source =
      fs.readFileSync(
        sourcePath,
        "utf8"
      );

    const metadataStart =
      source.indexOf(
        "const resolveWWebJsReconciliationMessageMetadata"
      );

    const factoryStart =
      source.indexOf(
        "export const createWWebJsReconciliationAdapterForSession"
      );

    const legacyStart =
      source.indexOf(
        "const syncUnreadMessages"
      );

    it(
      "keeps metadata resolution free of expensive message/media processing",
      () => {
        const metadataBlock =
          source.slice(
            metadataStart,
            factoryStart
          );

        expect(metadataStart).toBeGreaterThanOrEqual(0);
        expect(factoryStart).toBeGreaterThan(metadataStart);

        expect(metadataBlock).toContain("convertToContactPayload");
        expect(metadataBlock).toContain("deriveWwebjsGroupContext");
        expect(metadataBlock).toContain("buildFallbackContactPayloadFromMessage");

        expect(metadataBlock).not.toContain("getMessageData");
        expect(metadataBlock).not.toContain("convertToMediaPayload");
        expect(metadataBlock).not.toContain("downloadMedia");
      }
    );

    it(
      "keeps getMessageData and handleMessage behind processNewMessage",
      () => {
        const factoryBlock =
          source.slice(
            factoryStart,
            legacyStart
          );

        const lazyIndex =
          factoryBlock.indexOf("processNewMessage:");

        const dataIndex =
          factoryBlock.indexOf("getMessageData");

        const handleIndex =
          factoryBlock.indexOf("await handleMessage");

        expect(lazyIndex).toBeGreaterThanOrEqual(0);
        expect(dataIndex).toBeGreaterThan(lazyIndex);
        expect(handleIndex).toBeGreaterThan(dataIndex);

        expect(factoryBlock).not.toContain("sendSeen");
        expect(factoryBlock).not.toContain('.on("ready"');
        expect(factoryBlock).not.toContain(".initialize(");
      }
    );

    it(
      "enables raw contact profile lookup only for manual global reconciliation",
      () => {
        const manualStart =
          source.indexOf(
            "export const runManualWWebJsReconciliationForSession"
          );

        const automaticStart =
          source.indexOf(
            "const runAutomaticWWebJsReconciliationForSession"
          );

        const manual = source.slice(
          manualStart,
          automaticStart
        );

        expect(manualStart).toBeGreaterThanOrEqual(0);
        expect(automaticStart).toBeGreaterThan(manualStart);
        expect(manual).toMatch(
          /includeContactProfilePic:\s*!targetedRepair/
        );
      }
    );
  }
);