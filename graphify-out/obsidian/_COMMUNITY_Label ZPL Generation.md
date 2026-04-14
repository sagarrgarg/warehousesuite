---
type: community
cohesion: 0.50
members: 4
---

# Label ZPL Generation

**Cohesion:** 0.50 - moderately connected
**Members:** 4 nodes

## Members
- [[Generate ZPL code for item labels]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Get company information from WMS Settings and Company doctype for label printing]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[generate_label_zpl()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[get_company_info_for_labels()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Label_ZPL_Generation
SORT file.name ASC
```

## Connections to other communities
- 2 edges to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[generate_label_zpl()]] - degree 3, connects to 1 community
- [[get_company_info_for_labels()]] - degree 3, connects to 1 community