import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime, flt, today, nowtime


class POWStockConcern(Document):
	def validate(self):
		if not self.reported_by:
			self.reported_by = frappe.session.user
		if not self.reported_date:
			self.reported_date = now_datetime()

	def before_submit(self):
		self.status = "Open"

	def on_submit(self):
		self.create_assignment_notification()

	def create_assignment_notification(self):
		try:
			managers = frappe.get_all(
				"User",
				filters={"enabled": 1},
				or_filters=[
					["Has Role", "role", "=", "POW Manager"],
					["Has Role", "role", "=", "Stock User"],
				],
				pluck="name",
			)
			if not managers:
				managers = ["Administrator"]

			frappe.get_doc({
				"doctype": "ToDo",
				"description": f"Stock Concern: {self.name} - {self.source_document}",
				"reference_type": "POW Stock Concern",
				"reference_name": self.name,
				"assigned_by": frappe.session.user,
				"assigned_to": managers[0],
				"priority": "Medium",
				"status": "Open",
			}).insert(ignore_permissions=True)
		except Exception as e:
			frappe.log_error(f"Error creating assignment for POW Stock Concern {self.name}: {e}")

	def get_concern_warehouses(self):
		"""Derive warehouses from the linked Stock Entry."""
		if self.source_document_type != "Stock Entry" or not self.source_document:
			return []
		try:
			se = frappe.db.get_value(
				"Stock Entry",
				self.source_document,
				["from_warehouse", "to_warehouse", "custom_for_which_warehouse_to_transfer"],
				as_dict=True,
			)
			if not se:
				return []
			warehouses = set()
			for w in [se.from_warehouse, se.to_warehouse, se.custom_for_which_warehouse_to_transfer]:
				if w:
					warehouses.add(w)
			return list(warehouses)
		except Exception:
			return []

	def can_change_status(self):
		"""POW Profile-based permission check.

		Rules:
		  1. DENY sender (Stock Entry owner) — always.
		  2. ALLOW if user's POW Profile has "POW Stock Concern" in Allowed
		     Operations AND any of the concern's warehouses is in the user's
		     Warehouses Allowed (source_warehouse). Direct match only, no
		     descendant tree walking.
		"""
		current_user = frappe.session.user

		# Always allow Administrator
		if current_user == "Administrator":
			return True

		# DENY sender — the person who created the Stock Entry
		if self.source_document_type == "Stock Entry" and self.source_document:
			try:
				se_owner = frappe.db.get_value("Stock Entry", self.source_document, "owner")
				if se_owner == current_user:
					return False
			except Exception:
				pass

		# Find user's POW Profile(s) that have Stock Concern allowed
		profiles = frappe.get_all(
			"POW Profile User",
			filters={"user": current_user},
			fields=["parent"],
		)
		if not profiles:
			return False

		concern_warehouses = set(self.get_concern_warehouses())
		if not concern_warehouses:
			# No warehouse to scope against — fall back to profile-has-operation check
			return _profile_has_stock_concern_operation(profiles)

		for row in profiles:
			profile_name = row.parent
			profile = frappe.get_cached_doc("POW Profile", profile_name)

			if not profile or profile.disabled:
				continue

			# Check stock_concern is enabled on profile
			if not getattr(profile, "stock_concern", 0):
				continue

			# Check warehouse overlap — direct match, no descendants
			allowed_warehouses = {
				(r.warehouse or "").strip()
				for r in (profile.source_warehouse or [])
				if (r.warehouse or "").strip()
			}
			if concern_warehouses & allowed_warehouses:
				return True

		return False


def _profile_has_stock_concern_operation(profiles):
	"""Check if any of the user's profiles has stock_concern enabled."""
	for row in profiles:
		profile = frappe.get_cached_doc("POW Profile", row.parent)
		if profile and not profile.disabled and getattr(profile, "stock_concern", 0):
			return True
	return False


@frappe.whitelist()
def can_change_status(concern_name):
	try:
		concern = frappe.get_doc("POW Stock Concern", concern_name)
		return concern.can_change_status()
	except Exception as e:
		frappe.log_error(f"Error checking status permission for {concern_name}: {e}")
		return False


