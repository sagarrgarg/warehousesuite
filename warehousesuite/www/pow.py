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

	return context
