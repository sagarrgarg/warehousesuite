---
type: community
cohesion: 0.25
members: 8
---

# Stock Count Submission

**Cohesion:** 0.25 - loosely connected
**Members:** 8 nodes

## Members
- [[Check if there's an existing draft stock count for this warehouse and session]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Create a POW Stock Count entry for when all quantities match (no differences)]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Create and submit a new POW Stock Count with items]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[Save a POW Stock Count as draft]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[check_existing_draft_stock_count()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[create_and_submit_pow_stock_count()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[create_stock_match_entry()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py
- [[save_pow_stock_count_draft()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/page/pow_dashboard/pow_dashboard.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Stock_Count_Submission
SORT file.name ASC
```

## Connections to other communities
- 4 edges to [[_COMMUNITY_POW Dashboard Features Hub]]

## Top bridge nodes
- [[check_existing_draft_stock_count()]] - degree 5, connects to 1 community
- [[create_and_submit_pow_stock_count()]] - degree 3, connects to 1 community
- [[create_stock_match_entry()]] - degree 3, connects to 1 community
- [[save_pow_stock_count_draft()]] - degree 3, connects to 1 community