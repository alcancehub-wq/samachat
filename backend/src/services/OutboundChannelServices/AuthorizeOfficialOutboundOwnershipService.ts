import AppError from "../../errors/AppError";
import Queue from "../../models/Queue";
import User from "../../models/User";
import AuthorizeOfficialOutboundConnectionService from "./AuthorizeOfficialOutboundConnectionService";
import LoadOfficialOutboundConnectionService from "./LoadOfficialOutboundConnectionService";

interface Request {
  ownerUserId: number;
  ownerQueueId: number;
  actorProfile?: string | null;
  officialWhatsappId: number;
}

const AuthorizeOfficialOutboundOwnershipService = async ({
  ownerUserId,
  ownerQueueId,
  actorProfile,
  officialWhatsappId
}: Request): Promise<void> => {
  const normalizedOwnerUserId = Number(ownerUserId);
  const normalizedOwnerQueueId = Number(ownerQueueId);

  if (
    !Number.isInteger(normalizedOwnerUserId) ||
    normalizedOwnerUserId <= 0 ||
    !Number.isInteger(normalizedOwnerQueueId) ||
    normalizedOwnerQueueId <= 0
  ) {
    throw new AppError("ERR_META_OUTBOUND_OWNER_QUEUE_REQUIRED", 400);
  }

  const owner = await User.findByPk(normalizedOwnerUserId, {
    include: [{ model: Queue, as: "queues" }]
  });

  if (!owner) {
    throw new AppError("ERR_NO_USER_FOUND", 404);
  }

  const ownerQueueIds = (owner.queues || []).map(queue => Number(queue.id));

  if (!ownerQueueIds.includes(normalizedOwnerQueueId)) {
    throw new AppError("ERR_META_OUTBOUND_OWNER_QUEUE_FORBIDDEN", 403);
  }

  const connection = await LoadOfficialOutboundConnectionService(
    officialWhatsappId
  );

  AuthorizeOfficialOutboundConnectionService({
    profile: actorProfile || owner.profile,
    userQueueIds: [normalizedOwnerQueueId],
    connection
  });
};

export default AuthorizeOfficialOutboundOwnershipService;