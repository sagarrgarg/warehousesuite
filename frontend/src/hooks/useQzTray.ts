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

	const { call: getCert } = useFrappeGetCall('qzbridge.qz_auth.get_qz_certificate')
	const { call: signMsg } = useFrappePostCall('qzbridge.qz_auth.sign_qz_message')

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
			getCert()
				.then((res: any) => {
					if (res?.message) resolveCert(res.message)
					else rejectCert()
				})
				.catch(rejectCert)
		})

		qz.security.setSignatureAlgorithm('SHA512')
		qz.security.setSignaturePromise((toSign: any) => {
			return (resolveSig: any, rejectSig: any) => {
				signMsg({ challenge: toSign })
					.then((res: any) => {
						if (res?.message) resolveSig(res.message)
						else rejectSig()
					})
					.catch(rejectSig)
			}
		})
	}, [getCert, signMsg])

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
