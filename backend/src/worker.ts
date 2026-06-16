import "dotenv/config";
import "./bootstrap";
import "./database";
import { initRedis } from "./libs/redisStore";
import { logger } from "./utils/logger";
import startScheduleWorker from "./services/ScheduleServices/RunScheduleWorker";
import startCampaignWorker from "./services/CampaignServices/RunCampaignWorker";

const runWorkers = process.env.RUN_WORKERS !== "false";

if (runWorkers) {
  initRedis();
  startScheduleWorker();
  startCampaignWorker();

  logger.info("Worker started");
} else {
  logger.warn("Worker disabled by RUN_WORKERS=false");
}
