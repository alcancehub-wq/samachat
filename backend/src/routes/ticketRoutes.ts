import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as TicketController from "../controllers/TicketController";

const ticketRoutes = express.Router();

ticketRoutes.get(
	"/tickets",
	isAuth,
	checkSectorPermission("tickets.view"),
	TicketController.index
);

ticketRoutes.get(
	"/tickets/:ticketId",
	isAuth,
	checkSectorPermission("tickets.view"),
	TicketController.show
);

ticketRoutes.post(
	"/tickets",
	isAuth,
	checkSectorPermission("tickets.create"),
	TicketController.store
);

ticketRoutes.put(
	"/tickets/:ticketId",
	isAuth,
	checkSectorPermission("tickets.update"),
	TicketController.update
);

ticketRoutes.delete(
	"/tickets/:ticketId",
	isAuth,
	checkSectorPermission("tickets.delete"),
	TicketController.remove
);

export default ticketRoutes;
