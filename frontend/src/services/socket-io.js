import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";
import api from "./api";

const isLocalDev = import.meta.env.DEV && window.location.hostname === "localhost";
let socketTokenRefreshRequest = null;

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

const refreshSocketToken = async () => {
  if (!socketTokenRefreshRequest) {
    socketTokenRefreshRequest = api
      .post("/auth/refresh_token", undefined, { _skipAuthRefresh: true })
      .then(({ data }) => {
        localStorage.setItem("token", JSON.stringify(data.token));
        api.defaults.headers.Authorization = `Bearer ${data.token}`;
        return data.token;
      })
      .catch(() => {
        localStorage.removeItem("token");
        api.defaults.headers.Authorization = undefined;
        return null;
      })
      .finally(() => {
        socketTokenRefreshRequest = null;
      });
  }

  return socketTokenRefreshRequest;
};

function connectToSocket() {
  const socket = openSocket(isLocalDev ? window.location.origin : getBackendUrl(), {
      transports: ["polling", "websocket"],
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
    void refreshSocketToken().then(token => {
      if (!token) {
        return;
      }

      socket.io.opts.query = {
        token,
      };

      if (socket.disconnected) {
        socket.connect();
      }
    });
  });

  return socket;
}

export default connectToSocket;