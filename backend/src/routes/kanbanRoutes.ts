import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as KanbanController from "../controllers/KanbanController";

const kanbanRoutes = express.Router();

kanbanRoutes.get(
	"/kanban",
	isAuth,
	checkSectorPermission("kanban.view"),
	KanbanController.index
);

kanbanRoutes.get(
	"/kanban/columns",
	isAuth,
	checkSectorPermission("kanban.columns.view"),
	KanbanController.columnsIndex
);

kanbanRoutes.post(
	"/kanban/columns",
	isAuth,
	checkSectorPermission("kanban.columns.create"),
	KanbanController.columnsStore
);

kanbanRoutes.put(
	"/kanban/columns/reorder",
isAuth,
checkSectorPermission("kanban.columns.reorder"),
	KanbanController.columnsReorder
);

kanbanRoutes.put(
	"/kanban/columns/:columnId",
isAuth,
checkSectorPermission("kanban.columns.update"),
	KanbanController.columnsUpdate
);

kanbanRoutes.post(
	"/kanban/move",
	isAuth,
	checkSectorPermission("kanban.move"),
	KanbanController.move
);

export default kanbanRoutes;
