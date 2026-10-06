import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as IntegrationController from "../controllers/IntegrationController";
import * as CrmM2mOperationalConfigController from "../controllers/CrmM2mOperationalConfigController";

const integrationRoutes = express.Router();

integrationRoutes.get(
  "/integrations",
  isAuth,
  checkSectorPermission("integrations.view"),
  IntegrationController.index
);

integrationRoutes.get(
  "/integrations/crm-m2m-status",
  isAuth,
  checkSectorPermission("integrations.view"),
  IntegrationController.crmM2mStatus
);

integrationRoutes.get(
  "/integrations/:integrationId/crm-m2m-config",
  isAuth,
  checkSectorPermission("integrations.view"),
  CrmM2mOperationalConfigController.show
);

integrationRoutes.put(
  "/integrations/:integrationId/crm-m2m-config",
  isAuth,
  checkSectorPermission("integrations.update"),
  CrmM2mOperationalConfigController.update
);

integrationRoutes.get(
  "/integrations/:integrationId",
  isAuth,
  checkSectorPermission("integrations.view"),
  IntegrationController.show
);

integrationRoutes.post(
  "/integrations",
  isAuth,
  checkSectorPermission("integrations.create"),
  IntegrationController.store
);

integrationRoutes.put(
  "/integrations/:integrationId",
  isAuth,
  checkSectorPermission("integrations.update"),
  IntegrationController.update
);

integrationRoutes.delete(
  "/integrations/:integrationId",
  isAuth,
  checkSectorPermission("integrations.delete"),
  IntegrationController.remove
);

export default integrationRoutes;
