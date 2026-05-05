import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

const isLocalDev = import.meta.env.DEV && window.location.hostname === "localhost";

const getStoredToken = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  try {
    return JSON.parse(token);
  } catch (_error) {
    return null;
  }
};

function connectToSocket() {
  const socket = openSocket(isLocalDev ? window.location.origin : getBackendUrl(), {
      transports: ["websocket", "polling", "flashsocket"],
      path: isLocalDev ? "/socket.io" : "/socket.io",
      query: {
    token: getStoredToken(),
      },
    });

  socket.io.on("reconnect_attempt", () => {
    socket.io.opts.query = {
      token: getStoredToken(),
    };
  });

  socket.on("connect_error", () => {
    socket.io.opts.query = {
      token: getStoredToken(),
    };
  });

  return socket;
}

export default connectToSocket;