---
source_file: "/home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_work_order_service.py"
type: "code"
community: "Work Order Service"
location: "L182"
tags:
  - graphify/code
  - graphify/EXTRACTED
  - community/Work_Order_Service
---

# _query_bin_availability_for_item()

## Connections
- [[Bins with positive stock for item_code, optionally restricted to warehouses.]] - `rationale_for` [EXTRACTED]
- [[_get_item_availability()]] - `calls` [EXTRACTED]
- [[get_bom_for_item()]] - `calls` [EXTRACTED]
- [[pow_work_order_service.py]] - `contains` [EXTRACTED]

#graphify/code #graphify/EXTRACTED #community/Work_Order_Service