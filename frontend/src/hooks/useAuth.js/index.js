import { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";
import openSocket from "../../services/socket-io";

import { toast } from "react-toastify";

import { i18n } from "../../translate/i18n";
import api from "../../services/api";
import toastError from "../../errors/toastError";

const getStoredToken = () => {
	const token = localStorage.getItem("token");
	return token ? JSON.parse(token) : null;
};

const useAuth = () => {
	const history = useHistory();
	const [isAuth, setIsAuth] = useState(false);
	const [loading, setLoading] = useState(true);
	const [user, setUser] = useState({});
	const refreshTokenRequestRef = useRef(null);

	const clearAuthState = () => {
		localStorage.removeItem("token");
		api.defaults.headers.Authorization = undefined;
		setIsAuth(false);
		setUser({});
	};

	const refreshAuthToken = async () => {
		if (!refreshTokenRequestRef.current) {
			refreshTokenRequestRef.current = api
				.post("/auth/refresh_token", undefined, { _skipAuthRefresh: true })
				.then(({ data }) => {
					localStorage.setItem("token", JSON.stringify(data.token));
					api.defaults.headers.Authorization = `Bearer ${data.token}`;
					setIsAuth(true);
					setUser(data.user);
					return data;
				})
				.finally(() => {
					refreshTokenRequestRef.current = null;
				});
		}

		return refreshTokenRequestRef.current;
	};

	useEffect(() => {
		const requestInterceptor = api.interceptors.request.use(
			config => {
				const token = getStoredToken();
				if (token) {
					config.headers["Authorization"] = `Bearer ${token}`;
				}
				return config;
			},
			error => Promise.reject(error)
		);

		const responseInterceptor = api.interceptors.response.use(
			response => response,
			async error => {
				const originalRequest = error.config || {};

				if (originalRequest._skipAuthRefresh) {
					if (
						error?.response?.status === 401 ||
						error?.response?.status === 403
					) {
						clearAuthState();
					}
					return Promise.reject(error);
				}

				if (error?.response?.status === 403 && !originalRequest._retry) {
					originalRequest._retry = true;

					try {
						await refreshAuthToken();
						return api(originalRequest);
					} catch (refreshError) {
						clearAuthState();
						return Promise.reject(refreshError);
					}
				}

				if (error?.response?.status === 401) {
					clearAuthState();
				}

				return Promise.reject(error);
			}
		);

		return () => {
			api.interceptors.request.eject(requestInterceptor);
			api.interceptors.response.eject(responseInterceptor);
		};
	}, []);

	useEffect(() => {
		const token = getStoredToken();
		(async () => {
			if (token) {
				try {
					await refreshAuthToken();
				} catch (err) {
					clearAuthState();
					toastError(err);
				}
			}
			setLoading(false);
		})();
	}, []);

	useEffect(() => {
		const socket = openSocket();

		socket.on("user", data => {
			if (data.action === "update" && data.user.id === user.id) {
				setUser(data.user);
			}
		});

		return () => {
			socket.disconnect();
		};
	}, [user]);

	const handleLogin = async userData => {
		setLoading(true);

		try {
			const { data } = await api.post("/auth/login", userData);
			localStorage.setItem("token", JSON.stringify(data.token));
			api.defaults.headers.Authorization = `Bearer ${data.token}`;
			setUser(data.user);
			setIsAuth(true);
			toast.success(i18n.t("auth.toasts.success"));
			history.push("/tickets");
			setLoading(false);
		} catch (err) {
			toastError(err);
			setLoading(false);
		}
	};

	const handleLogout = async () => {
		setLoading(true);

		try {
			await api.delete("/auth/logout");
			clearAuthState();
			setLoading(false);
			history.push("/login");
		} catch (err) {
			toastError(err);
			setLoading(false);
		}
	};

	return { isAuth, user, loading, handleLogin, handleLogout };
};

export default useAuth;
