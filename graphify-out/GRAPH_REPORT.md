# Graph Report - /home/ubuntu/frappe-bench-new/apps/warehousesuite  (2026-04-14)

## Corpus Check
- 130 files · ~106,762 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1484 nodes · 2964 edges · 56 communities detected
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 6 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## God Nodes (most connected - your core abstractions)
1. `o()` - 49 edges
2. `bg()` - 43 edges
3. `Fy()` - 42 edges
4. `zh` - 41 edges
5. `n()` - 28 edges
6. `$u()` - 25 edges
7. `Nf` - 25 edges
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

### Community 0 - "Socket.IO Transport Core"
Cohesion: 0.02
Nodes (210): _1(), a1(), ag(), Ai(), aj(), ak(), Av(), B() (+202 more)

### Community 1 - "React API & Action Grid"
Cohesion: 0.02
Nodes (18): extractMessageFromFrappeException(), formatPowFetchError(), isGenericFrappeSdkMessage(), parseFrappeServerMessages(), errText(), PowDashboardInner(), ErrorBoundary, getCf() (+10 more)

### Community 2 - "Legacy POW Dashboard Page"
Cohesion: 0.02
Nodes (24): _a, a0, bv(), da(), hv(), it(), iv(), L0() (+16 more)

### Community 3 - "POW Dashboard Features Hub"
Cohesion: 0.02
Nodes (92): API / Service Layer Architecture, Item Inquiry Feature, Ac(), av(), close_pow_session(), create_concerns_from_discrepancies(), create_material_request(), create_pow_stock_count() (+84 more)

### Community 4 - "Socket.IO Engine Client"
Cohesion: 0.04
Nodes (10): bg(), c1(), componentDidCatch(), Fx(), kn(), $n, Nf, Rc() (+2 more)

### Community 5 - "WebSocket Polling Transport"
Cohesion: 0.05
Nodes (10): aw(), dw(), ff(), jf(), jw(), mw(), pw(), px() (+2 more)

### Community 6 - "Work Order Service"
Cohesion: 0.06
Nodes (53): _apply_substitutions_to_stock_entry(), _apply_work_order_item_substitutions(), _compose_description_with_original(), create_work_order(), get_alternative_items(), _get_alternative_items_for(), get_bom_for_item(), _get_item_availability() (+45 more)

### Community 7 - "POW Profile & Permissions"
Cohesion: 0.05
Nodes (35): Document, Fail Closed on Doubt Principle, POWAllowedOperations, POWProfile, POWProfileUser, POWSession, POWStockCountItem, assert_user_on_pow_profile() (+27 more)

### Community 8 - "Transfer Send/Receive Modals"
Cohesion: 0.07
Nodes (47): Bc(), Bd(), Bn(), Cd(), _d(), dg(), Ed(), ey() (+39 more)

### Community 9 - "Stock Count & Repack Modals"
Cohesion: 0.09
Nodes (41): cp(), Dc(), dp(), Ei(), fo(), fp(), gc(), gd() (+33 more)

### Community 10 - "Manufacturing Modals"
Cohesion: 0.11
Nodes (37): ae(), ap(), Be(), Cn(), Cr(), Cy(), ef(), ge() (+29 more)

### Community 11 - "Validation Framework"
Cohesion: 0.09
Nodes (29): Exception, create_api_response(), format_validation_errors(), get_already_received_quantity(), get_stock_quantity(), get_uom_conversion_factor(), Custom exception for validation errors, Validate stock availability for an item          Args:         item_code: Item c (+21 more)

### Community 12 - "Item Inquiry & Search"
Cohesion: 0.09
Nodes (34): af(), ao(), Bu(), cg(), df(), dr(), Dt(), Ec() (+26 more)

### Community 13 - "Concern Management"
Cohesion: 0.08
Nodes (21): Concern Management Feature, can_change_status(), changeStatusToResolve(), close_todo_assignment(), create_stock_concern_from_transfer(), get_concern_status_options(), getResolverNotes(), POWStockConcern (+13 more)