@frappe.whitelist()
def update_concern_status(concern_name, new_status, resolver_notes=None):
	try:
		concern = frappe.get_doc("POW Stock Concern", concern_name)

		if not concern.can_change_status():
			current_user = frappe.session.user
			msg = _("You don't have permission to change the status of this concern.")

			if concern.source_document_type == "Stock Entry" and concern.source_document:
				try:
					se_owner = frappe.db.get_value("Stock Entry", concern.source_document, "owner")
					if se_owner == current_user:
						msg = _("You cannot resolve concerns from transfers you created.")
				except Exception:
					pass

			return {"status": "error", "message": msg}

		valid_transitions = {
			"Open": ["Resolve Will Receive", "Resolve Reverted", "Resolve Partial"],
		}

		if concern.status not in valid_transitions or new_status not in valid_transitions.get(concern.status, []):
			return {"status": "error", "message": _("Invalid status transition from '{0}' to '{1}'").format(concern.status, new_status)}

		update_fields = {
			"status": new_status,
			"resolved_by": frappe.session.user,
			"resolved_date": now_datetime(),
		}
		if resolver_notes:
			update_fields["resolver_notes"] = resolver_notes

		frappe.db.set_value("POW Stock Concern", concern_name, update_fields, update_modified=False)
		close_todo_assignment(concern_name)

		return {"status": "success", "message": _("Concern resolved as '{0}'").format(new_status)}

	except Exception as e:
		frappe.log_error(f"Error updating POW Stock Concern status: {e}")
		return {"status": "error", "message": str(e)}


def close_todo_assignment(concern_name):
	try:
		todos = frappe.get_all(
			"ToDo",
			filters={"reference_type": "POW Stock Concern", "reference_name": concern_name, "status": "Open"},
		)
		for todo in todos:
			frappe.db.set_value("ToDo", todo.name, "status", "Closed")
	except Exception as e:
		frappe.log_error(f"Error closing ToDo for POW Stock Concern {concern_name}: {e}")


@frappe.whitelist()
def get_concern_status_options(concern_name):
	try:
		concern = frappe.get_doc("POW Stock Concern", concern_name)
		valid_transitions = {
			"Open": ["Resolve Will Receive", "Resolve Reverted", "Resolve Partial"],
		}
		return valid_transitions.get(concern.status, [])
	except Exception as e:
		frappe.log_error(f"Error getting status options for {concern_name}: {e}")
		return []


@frappe.whitelist()
def get_source_entry_items(concern_name):
	"""Get items from the source Stock Entry for revert selection.

	Returns list of items with item_code, item_name, qty, uom, stock_uom,
	s_warehouse (transit), t_warehouse (original source for reverse).
	"""
	concern = frappe.get_doc("POW Stock Concern", concern_name)

	if not concern.can_change_status():
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	if concern.source_document_type != "Stock Entry" or not concern.source_document:
		return []

	se = frappe.get_doc("Stock Entry", concern.source_document)
	result = []
	for item in se.items:
		result.append({
			"item_code": item.item_code,
			"item_name": item.item_name,
			"qty": item.qty,
			"transfer_qty": item.transfer_qty,
			"uom": item.uom,
			"stock_uom": item.stock_uom,
			"conversion_factor": item.conversion_factor,
			"s_warehouse": item.s_warehouse,
			"t_warehouse": item.t_warehouse,
			"valuation_rate": item.valuation_rate or 0,
		})

	transit_wh = se.to_warehouse
	source_wh = se.from_warehouse
	if (not transit_wh or not source_wh) and se.items:
		first = se.items[0]
		transit_wh = transit_wh or first.t_warehouse
		source_wh = source_wh or first.s_warehouse

	return {
		"items": result,
		"from_warehouse": source_wh,
		"to_warehouse": transit_wh,
		"transit_warehouse": transit_wh,
		"source_warehouse": source_wh,
		"company": se.company,
	}


