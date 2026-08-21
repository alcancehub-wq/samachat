import fs from "fs";
import path from "path";

describe(
  "wwebjs reconciliation automatic READY activation",
  () => {
    const source =
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../wwebjs.ts"
        ),
        "utf8"
      ).replace(/\r\n/g, "\n");

    it(
      "routes the dormant adapter through the bridge with automatic trigger",
      () => {
        const helperStart =
          source.indexOf(
            "const runAutomaticWWebJsReconciliationForSession"
          );

        const legacyStart =
          source.indexOf(
            "const syncUnreadMessages"
          );

        expect(
          helperStart
        ).toBeGreaterThanOrEqual(0);

        expect(
          legacyStart
        ).toBeGreaterThan(
          helperStart
        );

        const helper =
          source.slice(
            helperStart,
            legacyStart
          );

        expect(helper).toContain(
          "createWWebJsReconciliationAdapterForSession"
        );

        expect(helper).toContain(
          "RunWWebJsReconciliationBridge"
        );

        expect(helper).toContain(
          'trigger: "automatic"'
        );

        expect(helper).toContain(
          "reconciliation.collectWork"
        );

        expect(helper).toContain(
          "reconciliation.finalizeWork"
        );

        expect(helper).not.toContain(
          'trigger: "manual"'
        );

        expect(helper).not.toContain(
          "sendSeen"
        );
      }
    );

    it(
      "does not start automatic reconciliation from READY",
      () => {
        const readyStart =
          source.indexOf(
            'wbot.on("ready"'
          );

        const changeStateStart =
          source.indexOf(
            'wbot.on("change_state"'
          );

        expect(
          readyStart
        ).toBeGreaterThanOrEqual(0);

        expect(
          changeStateStart
        ).toBeGreaterThan(
          readyStart
        );

        const ready =
          source.slice(
            readyStart,
            changeStateStart
          );

        const registerIndex =
          ready.indexOf(
            "registerReadySession"
          );

        const reconciliationIndex =
          ready.indexOf(
            "runAutomaticWWebJsReconciliationForSession"
          );

        expect(
          registerIndex
        ).toBeGreaterThanOrEqual(0);

        expect(
          reconciliationIndex
        ).toBe(-1);

        expect(ready).not.toContain(
          "void runAutomaticWWebJsReconciliationForSession"
        );

        expect(ready).not.toContain(
          "syncUnreadMessages("
        );

        expect(ready).not.toContain(
          "sendSeen"
        );
      }
    );

    it(
      "does not wire reconciliation directly into reconnect scheduling",
      () => {
        const reconnectStart =
          source.indexOf(
            "const scheduleReconnect"
          );

        const getWbotStart =
          source.indexOf(
            "const getWbot"
          );

        const reconnect =
          source.slice(
            reconnectStart,
            getWbotStart
          );

        expect(reconnect).not.toContain(
          "runAutomaticWWebJsReconciliationForSession"
        );
      }
    );
  }
);