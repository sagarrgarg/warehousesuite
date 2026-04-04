import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'

interface Props {
	children: ReactNode
	fallback?: ReactNode
}

interface State {
	hasError: boolean
	error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props)
		this.state = { hasError: false, error: null }
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error }
	}

	componentDidCatch(error: Error, errorInfo: ErrorInfo) {
		console.error('ErrorBoundary caught:', error, errorInfo)
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback
			return (
				<div className="flex flex-col items-center justify-center min-h-dvh bg-background p-6">
					<div className="max-w-md w-full text-center bg-red-50 border border-red-200 rounded-2xl p-8 shadow-sm">
						<div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-2xl flex items-center justify-center">
							<AlertTriangle className="w-8 h-8 text-red-600" />
						</div>
						<h2 className="text-lg font-bold text-red-900 mb-2">Something went wrong</h2>
						<p className="text-sm text-red-700 mb-4">
							{this.state.error?.message ?? 'An unexpected error occurred.'}
						</p>
						<button
							onClick={() => window.location.reload()}
							className="px-6 py-3 bg-red-600 text-slate-900 dark:text-white font-bold rounded-xl hover:bg-red-700 active:scale-[0.98] transition-all"
						>
							Reload
						</button>
					</div>
				</div>
			)
		}
		return this.props.children
	}
}
