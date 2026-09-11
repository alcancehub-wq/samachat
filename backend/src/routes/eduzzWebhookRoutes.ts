import { Router } from "express";

import * as EduzzWebhookController from "../controllers/EduzzWebhookController";

const eduzzWebhookRoutes = Router();

eduzzWebhookRoutes.post(
  "/integrations/eduzz/:integrationId/webhook",
  EduzzWebhookController.receive
);

export default eduzzWebhookRoutes;
