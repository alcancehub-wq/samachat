import axios from "axios";
import { getBackendUrl } from "../config";

const isLocalDev = import.meta.env.DEV && window.location.hostname === "localhost";

const api = axios.create({
	baseURL: isLocalDev ? "/proxy" : getBackendUrl(),
	withCredentials: true,
});

export default api;
