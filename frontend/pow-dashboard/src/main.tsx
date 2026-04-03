import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./pow-dashboard.css";

const el = document.getElementById("pow-dashboard-root");
if (!el) {
	throw new Error("pow-dashboard-root mount node missing");
}

createRoot(el).render(
	<StrictMode>
		<App />
	</StrictMode>,
);
