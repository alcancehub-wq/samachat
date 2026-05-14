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

const inferPublicContentType = (filePath: string): string => {
  const ext = path.extname(filePath).toLowerCase();

  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain; charset=utf-8";
    case ".csv":
      return "text/csv; charset=utf-8";
    case ".json":
      return "application/json; charset=utf-8";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    case ".zip":
      return "application/zip";
    case ".rar":
      return "application/vnd.rar";
    case ".7z":
      return "application/x-7z-compressed";
    case ".ogg":
      return "audio/ogg";
    case ".mp3":
      return "audio/mpeg";
    case ".wav":
      return "audio/wav";
    case ".webm":
      return "audio/webm";
    case ".mp4":
      return "video/mp4";
    case ".mov":
      return "video/quicktime";
    default:
      return "application/octet-stream";
  }
};

const resolveDownloadName = (req: Request, filePath: string): string => {
  const requestedName = typeof req.query.filename === "string"
    ? req.query.filename.trim()
    : "";

  return path.basename(requestedName || filePath);
};

const isLocalOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

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
      "http://localhost:3000",
      "http://127.0.0.1:3000",
      process.env.FRONTEND_URL
    ]
      .filter((origin): origin is string => Boolean(origin))
      .map(origin => normalizeOrigin(origin.trim()))
  )
);

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const normalizedOrigin = normalizeOrigin(origin);
    const allowed = corsOrigins.includes(normalizedOrigin) || isLocalOrigin(normalizedOrigin);

    callback(null, allowed);
  },
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

    const contentType = inferPublicContentType(normalizedPath);
    const downloadName = resolveDownloadName(req, normalizedPath);
    const encodedDownloadName = encodeURIComponent(downloadName);

    const range = req.headers.range;
    if (!range) {
      res.setHeader("Content-Type", contentType);
      res.setHeader(
        "Content-Disposition",
        `inline; filename="${downloadName}"; filename*=UTF-8''${encodedDownloadName}`
      );
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
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${downloadName}"; filename*=UTF-8''${encodedDownloadName}`
    );

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
