---
type: community
cohesion: 1.00
members: 2
---

# Company Lookup

**Cohesion:** 1.00 - tightly connected
**Members:** 2 nodes

## Members
- [[Get all companies for selection]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_companies()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Company_Lookup
SORT file.name ASC
```

## Connections to other communities
- 1 edge to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[get_companies()]] - degree 2, connects to 1 community