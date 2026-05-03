import openSocket from "socket.io-client";
import { getBackendUrl } from "../config";

const isLocalDev = import.meta.env.DEV && window.location.hostname === "localhost";

function connectToSocket() {
    const token = localStorage.getItem("token");
    return openSocket(isLocalDev ? window.location.origin : getBackendUrl(), {
      transports: ["websocket", "polling", "flashsocket"],
      path: isLocalDev ? "/socket.io" : "/socket.io",
      query: {
        token: JSON.parse(token),
      },
    });
}

export default connectToSocket;