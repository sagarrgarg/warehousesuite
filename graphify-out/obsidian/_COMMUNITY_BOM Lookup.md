---
type: community
cohesion: 1.00
members: 2
---

# BOM Lookup

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[Get available BOMs for Material Request]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_available_boms()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/BOM_Lookup
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[get_available_boms()]] - degree 2, connects to 1 community