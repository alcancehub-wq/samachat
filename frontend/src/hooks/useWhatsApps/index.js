import { useState, useEffect, useReducer, useCallback, useContext } from "react";
import openSocket from "../../services/socket-io";
import toastError from "../../errors/toastError";

import api from "../../services/api";
import { AuthContext } from "../../context/Auth/AuthContext";
import { userHasPermission } from "../../utils/permissions";

const reducer = (state, action) => {
	if (action.type === "LOAD_WHATSAPPS") {
		const whatsApps = action.payload;

		return [...whatsApps];
	}

	if (action.type === "UPDATE_WHATSAPPS") {
		const whatsApp = action.payload;
		const whatsAppIndex = state.findIndex(s => s.id === whatsApp.id);

		if (whatsAppIndex !== -1) {
			state[whatsAppIndex] = whatsApp;
			return [...state];
		} else {
			return [whatsApp, ...state];
		}
	}

	if (action.type === "UPDATE_SESSION") {
		const whatsApp = action.payload;
		const whatsAppIndex = state.findIndex(s => s.id === whatsApp.id);

		if (whatsAppIndex !== -1) {
			state[whatsAppIndex].status = whatsApp.status;
			state[whatsAppIndex].updatedAt = whatsApp.updatedAt;
			state[whatsAppIndex].qrcode = whatsApp.qrcode;
			state[whatsAppIndex].retries = whatsApp.retries;
			return [...state];
		} else {
			return [...state];
		}
	}

	if (action.type === "DELETE_WHATSAPPS") {
		const whatsAppId = action.payload;

		const whatsAppIndex = state.findIndex(s => s.id === whatsAppId);
		if (whatsAppIndex !== -1) {
			state.splice(whatsAppIndex, 1);
		}
		return [...state];
	}

	if (action.type === "RESET") {
		return [];
	}
};

const useWhatsApps = () => {
	const [whatsApps, dispatch] = useReducer(reducer, []);
	const [loading, setLoading] = useState(true);
	const { isAuth, loading: authLoading, user } = useContext(AuthContext);
	const canViewConnections = userHasPermission(user, "connections.view");

	const loadWhatsApps = useCallback(async () => {
		if (authLoading || !isAuth || !canViewConnections) {
			dispatch({ type: "RESET" });
			setLoading(false);
			return;
		}

		setLoading(true);
		try {
			const { data } = await api.get("/whatsapp/");
			dispatch({ type: "LOAD_WHATSAPPS", payload: data });
			setLoading(false);
		} catch (err) {
			dispatch({ type: "RESET" });
			setLoading(false);
			if (err?.response?.status !== 403) {
				toastError(err);
			}
		}
	}, [authLoading, canViewConnections, isAuth]);

	useEffect(() => {
		loadWhatsApps();
	}, [loadWhatsApps]);

	useEffect(() => {
		if (authLoading || !isAuth || !canViewConnections) {
			return undefined;
		}

		const socket = openSocket();

		socket.on("whatsapp", data => {
			if (data.action === "update") {
				dispatch({ type: "UPDATE_WHATSAPPS", payload: data.whatsapp });
			}
		});

		socket.on("whatsapp", data => {
			if (data.action === "delete") {
				dispatch({ type: "DELETE_WHATSAPPS", payload: data.whatsappId });
			}
		});

		socket.on("whatsappSession", data => {
			if (data.action === "update") {
				dispatch({ type: "UPDATE_SESSION", payload: data.session });
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [authLoading, canViewConnections, isAuth]);

	return { whatsApps, loading, reload: loadWhatsApps };
};

export default useWhatsApps;
