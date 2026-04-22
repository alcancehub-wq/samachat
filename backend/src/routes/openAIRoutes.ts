import express from "express";
import isAuth from "../middleware/isAuth";
import checkSectorPermission from "../middleware/checkSectorPermission";

import * as OpenAISettingsController from "../controllers/OpenAISettingsController";
import * as OpenAIController from "../controllers/OpenAIController";

const openAIRoutes = express.Router();

openAIRoutes.get(
	"/openai/settings",
	isAuth,
	checkSectorPermission("openai.settings.view"),
	OpenAISettingsController.show
);
openAIRoutes.put(
	"/openai/settings",
	isAuth,
	checkSectorPermission("openai.settings.update"),
	OpenAISettingsController.update
);
openAIRoutes.post(
	"/openai/settings/test",
	isAuth,
	checkSectorPermission("openai.settings.test"),
	OpenAISettingsController.test
);

openAIRoutes.get(
	"/openai/logs",
	isAuth,
	checkSectorPermission("openai.logs.view"),
	OpenAIController.logs
);
openAIRoutes.post(
	"/openai/suggest",
	isAuth,
	checkSectorPermission("openai.use"),
	OpenAIController.suggest
);
openAIRoutes.post(
	"/openai/rewrite",
	isAuth,
	checkSectorPermission("openai.use"),
	OpenAIController.rewrite
);
openAIRoutes.post(
	"/openai/summarize",
	isAuth,
	checkSectorPermission("openai.use"),
	OpenAIController.summarize
);
openAIRoutes.post(
	"/openai/classify",
	isAuth,
	checkSectorPermission("openai.use"),
	OpenAIController.classify
);

export default openAIRoutes;
