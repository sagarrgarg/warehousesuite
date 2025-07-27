# POW Profiles

**POW Profiles** are the core configuration component in WarehouseSuite that define user access, warehouse permissions, and allowed operations. They serve as the foundation for role-based access control and operational workflows.

## 🎯 Overview

POW Profiles enable administrators to:
- **Define User Access**: Control which users can access specific warehouses
- **Configure Operations**: Enable/disable specific warehouse operations
- **Set Warehouse Permissions**: Define source and target warehouse access
- **Manage Workflows**: Configure operational workflows and processes
- **Ensure Security**: Implement granular access control

## 🔧 Profile Structure

### Basic Profile Information

#### Profile Details
```
┌─────────────────────────────────────────────────────────────┐
│                    POW Profile Configuration                │
├─────────────────────────────────────────────────────────────┤
│ Name: Main Warehouse Operations                            │
│ Company: Your Company Name                                 │
│ Disabled: ✗ (Active Profile)                               │
├─────────────────────────────────────────────────────────────┤
│ Warehouse Settings:                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ In Transit Warehouse: Central Transit WH               │ │
│ │ Warehouses Allowed: [Main WH, Branch WH]               │ │
│ │ Target Warehouse: [Storage A, Storage B]               │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Allowed Operations:                                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Material Transfer: ✓ | BOM Manufacturing: ✗            │ │
│ │ Purchase Receipt: ✗ | Repack: ✗                         │ │
│ │ Delivery Note: ✗ | Stock Count: ✓                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Profile Components

#### 1. Basic Information
- **Name**: Unique profile identifier
- **Company**: Associated company
- **Disabled**: Profile activation status
- **Description**: Profile description (optional)

#### 2. Warehouse Settings
- **In Transit Warehouse**: Central transit warehouse for transfers
- **Warehouses Allowed**: Source warehouses users can access
- **Target Warehouse**: Destination warehouses for operations

#### 3. Allowed Operations
- **Material Transfer**: Enable stock transfer operations
- **BOM Manufacturing**: Enable manufacturing operations
- **Purchase Receipt**: Enable receiving operations
- **Repack**: Enable repackaging operations
- **Delivery Note**: Enable shipping operations
- **Stock Count**: Enable counting operations

#### 4. User Assignment
- **Applicable Users**: Users assigned to this profile
- **User Permissions**: Specific user permissions within profile

## 🏢 Warehouse Configuration

### In Transit Warehouse

#### Purpose
The In Transit Warehouse serves as an intermediate storage point for multi-step transfers, enabling efficient warehouse-to-warehouse movements.

#### Configuration
```yaml
In Transit Warehouse:
  - Purpose: Central transit point for transfers
  - Type: Transit warehouse
  - Access: Restricted to transfer operations
  - Location: Centralized for efficiency
  - Capacity: Sufficient for transit volume
```

#### Best Practices
1. **Central Location**: Position centrally for efficient transfers
2. **Adequate Capacity**: Ensure sufficient storage capacity
3. **Access Control**: Restrict access to authorized personnel
4. **Monitoring**: Regular monitoring of transit stock

### Source Warehouses (Warehouses Allowed)

#### Configuration
Source warehouses are the warehouses from which users can transfer stock or perform operations.

```yaml
Source Warehouses:
  - Main Warehouse:
      Type: Primary storage
      Access: Full access
      Operations: All allowed operations
  - Branch Warehouse:
      Type: Secondary storage
      Access: Limited access
      Operations: Transfer and count only
  - Receiving Warehouse:
      Type: Receiving area
      Access: Receiving operations only
      Operations: Receiving and transfer
```

#### Access Control
- **Read Access**: View stock levels and item information
- **Write Access**: Perform operations (transfers, counts, etc.)
- **Admin Access**: Administrative functions

### Target Warehouses

#### Configuration
Target warehouses are the destinations for transfers and operations.

```yaml
Target Warehouses:
  - Storage Warehouse A:
      Type: Primary storage
      Purpose: Long-term storage
      Access: Transfer destination
  - Storage Warehouse B:
      Type: Secondary storage
      Purpose: Overflow storage
      Access: Transfer destination
  - Quality Check Area:
      Type: Quality control
      Purpose: Quality inspection
      Access: Transfer destination
