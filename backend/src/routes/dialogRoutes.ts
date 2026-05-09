import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";
import uploadConfig from "../config/upload";

import * as DialogController from "../controllers/DialogController";

const dialogRoutes = express.Router();
const upload = multer(uploadConfig);

dialogRoutes.get(
  "/dialogs",
  isAuth,
  checkSectorPermission("dialogs.view"),
  DialogController.index
);

dialogRoutes.get(
  "/dialogs/:dialogId",
  isAuth,
  checkSectorPermission("dialogs.view"),
  DialogController.show
);

dialogRoutes.post(
  "/dialogs",
  isAuth,
  checkSectorPermission("dialogs.create"),
  upload.single("media"),
  DialogController.store
);

dialogRoutes.put(
  "/dialogs/:dialogId",
  isAuth,
  checkSectorPermission("dialogs.update"),
  upload.single("media"),
  DialogController.update
);

dialogRoutes.delete(
  "/dialogs/:dialogId",
  isAuth,
  checkSectorPermission("dialogs.delete"),
  DialogController.remove
);

dialogRoutes.post(
  "/dialogs/:dialogId/duplicate",
  isAuth,
  checkSectorPermission("dialogs.duplicate"),
  DialogController.duplicate
);

export default dialogRoutes;
