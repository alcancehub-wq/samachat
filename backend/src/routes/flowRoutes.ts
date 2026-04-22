import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as FlowController from "../controllers/FlowController";
import * as FlowNodeController from "../controllers/FlowNodeController";

const flowRoutes = express.Router();

flowRoutes.get(
	"/flows",
	isAuth,
	checkSectorPermission("flows.view"),
	FlowController.index
);

flowRoutes.get(
	"/flows/:flowId",
	isAuth,
	checkSectorPermission("flows.view"),
	FlowController.show
);

flowRoutes.post(
	"/flows",
	isAuth,
	checkSectorPermission("flows.create"),
	FlowController.store
);

flowRoutes.put(
	"/flows/:flowId",
	isAuth,
	checkSectorPermission("flows.update"),
	FlowController.update
);

flowRoutes.put(
	"/flows/:flowId/graph",
	isAuth,
	checkSectorPermission("flows.graph.update"),
	FlowController.updateGraph
);

flowRoutes.get(
	"/flows/:flowId/nodes",
	isAuth,
	checkSectorPermission("flows.nodes.view"),
	FlowNodeController.index
);

flowRoutes.put(
	"/flows/:flowId/publish",
	isAuth,
	checkSectorPermission("flows.publish"),
	FlowController.publish
);

flowRoutes.put(
	"/flows/:flowId/unpublish",
	isAuth,
	checkSectorPermission("flows.unpublish"),
	FlowController.unpublish
);

flowRoutes.delete(
	"/flows/:flowId",
	isAuth,
	checkSectorPermission("flows.delete"),
	FlowController.remove
);

export default flowRoutes;
