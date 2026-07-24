import { useEffect, useCallback } from 'react'
import { useAtom } from 'jotai'
import { useFrappePostCall, useFrappeGetCall } from 'frappe-react-sdk'
import { qzConnectedAtom, qzPrintersAtom, qzLoadingAtom, qzErrorAtom } from '../store/qzStore'

const QZ_VERSION = '2.1.2'

export function useQzTray() {
	const [connected, setConnected] = useAtom(qzConnectedAtom)
	const [printers, setPrinters] = useAtom(qzPrintersAtom)
	const [loading, setLoading] = useAtom(qzLoadingAtom)
	const [error, setError] = useAtom(qzErrorAtom)
	const loadDependencies = useCallback(async () => {
		if ((window as any).qz) return

		const loadScript = (url: string) => {
			return new Promise<void>((resolve, reject) => {
				const script = document.createElement('script')
				script.src = url
				script.onload = () => resolve()
				script.onerror = () => reject(new Error(`Failed to load script: ${url}`))
				document.head.appendChild(script)
			})
		}

		await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jsrsasign/8.0.20/jsrsasign-all-min.js')
		await loadScript(`https://cdn.rawgit.com/qzind/tray/v${QZ_VERSION}/js/qz-tray.js`)
	}, [])

	const setupSecurity = useCallback(() => {
		const qz = (window as any).qz
		if (!qz) throw new Error('QZ is not loaded')

		qz.security.setCertificatePromise((resolveCert: any, rejectCert: any) => {
			fetch('/api/method/qzbridge.qz_auth.get_qz_certificate')
				.then((res) => res.json())
				.then((data) => {
					if (data?.message) resolveCert(data.message)
					else rejectCert('No certificate returned')
				})
				.catch((err) => rejectCert(err))
		})

		qz.security.setSignatureAlgorithm('SHA512')
		qz.security.setSignaturePromise((toSign: any) => {
			return (resolveSig: any, rejectSig: any) => {
				const csrfToken = (window as any).csrf_token || (window as any).frappe?.csrf_token || ''
				fetch('/api/method/qzbridge.qz_auth.sign_qz_message', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'X-Frappe-CSRF-Token': csrfToken,
					},
					body: JSON.stringify({ challenge: toSign }),
				})
					.then((res) => res.json())
					.then((data) => {
						if (data?.message) resolveSig(data.message)
						else rejectSig('No signature returned')
					})
					.catch((err) => rejectSig(err))
			}
		})
	}, [])

	const connect = useCallback(async () => {
		if (connected || loading) return
		setLoading(true)
		setError(null)
		try {
			await loadDependencies()
			setupSecurity()
			const qz = (window as any).qz
			await qz.websocket.connect({ retries: 2, delay: 1 })
			setConnected(true)
			const list = await qz.printers.find()
			setPrinters(list)
		} catch (err: any) {
			console.error('QZ Tray Connection Error:', err)
			setError(err.message || String(err))
		} finally {
			setLoading(false)
		}
	}, [connected, loading, loadDependencies, setupSecurity, setConnected, setPrinters, setLoading, setError])

	const sendToPrinter = useCallback(async (printerName: string, commands: string[]) => {
		if (!connected) await connect()
		const qz = (window as any).qz
		if (!qz) throw new Error('QZ Tray not initialized')
		
		const config = qz.configs.create(printerName)
		const data = commands.map(c => c + '\n')
		await qz.print(config, data)
	}, [connected, connect])

	return {
		connected,
		printers,
		loading,
		error,
		connect,
		sendToPrinter
	}
}
