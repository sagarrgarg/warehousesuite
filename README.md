# WarehouseSuite

A comprehensive warehouse management solution for ERPNext with advanced validation and control features.

## Features

- **Warehouse Validation**: Restrict same warehouse transfers
- **Value Difference Control**: Prevent or limit stock entries with value differences
- **Submission Control**: Role-based document submission restrictions
- **Auto Transit Management**: Automatic transit warehouse handling for material transfers
- **Mobile Interface**: Touch-friendly warehouse operations dashboard
- **Barcode Scanning**: Built-in barcode scanning for quick item operations

## Installation

```bash
bench --site your-site.com install-app warehousesuite
```

## Configuration

### WMSuite Settings

Access WMSuite Settings to configure:

#### Warehouse Operations
- **Restrict Same Warehouse Transfers**: Prevent stock entries between same warehouse
- **Auto Set Transit for Material Transfer**: Automatically set transit warehouse for material transfers

#### Stock Validation
- **Disallow Value Difference in Stock Entry**: Restrict stock entries with value differences
- **Maximum Allowed Value Difference**: Set tolerance limit for value differences
- **Override Roles**: Roles that can bypass value difference restrictions

#### Submission Control
- **Restrict Document Submission**: Control who can submit warehouse documents
- **Submission Override Roles**: Roles with submission permissions

#### Mobile Interface
- **Enable Mobile Interface**: Enable mobile-optimized warehouse dashboard
- **Default Warehouse**: Set default warehouse for mobile operations
- **Enable Barcode Scanning**: Enable barcode scanning functionality
- **Auto Refresh Interval**: Dashboard auto-refresh interval in seconds

## Roles

- **Warehouse Manager**: Full access to all warehouse operations and settings
- **System Manager**: Override permissions for all restrictions

## Usage

1. **Configure Settings**: Set up WMSuite Settings according to your warehouse requirements
2. **Assign Roles**: Create users and assign appropriate warehouse roles
3. **Start Operations**: Begin warehouse operations with validation and control features

## Support

For detailed configuration guide, please refer to the WMSuite Settings Guide.
