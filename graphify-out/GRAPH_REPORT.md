# Graph Report - /home/ubuntu/frappe-bench-new/apps/warehousesuite  (2026-04-21)

## Corpus Check
- 144 files · ~119,779 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1566 nodes · 3057 edges · 57 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 12 edges (avg confidence: 0.83)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `o()` - 49 edges
2. `Fy()` - 42 edges
3. `zh` - 41 edges
4. `Xb` - 41 edges
5. `n()` - 28 edges
6. `$u()` - 25 edges
7. `Bf` - 25 edges
8. `qp()` - 24 edges
9. `E()` - 23 edges
10. `Xs()` - 23 edges

## Surprising Connections (you probably didn't know these)
- `CLAUDE.md Project Instructions` --semantically_similar_to--> `AGENTS.md Cursor Cloud Instructions`  [INFERRED] [semantically similar]
  CLAUDE.md → AGENTS.md
- `Technical Handbook (root)` --semantically_similar_to--> `Technical Handbook (warehousesuite/)`  [INFERRED] [semantically similar]
  technical_handbook.md → warehousesuite/technical_handbook.md
- `Psychological Handbook (root)` --semantically_similar_to--> `Psychological Handbook (warehousesuite/)`  [INFERRED] [semantically similar]
  psychological_handbook.md → warehousesuite/psychological_handbook.md
- `TODO: FIFO/FEFO Picking Enforcement` --conceptually_related_to--> `Batch & Serial Number Support Plan`  [INFERRED]
  TODO.md → docs/superpowers/plans/2026-04-14-batch-serial-desk.md
- `Frappe Cloud Marketplace Publishing Checklist` --references--> `WarehouseSuite App`  [EXTRACTED]
  MARKETPLACE.md → README.md

## Hyperedges (group relationships)
- **POW Security Architecture (Profile + Warehouse Scope + Server Enforcement)** — concept_pow_profile, concept_pow_warehouse_scope, concept_security_profile_enforcement, rationale_server_side_scoping, rationale_frappe_get_all_vs_get_list [EXTRACTED 0.95]
- **Batch/Serial Support Across All Operations** — concept_batch_serial_support, concept_transfer_flow, concept_stock_count, concept_work_order, concept_serial_batch_bundle [EXTRACTED 0.90]
- **POW React Frontend Technology Stack** — concept_pow_dashboard, concept_frappe_react_sdk, concept_jotai_state, concept_tailwind_v4, concept_shadcn_ui, concept_trading_terminal_ui [EXTRACTED 0.95]

## Communities

### Community 0 - "Legacy Dashboard Bundle"
Cohesion: 0.02
Nodes (354): Ac(), Ad(), ae(), af(), ah(), ao(), ap(), as() (+346 more)

### Community 1 - "Socket.IO Client Core"
Cohesion: 0.02
Nodes (211): _1(), A_(), a1(), Ac(), ag(), Ai(), aj(), Ak() (+203 more)

### Community 2 - "React Frontend Components"
Cohesion: 0.02
Nodes (15): extractMessageFromFrappeException(), formatPowFetchError(), isGenericFrappeSdkMessage(), parseFrappeServerMessages(), getCf(), toStockQty(), buildItems(), getDifferences() (+7 more)

### Community 3 - "Dashboard UI Panels"
Cohesion: 0.02
Nodes (25): _a, a0, bv(), da(), hv(), it(), iv(), L0() (+17 more)

### Community 4 - "Socket.IO Transport"
Cohesion: 0.04
Nodes (10): Bf, componentDidCatch(), Gn, Lc(), ow, Sn(), x_(), Xb (+2 more)

### Community 5 - "Doctype Definitions"
Cohesion: 0.04
Nodes (35): Document, POWAllowedOperations, POWNotification, POWProfileMulti, POWProfile, POWProfileUser, POWSession, can_change_status() (+27 more)

### Community 6 - "Project Documentation"
Cohesion: 0.05
Nodes (58): Batch & Serial Number Support Plan, Desk Stock Entry Restriction Plan, ERPNext, Frappe Framework, frappe-react-sdk, Item Inquiry System, Jotai State Management, Material Request Integration (+50 more)

