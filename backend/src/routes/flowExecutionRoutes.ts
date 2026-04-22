import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as FlowExecutionController from "../controllers/FlowExecutionController";

const flowExecutionRoutes = express.Router();

flowExecutionRoutes.get(
  "/flow-executions",
  isAuth,
  checkSectorPermission("flows.executions.view"),
  FlowExecutionController.index
);

flowExecutionRoutes.get(
  "/flow-executions/:executionId",
  isAuth,
  checkSectorPermission("flows.executions.view"),
  FlowExecutionController.show
);

flowExecutionRoutes.post(
  "/flows/:flowId/test",
  isAuth,
  checkSectorPermission("flows.test"),
  FlowExecutionController.test
);

flowExecutionRoutes.post(
  "/flows/:flowId/execute",
  isAuth,
  checkSectorPermission("flows.execute"),
  FlowExecutionController.execute
);

export default flowExecutionRoutes;