### Community 14 - "Dashboard Layout & Panels"
Cohesion: 0.1
Nodes (30): Ad(), au(), By(), _c(), ca(), Fi(), Fl(), _g() (+22 more)

### Community 15 - "Work Order API Endpoints"
Cohesion: 0.07
Nodes (27): create_pow_work_order(), get_bom_details(), get_item_alternatives(), get_manufacture_items(), get_mfg_default_warehouses(), get_pending_pow_work_orders(), get_wo_material_shortfall(), get_wo_materials() (+19 more)

### Community 16 - "Reports & Pending Lists"
Cohesion: 0.13
Nodes (27): as(), ay(), Bp(), Ci(), Cl(), En(), Et(), eu() (+19 more)

### Community 17 - "SO Pending Report Service"
Cohesion: 0.13
Nodes (24): assert_pow_so_pending_report_access(), _filters_sql(), _format_line_row(), get_so_pending_delivery_lines(), get_so_pending_delivery_summary(), _like_wrap(), _normalize_paging(), Sales Order pending-delivery reports for POW dashboard.  Correctness notes (vs r (+16 more)

### Community 18 - "Profile Switcher & Boot"
Cohesion: 0.15
Nodes (24): ah(), bm(), ch(), E(), ep(), $f(), fh(), ka() (+16 more)

### Community 19 - "Stock Count Doctype"
Cohesion: 0.13
Nodes (12): Mobile-First Design Principle, Operator Empathy Principle, convert_to_stock_reconciliation(), item_row_has_difference(), POWStockCount, Return True when counted quantity differs from system/current stock beyond toler, Standalone wrapper so the method can be called via frappe.call as well., Ensure only one draft stock count per warehouse per session (+4 more)

### Community 20 - "Transfer Detail Modals"
Cohesion: 0.26
Nodes (18): ce(), Dy(), ea(), Er(), fa(), Fy(), gp(), Ir() (+10 more)

### Community 21 - "Socket.IO Decoder"
Cohesion: 0.14
Nodes (9): C0, cf(), k0(), Kn(), Pn(), Sr(), ta(), Wf() (+1 more)

### Community 22 - "Material Request Service"
Cohesion: 0.15
Nodes (15): create_transfer_from_mr(), _eligible_warehouses_for_item(), get_fulfillment_options(), _get_mr_lines_with_remaining(), get_pending_receives(), get_pending_transfer_requests(), raise_material_transfer_request(), Service layer for Material Request (Material Transfer) operations in POW.  Eligi (+7 more)

### Community 23 - "Auto Transit Validation"
Cohesion: 0.15
Nodes (14): auto_set_transit_for_material_transfer(), _get_wmsuite_settings(), Auto Transit Validation for Stock Entries  This module automatically sets 'Add t, Automatically set 'Add to Transit' to 1 for Material Transfer type Stock Entries, Get WMSuite Settings safely, Material Request Integration, Transfer Management Feature, _get_wmsuite_settings() (+6 more)

### Community 24 - "Material Request API"
Cohesion: 0.16
Nodes (13): create_material_transfer_request(), create_transfer_from_material_request(), get_material_request_fulfillment_options(), get_pending_pow_receives(), get_pending_transfer_material_requests(), _parse_list(), Whitelisted API endpoints for Material Request (Material Transfer) operations in, Return pending transfer receives for a warehouse.      Args:         default_war (+5 more)

### Community 25 - "Warehouse Stock Queries"
Cohesion: 0.14
Nodes (14): get_all_child_warehouses(), get_item_stock_info(), get_pow_profile_warehouses(), get_stock_info_in_uom(), get_transfer_receive_data(), get_uom_conversion_factor(), _get_warehouses_for_receive_filter(), Recursively get all child warehouses under a parent warehouse, excluding group a (+6 more)

### Community 26 - "SO Pending Report API"
Cohesion: 0.2
Nodes (11): get_pow_so_pending_lines(), get_pow_so_pending_summary(), _parse_filters(), Whitelisted POW APIs: Sales Order pending delivery reports., Build filters dict for service (customer + item_code exact from pickers)., Tab 1: pending SO lines (paginated). Scoped to profile warehouses., Tab 2: pending qty by item (paginated). Same scope as lines., Typeahead: customers with pending SO lines in profile warehouse scope. (+3 more)

### Community 27 - "ERPNext & Frappe Integration"
Cohesion: 0.2
Nodes (10): BOM Permission Fix (get_all vs get_list), Commercial License, ERPNext Integration, Frappe Framework, Privacy Policy, Recursive WO Item Alternatives, Truth in ERPNext Principle, WarehouseSuite App (+2 more)

### Community 28 - "Stock Count Submission"
Cohesion: 0.25
Nodes (8): check_existing_draft_stock_count(), create_and_submit_pow_stock_count(), create_stock_match_entry(), Check if there's an existing draft stock count for this warehouse and session, Save a POW Stock Count as draft, Create and submit a new POW Stock Count with items, Create a POW Stock Count entry for when all quantities match (no differences), save_pow_stock_count_draft()

### Community 29 - "Zebra Print Labels"
Cohesion: 0.32
Nodes (3): loadCompanies(), setupPrintLabelsEvents(), updateLabelPreview()

### Community 30 - "Test Stubs"
Cohesion: 0.29
Nodes (4): FrappeTestCase, TestPOWProfile, TestPOWSession, TestSelectWarehouse

### Community 31 - "React Error Boundary"
Cohesion: 0.33
Nodes (2): qj(), Z_

### Community 32 - "POW Website Route"
Cohesion: 0.4
Nodes (4): get_context(), get_context_for_dev(), Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +, Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu

### Community 33 - "Zebra Browser Print SDK"
Cohesion: 0.6
Nodes (3): g(), h(), k()

### Community 34 - "App Install Setup"
Cohesion: 0.67
Nodes (3): after_install(), _create_stock_entry_types(), Seed Stock Entry Types if they don't exist.

### Community 35 - "Print Format Analysis"
Cohesion: 0.5
Nodes (4): analyze_print_format_variables(), get_item_print_formats(), Analyze print format raw_commands to detect which variables are used, Get available print formats for Item doctype

### Community 36 - "Label ZPL Generation"
Cohesion: 0.5
Nodes (4): generate_label_zpl(), get_company_info_for_labels(), Get company information from WMS Settings and Company doctype for label printing, Generate ZPL code for item labels

### Community 37 - "Vite Build Config"
Cohesion: 0.67
Nodes (0): 

### Community 38 - "Warehouse Stock Count Items"
Cohesion: 1.0
Nodes (2): get_warehouse_items_for_stock_count(), Get all items with stock in the specified warehouse for stock count.

### Community 39 - "Stock Count Creation"
Cohesion: 1.0
Nodes (2): create_pow_stock_count_with_items(), Create a new POW Stock Count with items

### Community 40 - "Company Lookup"
Cohesion: 1.0
Nodes (2): get_companies(), Get all companies for selection

### Community 41 - "ZPL Label Builder"
Cohesion: 1.0
Nodes (2): generate_zpl_label(), Generate ZPL code for a single label matching the label design

### Community 42 - "BOM Lookup"
Cohesion: 1.0
Nodes (2): get_available_boms(), Get available BOMs for Material Request

### Community 43 - "BOM Items Query"
Cohesion: 1.0
Nodes (2): get_bom_items(), Get BOM items for Material Request.

### Community 44 - "Stock Entry Warehouse Fix"
Cohesion: 1.0
Nodes (2): fix_stock_entry_warehouses(), Fix stock entry warehouse information if missing (System Manager only).

### Community 45 - "Item Doctype Extension"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Psychological Handbook"
Cohesion: 1.0
Nodes (2): Psychological Handbook (Inner), Psychological Handbook (Root)

### Community 47 - "Technical Handbook"
Cohesion: 1.0
Nodes (2): Technical Handbook (Inner), Technical Handbook (Root)

### Community 48 - "Vite Env Types"
Cohesion: 1.0
Nodes (0): 

### Community 49 - "Frontend Index"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Hooks Config"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "WMSuite Transit Setting"
Cohesion: 1.0
Nodes (1): Get WMSuite settings as dictionary

### Community 52 - "WMSuite Value Diff Setting"
Cohesion: 1.0
Nodes (1): Check if user can bypass value difference restrictions

### Community 53 - "WMSuite Auto Setting"
Cohesion: 1.0
Nodes (1): Check if user has submission permission

### Community 54 - "Stock Count Variance Design"
Cohesion: 1.0
Nodes (1): Convert submitted stock count to stock reconciliation

### Community 55 - "Stock Count Reconciliation"
Cohesion: 1.0
Nodes (1): Get all items with stock in the selected warehouse

## Knowledge Gaps
- **190 isolated node(s):** `Seed Stock Entry Types if they don't exist.`, `Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu`, `Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +`, `Sales Order pending-delivery reports for POW dashboard.  Correctness notes (vs r`, `SQL expression: effective warehouse for a sales order line.` (+185 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Warehouse Stock Count Items`** (2 nodes): `get_warehouse_items_for_stock_count()`, `Get all items with stock in the specified warehouse for stock count.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stock Count Creation`** (2 nodes): `create_pow_stock_count_with_items()`, `Create a new POW Stock Count with items`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Company Lookup`** (2 nodes): `get_companies()`, `Get all companies for selection`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `ZPL Label Builder`** (2 nodes): `generate_zpl_label()`, `Generate ZPL code for a single label matching the label design`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `BOM Lookup`** (2 nodes): `get_available_boms()`, `Get available BOMs for Material Request`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `BOM Items Query`** (2 nodes): `get_bom_items()`, `Get BOM items for Material Request.`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stock Entry Warehouse Fix`** (2 nodes): `fix_stock_entry_warehouses()`, `Fix stock entry warehouse information if missing (System Manager only).`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Item Doctype Extension`** (2 nodes): `item.js`, `refresh()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Psychological Handbook`** (2 nodes): `Psychological Handbook (Inner)`, `Psychological Handbook (Root)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Technical Handbook`** (2 nodes): `Technical Handbook (Inner)`, `Technical Handbook (Root)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Vite Env Types`** (1 nodes): `vite-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Frontend Index`** (1 nodes): `index.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Hooks Config`** (1 nodes): `hooks.py`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WMSuite Transit Setting`** (1 nodes): `Get WMSuite settings as dictionary`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WMSuite Value Diff Setting`** (1 nodes): `Check if user can bypass value difference restrictions`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `WMSuite Auto Setting`** (1 nodes): `Check if user has submission permission`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stock Count Variance Design`** (1 nodes): `Convert submitted stock count to stock reconciliation`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Stock Count Reconciliation`** (1 nodes): `Get all items with stock in the selected warehouse`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `zh` connect `Legacy POW Dashboard Page` to `POW Dashboard Features Hub`?**
  _High betweenness centrality (0.024) - this node is a cross-community bridge._
- **Why does `POWStockConcern` connect `Concern Management` to `POW Profile & Permissions`?**
  _High betweenness centrality (0.018) - this node is a cross-community bridge._
- **What connects `Seed Stock Entry Types if they don't exist.`, `Website page context for `/pow` — React POW shell; requires logged-in user.  	Gu`, `Boot payload for the Vite dev shell (`frontend/`). Requires desk-style session +` to the rest of the system?**
  _190 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Socket.IO Transport Core` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `React API & Action Grid` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `Legacy POW Dashboard Page` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._
- **Should `POW Dashboard Features Hub` be split into smaller, more focused modules?**
  _Cohesion score 0.02 - nodes in this community are weakly interconnected._