### Community 7 - "Work Order Service"
Cohesion: 0.06
Nodes (53): _apply_substitutions_to_stock_entry(), _apply_work_order_item_substitutions(), _compose_description_with_original(), create_work_order(), get_alternative_items(), _get_alternative_items_for(), get_bom_for_item(), _get_item_availability() (+45 more)

### Community 8 - "Validation Framework"
Cohesion: 0.09
Nodes (29): Exception, create_api_response(), format_validation_errors(), get_already_received_quantity(), get_stock_quantity(), get_uom_conversion_factor(), Custom exception for validation errors, Validate stock availability for an item          Args:         item_code: Item c (+21 more)

### Community 9 - "Socket.IO Engine"
Cohesion: 0.09
Nodes (5): a0, e_(), _f(), oN(), q_()

### Community 10 - "Work Order API"
Cohesion: 0.07
Nodes (29): create_pow_work_order(), get_bom_details(), get_boms_for_item(), get_item_alternatives(), get_manufacture_items(), get_mfg_default_warehouses(), get_pending_pow_work_orders(), get_wo_material_shortfall() (+21 more)

### Community 11 - "SO Pending Report Service"
Cohesion: 0.13
Nodes (24): assert_pow_so_pending_report_access(), _filters_sql(), _format_line_row(), get_so_pending_delivery_lines(), get_so_pending_delivery_summary(), _like_wrap(), _normalize_paging(), Sales Order pending-delivery reports for POW dashboard.  Correctness notes (vs r (+16 more)

### Community 12 - "Socket.IO Decoder"
Cohesion: 0.13
Nodes (10): C0, cf(), cp(), k0(), Kn(), Pn(), Sr(), ta() (+2 more)

### Community 13 - "WMSuite Settings"
Cohesion: 0.14
Nodes (12): check_value_difference_allowed(), get_active_pow_notifications(), get_settings(), get_wmsuite_settings(), Validate WMSuite Settings, Validate value difference settings, Validate role settings, Extract role names from roles data (handles both string and Table MultiSelect fo (+4 more)

### Community 14 - "Material Request Service"
Cohesion: 0.14
Nodes (16): create_transfer_from_mr(), _eligible_warehouses_for_item(), get_fulfillment_options(), _get_mr_lines_with_remaining(), get_pending_receives(), get_pending_transfer_requests(), raise_material_transfer_request(), Service layer for Material Request (Material Transfer) operations in POW.  Eligi (+8 more)

### Community 15 - "Material Request API"
Cohesion: 0.16
Nodes (13): create_material_transfer_request(), create_transfer_from_material_request(), get_material_request_fulfillment_options(), get_pending_pow_receives(), get_pending_transfer_material_requests(), _parse_list(), Whitelisted API endpoints for Material Request (Material Transfer) operations in, Return pending transfer receives for a warehouse.      Args:         default_war (+5 more)

### Community 16 - "Warehouse Scope Utils"
Cohesion: 0.18
Nodes (13): assert_user_on_pow_profile(), assert_warehouses_in_scope(), get_pow_profile_delivery_warehouse_scope(), get_pow_profile_source_warehouse_scope(), get_pow_profile_target_receive_scope(), POW Profile warehouse expansion (source ∪ target roots + leaf descendants)., Deprecated alias — use ``get_pow_profile_source_warehouse_scope`` instead., Assert user membership on profile and return the full scope (source ∪ target). (+5 more)

### Community 17 - "Stock & Transfer Queries"
Cohesion: 0.14
Nodes (14): get_all_child_warehouses(), get_item_stock_info(), get_pow_profile_warehouses(), get_stock_info_in_uom(), get_transfer_receive_data(), get_uom_conversion_factor(), _get_warehouses_for_receive_filter(), Recursively get all child warehouses under a parent warehouse, excluding group a (+6 more)

### Community 18 - "SO Pending Report API"
Cohesion: 0.2
Nodes (11): get_pow_so_pending_lines(), get_pow_so_pending_summary(), _parse_filters(), Whitelisted POW APIs: Sales Order pending delivery reports., Build filters dict for service (customer + item_code exact from pickers)., Tab 1: pending SO lines (paginated). Scoped to profile warehouses., Tab 2: pending qty by item (paginated). Same scope as lines., Typeahead: customers with pending SO lines in profile warehouse scope. (+3 more)

### Community 19 - "React App Shell"
Cohesion: 0.2
Nodes (3): errText(), PowDashboardInner(), ErrorBoundary

### Community 20 - "Batch Serial Service"
Cohesion: 0.2
Nodes (9): create_serial_and_batch_bundle(), get_available_batches(), get_available_serial_nos(), get_item_batch_serial_info(), Batch and serial number lookup service for POW operations., Get batches with available qty for an item in a warehouse.  	Returns list of {ba, Get active serial numbers for an item in a warehouse., Create a Serial and Batch Bundle document.  	Args: 		item_code: Item code 		ware (+1 more)

### Community 21 - "Value Diff Validation"
Cohesion: 0.32
Nodes (7): _get_wmsuite_settings(), _has_override_permission(), Value Difference Validation for Stock Entries  This module provides validation t, Validate if Stock Entry has value difference and restrict based on WMSuite Setti, Get WMSuite Settings safely, Check if current user has override permission, validate_value_difference()

### Community 22 - "Stock Count Operations"
Cohesion: 0.25
Nodes (8): check_existing_draft_stock_count(), create_and_submit_pow_stock_count(), create_stock_match_entry(), Check if there's an existing draft stock count for this warehouse and session, Save a POW Stock Count as draft, Create and submit a new POW Stock Count with items, Create a POW Stock Count entry for when all quantities match (no differences), save_pow_stock_count_draft()

### Community 23 - "Label Printing"
Cohesion: 0.32
Nodes (3): loadCompanies(), setupPrintLabelsEvents(), updateLabelPreview()

### Community 24 - "Test Stubs"
Cohesion: 0.29
Nodes (4): FrappeTestCase, TestPOWProfile, TestPOWSession, TestSelectWarehouse

### Community 25 - "Auto Transit Validation"
Cohesion: 0.4
Nodes (5): auto_set_transit_for_material_transfer(), _get_wmsuite_settings(), Auto Transit Validation for Stock Entries  This module automatically sets 'Add t, Automatically set 'Add to Transit' to 1 for Material Transfer type Stock Entries, Get WMSuite Settings safely

### Community 26 - "Socket.IO Error Boundary"
Cohesion: 0.33
Nodes (2): cN(), vk

### Community 27 - "POW Page Context"
Cohesion: 0.4
Nodes (4): get_context(), get_context_for_dev(), Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +, Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu

### Community 28 - "Batch Serial API"
Cohesion: 0.4
Nodes (1): Whitelisted API for batch/serial queries in POW.

### Community 29 - "Zebra Print SDK"
Cohesion: 0.6
Nodes (3): g(), h(), k()

### Community 30 - "Small Community 30"
Cohesion: 0.67
Nodes (3): after_install(), _create_stock_entry_types(), Seed Stock Entry Types if they don't exist.

### Community 31 - "Small Community 31"
Cohesion: 0.5
Nodes (3): clear_concern_link_before_cancel(), Clear bidirectional links between Stock Entry and POW Stock Concern before cance, When a revert Stock Entry is cancelled, clear the link on the concern.

### Community 32 - "Small Community 32"
Cohesion: 0.5
Nodes (4): analyze_print_format_variables(), get_item_print_formats(), Analyze print format raw_commands to detect which variables are used, Get available print formats for Item doctype

### Community 33 - "Small Community 33"
Cohesion: 0.5
Nodes (4): generate_label_zpl(), get_company_info_for_labels(), Get company information from WMS Settings and Company doctype for label printing, Generate ZPL code for item labels

### Community 34 - "Small Community 34"
Cohesion: 0.67
Nodes (0): 

### Community 35 - "Small Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Small Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Small Community 37"
Cohesion: 1.0
Nodes (2): AGENTS.md Cursor Cloud Instructions, CLAUDE.md Project Instructions

### Community 38 - "Small Community 38"
Cohesion: 1.0
Nodes (2): Technical Handbook (warehousesuite/), Technical Handbook (root)

### Community 39 - "Small Community 39"
Cohesion: 1.0
Nodes (2): Psychological Handbook (warehousesuite/), Psychological Handbook (root)

### Community 40 - "Small Community 40"
Cohesion: 1.0
Nodes (2): TODO: Native Mobile App (React Native), TODO: Mobile PWA Enhancement

### Community 41 - "Small Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Small Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Small Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Small Community 44"
Cohesion: 1.0
Nodes (1): Get WMSuite settings as dictionary

### Community 45 - "Small Community 45"
Cohesion: 1.0
Nodes (1): Check if user can bypass value difference restrictions

### Community 46 - "Small Community 46"
Cohesion: 1.0
Nodes (1): Check if user has submission permission

### Community 47 - "Small Community 47"
Cohesion: 1.0
Nodes (1): Convert submitted stock count to stock reconciliation

### Community 48 - "Small Community 48"
Cohesion: 1.0
Nodes (1): Get all items with stock in the selected warehouse

### Community 49 - "Small Community 49"
Cohesion: 1.0
Nodes (1): Frappe modules.txt

### Community 50 - "Small Community 50"
Cohesion: 1.0
Nodes (1): Frappe patches.txt

### Community 51 - "Small Community 51"
Cohesion: 1.0
Nodes (1): TODO: Material Consumption Reconciliation Report

### Community 52 - "Small Community 52"
Cohesion: 1.0
Nodes (1): TODO: Warehouse Performance Report

### Community 53 - "Small Community 53"
Cohesion: 1.0
Nodes (1): TODO: QC Hold / Quarantine Workflow

### Community 54 - "Small Community 54"
Cohesion: 1.0
Nodes (1): TODO: Production Progress Dashboard

### Community 55 - "Small Community 55"
Cohesion: 1.0
Nodes (1): TODO: Geospatial India Mapping for Sales Orders

### Community 56 - "Small Community 56"
Cohesion: 1.0
Nodes (1): TODO: Bin/Location Management

## Knowledge Gaps
- **217 isolated node(s):** `Seed Stock Entry Types if they don't exist.`, `Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu`, `Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +`, `Batch and serial number lookup service for POW operations.`, `Check if item has batch/serial tracking enabled.` (+212 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Small Community 35`** (2 nodes): `item.js`, `refresh()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 36`** (2 nodes): `stock_entry.js`, `refresh()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 37`** (2 nodes): `AGENTS.md Cursor Cloud Instructions`, `CLAUDE.md Project Instructions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 38`** (2 nodes): `Technical Handbook (warehousesuite/)`, `Technical Handbook (root)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 39`** (2 nodes): `Psychological Handbook (warehousesuite/)`, `Psychological Handbook (root)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 40`** (2 nodes): `TODO: Native Mobile App (React Native)`, `TODO: Mobile PWA Enhancement`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 41`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 42`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 43`** (1 nodes): `hooks.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 44`** (1 nodes): `Get WMSuite settings as dictionary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 45`** (1 nodes): `Check if user can bypass value difference restrictions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 46`** (1 nodes): `Check if user has submission permission`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 47`** (1 nodes): `Convert submitted stock count to stock reconciliation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 48`** (1 nodes): `Get all items with stock in the selected warehouse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 49`** (1 nodes): `Frappe modules.txt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 50`** (1 nodes): `Frappe patches.txt`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 51`** (1 nodes): `TODO: Material Consumption Reconciliation Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 52`** (1 nodes): `TODO: Warehouse Performance Report`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 53`** (1 nodes): `TODO: QC Hold / Quarantine Workflow`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 54`** (1 nodes): `TODO: Production Progress Dashboard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 55`** (1 nodes): `TODO: Geospatial India Mapping for Sales Orders`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Small Community 56`** (1 nodes): `TODO: Bin/Location Management`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zh` connect `Dashboard UI Panels` to `Legacy Dashboard Bundle`?**
  _High betweenness centrality (0.017) - this node is a cross-community bridge._
- **Why does `Xb` connect `Socket.IO Transport` to `Socket.IO Client Core`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `$u()` connect `Dashboard UI Panels` to `Legacy Dashboard Bundle`?**
  _High betweenness centrality (0.009) - this node is a cross-community bridge._
- **What connects `Seed Stock Entry Types if they don't exist.`, `Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu`, `Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +` to the rest of the system?**
  _217 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Legacy Dashboard Bundle` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Socket.IO Client Core` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `React Frontend Components` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._