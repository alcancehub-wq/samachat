import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";
import * as OpenAIAuditController from "../controllers/OpenAIAuditController";

const aiRoutes = express.Router();

aiRoutes.post(
  "/ai/audit",
  isAuth,
  checkSectorPermission("openai.use"),
  OpenAIAuditController.audit
);

aiRoutes.post(
  "/ai/fix-plan",
  isAuth,
  checkSectorPermission("openai.use"),
  OpenAIAuditController.fixPlan
);

export default aiRoutes;
