import React from "react";
import ReactDOM from "react-dom";
import CssBaseline from "@material-ui/core/CssBaseline";

import App from "./App";
import "./index.css";

ReactDOM.render(
	<CssBaseline>
		<App />
	</CssBaseline>,
	document.getElementById("root")
);

const registerServiceWorker = () => {
	if (!import.meta.env.PROD || !("serviceWorker" in navigator)) {
		return;
	}

	window.addEventListener(
		"load",
		() => {
			navigator.serviceWorker.register("/service-worker.js").catch(() => {
				// Ignore registration failures to avoid affecting app boot.
			});
		},
		{ once: true }
	);
};

registerServiceWorker();

// ReactDOM.render(
// 	<React.StrictMode>
// 		<CssBaseline>
// 			<App />
// 		</CssBaseline>,
//   </React.StrictMode>

// 	document.getElementById("root")
// );
