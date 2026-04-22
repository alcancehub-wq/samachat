import { Router } from "express";

import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";
import * as UserController from "../controllers/UserController";

const userRoutes = Router();

userRoutes.get(
	"/users",
	isAuth,
	checkSectorPermission("users.view"),
	UserController.index
);

userRoutes.post(
	"/users",
	isAuth,
	checkSectorPermission("users.create"),
	UserController.store
);

userRoutes.put(
	"/users/:userId",
	isAuth,
	checkSectorPermission("users.update"),
	UserController.update
);

userRoutes.get(
	"/users/:userId",
	isAuth,
	checkSectorPermission("users.view"),
	UserController.show
);

userRoutes.delete(
	"/users/:userId",
	isAuth,
	checkSectorPermission("users.delete"),
	UserController.remove
);

export default userRoutes;
