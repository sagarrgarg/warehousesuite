---
source_file: "/home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/warehousesuite/doctype/pow_stock_count/pow_stock_count.py"
type: "rationale"
community: "Stock Count Doctype"
location: "L27"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Stock_Count_Doctype
---

# Ensure only one draft stock count per warehouse per session

## Connections
- [[.check_draft_limitation()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Stock_Count_Doctype