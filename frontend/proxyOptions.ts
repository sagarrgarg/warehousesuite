import path from 'path';
import fs from 'fs';

function getCommonSiteConfig() {
	let currentDir = path.resolve('.');
	while (currentDir !== '/') {
		if (
			fs.existsSync(path.join(currentDir, 'sites')) &&
			fs.existsSync(path.join(currentDir, 'apps'))
		) {
			const configPath = path.join(currentDir, 'sites', 'common_site_config.json');
			if (fs.existsSync(configPath)) {
				return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
			}
			return null;
		}
		currentDir = path.resolve(currentDir, '..');
	}
	return null;
}

const config = getCommonSiteConfig();
const webserver_port = config ? config.webserver_port : 8000;
if (!config) {
	console.log('No common_site_config.json found, using default port 8000');
}

export default {
	'^/(app|api|assets|files|private)': {
		target: `http://127.0.0.1:${webserver_port}`,
		ws: true,
		changeOrigin: true,
		secure: false,
		router: function (req: any) {
			const site_name = req.headers.host.split(':')[0];
			return `http://${site_name}:${webserver_port}`;
		}
	}
};
