import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as FileListController from "../controllers/FileListController";

const fileListRoutes = express.Router();

fileListRoutes.get(
	"/files",
	isAuth,
	checkSectorPermission("files.view"),
	FileListController.index
);

export default fileListRoutes;