@frappe.whitelist()
def create_revert_transfer(concern_name, items, resolver_notes=None):
	"""Create a reverse Stock Entry: transit → original source warehouse.

	Args:
		concern_name: POW Stock Concern name
		items: JSON array of {item_code, qty, uom} — selected items to revert
		resolver_notes: optional notes

	Returns:
		dict with status, stock_entry name, concern status
	"""
	concern = frappe.get_doc("POW Stock Concern", concern_name)

	if not concern.can_change_status():
		frappe.throw(_("Not permitted"), frappe.PermissionError)

	if concern.status != "Open":
		return {"status": "error", "message": _("Concern is not Open")}

	if concern.source_document_type != "Stock Entry" or not concern.source_document:
		return {"status": "error", "message": _("No source Stock Entry linked")}

	if isinstance(items, str):
		items = frappe.parse_json(items)

	if not items:
		return {"status": "error", "message": _("No items selected for revert")}

	original_se = frappe.get_doc("Stock Entry", concern.source_document)
	original_items_map = {row.item_code: row for row in original_se.items}

	# Transit warehouse = where stock currently sits (original SE's to_warehouse)
	# Source warehouse = where stock came from (send it back here)
	# Try header-level first, fall back to first item row
	transit_wh = original_se.to_warehouse
	source_wh = original_se.from_warehouse

	if (not transit_wh or not source_wh) and original_se.items:
		first_item = original_se.items[0]
		transit_wh = transit_wh or first_item.t_warehouse
		source_wh = source_wh or first_item.s_warehouse

	if not transit_wh or not source_wh:
		return {
			"status": "error",
			"message": _("Cannot determine transit/source warehouses. SE {0}: from={1}, to={2}").format(
				original_se.name, original_se.from_warehouse, original_se.to_warehouse
			),
		}

	# Create reverse Stock Entry — direct transfer, NOT through transit
	# Link back to original outward SE so ERPNext updates transferred_qty
	se = frappe.new_doc("Stock Entry")
	se.stock_entry_type = "Material Transfer"
	se.company = original_se.company
	se.from_warehouse = transit_wh
	se.to_warehouse = source_wh
	se.add_to_transit = 0
	se.outgoing_stock_entry = original_se.name
	se.posting_date = today()
	se.posting_time = nowtime()
	se.pow_stock_concern = concern_name
	se.remarks = _("Revert transfer for concern {0}").format(concern_name)

	all_reverted = True
	for item_data in items:
		item_code = item_data.get("item_code")
		revert_qty = flt(item_data.get("qty", 0))
		if revert_qty <= 0:
			continue

		original_row = original_items_map.get(item_code)
		if not original_row:
			frappe.throw(_("Item {0} not found in original Stock Entry").format(item_code))

		if revert_qty < original_row.qty:
			all_reverted = False

		uom = item_data.get("uom") or original_row.uom
		cf = flt(original_row.conversion_factor) or 1.0

		se.append("items", {
			"item_code": item_code,
			"item_name": original_row.item_name,
			"description": original_row.description,
			"qty": revert_qty,
			"transfer_qty": flt(revert_qty * cf),
			"uom": uom,
			"stock_uom": original_row.stock_uom,
			"conversion_factor": cf,
			"s_warehouse": transit_wh,
			"t_warehouse": source_wh,
			"basic_rate": flt(original_row.valuation_rate),
			"valuation_rate": flt(original_row.valuation_rate),
			"allow_zero_valuation_rate": 1 if not original_row.valuation_rate else 0,
			"against_stock_entry": original_se.name,
			"ste_detail": original_row.name,
		})

	# Check if some items were not selected for revert (partial)
	reverted_items = {i.get("item_code") for i in items if flt(i.get("qty", 0)) > 0}
	if reverted_items != set(original_items_map.keys()):
		all_reverted = False

	if not se.items:
		return {"status": "error", "message": _("No valid items to revert")}

	frappe.db.begin()
	try:
		se.insert(ignore_permissions=True)
		se.submit()
		frappe.db.commit()
	except Exception:
		frappe.db.rollback()
		raise

	# Update concern
	new_status = "Resolve Reverted" if all_reverted else "Resolve Partial"
	update_fields = {
		"status": new_status,
		"pow_revert_stock_entry": se.name,
		"resolved_by": frappe.session.user,
		"resolved_date": now_datetime(),
	}
	if resolver_notes:
		update_fields["resolver_notes"] = resolver_notes

	frappe.db.set_value("POW Stock Concern", concern_name, update_fields, update_modified=False)
	close_todo_assignment(concern_name)

	return {
		"status": "success",
		"stock_entry": se.name,
		"concern_status": new_status,
		"message": _("Revert transfer {0} created. {1} items sent back to {2}").format(
			se.name, len(se.items), source_wh
		),
	}


