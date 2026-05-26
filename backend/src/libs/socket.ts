import { Server as SocketIO } from "socket.io";
import { Server } from "http";
import { verify } from "jsonwebtoken";
import AppError from "../errors/AppError";
import { logger } from "../utils/logger";
import authConfig from "../config/auth";
import {
  getScopedContactRoom,
  getScopedNotificationRoom,
  getScopedTicketsRoom
} from "../helpers/socketRooms";

let io: SocketIO;

const isLocalOrigin = (origin: string) =>
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);

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
      origin: (origin, callback) => {
        if (!origin) {
          callback(null, true);
          return;
        }

        const allowed = allowedOrigins.includes(origin) || isLocalOrigin(origin);
        callback(null, allowed);
      },
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

    socket.on("joinNotification", (payload?: { whatsappId?: number | null }) => {
      logger.info("A client joined notification channel");
      socket.join(getScopedNotificationRoom(payload?.whatsappId));
    });

    socket.on(
      "joinTickets",
      (payload: string | { status: string; whatsappId?: number | null }) => {
        const status = typeof payload === "string" ? payload : payload?.status;
        const whatsappId =
          typeof payload === "string" ? undefined : payload?.whatsappId;

        logger.info(`A client joined to ${status} tickets channel.`);
        socket.join(getScopedTicketsRoom(status, whatsappId));
      }
    );

    socket.on("joinContacts", (payload?: { whatsappId?: number | null }) => {
      logger.info("A client joined contact channel");
      socket.join(getScopedContactRoom(payload?.whatsappId));
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
