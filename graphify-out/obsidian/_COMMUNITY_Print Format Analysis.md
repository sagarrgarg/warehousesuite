---
type: community
cohesion: 0.50
members: 4
---

# Print Format Analysis

**Cohesion:** 0.50 - moderately connected
**Members:** 4 nodes

## Members
- [[Analyze print format raw_commands to detect which variables are used]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Get available print formats for Item doctype]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[analyze_print_format_variables()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_item_print_formats()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Print_Format_Analysis
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[analyze_print_format_variables()]] - degree 3, connects to 1 community
- [[get_item_print_formats()]] - degree 3, connects to 1 community