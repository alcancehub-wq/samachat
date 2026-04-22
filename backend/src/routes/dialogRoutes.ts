import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as DialogController from "../controllers/DialogController";

const dialogRoutes = express.Router();

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
  DialogController.store
);

dialogRoutes.put(
  "/dialogs/:dialogId",
  isAuth,
  checkSectorPermission("dialogs.update"),
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
