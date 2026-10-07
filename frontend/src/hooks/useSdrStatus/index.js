import { useEffect, useState } from "react";

import api from "../../services/api";

// Estado do agente SDR para a lista de conversas. Uma consulta so, guardada por
// alguns segundos e compartilhada por todos os itens da lista.
let cache = null;
let cacheAt = 0;
let inflight = null;
const TTL_MS = 15000;

const load = () => {
	if (cache && Date.now() - cacheAt < TTL_MS) return Promise.resolve(cache);
	if (!inflight) {
		inflight = api
			.get("/sdr-agent/status")
			.then(({ data }) => {
				cache = data;
				cacheAt = Date.now();
				return data;
			})
			.catch(() => null)
			.finally(() => {
				inflight = null;
			});
	}
	return inflight;
};

export const invalidateSdrStatus = () => {
	cache = null;
	cacheAt = 0;
};

const useSdrStatus = () => {
	const [status, setStatus] = useState(cache);

	useEffect(() => {
		let alive = true;
		load().then(data => {
			if (alive) setStatus(data);
		});
		return () => {
			alive = false;
		};
	}, []);

	return status;
};

export default useSdrStatus;
