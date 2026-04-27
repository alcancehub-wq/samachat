import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";

let io: SocketIO;

const baseOrigins = [
  "https://samachat.com.br",
  "https://app.samachat.com.br"
];
const devOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001"
];
const envOrigins = (process.env.CORS_ORIGINS || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);
const allowedOrigins = Array.from(
  new Set([
    ...baseOrigins,
    ...envOrigins,
    ...(process.env.NODE_ENV === "production" ? [] : devOrigins)
  ])
);

export const initIO = (httpServer: Server): SocketIO => {
  io = new SocketIO(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ["OPTIONS", "GET", "POST", "PUT", "PATCH", "DELETE"],
      allowedHeaders: ["Content-Type", "Authorization"]
    }
  });

  io.on("connection", socket => {
    const { token } = socket.handshake.query;
    let tokenData = null;
    try {
      tokenData = verify(token, authConfig.secret);
      logger.debug(JSON.stringify(tokenData), "io-onConnection: tokenData");
    } catch (error) {
      logger.error(JSON.stringify(error), "Error decoding token");
      socket.disconnect();
      return io;
    }

    logger.info("Client Connected");
    socket.on("joinChatBox", (ticketId: string) => {
      logger.info("A client joined a ticket channel");
      socket.join(ticketId);
    });

    socket.on("joinNotification", () => {
      logger.info("A client joined notification channel");
      socket.join("notification");
    });

    socket.on("joinTickets", (status: string) => {
      logger.info(`A client joined to ${status} tickets channel.`);
      socket.join(status);
    });

    socket.on("disconnect", () => {
      logger.info("Client disconnected");
    });

    return socket;
  });
  return io;
};

export const getIO = (): SocketIO => {
  if (!io) {
    throw new AppError("Socket IO not initialized");
  }
  return io;
};
