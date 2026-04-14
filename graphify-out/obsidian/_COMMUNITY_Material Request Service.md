---
type: community
cohesion: 0.15
members: 16
---

# Material Request Service

**Cohesion:** 0.15 - loosely connected
**Members:** 16 nodes

## Members
- [[Create a Material Transfer Stock Entry linked back to MR lines.      Args]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[Create and submit a Material Request of type Material Transfer.      Args]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[Fetch MR item lines that still have remaining transfer qty.      If warehouses]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[For each MR line with remaining qty, return candidate source warehouses     with]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[Return submitted Material Transfer MRs with remaining qty.      Args         wa]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[Return warehouses with stock for the item, respecting eligibility rules.]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[Service layer for Material Request (Material Transfer) operations in POW.  Eligi]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[Thin wrapper that re-uses existing receive data logic but normalises     output]] - rationale - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[_eligible_warehouses_for_item()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[_get_mr_lines_with_remaining()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[create_transfer_from_mr()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[get_fulfillment_options()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[get_pending_receives()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[get_pending_transfer_requests()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[pow_material_request_service.py]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py
- [[raise_material_transfer_request()]] - code - /home/ubuntu/frappe-bench-new/apps/warehousesuite/warehousesuite/services/pow_material_request_service.py

## Live Query (requires Dataview plugin)

```dataview
TABLE source_file, type FROM #community/Material_Request_Service
SORT file.name ASC
```
