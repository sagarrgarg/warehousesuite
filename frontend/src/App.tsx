import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { FrappeProvider } from 'frappe-react-sdk'
import { Toaster } from 'sonner'
import Dashboard from './pages/Dashboard'

function App() {
	useEffect(() => {
		const userId = document.cookie?.split('; ').find(row => row.startsWith('user_id='))?.split('=')[1]?.trim()
		const isLoggedIn = userId !== 'Guest'

		if (!isLoggedIn && !import.meta.env.DEV) {
			window.location.href = '/login?redirect-to=/pow'
		}
	}, [])

	return (
		<FrappeProvider
			swrConfig={{ errorRetryCount: 2 }}
			socketPort={import.meta.env.VITE_SOCKET_PORT}
			siteName={(window as any).frappe?.boot?.sitename ?? import.meta.env.VITE_SITE_NAME}>
			{(window as any).frappe?.boot?.user?.name && (window as any).frappe?.boot?.user?.name !== 'Guest' &&
				<BrowserRouter basename="/pow">
					<Routes>
						<Route index element={<Dashboard />} />
						<Route path="*" element={<Navigate to="/" />} />
					</Routes>
				</BrowserRouter>
			}
			<Toaster richColors theme='light' position="top-center" />
		</FrappeProvider>
	)
}

export default App
