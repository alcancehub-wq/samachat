import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as TaskController from "../controllers/TaskController";

const taskRoutes = express.Router();

taskRoutes.get(
	"/tasks",
	isAuth,
	checkSectorPermission("tasks.view"),
	TaskController.index
);

taskRoutes.get(
	"/tasks/:taskId",
	isAuth,
	checkSectorPermission("tasks.view"),
	TaskController.show
);

taskRoutes.post(
	"/tasks",
	isAuth,
	checkSectorPermission("tasks.create"),
	TaskController.store
);

taskRoutes.put(
	"/tasks/:taskId",
	isAuth,
	checkSectorPermission("tasks.update"),
	TaskController.update
);

taskRoutes.put(
	"/tasks/:taskId/close",
	isAuth,
	checkSectorPermission("tasks.close"),
	TaskController.close
);

taskRoutes.put(
	"/tasks/:taskId/reopen",
	isAuth,
	checkSectorPermission("tasks.reopen"),
	TaskController.reopen
);

taskRoutes.delete(
	"/tasks/:taskId",
	isAuth,
	checkSectorPermission("tasks.delete"),
	TaskController.remove
);

export default taskRoutes;