@frappe.whitelist()
def create_stock_concern_from_transfer(concern_data, source_document_type, source_document, pow_session_id=None):
	try:
		concern_data = frappe.parse_json(concern_data)

		company = frappe.defaults.get_global_default("company")
		if not company:
			company = frappe.db.get_single_value("Global Defaults", "default_company")
		if not company:
			companies = frappe.get_all("Company", limit=1, pluck="name")
			company = companies[0] if companies else None

		concern = frappe.new_doc("POW Stock Concern")
		concern.company = company
		concern.concern_type = concern_data.get("concern_type", "Quantity Mismatch")
		concern.priority = concern_data.get("priority", "Medium")
		concern.source_document_type = source_document_type
		concern.source_document = source_document
		concern.pow_session_id = pow_session_id
		concern.concern_description = concern_data.get(
			"concern_description", f"Concern raised for {source_document_type}: {source_document}"
		)
		concern.receiver_notes = concern_data.get("receiver_notes", "")

		concern.insert()
		concern.submit()

		return {
			"status": "success",
			"concern_name": concern.name,
			"message": f"Stock concern created: {concern.name}",
		}

	except Exception as e:
		frappe.log_error(f"Error creating stock concern from transfer: {e}")
		return {"status": "error", "message": str(e)}


@frappe.whitelist()
def get_concerns_for_profile(pow_profile=None, status=None):
	"""List stock concerns scoped to user's POW Profile warehouses.

	Args:
		pow_profile: POW Profile name (optional — auto-detect if omitted)
		status: filter by status (optional, default: Open)

	Returns:
		list of concern dicts with source document info
	"""
	current_user = frappe.session.user

	if pow_profile:
		from warehousesuite.utils.pow_warehouse_scope import assert_user_on_pow_profile
		profile = assert_user_on_pow_profile(pow_profile)
	else:
		profiles = frappe.get_all("POW Profile User", filters={"user": current_user}, fields=["parent"])
		if not profiles:
			return []
		profile = frappe.get_cached_doc("POW Profile", profiles[0].parent)

	# Check stock_concern is enabled on profile
	if not getattr(profile, "stock_concern", 0):
		return []

	# Get allowed warehouses — direct match only
	allowed_warehouses = [
		(r.warehouse or "").strip()
		for r in (profile.source_warehouse or [])
		if (r.warehouse or "").strip()
	]
	if not allowed_warehouses:
		return []

	# Get all open concerns
	filters = {"docstatus": 1}
	if status:
		filters["status"] = status
	else:
		filters["status"] = "Open"

	concerns = frappe.get_all(
		"POW Stock Concern",
		filters=filters,
		fields=[
			"name", "concern_type", "priority", "status",
			"source_document_type", "source_document", "pow_session_id",
			"concern_description", "receiver_notes", "resolver_notes",
			"reported_by", "reported_date", "resolved_by", "resolved_date",
			"company",
		],
		order_by="reported_date desc",
	)

	# Filter by warehouse scope
	allowed_set = set(allowed_warehouses)
	result = []
	for c in concerns:
		if c.source_document_type != "Stock Entry" or not c.source_document:
			continue
		se = frappe.db.get_value(
			"Stock Entry",
			c.source_document,
			["from_warehouse", "to_warehouse", "custom_for_which_warehouse_to_transfer", "owner"],
			as_dict=True,
		)
		if not se:
			continue
		concern_warehouses = {w for w in [se.from_warehouse, se.to_warehouse, se.custom_for_which_warehouse_to_transfer] if w}
		if not (concern_warehouses & allowed_set):
			continue

		c["source_warehouse"] = se.from_warehouse
		c["target_warehouse"] = se.custom_for_which_warehouse_to_transfer or se.to_warehouse
		c["sender"] = se.owner

		# Use the single source of truth for permission check
		concern_doc = frappe.get_doc("POW Stock Concern", c.name)
		c["can_resolve"] = concern_doc.can_change_status()

		result.append(c)

	return result
