import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FrappeProvider } from 'frappe-react-sdk'
import { Toaster } from 'sonner'
import ErrorBoundary from './components/ErrorBoundary'
import Dashboard from './pages/Dashboard'
import Analytics from './pages/Analytics'

function App() {
	const [isReady, setIsReady] = useState(false)

	useEffect(() => {
		const userId = document.cookie?.split('; ')
			.find(row => row.startsWith('user_id='))?.split('=')[1]?.trim()

		if (!userId || userId === 'Guest') {
			if (!import.meta.env.DEV) {
				window.location.href = '/login?redirect-to=/pow'
				return
			}
		}
		setIsReady(true)
	}, [])

	const boot = (window as any).frappe?.boot
	const siteName = typeof boot?.sitename === 'string' ? boot.sitename : import.meta.env.VITE_SITE_NAME

	if (!isReady) return null

	return (
		<FrappeProvider
			swrConfig={{ errorRetryCount: 2 }}
			siteName={siteName}
			enableSocket={false}>
			<ErrorBoundary>
				<BrowserRouter basename="/pow">
					<Routes>
						<Route index element={<Dashboard />} />
						<Route path="analytics" element={<Analytics />} />
						<Route path="*" element={<Navigate to="/" />} />
					</Routes>
				</BrowserRouter>
				<Toaster richColors theme='light' position="top-center" />
			</ErrorBoundary>
		</FrappeProvider>
	)
}

export default App
