---
source_file: "/home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/doctype/pow_stock_count/pow_stock_count.py"
type: "rationale"
community: "Stock Count Doctype"
location: "L11"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Stock_Count_Doctype
---

# Return True when counted quantity differs from system/current stock beyond toler

## Connections
- [[item_row_has_difference()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Stock_Count_Doctype