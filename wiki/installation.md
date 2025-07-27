# Installation Guide

This guide provides step-by-step instructions for installing WarehouseSuite on ERPNext 14+ and 15+.

## 📋 Prerequisites

### System Requirements
- **Operating System**: Ubuntu 20.04+ / CentOS 8+ / Debian 11+
- **Python**: 3.10+ (for ERPNext 15), 3.9+ (for ERPNext 14)
- **Node.js**: 18+ (for ERPNext 15), 16+ (for ERPNext 14)
- **Database**: MariaDB 10.6+ / MySQL 8.0+
- **Memory**: Minimum 4GB RAM (8GB recommended)
- **Storage**: Minimum 20GB free space

### ERPNext Requirements
- **ERPNext Version**: 14.0.0+ or 15.0.0+
- **Frappe Framework**: Compatible version with ERPNext
- **Bench**: Latest version installed and configured

## 🚀 Installation Steps

### Step 1: Verify ERPNext Installation

First, ensure your ERPNext installation is working correctly:

```bash
# Check ERPNext version
bench --version
frappe --version

# Verify ERPNext is running
bench start
```

### Step 2: Install WarehouseSuite App

#### Method 1: Using Bench Install (Recommended)

```bash
# Navigate to your bench directory
cd /path/to/your/bench

# Install WarehouseSuite
bench get-app warehousesuite https://github.com/sagarrgarg/warehousesuite.git

# Install the app on your site
bench --site your-site-name install-app warehousesuite
```

#### Method 2: Manual Installation

```bash
# Clone the repository
cd apps
git clone https://github.com/sagarrgarg/warehousesuite.git

# Install dependencies
cd warehousesuite
pip install -e .

# Install on site
bench --site your-site-name install-app warehousesuite
```

### Step 3: Build Assets

```bash
# Build JavaScript and CSS assets
bench build --app warehousesuite

# Clear cache
bench clear-cache
```

### Step 4: Run Database Migrations

```bash
# Run migrations
bench migrate

# Clear cache again
bench clear-cache
```

### Step 5: Verify Installation

```bash
# Check if app is installed
bench --site your-site-name list-apps

# Verify doctypes are created
bench --site your-site-name console
```

In the console:
```python
import frappe
frappe.get_doc("POW Profile")
print("WarehouseSuite installed successfully!")
```

## ⚙️ Post-Installation Configuration

### Step 1: Create WMSuite Settings

1. Navigate to **Setup > Customize > WMSuite Settings**
2. Configure the following settings:
   - **Auto Set Transit**: Enable for automatic transit warehouse handling
   - **Enable Warehouse Filtering**: Enable for warehouse-based access control
   - **Disallow Value Difference**: Configure value difference restrictions
   - **Enable Barcode Scanning**: Enable barcode functionality
   - **Auto Refresh Interval**: Set dashboard refresh interval (default: 30 seconds)

### Step 2: Set Up User Roles

1. Go to **Setup > Users and Permissions > Role**
2. Ensure the following roles exist:
   - **Stock User** (should already exist in ERPNext)
   - **System Manager** (for administrative access)

### Step 3: Create POW Profiles

1. Navigate to **WarehouseSuite > POW Profile**
2. Create profiles for different warehouse scenarios:
   - **Main Warehouse Profile**
   - **Receiving Profile**
   - **Shipping Profile**
   - **Counting Profile**

### Step 4: Assign Users to Profiles

1. In each POW Profile, add users to the **Applicable Users** table
2. Configure allowed warehouses and operations
3. Set up warehouse permissions

## 🔧 Configuration Details

### WMSuite Settings Configuration

#### Auto Transit Management
- **Purpose**: Automatically sets "Add to Transit" for Material Transfer stock entries
- **When to Enable**: When using transit warehouses for multi-step transfers
- **Impact**: Reduces manual configuration for transfer operations

#### Value Difference Control
- **Purpose**: Prevents or limits stock entries with value discrepancies
- **Configuration**:
  - **Disallow Value Difference**: Enable to block entries with differences
  - **Maximum Value Difference**: Set threshold for allowed differences
  - **Override Roles**: Specify roles that can bypass restrictions

