---
source_file: "/home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/doctype/pow_stock_count/pow_stock_count.py"
type: "code"
community: "Stock Count Doctype"
location: "L10"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Stock_Count_Doctype
---

# item_row_has_difference()

## Connections
- [[.prune_items_without_difference()]] - `calls` [EXTRACTED]
- [[Return True when counted quantity differs from systemcurrent stock beyond toler]] - `rationale_for` [EXTRACTED]
- [[convert_to_stock_reconciliation()]] - `calls` [EXTRACTED]
- [[pow_stock_count.js]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Stock_Count_Doctype