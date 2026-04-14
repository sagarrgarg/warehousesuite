---
source_file: "/home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_work_order_service.py"
type: "rationale"
community: "Work Order Service"
location: "L832"
tags:
  - graphify/rationale
  - graphify/EXTRACTED
  - community/Work_Order_Service
---

# Return items with insufficient stock to fulfill the WO.      Args:         wo_na

## Connections
- [[get_material_shortfall()]] - `rationale_for` [EXTRACTED]

#graphify/rationale #graphify/EXTRACTED #community/Work_Order_Service