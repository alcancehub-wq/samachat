import { Router } from "express";
import * as CloudApiWebhookController from "../controllers/CloudApiWebhookController";

const cloudApiWebhookRoutes = Router();

cloudApiWebhookRoutes.post(
  "/cloud-api/webhook/:whatsappId",
  CloudApiWebhookController.receive
);

cloudApiWebhookRoutes.get(
  "/cloud-api/webhook/:whatsappId",
  CloudApiWebhookController.verify
);

export default cloudApiWebhookRoutes;
