import express from "express";

import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as EduzzIntegrationRuleController from "../controllers/EduzzIntegrationRuleController";

const eduzzIntegrationRuleRoutes =
  express.Router();

eduzzIntegrationRuleRoutes.get(
  "/integrations/:integrationId/eduzz-rules",
  isAuth,
  checkSectorPermission("integrations.view"),
  EduzzIntegrationRuleController.index
);

eduzzIntegrationRuleRoutes.post(
  "/integrations/:integrationId/eduzz-rules",
  isAuth,
  checkSectorPermission("integrations.create"),
  EduzzIntegrationRuleController.store
);

eduzzIntegrationRuleRoutes.put(
  "/integrations/:integrationId/eduzz-rules/:ruleId",
  isAuth,
  checkSectorPermission("integrations.update"),
  EduzzIntegrationRuleController.update
);

eduzzIntegrationRuleRoutes.delete(
  "/integrations/:integrationId/eduzz-rules/:ruleId",
  isAuth,
  checkSectorPermission("integrations.delete"),
  EduzzIntegrationRuleController.remove
);

export default eduzzIntegrationRuleRoutes;
