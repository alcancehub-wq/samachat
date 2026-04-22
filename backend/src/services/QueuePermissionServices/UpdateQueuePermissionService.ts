import * as Yup from "yup";
import AppError from "../../errors/AppError";
import QueuePermission from "../../models/QueuePermission";
import Queue from "../../models/Queue";
import { SECTOR_PERMISSION_KEYS } from "../../utils/sectorPermissions";

interface Request {
  queueId: number | string;
  permissions: string[];
}

const UpdateQueuePermissionService = async ({
  queueId,
  permissions
}: Request): Promise<QueuePermission> => {
  const normalizedPermissions = Array.isArray(permissions)
    ? permissions
        .filter(permission => typeof permission === "string")
        .map(permission => permission.trim())
        .filter(permission => permission.length > 0)
    : [];

  const allowedPermissions = Array.from(
    new Set(
      normalizedPermissions.filter(permission =>
        SECTOR_PERMISSION_KEYS.includes(permission)
      )
    )
  );

  const schema = Yup.object().shape({
    permissions: Yup.array()
      .of(Yup.string().oneOf(SECTOR_PERMISSION_KEYS))
      .required()
  });

  try {
    await schema.validate({ permissions: allowedPermissions });
  } catch (err) {
    throw new AppError(err.message);
  }

  const queue = await Queue.findByPk(queueId);

  if (!queue) {
    throw new AppError("ERR_QUEUE_NOT_FOUND", 404);
  }

  const existing = await QueuePermission.findOne({ where: { queueId } });

  if (!existing) {
    return QueuePermission.create({
      queueId: Number(queueId),
      permissions: allowedPermissions
    });
  }

  await existing.update({ permissions: allowedPermissions });

  return existing;
};

export default UpdateQueuePermissionService;
