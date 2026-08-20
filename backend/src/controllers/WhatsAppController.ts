import { Request, Response } from "express";
import { getIO } from "../libs/socket";
import { StartWhatsAppSession } from "../services/WbotServices/StartWhatsAppSession";

import CreateWhatsAppService from "../services/WhatsappService/CreateWhatsAppService";
import DeleteWhatsAppService from "../services/WhatsappService/DeleteWhatsAppService";
import ListWhatsAppsService from "../services/WhatsappService/ListWhatsAppsService";
import ShowWhatsAppService from "../services/WhatsappService/ShowWhatsAppService";
import UpdateWhatsAppService from "../services/WhatsappService/UpdateWhatsAppService";
import GetWhatsAppSharingSettingsService from "../services/WhatsappService/GetWhatsAppSharingSettingsService";
import { whatsappProvider } from "../providers/WhatsApp";
import SerializeWhatsAppForClient from "../helpers/SerializeWhatsAppForClient";
import { logger } from "../utils/logger";
import RunManualWhatsAppReconciliationService from "../services/WhatsappService/RunManualWhatsAppReconciliationService";
import {
  getWhatsAppReconciliationRuntimeState,
  WhatsAppReconciliationBlockedError
} from "../services/WhatsappService/WhatsAppReconciliationRuntime";

interface SharingSettingsData {
  isShared: boolean;
  distributionEnabled: boolean;
  distributionMode?: string | null;
  distributionUserIds?: number[];
}

interface WhatsappData {
  name: string;
  queueIds: number[];
  greetingMessage?: string;
  farewellMessage?: string;
  status?: string;
  isDefault?: boolean;
  linkedUserId?: number | null;
  linkedUserIds?: number[];
  linkedUserSignMessages?: boolean;
  providerType?: string;
  wabaId?: string;
  phoneNumberId?: string;
  businessAccountId?: string;
  accessToken?: string;
  verifyToken?: string;
  appSecret?: string;
  apiVersion?: string;
  sharingSettings?: SharingSettingsData;
}

export const index = async (req: Request, res: Response): Promise<Response> => {
  const whatsapps = await ListWhatsAppsService();

  return res
    .status(200)
    .json(whatsapps.map(SerializeWhatsAppForClient));
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const {
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    linkedUserId,
    linkedUserIds,
    linkedUserSignMessages,
    providerType,
    wabaId,
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken,
    appSecret,
    apiVersion,
    sharingSettings
  }: WhatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await CreateWhatsAppService({
    name,
    status,
    isDefault,
    greetingMessage,
    farewellMessage,
    queueIds,
    linkedUserId,
    linkedUserIds,
    linkedUserSignMessages,
    providerType,
    wabaId,
    phoneNumberId,
    businessAccountId,
    accessToken,
    verifyToken,
    appSecret,
    apiVersion,
    sharingSettings
  });

  const formattedWhatsApp = await ShowWhatsAppService(whatsapp.id);
  const formattedOldDefaultWhatsapp = oldDefaultWhatsapp
    ? await ShowWhatsAppService(oldDefaultWhatsapp.id)
    : null;

  if (formattedWhatsApp.providerType !== "official") {
    StartWhatsAppSession(formattedWhatsApp, { reason: "create" });
  }

  const serializedWhatsApp =
    SerializeWhatsAppForClient(formattedWhatsApp);
  const savedSharingSettings =
    await GetWhatsAppSharingSettingsService(formattedWhatsApp.id);
  const responseWhatsApp = {
    ...serializedWhatsApp,
    sharingSettings: savedSharingSettings
  };
  const serializedOldDefaultWhatsapp = formattedOldDefaultWhatsapp
    ? SerializeWhatsAppForClient(formattedOldDefaultWhatsapp)
    : null;

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp: serializedWhatsApp
  });

  if (serializedOldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: serializedOldDefaultWhatsapp
    });
  }

  return res.status(200).json(responseWhatsApp);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { whatsappId } = req.params;

  const whatsapp = await ShowWhatsAppService(whatsappId);
  const sharingSettings =
    await GetWhatsAppSharingSettingsService(whatsapp.id);

  return res.status(200).json({
    ...SerializeWhatsAppForClient(whatsapp),
    sharingSettings
  });
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsappData = req.body;

  const { whatsapp, oldDefaultWhatsapp } = await UpdateWhatsAppService({
    whatsappData,
    whatsappId
  });

  const formattedWhatsApp = await ShowWhatsAppService(whatsapp.id);
  const formattedOldDefaultWhatsapp = oldDefaultWhatsapp
    ? await ShowWhatsAppService(oldDefaultWhatsapp.id)
    : null;

  const serializedWhatsApp =
    SerializeWhatsAppForClient(formattedWhatsApp);
  const savedSharingSettings =
    await GetWhatsAppSharingSettingsService(formattedWhatsApp.id);
  const responseWhatsApp = {
    ...serializedWhatsApp,
    sharingSettings: savedSharingSettings
  };
  const serializedOldDefaultWhatsapp = formattedOldDefaultWhatsapp
    ? SerializeWhatsAppForClient(formattedOldDefaultWhatsapp)
    : null;

  const io = getIO();
  io.emit("whatsapp", {
    action: "update",
    whatsapp: serializedWhatsApp
  });

  if (serializedOldDefaultWhatsapp) {
    io.emit("whatsapp", {
      action: "update",
      whatsapp: serializedOldDefaultWhatsapp
    });
  }

  return res.status(200).json(responseWhatsApp);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  await DeleteWhatsAppService(whatsappId);
  await whatsappProvider.removeSession(+whatsappId);

  const io = getIO();
  io.emit("whatsapp", {
    action: "delete",
    whatsappId: +whatsappId
  });

  return res.status(200).json({ message: "Whatsapp deleted." });
};

