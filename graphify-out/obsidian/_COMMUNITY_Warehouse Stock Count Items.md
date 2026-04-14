---
type: community
cohesion: 1.00
members: 2
---

# Warehouse Stock Count Items

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[Get all items with stock in the specified warehouse for stock count.]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_warehouse_items_for_stock_count()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Warehouse_Stock_Count_Items
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[get_warehouse_items_for_stock_count()]] - degree 2, connects to 1 community