```

#### Warehouse Hierarchy
```
Main Warehouse
├── Storage Area A
│   ├── Zone 1
│   └── Zone 2
├── Storage Area B
│   ├── Zone 3
│   └── Zone 4
└── Transit Area
    ├── Incoming
    └── Outgoing
```

## 🔄 Allowed Operations

### Material Transfer

#### Configuration
```yaml
Material Transfer:
  Enabled: true
  Permissions:
    - Create transfers
    - Send transfers
    - Receive transfers
    - View transfer history
  Restrictions:
    - Source warehouse access only
    - Target warehouse access only
    - Stock availability validation
```

#### Transfer Workflow
1. **Transfer Creation**: Create transfer from source to target
2. **Stock Validation**: Validate stock availability
3. **Transfer Execution**: Execute transfer operation
4. **Status Tracking**: Track transfer status

### BOM Manufacturing

#### Configuration
```yaml
BOM Manufacturing:
  Enabled: false (for most profiles)
  Permissions:
    - Create manufacturing orders
    - Issue raw materials
    - Receive finished goods
    - View manufacturing history
  Restrictions:
    - Manufacturing warehouse access only
    - BOM validation required
    - Component availability check
```

#### Manufacturing Workflow
1. **Order Creation**: Create manufacturing order
2. **Material Issue**: Issue raw materials
3. **Production**: Monitor production process
4. **Receipt**: Receive finished goods

### Purchase Receipt

#### Configuration
```yaml
Purchase Receipt:
  Enabled: false (for most profiles)
  Permissions:
    - Create purchase receipts
    - Receive goods
    - Quality inspection
    - View receiving history
  Restrictions:
    - Receiving warehouse access only
    - Purchase order validation
    - Quality check requirements
```

#### Receiving Workflow
1. **Receipt Creation**: Create purchase receipt
2. **Goods Receipt**: Receive incoming goods
3. **Quality Check**: Perform quality inspection
4. **Storage**: Transfer to storage location

### Repack Operations

#### Configuration
```yaml
Repack Operations:
  Enabled: false (for most profiles)
  Permissions:
    - Create repack orders
    - Perform repackaging
    - Update item configurations
    - View repack history
  Restrictions:
    - Repack area access only
    - Component availability check
    - Quality standards compliance
```

#### Repack Workflow
1. **Order Creation**: Create repack order
2. **Component Issue**: Issue components
3. **Repackaging**: Perform repackaging
4. **Receipt**: Receive repackaged items

### Delivery Note

#### Configuration
```yaml
Delivery Note:
  Enabled: false (for most profiles)
  Permissions:
    - Create delivery notes
    - Pick items
    - Pack items
    - Ship items
  Restrictions:
    - Shipping warehouse access only
    - Sales order validation
    - Stock availability check
```

#### Shipping Workflow
1. **Order Processing**: Process sales orders
2. **Picking**: Pick items from storage
3. **Packing**: Pack items for shipment
4. **Shipping**: Ship items to customers

### Stock Count

#### Configuration
```yaml
Stock Count:
  Enabled: true
  Permissions:
    - Create stock counts
    - Perform counting
    - Submit counts
    - View count history
  Restrictions:
    - Assigned warehouse access only
    - Session-based counting
    - Variance tracking
```

#### Counting Workflow
1. **Count Creation**: Create counting session
2. **Physical Count**: Perform physical counting
3. **Variance Analysis**: Analyze count variances
4. **Count Submission**: Submit final count

## 👥 User Assignment

### Applicable Users

#### User Assignment Process
1. **User Selection**: Select users for profile assignment
2. **Permission Assignment**: Assign specific permissions
3. **Access Validation**: Validate user access rights
4. **Profile Activation**: Activate profile for users

#### User Management
```yaml
Applicable Users:
  - warehouse.operator@company.com:
      Role: Stock User
      Permissions: Full profile access
      Active: true
  - warehouse.supervisor@company.com:
      Role: Stock User
      Permissions: Supervisory access
      Active: true
  - warehouse.manager@company.com:
      Role: System Manager
      Permissions: Administrative access
      Active: true
