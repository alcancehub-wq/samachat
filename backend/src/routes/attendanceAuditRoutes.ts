import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";
import * as AttendanceAuditController from "../controllers/AttendanceAuditController";

const attendanceAuditRoutes = express.Router();

attendanceAuditRoutes.get(
  "/attendance-audit/dossier",
  isAuth,
  checkSectorPermission("openai.use"),
  AttendanceAuditController.dossier
);

attendanceAuditRoutes.get(
  "/attendance-audit/report",
  isAuth,
  checkSectorPermission("openai.use"),
  AttendanceAuditController.report
);

export default attendanceAuditRoutes;
