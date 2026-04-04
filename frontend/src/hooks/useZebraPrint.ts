import { useState, useEffect, useCallback } from 'react'

const ZEBRA_SCRIPT = '/assets/warehousesuite/js/zebrabrowserprint.js'

interface PrinterDevice {
	name: string
	[key: string]: unknown
}

export function useZebraPrint() {
	const [printers, setPrinters] = useState<PrinterDevice[]>([])
	const [scriptLoaded, setScriptLoaded] = useState(false)
	const [loading, setLoading] = useState(false)

	const loadScript = useCallback((): Promise<void> => {
		return new Promise((resolve, reject) => {
			if (typeof (window as any).BrowserPrint !== 'undefined') {
				setScriptLoaded(true)
				resolve()
				return
			}
			const existing = document.querySelector(`script[src*="zebrabrowserprint"]`)
			if (existing) {
				const check = setInterval(() => {
					if (typeof (window as any).BrowserPrint !== 'undefined') {
						clearInterval(check)
						setScriptLoaded(true)
						resolve()
					}
				}, 100)
				setTimeout(() => {
					clearInterval(check)
					reject(new Error('Zebra Browser Print script timeout'))
				}, 5000)
				return
			}
			const script = document.createElement('script')
			script.src = ZEBRA_SCRIPT
			script.async = true
			script.onload = () => {
				setTimeout(() => {
					if (typeof (window as any).BrowserPrint !== 'undefined') {
						setScriptLoaded(true)
						resolve()
					} else {
						reject(new Error('BrowserPrint not found after load'))
					}
				}, 500)
			}
			script.onerror = () => reject(new Error(`Failed to load ${ZEBRA_SCRIPT}`))
			document.head.appendChild(script)
		})
	}, [])

	const refreshPrinters = useCallback(async () => {
		setLoading(true)
		try {
			await loadScript()
			const BrowserPrint = (window as any).BrowserPrint
			if (!BrowserPrint) {
				setPrinters([])
				return
			}
			return new Promise<void>((resolve, reject) => {
				const timeout = setTimeout(() => {
					setPrinters([])
					reject(new Error('Timeout loading printers'))
				}, 10000)
				BrowserPrint.getLocalDevices(
					(devices: any) => {
						clearTimeout(timeout)
						let list: PrinterDevice[] = []
						if (Array.isArray(devices)) {
							list = devices
						} else if (devices?.printer) {
							list = devices.printer
						} else if (devices && typeof devices === 'object') {
							for (const k of Object.keys(devices)) {
								if (Array.isArray(devices[k])) {
									list = devices[k]
									break
								}
							}
						}
						setPrinters(list)
						resolve()
					},
					(err: any) => {
						clearTimeout(timeout)
						setPrinters([])
						reject(err)
					},
					'printer',
				)
			})
		} finally {
			setLoading(false)
		}
	}, [loadScript])

	const sendToPrinter = useCallback(async (printerData: PrinterDevice, zpl: string): Promise<void> => {
		await loadScript()
		const BrowserPrint = (window as any).BrowserPrint
		if (!BrowserPrint) throw new Error('Zebra Browser Print not available')
		return new Promise((resolve, reject) => {
			try {
				const device = new BrowserPrint.Device(printerData)
				device.send(zpl, () => resolve(), (err: any) => reject(err || new Error('Print failed')))
			} catch (e) {
				reject(e)
			}
		})
	}, [loadScript])

	useEffect(() => {
		loadScript().catch(() => {})
	}, [loadScript])

	return { printers, scriptLoaded, loading, refreshPrinters, sendToPrinter, loadScript }
}
