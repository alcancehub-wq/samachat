import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as TagController from "../controllers/TagController";

const tagRoutes = express.Router();

tagRoutes.get(
	"/tags",
	isAuth,
	checkSectorPermission("tags.view"),
	TagController.index
);

tagRoutes.get(
	"/tags/:tagId",
	isAuth,
	checkSectorPermission("tags.view"),
	TagController.show
);

tagRoutes.post(
	"/tags",
	isAuth,
	checkSectorPermission("tags.create"),
	TagController.store
);

tagRoutes.put(
	"/tags/:tagId",
	isAuth,
	checkSectorPermission("tags.update"),
	TagController.update
);

tagRoutes.delete(
	"/tags/:tagId",
	isAuth,
	checkSectorPermission("tags.delete"),
	TagController.remove
);

export default tagRoutes;
