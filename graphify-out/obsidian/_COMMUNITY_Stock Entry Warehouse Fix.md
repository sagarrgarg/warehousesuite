---
type: community
cohesion: 1.00
members: 2
---

# Stock Entry Warehouse Fix

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[Fix stock entry warehouse information if missing (System Manager only).]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[fix_stock_entry_warehouses()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Stock_Entry_Warehouse_Fix
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[fix_stock_entry_warehouses()]] - degree 2, connects to 1 community