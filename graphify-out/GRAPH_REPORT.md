# Graph Report - /home/ubuntu/frappe-bench-new/apps/warehousesuite  (2026-04-15)

## Corpus Check
- 41 files · ~50,000 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1620 nodes · 3097 edges · 66 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `o()` - 49 edges
2. `fb()` - 43 edges
3. `Fy()` - 42 edges
4. `zh` - 41 edges
5. `n()` - 28 edges
6. `Qf()` - 28 edges
7. `$u()` - 25 edges
8. `qp()` - 24 edges
9. `E()` - 23 edges
10. `Xs()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `Technical Handbook (Root)` --semantically_similar_to--> `Technical Handbook (Inner)`  [INFERRED] [semantically similar]
  technical_handbook.md → warehousesuite/technical_handbook.md
- `Psychological Handbook (Root)` --semantically_similar_to--> `Psychological Handbook (Inner)`  [INFERRED] [semantically similar]
  psychological_handbook.md → warehousesuite/psychological_handbook.md
- `Trading Terminal Aesthetic (Design System)` --conceptually_related_to--> `Operator Empathy Principle`  [INFERRED]
  technical_handbook.md → warehousesuite/psychological_handbook.md
- `WarehouseSuite App` --implements--> `Frappe Framework`  [EXTRACTED]
  README.md → CLAUDE.md
- `WarehouseSuite App` --references--> `Commercial License`  [EXTRACTED]
  README.md → license.txt

## Hyperedges (group relationships)
- **POW Profile Security Enforcement Pattern** — pow_profile, pow_warehouse_scope, profile_permission_enforcement, server_side_data_scoping, fail_closed_principle, warehouse_rulebook [EXTRACTED 0.95]
- **POW Floor Operations Suite** — pow_dashboard, transfer_management, stock_counting, item_inquiry, work_order_manufacturing, material_request_integration, so_pending_report [EXTRACTED 0.95]
- **Design Intent: Operator-First UX** — mobile_first_design, trading_terminal_aesthetic, operator_empathy, truth_in_erpnext [INFERRED 0.85]

## Communities

### Community 0 - "Community 0"
Cohesion: 0.02
Nodes (347): API / Service Layer Architecture, Batch/Serial + Desk Restriction Plan, Batch & Serial Number Support, Item Inquiry Feature, Ac(), Ad(), ae(), af() (+339 more)

### Community 1 - "Community 1"
Cohesion: 0.02
Nodes (213): _1(), a_(), a1(), Ab(), Ac(), ag(), Ai(), aj() (+205 more)

### Community 2 - "Community 2"
Cohesion: 0.02
Nodes (15): extractMessageFromFrappeException(), formatPowFetchError(), isGenericFrappeSdkMessage(), parseFrappeServerMessages(), getCf(), toStockQty(), buildItems(), getDifferences() (+7 more)

### Community 3 - "Community 3"
Cohesion: 0.02
Nodes (28): _a, a0, bv(), h0(), hv(), it(), iv(), L0() (+20 more)

### Community 4 - "Community 4"
Cohesion: 0.03
Nodes (16): a0, componentDidCatch(), En(), fb(), Gn, h1(), Iy(), Lc() (+8 more)

### Community 5 - "Community 5"
Cohesion: 0.04
Nodes (70): _apply_substitutions_to_stock_entry(), _apply_work_order_item_substitutions(), _compose_description_with_original(), create_work_order(), get_alternative_items(), _get_alternative_items_for(), get_bom_for_item(), _get_item_availability() (+62 more)

### Community 6 - "Community 6"
Cohesion: 0.04
Nodes (39): Document, Fail Closed on Doubt Principle, POWAllowedOperations, POWNotification, POWProfileMulti, POWProfile, POWProfileUser, POWSession (+31 more)

### Community 7 - "Community 7"
Cohesion: 0.06
Nodes (31): Concern Management Feature, can_change_status(), changeStatusToResolve(), close_todo_assignment(), create_revert_transfer(), create_stock_concern_from_transfer(), get_concern_status_options(), get_concerns_for_profile() (+23 more)

### Community 8 - "Community 8"
Cohesion: 0.06
Nodes (33): create_pow_work_order(), get_bom_details(), get_item_alternatives(), get_manufacture_items(), get_mfg_default_warehouses(), get_pending_pow_work_orders(), get_wo_material_shortfall(), get_wo_materials() (+25 more)

### Community 9 - "Community 9"
Cohesion: 0.09
Nodes (29): Exception, create_api_response(), format_validation_errors(), get_already_received_quantity(), get_stock_quantity(), get_uom_conversion_factor(), Custom exception for validation errors, Validate stock availability for an item          Args:         item_code: Item c (+21 more)

### Community 10 - "Community 10"
Cohesion: 0.13
Nodes (24): assert_pow_so_pending_report_access(), _filters_sql(), _format_line_row(), get_so_pending_delivery_lines(), get_so_pending_delivery_summary(), _like_wrap(), _normalize_paging(), Sales Order pending-delivery reports for POW dashboard.  Correctness notes (vs r (+16 more)

### Community 11 - "Community 11"
Cohesion: 0.11
Nodes (14): Mobile-First Design Principle, Operator Empathy Principle, convert_to_stock_reconciliation(), item_row_has_difference(), POWStockCount, Return True when counted quantity differs from system/current stock beyond toler, Standalone wrapper so the method can be called via frappe.call as well., Standalone wrapper so the method can be called via frappe.call as well. (+6 more)

### Community 12 - "Community 12"
Cohesion: 0.11
Nodes (20): create_transfer_from_mr(), _eligible_warehouses_for_item(), get_fulfillment_options(), _get_mr_lines_with_remaining(), get_pending_receives(), get_pending_transfer_requests(), raise_material_transfer_request(), Service layer for Material Request (Material Transfer) operations in POW.  Eligi (+12 more)

### Community 13 - "Community 13"
Cohesion: 0.11
Nodes (19): get_all_child_warehouses(), get_item_stock_info(), get_pow_profile_warehouses(), get_stock_info_in_uom(), get_transfer_receive_data(), get_uom_conversion_factor(), _get_warehouses_for_receive_filter(), Recursively get all child warehouses under a parent warehouse, excluding group a (+11 more)

### Community 14 - "Community 14"
Cohesion: 0.13
Nodes (10): C0, cf(), cp(), k0(), Kn(), Pn(), Sr(), ta() (+2 more)

### Community 15 - "Community 15"
Cohesion: 0.12
Nodes (17): create_material_transfer_request(), create_transfer_from_material_request(), get_material_request_fulfillment_options(), get_pending_pow_receives(), get_pending_transfer_material_requests(), _parse_list(), Whitelisted API endpoints for Material Request (Material Transfer) operations in, Return pending transfer receives for a warehouse.      Args:         default_war (+9 more)

### Community 16 - "Community 16"
Cohesion: 0.14
Nodes (15): auto_set_transit_for_material_transfer(), _get_wmsuite_settings(), Auto Transit Validation for Stock Entries  This module automatically sets 'Add t, Automatically set 'Add to Transit' to 1 for Material Transfer type Stock Entries, Get WMSuite Settings safely, Get WMSuite Settings safely, Material Request Integration, Transfer Management Feature (+7 more)

### Community 17 - "Community 17"
Cohesion: 0.2
Nodes (11): get_pow_so_pending_lines(), get_pow_so_pending_summary(), _parse_filters(), Whitelisted POW APIs: Sales Order pending delivery reports., Build filters dict for service (customer + item_code exact from pickers)., Tab 1: pending SO lines (paginated). Scoped to profile warehouses., Tab 2: pending qty by item (paginated). Same scope as lines., Typeahead: customers with pending SO lines in profile warehouse scope. (+3 more)

### Community 18 - "Community 18"
Cohesion: 0.17
Nodes (12): check_existing_draft_stock_count(), create_and_submit_pow_stock_count(), create_stock_match_entry(), Check if there's an existing draft stock count for this warehouse and session, Save a POW Stock Count as draft, Check if there's an existing draft stock count for this warehouse and session, Create and submit a new POW Stock Count with items, Save a POW Stock Count as draft (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.2
Nodes (3): errText(), PowDashboardInner(), ErrorBoundary

### Community 20 - "Community 20"
Cohesion: 0.2
Nodes (10): BOM Permission Fix (get_all vs get_list), Commercial License, ERPNext Integration, Frappe Framework, Privacy Policy, Recursive WO Item Alternatives, Truth in ERPNext Principle, WarehouseSuite App (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.2
Nodes (9): create_serial_and_batch_bundle(), get_available_batches(), get_available_serial_nos(), get_item_batch_serial_info(), Batch and serial number lookup service for POW operations., Get batches with available qty for an item in a warehouse.  	Returns list of {ba, Get active serial numbers for an item in a warehouse., Create a Serial and Batch Bundle document.  	Args: 		item_code: Item code 		ware (+1 more)

### Community 22 - "Community 22"
Cohesion: 0.32
Nodes (3): loadCompanies(), setupPrintLabelsEvents(), updateLabelPreview()

### Community 23 - "Community 23"
Cohesion: 0.29
Nodes (4): FrappeTestCase, TestPOWProfile, TestPOWSession, TestSelectWarehouse

### Community 24 - "Community 24"
Cohesion: 0.33
Nodes (6): analyze_print_format_variables(), get_item_print_formats(), Analyze print format raw_commands to detect which variables are used, Get available print formats for Item doctype, Analyze print format raw_commands to detect which variables are used, Get available print formats for Item doctype

### Community 25 - "Community 25"
Cohesion: 0.33
Nodes (6): generate_label_zpl(), get_company_info_for_labels(), Get company information from WMS Settings and Company doctype for label printing, Get company information from WMS Settings and Company doctype for label printing, Generate ZPL code for item labels, Generate ZPL code for item labels

### Community 26 - "Small 26"
Cohesion: 0.4
Nodes (4): get_context(), get_context_for_dev(), Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +, Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu

### Community 27 - "Small 27"
Cohesion: 0.6
Nodes (3): g(), h(), k()

### Community 28 - "Small 28"
Cohesion: 0.4
Nodes (1): Whitelisted API for batch/serial queries in POW.

### Community 29 - "Small 29"
Cohesion: 0.67
Nodes (3): after_install(), _create_stock_entry_types(), Seed Stock Entry Types if they don't exist.

### Community 30 - "Small 30"
Cohesion: 0.5
Nodes (3): clear_concern_link_before_cancel(), Clear bidirectional links between Stock Entry and POW Stock Concern before cance, When a revert Stock Entry is cancelled, clear the link on the concern.

### Community 31 - "Small 31"
Cohesion: 0.67
Nodes (0): 

### Community 32 - "Small 32"
Cohesion: 0.67
Nodes (3): Create stock entry for receiving transfer (in-transit -> destination).      Args, Create stock entry for receiving transfer (in-transit -> destination).      Args, receive_transfer_stock_entry()

### Community 33 - "Small 33"
Cohesion: 0.67
Nodes (3): create_pow_stock_count(), Create a new POW Stock Count, Create a new POW Stock Count

### Community 34 - "Small 34"
Cohesion: 0.67
Nodes (3): get_warehouse_items_for_stock_count(), Get all items with stock in the specified warehouse for stock count., Get all items with stock in the specified warehouse for stock count.

### Community 35 - "Small 35"
Cohesion: 0.67
Nodes (3): create_pow_stock_count_with_items(), Create a new POW Stock Count with items, Create a new POW Stock Count with items

### Community 36 - "Small 36"
Cohesion: 0.67
Nodes (3): Validate only UI-specific aspects of transfer receive, Validate only UI-specific aspects of transfer receive, validate_transfer_receive_quantities()

### Community 37 - "Small 37"
Cohesion: 0.67
Nodes (3): get_item_inquiry_data(), Get comprehensive item information for inquiry modal.      When ``pow_profile``, Get comprehensive item information for inquiry modal.      When ``pow_profile``

### Community 38 - "Small 38"
Cohesion: 0.67
Nodes (3): get_bom_items(), Get BOM items for Material Request., Get BOM items for Material Request.

### Community 39 - "Small 39"
Cohesion: 0.67
Nodes (3): get_pending_sent_transfers(), Get pending sent transfers for one or more warehouses.      Args:         source, Get pending sent transfers for one or more warehouses.      Args:         source

### Community 40 - "Small 40"
Cohesion: 0.67
Nodes (3): get_item_uoms(), Get available UOMs for an item with conversion factors., Get available UOMs for an item with conversion factors.

### Community 41 - "Small 41"
Cohesion: 0.67
Nodes (3): get_item_availability(), Return available UOMs with conversion factors and warehouse-wise stock for an it, Return available UOMs with conversion factors and warehouse-wise stock for an it

### Community 42 - "Small 42"
Cohesion: 0.67
Nodes (3): create_concerns_from_discrepancies(), Create stock concerns from transfer discrepancies, Create stock concerns from transfer discrepancies

### Community 43 - "Small 43"
Cohesion: 0.67
Nodes (3): get_available_boms(), Get available BOMs for Material Request, Get available BOMs for Material Request

### Community 44 - "Small 44"
Cohesion: 0.67
Nodes (3): Frappe Cloud Marketplace, MIT License, WarehouseSuite

### Community 45 - "Small 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Small 46"
Cohesion: 1.0
Nodes (2): Technical Handbook (Inner), Technical Handbook (Root)

### Community 47 - "Small 47"
Cohesion: 1.0
Nodes (2): Psychological Handbook (Inner), Psychological Handbook (Root)

### Community 48 - "Small 48"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Small 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Small 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Small 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Small 52"
Cohesion: 1.0
Nodes (1): Get WMSuite settings as dictionary

### Community 53 - "Small 53"
Cohesion: 1.0
Nodes (1): Check if user can bypass value difference restrictions

### Community 54 - "Small 54"
Cohesion: 1.0
Nodes (1): Check if user has submission permission

### Community 55 - "Small 55"
Cohesion: 1.0
Nodes (1): Convert submitted stock count to stock reconciliation

### Community 56 - "Small 56"
Cohesion: 1.0
Nodes (1): Get all items with stock in the selected warehouse

### Community 57 - "Small 57"
Cohesion: 1.0
Nodes (1): Convert submitted stock count to stock reconciliation

### Community 58 - "Small 58"
Cohesion: 1.0
Nodes (1): Get all items with stock in the selected warehouse

### Community 59 - "Small 59"
Cohesion: 1.0
Nodes (1): QZ Tray Integration

### Community 60 - "Small 60"
Cohesion: 1.0
Nodes (1): Material Consumption Reconciliation Report

### Community 61 - "Small 61"
Cohesion: 1.0
Nodes (1): Warehouse Performance Report

### Community 62 - "Small 62"
Cohesion: 1.0
Nodes (1): Desk Stock Entry Restriction

### Community 63 - "Small 63"
Cohesion: 1.0
Nodes (1): FIFO/FEFO Picking Enforcement

### Community 64 - "Small 64"
Cohesion: 1.0
Nodes (1): Batch Stock Ageing Report

### Community 65 - "Small 65"
Cohesion: 1.0
Nodes (1): Barcode Scan Input

## Knowledge Gaps
- **286 isolated node(s):** `Seed Stock Entry Types if they don't exist.`, `Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu`, `Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +`, `Sales Order pending-delivery reports for POW dashboard.  Correctness notes (vs r`, `SQL expression: effective warehouse for a sales order line.` (+281 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Small 45`** (2 nodes): `item.js`, `refresh()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 46`** (2 nodes): `Technical Handbook (Inner)`, `Technical Handbook (Root)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 47`** (2 nodes): `Psychological Handbook (Inner)`, `Psychological Handbook (Root)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 48`** (2 nodes): `stock_entry.js`, `refresh()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 49`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 50`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 51`** (1 nodes): `hooks.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 52`** (1 nodes): `Get WMSuite settings as dictionary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 53`** (1 nodes): `Check if user can bypass value difference restrictions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 54`** (1 nodes): `Check if user has submission permission`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 55`** (1 nodes): `Convert submitted stock count to stock reconciliation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 56`** (1 nodes): `Get all items with stock in the selected warehouse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 57`** (1 nodes): `Convert submitted stock count to stock reconciliation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 58`** (1 nodes): `Get all items with stock in the selected warehouse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 59`** (1 nodes): `QZ Tray Integration`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 60`** (1 nodes): `Material Consumption Reconciliation Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 61`** (1 nodes): `Warehouse Performance Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 62`** (1 nodes): `Desk Stock Entry Restriction`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 63`** (1 nodes): `FIFO/FEFO Picking Enforcement`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 64`** (1 nodes): `Batch Stock Ageing Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small 65`** (1 nodes): `Barcode Scan Input`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `POWStockConcern` connect `Community 7` to `Community 6`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `zh` connect `Community 3` to `Community 0`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **What connects `Seed Stock Entry Types if they don't exist.`, `Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu`, `Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +` to the rest of the system?**
  _286 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._