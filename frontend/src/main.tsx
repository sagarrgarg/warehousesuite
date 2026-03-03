import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

function renderApp() {
	createRoot(document.getElementById('root') as HTMLElement).render(
		<StrictMode>
			<App />
		</StrictMode>,
	)
}

if (import.meta.env.DEV) {
	fetch('/api/method/warehousesuite.www.pow.get_context_for_dev', {
		method: 'POST',
	})
		.then(response => response.json())
		.then((values) => {
			const v = JSON.parse(values.message)
			if (!window.frappe) window.frappe = {} as any
			;(window as any).frappe.boot = v
			renderApp()
		})
} else {
	renderApp()
}
