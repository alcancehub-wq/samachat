import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as WebhookController from "../controllers/WebhookController";

const webhookRoutes = express.Router();

webhookRoutes.get(
  "/webhooks",
  isAuth,
  checkSectorPermission("webhooks.view"),
  WebhookController.index
);

webhookRoutes.get(
  "/webhooks/events",
  isAuth,
  checkSectorPermission("webhooks.events"),
  WebhookController.events
);

webhookRoutes.get(
  "/webhooks/:webhookId",
  isAuth,
  checkSectorPermission("webhooks.view"),
  WebhookController.show
);

webhookRoutes.post(
  "/webhooks",
  isAuth,
  checkSectorPermission("webhooks.create"),
  WebhookController.store
);

webhookRoutes.put(
  "/webhooks/:webhookId",
  isAuth,
  checkSectorPermission("webhooks.update"),
  WebhookController.update
);

webhookRoutes.delete(
  "/webhooks/:webhookId",
  isAuth,
  checkSectorPermission("webhooks.delete"),
  WebhookController.remove
);

webhookRoutes.post(
  "/webhooks/:webhookId/test",
  isAuth,
  checkSectorPermission("webhooks.test"),
  WebhookController.test
);

webhookRoutes.get(
  "/webhooks/:webhookId/logs",
  isAuth,
  checkSectorPermission("webhooks.logs"),
  WebhookController.logs
);

export default webhookRoutes;
