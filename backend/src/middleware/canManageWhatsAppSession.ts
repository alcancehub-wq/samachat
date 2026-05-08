import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import User from "../models/User";
import GetUserPermissionsService from "../services/PermissionServices/GetUserPermissionsService";

const canManageWhatsAppSession = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  if (req.user?.profile?.toLowerCase() === "admin") {
    return next();
  }

  const userPermissions = await GetUserPermissionsService(req.user.id);

  if (userPermissions.includes("connections.session.manage")) {
    return next();
  }

  const requestedWhatsAppId = Number(req.params.whatsappId);

  if (!Number.isNaN(requestedWhatsAppId)) {
    const user = await User.findByPk(req.user.id, {
      attributes: ["id", "whatsappId"]
    });

    if (user?.whatsappId === requestedWhatsAppId) {
      return next();
    }
  }

  throw new AppError("ERR_NO_PERMISSION", 403);
};

export default canManageWhatsAppSession;