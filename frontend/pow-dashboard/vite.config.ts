import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

/** Frappe serves files from the app `public/` tree under `/assets/<app_name>/`. */
const APP_NAME = "warehousesuite";
const OUT_DIR = path.resolve(__dirname, `../../warehousesuite/public/pow_dashboard_react`);
const BASE = `/assets/${APP_NAME}/pow_dashboard_react/`;

export default defineConfig({
	plugins: [react()],
	base: BASE,
	build: {
		outDir: OUT_DIR,
		emptyDir: false,
		rollupOptions: {
			output: {
				entryFileNames: "assets/pow-dashboard.js",
				chunkFileNames: "assets/[name].js",
				assetFileNames: "assets/pow-dashboard[extname]",
			},
		},
	},
	server: {
		port: 5175,
		proxy: {
			"^/(api|assets|app|desk|files|private)": {
				target: "http://127.0.0.1:8000",
				changeOrigin: true,
			},
		},
	},
});
