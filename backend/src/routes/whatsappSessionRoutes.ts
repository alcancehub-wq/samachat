import { Router } from "express";
import isAuth from "../middleware/isAuth";
import canManageWhatsAppSession from "../middleware/canManageWhatsAppSession";

import WhatsAppSessionController from "../controllers/WhatsAppSessionController";

const whatsappSessionRoutes = Router();

whatsappSessionRoutes.post(
  "/whatsappsession/:whatsappId",
  isAuth,
  canManageWhatsAppSession,
  WhatsAppSessionController.store
);

whatsappSessionRoutes.put(
  "/whatsappsession/:whatsappId",
  isAuth,
  canManageWhatsAppSession,
  WhatsAppSessionController.update
);

whatsappSessionRoutes.delete(
  "/whatsappsession/:whatsappId",
  isAuth,
  canManageWhatsAppSession,
  WhatsAppSessionController.remove
);

export default whatsappSessionRoutes;
