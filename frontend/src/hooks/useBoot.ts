import { useState, useEffect } from 'react'

/** Get the default company from Frappe boot data — same as frappe.defaults.get_global_default('company') */
export function useCompany(): string {
	const [company, setCompany] = useState('')
	useEffect(() => {
		const boot = (window as any).frappe?.boot
		const c = boot?.sysdefaults?.company ?? boot?.user?.defaults?.company ?? ''
		setCompany(c)
	}, [])
	return company
}
