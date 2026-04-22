import gracefulShutdown from "http-graceful-shutdown";
import fs from "fs";
import path from "path";
import app from "./app";
import { initIO } from "./libs/socket";
import { logger } from "./utils/logger";
import { initRedis } from "./libs/redisStore";
import { StartAllWhatsAppsSessions } from "./services/WbotServices/StartAllWhatsAppsSessions";
import startScheduleWorker from "./services/ScheduleServices/RunScheduleWorker";
import startCampaignWorker from "./services/CampaignServices/RunCampaignWorker";

const ensureDir = (dirPath: string) => {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch (err) {
    logger.warn({ err, dirPath }, "Failed to ensure directory");
  }
};

ensureDir(path.join(process.cwd(), "public"));
ensureDir(path.join(process.cwd(), ".wwebjs_auth"));

logger.info(
  {
    NODE_ENV: process.env.NODE_ENV,
    BACKEND_URL: process.env.BACKEND_URL,
    FRONTEND_URL: process.env.FRONTEND_URL
  },
  "Runtime environment"
);

const server = app.listen(process.env.PORT, () => {
  logger.info(`Server started on port: ${process.env.PORT}`);
});

initIO(server);
initRedis();
StartAllWhatsAppsSessions();
startScheduleWorker();
startCampaignWorker();
gracefulShutdown(server);

process.on("uncaughtException", err => {
  logger.error({ info: "Global uncaught exception", err });
});

process.on("unhandledRejection", err => {
  if (err) logger.error({ info: "Global unhandled rejection", err });
});
