---
source_file: "/home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/doctype/pow_stock_count/pow_stock_count.py"
type: "rationale"
community: "Stock Count Doctype"
location: "L77"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Stock_Count_Doctype
---

# Keep only child rows with a real variance (counted vs current stock).

## Connections
- [[.prune_items_without_difference()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Stock_Count_Doctype