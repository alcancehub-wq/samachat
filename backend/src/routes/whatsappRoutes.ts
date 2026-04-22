import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as WhatsAppController from "../controllers/WhatsAppController";

const whatsappRoutes = express.Router();

whatsappRoutes.get(
  "/whatsapp/",
  isAuth,
  checkSectorPermission("connections.view"),
  WhatsAppController.index
);

whatsappRoutes.post(
  "/whatsapp/",
  isAuth,
  checkSectorPermission("connections.create"),
  WhatsAppController.store
);

whatsappRoutes.get(
  "/whatsapp/:whatsappId",
  isAuth,
  checkSectorPermission("connections.view"),
  WhatsAppController.show
);

whatsappRoutes.put(
  "/whatsapp/:whatsappId",
  isAuth,
  checkSectorPermission("connections.update"),
  WhatsAppController.update
);

whatsappRoutes.post(
  "/whatsapp/:whatsappId/restart",
  isAuth,
  checkSectorPermission("connections.view"),
  WhatsAppController.restart
);

whatsappRoutes.delete(
  "/whatsapp/:whatsappId",
  isAuth,
  checkSectorPermission("connections.delete"),
  WhatsAppController.remove
);

export default whatsappRoutes;
