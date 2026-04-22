import { Router } from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as SettingController from "../controllers/SettingController";

const settingRoutes = Router();

settingRoutes.get(
	"/settings",
	isAuth,
	checkSectorPermission("settings.view"),
	SettingController.index
);

// routes.get("/settings/:settingKey", isAuth, SettingsController.show);

// change setting key to key in future
settingRoutes.put(
	"/settings/:settingKey",
	isAuth,
	checkSectorPermission("settings.update"),
	SettingController.update
);

export default settingRoutes;
