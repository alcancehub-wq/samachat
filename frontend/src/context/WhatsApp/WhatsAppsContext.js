import React, { createContext } from "react";

import useWhatsApps from "../../hooks/useWhatsApps";

const WhatsAppsContext = createContext();

const WhatsAppsProvider = ({ children }) => {
	const { loading, whatsApps, reload } = useWhatsApps();

	return (
		<WhatsAppsContext.Provider value={{ whatsApps, loading, reload }}>
			{children}
		</WhatsAppsContext.Provider>
	);
};

export { WhatsAppsContext, WhatsAppsProvider };
