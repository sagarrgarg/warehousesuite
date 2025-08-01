app_name = "warehousesuite"
app_title = "Warehousesuite"
app_publisher = "Sagar Ratan Garg"
app_description = "WarehouseSuite is a mobile-first warehouse management solution for ERPNext."
app_email = "sagar1ratan1garg1@gmail.com"
app_license = "Commercial"

# Apps
# ------------------

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "warehousesuite",
# 		"logo": "/assets/warehousesuite/logo.png",
# 		"title": "Warehousesuite",
# 		"route": "/warehousesuite",
# 		"has_permission": "warehousesuite.api.permission.has_app_permission"
# 	}
# ]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/warehousesuite/css/warehousesuite.css"
# app_include_js = "/assets/warehousesuite/js/warehousesuite.js"

# include js, css files in header of web template
# web_include_css = "/assets/warehousesuite/css/warehousesuite.css"
# web_include_js = "/assets/warehousesuite/js/warehousesuite.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "warehousesuite/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "warehousesuite/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "warehousesuite.utils.jinja_methods",
# 	"filters": "warehousesuite.utils.jinja_filters"
# }

# Installation
# ------------

# after_install = "warehousesuite.install.after_install"

# Uninstallation
# ------------

# before_uninstall = "warehousesuite.install.before_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "warehousesuite.utils.before_app_install"
# after_app_install = "warehousesuite.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "warehousesuite.utils.before_app_uninstall"
# after_app_uninstall = "warehousesuite.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "warehousesuite.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

doc_events = {
    "Stock Entry": {
        "validate": [
            "warehousesuite.warehousesuite.overrides.auto_transit_validation.auto_set_transit_for_material_transfer"
        ],
        "on_submit": [
            "warehousesuite.warehousesuite.overrides.value_difference_validation.validate_value_difference"
        ]
    }
}

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"warehousesuite.tasks.all"
# 	],
# 	"daily": [
# 		"warehousesuite.tasks.daily"
# 	],
# 	"hourly": [
# 		"warehousesuite.tasks.hourly"
# 	],
# 	"weekly": [
# 		"warehousesuite.tasks.weekly"
# 	],
# 	"monthly": [
# 		"warehousesuite.tasks.monthly"
# 	],
# }

# Testing
# -------

# before_tests = "warehousesuite.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "warehousesuite.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "warehousesuite.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["warehousesuite.utils.before_request"]
# after_request = ["warehousesuite.utils.after_request"]

# Job Events
# ----------
# before_job = ["warehousesuite.utils.before_job"]
# after_job = ["warehousesuite.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"warehousesuite.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }

# Fixtures
# --------

fixtures = [
    {"doctype": "Custom Field", "filters": [["module", "=", "WarehouseSuite"]]},
    {"doctype": "DocType", "filters": [["module", "=", "WarehouseSuite"]]}
]