#### Warehouse Filtering
- **Purpose**: Restricts users to specific warehouses based on their profile
- **When to Enable**: For multi-warehouse operations with access control
- **Benefits**: Enhanced security and operational control

### POW Profile Configuration

#### Warehouse Settings
- **In Transit Warehouse**: Central transit warehouse for transfers
- **Source Warehouses**: Warehouses users can transfer from
- **Target Warehouses**: Warehouses users can transfer to

#### Allowed Operations
- **Material Transfer**: Enable for stock transfers
- **BOM Manufacturing**: Enable for manufacturing operations
- **Purchase Receipt**: Enable for receiving operations
- **Repack**: Enable for repackaging operations
- **Delivery Note**: Enable for shipping operations
- **Stock Count**: Enable for counting operations

## 🧪 Testing Installation

### Test 1: Basic Functionality

1. **Access POW Dashboard**:
   - Navigate to **WarehouseSuite > POW Dashboard**
   - Verify the dashboard loads without errors

2. **Create POW Session**:
   - Select a POW Profile
   - Create a new session
   - Verify session is created successfully

3. **Test Transfer Operations**:
   - Try creating a transfer
   - Verify validation works
   - Check stock entry creation

### Test 2: User Permissions

1. **Test with Different Users**:
   - Log in as different users
   - Verify they can only access allowed warehouses
   - Check operation permissions

2. **Test Role Restrictions**:
   - Verify Stock User permissions
   - Test System Manager access
   - Check custom role configurations

### Test 3: Integration Testing

1. **ERPNext Integration**:
   - Verify stock entries are created correctly
   - Check integration with existing ERPNext workflows
   - Test reporting and analytics

2. **Database Integrity**:
   - Verify all doctypes are created
   - Check custom fields are added
   - Test data consistency

## 🚨 Troubleshooting

### Common Installation Issues

#### Issue 1: App Installation Fails
```bash
# Solution: Check dependencies
bench --site your-site-name install-app warehousesuite --force

# If still failing, check logs
bench --site your-site-name logs
```

#### Issue 2: Assets Not Building
```bash
# Solution: Clear cache and rebuild
bench clear-cache
bench build --app warehousesuite
bench clear-cache
```

#### Issue 3: Migration Errors
```bash
# Solution: Check database connection
bench --site your-site-name migrate --force

# If issues persist, check database logs
bench --site your-site-name logs
```

#### Issue 4: Permission Errors
```bash
# Solution: Reset permissions
bench --site your-site-name reset-permissions

# Or manually set permissions
bench --site your-site-name console
```

In console:
```python
import frappe
frappe.db.commit()
```

### Performance Issues

#### Slow Dashboard Loading
1. **Check Database Performance**:
   ```bash
   bench --site your-site-name console
   ```
   
   ```python
   import frappe
   frappe.db.sql("SHOW PROCESSLIST")
   ```

2. **Optimize Queries**:
   - Review slow query logs
   - Add database indexes if needed
   - Optimize warehouse queries

#### Memory Issues
1. **Monitor Resource Usage**:
   ```bash
   htop
   free -h
   ```

2. **Optimize Configuration**:
   - Increase PHP memory limit
   - Optimize MySQL configuration
   - Reduce concurrent users if needed

## 📞 Support

If you encounter issues during installation:

1. **Check Logs**:
   ```bash
   bench --site your-site-name logs
   ```

2. **Verify Requirements**:
   - Ensure all prerequisites are met
   - Check ERPNext compatibility
   - Verify database connectivity

3. **Contact Support**:
   - Email: sagar1ratan1garg1@gmail.com
   - GitHub Issues: [Create an issue](https://github.com/sagarrgarg/warehousesuite/issues)

## 🔄 Updating WarehouseSuite

### Update Process

```bash
# Navigate to app directory
cd apps/warehousesuite

# Pull latest changes
git pull origin main

# Update dependencies
pip install -e .

# Build assets
bench build --app warehousesuite

# Run migrations
bench migrate

# Clear cache
bench clear-cache
```

### Version Compatibility

- **ERPNext 14**: Compatible with WarehouseSuite 1.0+
- **ERPNext 15**: Compatible with WarehouseSuite 1.0+
- **Future Versions**: Check compatibility matrix

---

**Next Steps**: After installation, proceed to [Getting Started](getting-started.md) for initial configuration and setup. 