```

### User Permissions

#### Permission Levels
- **Basic Access**: View and basic operations
- **Standard Access**: Full operational access
- **Supervisory Access**: Oversight and approval
- **Administrative Access**: Full system access

#### Permission Matrix
| Permission | Basic | Standard | Supervisory | Administrative |
|------------|-------|----------|-------------|----------------|
| View Stock | ✅ | ✅ | ✅ | ✅ |
| Create Transfer | ❌ | ✅ | ✅ | ✅ |
| Approve Transfer | ❌ | ❌ | ✅ | ✅ |
| Manage Profiles | ❌ | ❌ | ❌ | ✅ |

## 🔧 Profile Configuration Examples

### Example 1: Simple Warehouse Profile

For a single warehouse operation:

```yaml
Profile Name: Single Warehouse Operations
Company: Your Company
Warehouse Settings:
  In Transit Warehouse: Main Warehouse
  Source Warehouses: [Main Warehouse]
  Target Warehouses: [Main Warehouse]
Allowed Operations:
  Material Transfer: true
  BOM Manufacturing: false
  Purchase Receipt: false
  Repack: false
  Delivery Note: false
  Stock Count: true
Applicable Users:
  - warehouse.operator@company.com
```

### Example 2: Multi-Warehouse Profile

For multiple warehouse operations:

```yaml
Profile Name: Multi-Warehouse Operations
Company: Your Company
Warehouse Settings:
  In Transit Warehouse: Central Transit WH
  Source Warehouses: [Main WH, Branch WH, Receiving WH]
  Target Warehouses: [Storage A, Storage B, Quality Check]
Allowed Operations:
  Material Transfer: true
  BOM Manufacturing: false
  Purchase Receipt: true
  Repack: false
  Delivery Note: false
  Stock Count: true
Applicable Users:
  - warehouse.manager@company.com
  - warehouse.operator@company.com
```

### Example 3: Specialized Operations Profile

For specific operations:

```yaml
Profile Name: Receiving Operations
Company: Your Company
Warehouse Settings:
  In Transit Warehouse: Quality Check Area
  Source Warehouses: [Receiving Area]
  Target Warehouses: [Storage A, Storage B, Quality Check]
Allowed Operations:
  Material Transfer: true
  BOM Manufacturing: false
  Purchase Receipt: true
  Repack: false
  Delivery Note: false
  Stock Count: false
Applicable Users:
  - receiving.operator@company.com
```

## 🛡️ Security and Access Control

### Access Control Implementation

#### Warehouse Access Control
- **Source Access**: Users can only access assigned source warehouses
- **Target Access**: Users can only transfer to allowed target warehouses
- **Transit Access**: Transit warehouse access control
- **Operation Restrictions**: Operation-specific access control

#### User Access Control
- **Profile Assignment**: Users can only access assigned profiles
- **Role Validation**: Validate user roles and permissions
- **Session Control**: Session-based access control
- **Audit Trail**: Complete access audit trail

### Security Best Practices

#### Profile Security
1. **Principle of Least Privilege**: Grant minimum necessary access
2. **Regular Review**: Regularly review profile assignments
3. **Access Monitoring**: Monitor user access patterns
4. **Security Audits**: Regular security audits

#### Data Security
1. **Data Encryption**: Encrypt sensitive profile data
2. **Access Logging**: Log all profile access
3. **Backup Protection**: Regular profile data backup
4. **Recovery Procedures**: Profile recovery procedures

## 🔄 Profile Management

### Profile Lifecycle

#### Creation Process
1. **Requirements Analysis**: Analyze operational requirements
2. **Profile Design**: Design profile structure
3. **Configuration**: Configure profile settings
4. **Testing**: Test profile functionality
5. **Deployment**: Deploy profile to production

#### Maintenance Process
1. **Regular Review**: Regular profile review
2. **Updates**: Update profile configurations
3. **Optimization**: Optimize profile performance
4. **Documentation**: Maintain profile documentation

### Profile Optimization

#### Performance Optimization
1. **Efficient Queries**: Optimize database queries
2. **Caching**: Implement intelligent caching
3. **Indexing**: Proper database indexing
4. **Resource Management**: Optimize resource usage

#### User Experience Optimization
1. **Intuitive Design**: Design intuitive profiles
2. **Fast Response**: Ensure quick profile access
3. **Error Prevention**: Prevent common errors
4. **Help System**: Provide comprehensive help

## 🚨 Troubleshooting

### Common Issues

#### Profile Access Issues
1. **User Cannot Access Profile**:
   - Check user assignment
   - Verify user permissions
   - Check profile status
   - Validate user roles

2. **Warehouse Access Denied**:
   - Check warehouse assignment
   - Verify warehouse permissions
   - Check warehouse status
   - Validate warehouse configuration

#### Configuration Issues
1. **Operations Not Available**:
   - Check operation settings
   - Verify user permissions
   - Check profile configuration
   - Validate operation requirements

2. **Transfer Restrictions**:
   - Check warehouse assignments
   - Verify transfer permissions
   - Check stock availability
   - Validate transfer rules

### Debug Information

#### Profile Debugging
```python
# Debug profile configuration
import frappe

