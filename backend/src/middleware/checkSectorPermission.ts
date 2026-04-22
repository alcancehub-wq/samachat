import { Request, Response, NextFunction } from "express";
import AppError from "../errors/AppError";
import GetUserPermissionsService from "../services/PermissionServices/GetUserPermissionsService";

const checkSectorPermission = (permission: string) => {
  return async (req: Request, _res: Response, next: NextFunction) => {
    if (req.user?.profile?.toLowerCase() === "admin") {
      return next();
    }

    const userPermissions = await GetUserPermissionsService(req.user.id);

    if (!userPermissions.includes(permission)) {
      throw new AppError("ERR_NO_PERMISSION", 403);
    }

    return next();
  };
};

export default checkSectorPermission;
