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
		headers: { 'Content-Type': 'application/json' },
	})
		.then(response => {
			if (!response.ok) throw new Error(`HTTP ${response.status}`)
			return response.json()
		})
		.then((values) => {
			if (values?.message) {
				const v = typeof values.message === 'string'
					? JSON.parse(values.message)
					: values.message
				if (!window.frappe) (window as any).frappe = {}
				;(window as any).frappe.boot = v
			}
			renderApp()
		})
		.catch((err) => {
			console.warn('Failed to load dev boot data:', err.message)
			renderApp()
		})
} else {
	renderApp()
}
