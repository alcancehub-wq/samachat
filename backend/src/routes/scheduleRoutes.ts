import express from "express";
import multer from "multer";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";
import uploadConfig from "../config/upload";

import * as ScheduleController from "../controllers/ScheduleController";

const scheduleRoutes = express.Router();
const upload = multer(uploadConfig);

scheduleRoutes.get(
  "/schedules",
  isAuth,
  checkSectorPermission("schedules.view"),
  ScheduleController.index
);

scheduleRoutes.get(
  "/schedules/:scheduleId",
  isAuth,
  checkSectorPermission("schedules.view"),
  ScheduleController.show
);

scheduleRoutes.post(
  "/schedules",
  isAuth,
  checkSectorPermission("schedules.create"),
  upload.single("media"),
  ScheduleController.store
);

scheduleRoutes.put(
  "/schedules/:scheduleId",
  isAuth,
  checkSectorPermission("schedules.update"),
  upload.single("media"),
  ScheduleController.update
);

scheduleRoutes.put(
  "/schedules/:scheduleId/cancel",
  isAuth,
  checkSectorPermission("schedules.cancel"),
  ScheduleController.cancel
);

scheduleRoutes.put(
  "/schedules/:scheduleId/reopen",
  isAuth,
  checkSectorPermission("schedules.reopen"),
  ScheduleController.reopen
);

scheduleRoutes.delete(
  "/schedules/:scheduleId",
  isAuth,
  checkSectorPermission("schedules.delete"),
  ScheduleController.remove
);

export default scheduleRoutes;
