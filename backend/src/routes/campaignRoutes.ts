import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as CampaignController from "../controllers/CampaignController";

const campaignRoutes = express.Router();

campaignRoutes.get(
	"/campaigns",
	isAuth,
	checkSectorPermission("campaigns.view"),
	CampaignController.index
);

campaignRoutes.get(
	"/campaigns/:campaignId",
	isAuth,
	checkSectorPermission("campaigns.view"),
	CampaignController.show
);

campaignRoutes.post(
	"/campaigns",
	isAuth,
	checkSectorPermission("campaigns.create"),
	CampaignController.store
);

campaignRoutes.put(
	"/campaigns/:campaignId",
	isAuth,
	checkSectorPermission("campaigns.update"),
	CampaignController.update
);

campaignRoutes.delete(
	"/campaigns/:campaignId",
	isAuth,
	checkSectorPermission("campaigns.delete"),
	CampaignController.remove
);

export default campaignRoutes;
