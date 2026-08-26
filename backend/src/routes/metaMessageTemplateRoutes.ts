import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as MetaMessageTemplateController from "../controllers/MetaMessageTemplateController";

const metaMessageTemplateRoutes = express.Router();

metaMessageTemplateRoutes.get(
  "/meta-message-templates/:whatsappId",
  isAuth,
  checkSectorPermission("metaTemplates.view"),
  MetaMessageTemplateController.index
);

export default metaMessageTemplateRoutes;