def debug_profile(profile_name):
    profile = frappe.get_doc("POW Profile", profile_name)
    
    print(f"Profile: {profile.name}")
    print(f"Company: {profile.company}")
    print(f"Disabled: {profile.disabled}")
    
    print("Source Warehouses:")
    for warehouse in profile.source_warehouse:
        print(f"  - {warehouse.warehouse}")
    
    print("Target Warehouses:")
    for warehouse in profile.target_warehouse:
        print(f"  - {warehouse.warehouse}")
    
    print("Allowed Operations:")
    print(f"  Material Transfer: {profile.material_transfer}")
    print(f"  BOM Manufacturing: {profile.manufacturing}")
    print(f"  Purchase Receipt: {profile.purchase_receipt}")
    print(f"  Repack: {profile.repack}")
    print(f"  Delivery Note: {profile.delivery_note}")
    print(f"  Stock Count: {profile.stock_count}")
    
    print("Applicable Users:")
    for user in profile.applicable_users:
        print(f"  - {user.user}")
```

#### User Access Debugging
```python
# Debug user access
def debug_user_access(user_email):
    user_roles = frappe.get_roles(user_email)
    print(f"User: {user_email}")
    print(f"Roles: {user_roles}")
    
    # Check profile assignments
    profiles = frappe.get_all("POW Profile User", 
        filters={"user": user_email}, 
        fields=["parent"])
    
    print("Assigned Profiles:")
    for profile in profiles:
        print(f"  - {profile.parent}")
        
        # Check profile details
        profile_doc = frappe.get_doc("POW Profile", profile.parent)
        print(f"    Disabled: {profile_doc.disabled}")
        print(f"    Material Transfer: {profile_doc.material_transfer}")
```

## 📈 Best Practices

### Profile Design

#### Efficient Design
1. **Clear Purpose**: Define clear profile purpose
2. **Minimal Permissions**: Grant minimum necessary permissions
3. **Logical Grouping**: Group related operations
4. **Scalable Design**: Design for scalability

#### Security Design
1. **Access Control**: Implement proper access control
2. **Audit Trail**: Maintain complete audit trail
3. **Regular Review**: Regular security review
4. **Documentation**: Comprehensive documentation

### Profile Management

#### Operational Management
1. **Regular Updates**: Regular profile updates
2. **User Training**: Train users on profile usage
3. **Performance Monitoring**: Monitor profile performance
4. **Continuous Improvement**: Continuous improvement

#### Maintenance Management
1. **Regular Backup**: Regular profile backup
2. **Version Control**: Version control for profiles
3. **Change Management**: Proper change management
4. **Testing**: Thorough testing procedures

## 🔮 Future Enhancements

### Planned Features

#### Advanced Profile Features
- **Dynamic Profiles**: Dynamic profile configuration
- **Conditional Access**: Conditional access control
- **Time-based Access**: Time-based access control
- **Location-based Access**: Location-based access control

#### Integration Enhancements
- **ERP Integration**: Enhanced ERPNext integration
- **Third-Party Integration**: External system integration
- **API Extensions**: Extended API capabilities
- **Real-Time Sync**: Real-time profile synchronization

#### Security Enhancements
- **Advanced Security**: Advanced security features
- **Multi-factor Authentication**: Multi-factor authentication
- **Biometric Access**: Biometric access control
- **Advanced Encryption**: Advanced encryption methods

---

**Related Documentation**:
- [POW Sessions](pow-sessions.md)
- [WMSuite Settings](wmsuite-settings.md)
- [Permissions & Roles](permissions.md)
- [POW Dashboard](../features/pow-dashboard.md) 