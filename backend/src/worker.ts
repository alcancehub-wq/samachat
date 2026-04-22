import "dotenv/config";
import "./bootstrap";
import "./database";
import { initRedis } from "./libs/redisStore";
import { logger } from "./utils/logger";
import startScheduleWorker from "./services/ScheduleServices/RunScheduleWorker";
import startCampaignWorker from "./services/CampaignServices/RunCampaignWorker";

initRedis();
startScheduleWorker();
startCampaignWorker();

logger.info("Worker started");
