---
type: community
cohesion: 1.00
members: 1
---

# Stock Count Reconciliation

**Cohesion:** 1.00 - tightly connected
**Members:** 1 nodes

## Members
- [[Get all items with stock in the selected warehouse]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/doctype/pow_stock_count/pow_stock_count.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Stock_Count_Reconciliation
SORT file.name ASC
```
