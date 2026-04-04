import frappe


def get_context(context):
	"""Website page context for `/pow` — React POW shell; requires logged-in user.

	Guests are redirected to login with return URL `/pow`. Uses same session cookies as Desk
	for `frappe-react-sdk` API calls.
	"""
	context.no_cache = 1
	context.title = "POW"

	if frappe.session.user == "Guest":
		frappe.local.flags.redirect_location = frappe.utils.get_url("/login?redirect-to=/pow")
		raise frappe.Redirect

	# Desk-compatible boot (sitename, sysdefaults including company, etc.) for FrappeProvider / hooks.
	context.boot = frappe.boot.get_bootinfo()
	return context


@frappe.whitelist()
def get_context_for_dev():
	"""Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session + developer_mode."""
	if not frappe.conf.developer_mode:
		frappe.throw(frappe._("Not permitted"), frappe.PermissionError)
	return frappe.boot.get_bootinfo()
