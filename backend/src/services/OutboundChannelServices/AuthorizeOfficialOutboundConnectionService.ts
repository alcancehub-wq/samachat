import AppError from "../../errors/AppError";
import {
  DEFAULT_SECTOR_PERMISSIONS,
  expandSectorPermissions
} from "../../utils/sectorPermissions";

interface QueuePermissionLike {
  permissions?: unknown;
}

interface QueueLike {
  id: number;
  permission?: QueuePermissionLike | null;
}

interface ConnectionLike {
  providerType?: string | null;
  queues?: QueueLike[];
}

interface Request {
  profile?: string | null;
  userQueueIds: number[];
  connection: ConnectionLike;
}

export const OUTBOUND_PERMISSION = "metaOutbound.send";

const normalizePermissions = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    const normalized = value.filter(
      item => typeof item === "string"
    ) as string[];

    return normalized.length > 0
      ? expandSectorPermissions(normalized)
      : [...DEFAULT_SECTOR_PERMISSIONS];
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        const normalized = parsed.filter(
          item => typeof item === "string"
        ) as string[];

        return normalized.length > 0
          ? expandSectorPermissions(normalized)
          : [...DEFAULT_SECTOR_PERMISSIONS];
      }
    } catch {
      return [];
    }
  }

  return [...DEFAULT_SECTOR_PERMISSIONS];
};

const AuthorizeOfficialOutboundConnectionService = ({
  profile,
  userQueueIds,
  connection
}: Request): void => {
  if (
    String(connection.providerType || "")
      .trim()
      .toLowerCase() !== "official"
  ) {
    throw new AppError(
      "ERR_META_OUTBOUND_OFFICIAL_CONNECTION_REQUIRED",
      400
    );
  }

  if (
    String(profile || "")
      .trim()
      .toLowerCase() === "admin"
  ) {
    return;
  }

  const userQueueSet = new Set(
    userQueueIds
      .map(queueId => Number(queueId))
      .filter(queueId => Number.isInteger(queueId) && queueId > 0)
  );

  const authorized = (connection.queues || []).some(queue => {
    if (!userQueueSet.has(Number(queue.id))) {
      return false;
    }

    return normalizePermissions(
      queue.permission?.permissions
    ).includes(OUTBOUND_PERMISSION);
  });

  if (!authorized) {
    throw new AppError("ERR_NO_PERMISSION", 403);
  }
};

export default AuthorizeOfficialOutboundConnectionService;
