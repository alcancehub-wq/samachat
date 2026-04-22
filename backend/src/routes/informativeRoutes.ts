import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as InformativeController from "../controllers/InformativeController";

const informativeRoutes = express.Router();

informativeRoutes.get(
  "/informatives",
  isAuth,
  checkSectorPermission("informatives.view"),
  InformativeController.index
);

informativeRoutes.get(
  "/informatives/:informativeId",
  isAuth,
  checkSectorPermission("informatives.view"),
  InformativeController.show
);

informativeRoutes.post(
  "/informatives",
  isAuth,
  checkSectorPermission("informatives.create"),
  InformativeController.store
);

informativeRoutes.put(
  "/informatives/:informativeId",
  isAuth,
  checkSectorPermission("informatives.update"),
  InformativeController.update
);

informativeRoutes.delete(
  "/informatives/:informativeId",
  isAuth,
  checkSectorPermission("informatives.delete"),
  InformativeController.remove
);

export default informativeRoutes;
