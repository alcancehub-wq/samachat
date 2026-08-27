import fs from "fs";
import path from "path";

describe(
  "WhatsApp manual reconciliation backend",
  () => {
    const controller =
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../WhatsAppController.ts"
        ),
        "utf8"
      ).replace(/\r\n/g, "\n");

    const routes =
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../routes/whatsappRoutes.ts"
        ),
        "utf8"
      ).replace(/\r\n/g, "\n");

    const wwebjs =
      fs.readFileSync(
        path.resolve(
          __dirname,
          "../../providers/WhatsApp/Implementations/wwebjs.ts"
        ),
        "utf8"
      ).replace(/\r\n/g, "\n");

    it(
      "uses the same WWebJS reconciliation engine with manual trigger",
      () => {
        const manualStart =
          wwebjs.indexOf(
            "export const runManualWWebJsReconciliationForSession"
          );

        const automaticStart =
          wwebjs.indexOf(
            "const runAutomaticWWebJsReconciliationForSession"
          );

        expect(
          manualStart
        ).toBeGreaterThanOrEqual(0);

        expect(
          automaticStart
        ).toBeGreaterThan(
          manualStart
        );

        const manual =
          wwebjs.slice(
            manualStart,
            automaticStart
          );

        expect(manual).toContain(
          "createWWebJsReconciliationAdapterForSession"
        );

        expect(manual).toContain(
          "RunWWebJsReconciliationBridge"
        );

        expect(manual).toContain(
          'trigger: "manual"'
        );

        expect(manual).toContain(
          "reconciliation.collectWork"
        );

        expect(manual).toContain(
          "reconciliation.finalizeWork"
        );

        expect(manual).not.toContain(
          "sendSeen"
        );

        expect(manual).not.toContain(
          "syncUnreadMessages"
        );
      }
    );

    it(
      "guards manual execution by provider and session readiness",
      () => {
        expect(controller).toContain(
          'whatsapp.providerType === "official"'
        );

        expect(controller).toContain(
          'configuredProvider !== "wwebjs"'
        );

        expect(controller).toContain(
          "whatsappProvider.isSessionReady"
        );

        expect(controller).toContain(
          "ERR_WAPP_NOT_INITIALIZED"
        );

        expect(controller).toContain(
          "ERR_WHATSAPP_RECONCILIATION_UNSUPPORTED_PROVIDER"
        );
      }
    );

    it(
      "authorizes a targeted ticket using normal ticket access rules",
      () => {
        expect(controller).toContain(
          "ShowTicketService"
        );

        expect(controller).toContain(
          "requestedTicketId !== null"
        );

        expect(controller).toContain(
          "userId: requesterUserId"
        );

        expect(controller).toContain(
          "profile: req.user.profile"
        );
      }
    );

    it(
      "tracks the authenticated requester and maps lock or cooldown conflicts",
      () => {
        expect(controller).toContain(
          "Number(req.user.id)"
        );

        expect(controller).toContain(
          "requestedByUserId"
        );

        expect(controller).toContain(
          "WhatsAppReconciliationBlockedError"
        );

        expect(controller).toContain(
          "retryAfterMs"
        );

        expect(controller).toContain(
          "getWhatsAppReconciliationRuntimeState"
        );
      }
    );

    it(
      "exposes authenticated manual and state routes",
      () => {
        expect(routes).toContain(
          '"/whatsapp/:whatsappId/reconcile"'
        );

        expect(routes).toContain(
          '"/whatsapp/:whatsappId/reconcile-state"'
        );

        expect(routes).toContain(
          "WhatsAppController.reconcile"
        );

        expect(routes).toContain(
          "WhatsAppController.reconciliationState"
        );

        const reconcileRouteStart =
          routes.indexOf(
            '"/whatsapp/:whatsappId/reconcile"'
          );

        const reconcileRoute =
          routes.slice(
            reconcileRouteStart,
            reconcileRouteStart + 220
          );

        expect(reconcileRoute).toContain(
          "isAuth"
        );

        expect(reconcileRoute).toContain(
          'checkSectorPermission("connections.view")'
        );
      }
    );
  }
);