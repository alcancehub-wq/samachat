import express from "express";

import * as DashboardController from "../controllers/DashboardController";
import isAuth from "../middleware/isAuth";

const dashboardRoutes = express.Router();

dashboardRoutes.get("/dashboard", isAuth, DashboardController.show);

export default dashboardRoutes;