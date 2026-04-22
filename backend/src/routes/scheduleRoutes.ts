import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as ScheduleController from "../controllers/ScheduleController";

const scheduleRoutes = express.Router();

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
  ScheduleController.store
);

scheduleRoutes.put(
  "/schedules/:scheduleId",
  isAuth,
  checkSectorPermission("schedules.update"),
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