export const reconciliationState = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp =
    await ShowWhatsAppService(whatsappId);

  if (whatsapp.providerType === "official") {
    return res.status(400).json({
      error: "ERR_WHATSAPP_RECONCILIATION_UNSUPPORTED_PROVIDER"
    });
  }

  const configuredProvider =
    String(
      process.env.WHATSAPP_PROVIDER ||
      "wwebjs"
    ).toLowerCase();

  if (configuredProvider !== "wwebjs") {
    return res.status(400).json({
      error: "ERR_WHATSAPP_RECONCILIATION_UNSUPPORTED_PROVIDER"
    });
  }

  const state =
    await getWhatsAppReconciliationRuntimeState(
      whatsapp.id
    );

  return res.status(200).json(state);
};

export const reconcile = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;

  const requesterUserId =
    Number(req.user.id);

  if (
    !Number.isInteger(requesterUserId) ||
    requesterUserId <= 0
  ) {
    return res.status(401).json({
      error: "ERR_INVALID_AUTHENTICATED_USER"
    });
  }

  const whatsapp =
    await ShowWhatsAppService(whatsappId);

  if (whatsapp.providerType === "official") {
    return res.status(400).json({
      error: "ERR_WHATSAPP_RECONCILIATION_UNSUPPORTED_PROVIDER"
    });
  }

  const configuredProvider =
    String(
      process.env.WHATSAPP_PROVIDER ||
      "wwebjs"
    ).toLowerCase();

  if (configuredProvider !== "wwebjs") {
    return res.status(400).json({
      error: "ERR_WHATSAPP_RECONCILIATION_UNSUPPORTED_PROVIDER"
    });
  }

  if (
    !whatsappProvider.isSessionReady(
      whatsapp.id
    )
  ) {
    return res.status(409).json({
      error: "ERR_WAPP_NOT_INITIALIZED"
    });
  }

  logger.info(
    {
      whatsappId: whatsapp.id,
      requestedByUserId:
        requesterUserId
    },
    "Manual WhatsApp reconciliation requested"
  );

  try {
    const result =
      await RunManualWhatsAppReconciliationService({
        whatsappId: whatsapp.id
      });

    const state =
      await getWhatsAppReconciliationRuntimeState(
        whatsapp.id
      );

    logger.info(
      {
        whatsappId: whatsapp.id,
        requestedByUserId:
          requesterUserId,
        checkedMessages:
          result.checkedMessages,
        importedMessages:
          result.importedMessages,
        existingMessages:
          result.existingMessages,
        skippedMessages:
          result.skippedMessages,
        contactsChecked:
          result.contactsChecked
      },
      "Manual WhatsApp reconciliation completed"
    );

    return res.status(200).json({
      ...result,
      requestedByUserId:
        requesterUserId,
      state
    });
  } catch (err) {
    if (
      err instanceof
      WhatsAppReconciliationBlockedError
    ) {
      return res.status(409).json({
        error: err.message,
        reason: err.reason,
        retryAfterMs:
          err.retryAfterMs
      });
    }

    try {
      require("fs").appendFileSync(
        "/tmp/samachat-p05-reconcile-error.log",
        `${JSON.stringify({
          timestamp: new Date().toISOString(),
          whatsappId: whatsapp.id,
          requestedByUserId: requesterUserId,
          errorName:
            err instanceof Error
              ? err.name
              : typeof err,
          errorMessage:
            err instanceof Error
              ? err.message
              : String(err),
          errorStack:
            err instanceof Error
              ? err.stack
              : null
        })}\n`,
        "utf8"
      );
    } catch (diagnosticErr) {
      logger.error(
        {
          whatsappId: whatsapp.id,
          requestedByUserId: requesterUserId,
          err: diagnosticErr
        },
        "Unable to persist manual WhatsApp reconciliation diagnostic"
      );
    }

    throw err;
  }
};

export const restart = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { whatsappId } = req.params;
  const whatsapp = await ShowWhatsAppService(whatsappId);

  if (whatsapp.providerType === "official") {
    return res.status(400).json({
      message: "Official Cloud API connections do not use QR sessions."
    });
  }

  await whatsappProvider.removeSession(whatsapp.id);
  void StartWhatsAppSession(whatsapp, { reason: "manual_restart" });

  return res.status(200).json({ message: "Restarting session." });
};
