/** Get the default company from Frappe boot data — same as frappe.defaults.get_global_default('company') */
export function useCompany(): string {
	const boot = (window as any).frappe?.boot
	return boot?.sysdefaults?.company ?? boot?.user?.defaults?.company ?? ''
}
