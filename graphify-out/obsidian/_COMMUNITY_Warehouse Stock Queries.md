---
type: community
cohesion: 0.14
members: 14
---

# Warehouse Stock Queries

**Cohesion:** 0.14 - loosely connected
**Members:** 14 nodes

## Members
- [[Get UOM conversion factor between two UOMs for an item]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Get list of warehouses to match the warehouse itself, its children, and its par]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Get source, target, and in-transit warehouses from POW profile]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Get stock information for an item in a specific UOM.]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Get stock information for an item in a warehouse.      When ``pow_profile`` is p]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Get transfer receive data filtered by warehouse(s).      Args         default_w]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Recursively get all child warehouses under a parent warehouse, excluding group a]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[_get_warehouses_for_receive_filter()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_all_child_warehouses()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_item_stock_info()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_pow_profile_warehouses()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_stock_info_in_uom()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_transfer_receive_data()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_uom_conversion_factor()_1]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Warehouse_Stock_Queries
SORT file.name ASC
```

## Connections to other communities
- 7 edges to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[get_all_child_warehouses()]] - degree 4, connects to 1 community
- [[get_stock_info_in_uom()]] - degree 4, connects to 1 community
- [[get_transfer_receive_data()]] - degree 4, connects to 1 community
- [[get_uom_conversion_factor()_1]] - degree 4, connects to 1 community
- [[_get_warehouses_for_receive_filter()]] - degree 4, connects to 1 community