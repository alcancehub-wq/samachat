import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as IntegrationController from "../controllers/IntegrationController";

const integrationRoutes = express.Router();

integrationRoutes.get(
  "/integrations",
  isAuth,
  checkSectorPermission("integrations.view"),
  IntegrationController.index
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
