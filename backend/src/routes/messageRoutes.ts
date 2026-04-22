import { Router } from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageController";

const messageRoutes = Router();

const upload = multer(uploadConfig);

messageRoutes.get(
  "/messages/:ticketId",
  isAuth,
  checkSectorPermission("messages.view"),
  MessageController.index
);

messageRoutes.post(
  "/messages/:ticketId",
  isAuth,
  checkSectorPermission("messages.create"),
  upload.array("medias"),
  MessageController.store
);

messageRoutes.delete(
  "/messages/:messageId",
  isAuth,
  checkSectorPermission("messages.delete"),
  MessageController.remove
);

export default messageRoutes;
