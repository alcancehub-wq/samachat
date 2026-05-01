import "dotenv/config";
import "./bootstrap";
import "reflect-metadata";
import "express-async-errors";
import fs from "fs";
import path from "path";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import * as Sentry from "@sentry/node";

import "./database";
import uploadConfig from "./config/upload";
import AppError from "./errors/AppError";
import routes from "./routes";
import { logger } from "./utils/logger";

Sentry.init({ dsn: process.env.SENTRY_DSN });

const app = express();

const normalizeOrigin = (origin: string) => {
  try {
    return new URL(origin).origin;
  } catch (_err) {
    return origin.replace(/\/+$/, "");
  }
};

const corsOrigins = Array.from(
  new Set(
    [
      "https://samachat.com.br",
      "https://app.samachat.com.br",
      process.env.FRONTEND_URL
    ]
      .filter((origin): origin is string => Boolean(origin))
      .map(origin => normalizeOrigin(origin.trim()))
  )
);

const corsOptions = {
  origin: corsOrigins,
  credentials: true,
  methods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
  allowedHeaders: ["Content-Type", "Authorization"]
};

app.options("*", cors(corsOptions));
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(express.json());
app.use(Sentry.Handlers.requestHandler());
app.get("/health", (_req: Request, res: Response) => {
  return res.status(200).json({ status: "ok" });
});
app.get("/version", (_req: Request, res: Response) => {
  return res.status(200).json({
    commit: process.env.GIT_SHA || process.env.COMMIT_SHA || "unknown",
    buildTime: process.env.BUILD_TIME || "unknown",
    nodeEnv: process.env.NODE_ENV || "unknown"
  });
});
app.get("/public/*", (req: Request, res: Response, next: NextFunction) => {
  const relativePath = req.params[0];
  const resolvedPath = path.join(uploadConfig.directory, relativePath);
  const normalizedPath = path.normalize(resolvedPath);

  if (!normalizedPath.startsWith(uploadConfig.directory)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  fs.stat(normalizedPath, (err, stats) => {
    if (err || !stats.isFile()) {
      return next();
    }

    const ext = path.extname(normalizedPath).toLowerCase();
    const contentType =
      ext === ".ogg"
        ? "audio/ogg"
        : ext === ".mp3"
        ? "audio/mpeg"
        : ext === ".webm"
        ? "audio/webm"
        : "application/octet-stream";

    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Length", stats.size.toString());
      res.setHeader("Accept-Ranges", "bytes");
      fs.createReadStream(normalizedPath).pipe(res);
      return;
    }

    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stats.size - 1;

    if (Number.isNaN(start) || Number.isNaN(end) || start > end) {
      return res.status(416).end();
    }

    const chunkSize = end - start + 1;
    res.status(206);
    res.setHeader("Content-Range", `bytes ${start}-${end}/${stats.size}`);
    res.setHeader("Accept-Ranges", "bytes");
    res.setHeader("Content-Length", chunkSize.toString());
    res.setHeader("Content-Type", contentType);

    fs.createReadStream(normalizedPath, { start, end }).pipe(res);
  });
});
app.use("/public", express.static(uploadConfig.directory));
app.use(routes);

app.use(Sentry.Handlers.errorHandler());

app.use(async (err: Error, req: Request, res: Response, _: NextFunction) => {
  if (err instanceof AppError) {
    logger.warn(err);
    return res.status(err.statusCode).json({ error: err.message });
  }

  logger.error(err);
  return res.status(500).json({ error: "Internal server error" });
});

export default app;
