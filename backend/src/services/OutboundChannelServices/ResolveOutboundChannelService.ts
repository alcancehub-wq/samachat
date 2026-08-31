import AppError from "../../errors/AppError";
import GetDefaultWhatsApp from "../../helpers/GetDefaultWhatsApp";
import Whatsapp from "../../models/Whatsapp";
import AuthorizeOfficialOutboundConnectionService from "./AuthorizeOfficialOutboundConnectionService";
import LoadOfficialOutboundConnectionService from "./LoadOfficialOutboundConnectionService";
import {
  OutboundChannelMode,
  ResolveOutboundChannelRequest,
  ResolvedOutboundChannel
} from "./types";

const normalizeMode = (
  mode?: OutboundChannelMode | null
): OutboundChannelMode => {
  if (!mode) {
    return "STANDARD";
  }

  if (mode === "STANDARD" || mode === "OFFICIAL") {
    return mode;
  }

  throw new AppError("ERR_OUTBOUND_CHANNEL_MODE_INVALID", 400);
};

const loadExistingTicketWhatsapp = async (
  whatsappId: number
): Promise<Whatsapp> => {
  const whatsapp = await Whatsapp.findByPk(whatsappId);

  if (!whatsapp) {
    throw new AppError("ERR_NO_WAPP_FOUND", 404);
  }

  return whatsapp;
};

const ResolveOutboundChannelService = async ({
  mode,
  context,
  ownerUserId,
  actorProfile,
  actorQueueIds = [],
  existingTicketWhatsappId,
  officialWhatsappId
}: ResolveOutboundChannelRequest): Promise<ResolvedOutboundChannel> => {
  const resolvedMode = normalizeMode(mode);
  const normalizedOwnerUserId = Number(ownerUserId);

  if (
    !Number.isInteger(normalizedOwnerUserId) ||
    normalizedOwnerUserId <= 0
  ) {
    throw new AppError("ERR_OUTBOUND_OWNER_REQUIRED", 400);
  }

  if (resolvedMode === "STANDARD") {
    const whatsapp =
      existingTicketWhatsappId !== null &&
      existingTicketWhatsappId !== undefined
        ? await loadExistingTicketWhatsapp(
            Number(existingTicketWhatsappId)
          )
        : await GetDefaultWhatsApp(normalizedOwnerUserId);

    return {
      mode: "STANDARD",
      context,
      ownerUserId: normalizedOwnerUserId,
      whatsappId: whatsapp.id,
      providerType: whatsapp.providerType || "",
      whatsapp
    };
  }

  const normalizedOfficialWhatsappId =
    Number(officialWhatsappId);

  if (
    !Number.isInteger(normalizedOfficialWhatsappId) ||
    normalizedOfficialWhatsappId <= 0
  ) {
    throw new AppError(
      "ERR_META_OUTBOUND_OFFICIAL_CONNECTION_REQUIRED",
      400
    );
  }

  const whatsapp =
    await LoadOfficialOutboundConnectionService(
      normalizedOfficialWhatsappId
    );

  AuthorizeOfficialOutboundConnectionService({
    profile: actorProfile,
    userQueueIds: actorQueueIds,
    connection: whatsapp
  });

  return {
    mode: "OFFICIAL",
    context,
    ownerUserId: normalizedOwnerUserId,
    whatsappId: whatsapp.id,
    providerType: whatsapp.providerType || "",
    whatsapp
  };
};

export default ResolveOutboundChannelService;
