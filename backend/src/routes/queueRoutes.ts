import { Router } from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as QueueController from "../controllers/QueueController";
import * as QueuePermissionController from "../controllers/QueuePermissionController";

const queueRoutes = Router();

queueRoutes.get("/queue", isAuth, checkSectorPermission("sectors.view"), QueueController.index);

queueRoutes.post(
	"/queue",
	isAuth,
	checkSectorPermission("sectors.create"),
	QueueController.store
);

queueRoutes.get(
	"/queue/:queueId",
	isAuth,
	checkSectorPermission("sectors.view"),
	QueueController.show
);

queueRoutes.put(
	"/queue/:queueId",
	isAuth,
	checkSectorPermission("sectors.update"),
	QueueController.update
);

queueRoutes.delete(
	"/queue/:queueId",
	isAuth,
	checkSectorPermission("sectors.delete"),
	QueueController.remove
);

queueRoutes.get(
	"/queue/:queueId/permissions",
	isAuth,
	checkSectorPermission("sectors.permissions.update"),
	QueuePermissionController.show
);

queueRoutes.put(
	"/queue/:queueId/permissions",
	isAuth,
	checkSectorPermission("sectors.permissions.update"),
	QueuePermissionController.update
);

queueRoutes.get(
	"/queue-permissions",
	isAuth,
	checkSectorPermission("sectors.permissions.update"),
	QueuePermissionController.index
);

export default queueRoutes;
