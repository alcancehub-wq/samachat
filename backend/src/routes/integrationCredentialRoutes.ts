import express from "express";

import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";
import * as IntegrationCredentialController from "../controllers/IntegrationCredentialController";

const integrationCredentialRoutes = express.Router();

integrationCredentialRoutes.get(
  "/integrations/:integrationId/credentials",
  isAuth,
  checkSectorPermission("integrations.view"),
  IntegrationCredentialController.index
);

integrationCredentialRoutes.post(
  "/integrations/:integrationId/credentials",
  isAuth,
  checkSectorPermission("integrations.update"),
  IntegrationCredentialController.store
);

integrationCredentialRoutes.put(
  "/integrations/:integrationId/credentials/:credentialId",
  isAuth,
  checkSectorPermission("integrations.update"),
  IntegrationCredentialController.update
);

integrationCredentialRoutes.delete(
  "/integrations/:integrationId/credentials/:credentialId",
  isAuth,
  checkSectorPermission("integrations.delete"),
  IntegrationCredentialController.remove
);

export default integrationCredentialRoutes;