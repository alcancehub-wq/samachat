import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as MetaMessageTemplateController from "../controllers/MetaMessageTemplateController";

const metaMessageTemplateRoutes = express.Router();

metaMessageTemplateRoutes.get(
  "/meta-message-templates/authorized-connections",
  isAuth,
  checkSectorPermission("metaTemplates.view"),
  MetaMessageTemplateController.authorizedConnections
);

metaMessageTemplateRoutes.get(
  "/meta-message-templates/:whatsappId",
  isAuth,
  checkSectorPermission("metaTemplates.view"),
  MetaMessageTemplateController.index
);

metaMessageTemplateRoutes.post(
  "/meta-message-templates/:whatsappId",
  isAuth,
  checkSectorPermission("metaTemplates.create"),
  MetaMessageTemplateController.store
);

metaMessageTemplateRoutes.delete(
  "/meta-message-templates/:whatsappId/:name",
  isAuth,
  checkSectorPermission("metaTemplates.delete"),
  MetaMessageTemplateController.destroy
);

export default metaMessageTemplateRoutes;