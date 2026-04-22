import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as AdminInformativeController from "../controllers/Admin/AdminInformativeController";
import * as AdminKanbanController from "../controllers/Admin/AdminKanbanController";
import * as AdminTaskController from "../controllers/Admin/AdminTaskController";
import * as AdminFileListController from "../controllers/Admin/AdminFileListController";

const adminRoutes = express.Router();

adminRoutes.get(
  "/admin/informatives",
  isAuth,
  checkSectorPermission("informatives.view"),
  AdminInformativeController.index
);
adminRoutes.get(
  "/admin/informatives/:informativeId",
  isAuth,
  checkSectorPermission("informatives.view"),
  AdminInformativeController.show
);
adminRoutes.post(
  "/admin/informatives",
  isAuth,
  checkSectorPermission("informatives.create"),
  AdminInformativeController.store
);
adminRoutes.put(
  "/admin/informatives/:informativeId",
  isAuth,
  checkSectorPermission("informatives.update"),
  AdminInformativeController.update
);
adminRoutes.delete(
  "/admin/informatives/:informativeId",
  isAuth,
  checkSectorPermission("informatives.delete"),
  AdminInformativeController.remove
);

adminRoutes.get(
  "/admin/kanban",
  isAuth,
  checkSectorPermission("kanban.view"),
  AdminKanbanController.index
);
adminRoutes.get(
  "/admin/kanban/columns",
  isAuth,
  checkSectorPermission("kanban.columns.view"),
  AdminKanbanController.columnsIndex
);
adminRoutes.post(
  "/admin/kanban/columns",
  isAuth,
  checkSectorPermission("kanban.columns.create"),
  AdminKanbanController.columnsStore
);
adminRoutes.put(
  "/admin/kanban/columns/reorder",
  isAuth,
  checkSectorPermission("kanban.columns.reorder"),
  AdminKanbanController.columnsReorder
);
adminRoutes.put(
  "/admin/kanban/columns/:columnId",
  isAuth,
  checkSectorPermission("kanban.columns.update"),
  AdminKanbanController.columnsUpdate
);
adminRoutes.post(
  "/admin/kanban/move",
  isAuth,
  checkSectorPermission("kanban.move"),
  AdminKanbanController.move
);

adminRoutes.get(
  "/admin/tasks",
  isAuth,
  checkSectorPermission("tasks.view"),
  AdminTaskController.index
);
adminRoutes.get(
  "/admin/tasks/:taskId",
  isAuth,
  checkSectorPermission("tasks.view"),
  AdminTaskController.show
);
adminRoutes.post(
  "/admin/tasks",
  isAuth,
  checkSectorPermission("tasks.create"),
  AdminTaskController.store
);
adminRoutes.put(
  "/admin/tasks/:taskId",
  isAuth,
  checkSectorPermission("tasks.update"),
  AdminTaskController.update
);
adminRoutes.put(
  "/admin/tasks/:taskId/close",
  isAuth,
  checkSectorPermission("tasks.close"),
  AdminTaskController.close
);
adminRoutes.put(
  "/admin/tasks/:taskId/reopen",
  isAuth,
  checkSectorPermission("tasks.reopen"),
  AdminTaskController.reopen
);
adminRoutes.delete(
  "/admin/tasks/:taskId",
  isAuth,
  checkSectorPermission("tasks.delete"),
  AdminTaskController.remove
);

adminRoutes.get(
  "/admin/files",
  isAuth,
  checkSectorPermission("files.view"),
  AdminFileListController.index
);
adminRoutes.get(
  "/admin/files/:fileId/resolve",
  isAuth,
  checkSectorPermission("files.view"),
  AdminFileListController.resolve
);
adminRoutes.get(
  "/admin/files/:fileId/download",
  isAuth,
  checkSectorPermission("files.view"),
  AdminFileListController.download
);

export default adminRoutes;
