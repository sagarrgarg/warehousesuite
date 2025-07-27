# Getting Started with WarehouseSuite

This guide will help you get up and running with WarehouseSuite quickly and efficiently. Follow these steps to set up your warehouse management system and start using it effectively.

## 🚀 Quick Start Checklist

### Prerequisites
- [ ] WarehouseSuite installed and configured
- [ ] ERPNext 14+ or 15+ running
- [ ] User accounts created with appropriate roles
- [ ] Warehouses configured in ERPNext
- [ ] Items with stock available

### Initial Setup
- [ ] WMSuite Settings configured
- [ ] POW Profiles created
- [ ] Users assigned to profiles
- [ ] Test session created
- [ ] Basic operations tested

## 📋 Step-by-Step Setup

### Step 1: Verify Installation

First, ensure WarehouseSuite is properly installed:

1. **Check App Installation**:
   ```bash
   bench --site your-site-name list-apps
   ```
   You should see `warehousesuite` in the list.

2. **Verify Doctypes**:
   - Navigate to **Setup > Customize > Doctype**
   - Search for "POW" - you should see:
     - POW Profile
     - POW Session
     - POW Stock Concern
     - POW Stock Count
     - WMSuite Settings

3. **Check Permissions**:
   - Go to **Setup > Users and Permissions > Role**
   - Verify "Stock User" role exists and has appropriate permissions

### Step 2: Configure WMSuite Settings

1. **Access Settings**:
   - Navigate to **Setup > Customize > WMSuite Settings**
   - If no settings exist, create a new record

2. **Basic Configuration**:
   ```
   Auto Set Transit: ✓ (Enable for automatic transit handling)
   Enable Warehouse Filtering: ✓ (Enable for access control)
   Disallow Value Difference: ✓ (Enable for strict validation)
   Max Value Difference: 0 (No variance allowed)
   Enable Barcode Scanning: ✓ (Enable barcode functionality)
   Auto Refresh Interval: 30 (30 seconds)
   ```

3. **Advanced Settings** (Optional):
   ```
   Override Roles: (Add roles that can bypass restrictions)
   Enable Notifications: ✓ (Enable system notifications)
   Debug Mode: (Enable for troubleshooting)
   ```

### Step 3: Create POW Profiles

POW Profiles define what warehouses and operations users can access.

#### Create Main Warehouse Profile

1. **Navigate to Profile**:
   - Go to **WarehouseSuite > POW Profile**
   - Click **New**

2. **Basic Information**:
   ```
   Name: Main Warehouse Operations
   Company: Your Company
   Disabled: ✗ (Leave unchecked)
   ```

3. **Warehouse Settings**:
   ```
   In Transit Warehouse: [Select your transit warehouse]
   Warehouses Allowed: [Add source warehouses]
   Target Warehouse: [Add destination warehouses]
   ```

4. **Allowed Operations**:
   ```
   Material Transfer: ✓
   BOM Manufacturing: ✗ (Disable if not needed)
   Purchase Receipt: ✗ (Disable if not needed)
   Repack: ✗ (Disable if not needed)
   Delivery Note: ✗ (Disable if not needed)
   Stock Count: ✓
   Show Only Available Stock Items: ✓
   ```

5. **Applicable Users**:
   - Add users who should have access to this profile
   - Each user can be assigned to multiple profiles

#### Create Additional Profiles

Create specialized profiles for different operations:

- **Receiving Profile**: For purchase receipt operations
- **Shipping Profile**: For delivery note operations
- **Counting Profile**: For stock counting operations
- **Manufacturing Profile**: For BOM manufacturing operations

### Step 4: Assign Users to Profiles

1. **User Assignment**:
   - In each POW Profile, add users to the **Applicable Users** table
   - Users can be assigned to multiple profiles
   - Each profile defines different warehouse access

2. **Role Verification**:
   - Ensure users have the "Stock User" role
   - Verify warehouse access permissions
   - Test user login and access

### Step 5: Test Basic Operations

#### Test 1: Access POW Dashboard

1. **Login as Test User**:
   - Login with a user assigned to a POW Profile
   - Navigate to **WarehouseSuite > POW Dashboard**

2. **Verify Dashboard Loads**:
   - Dashboard should load without errors
   - Profile dropdown should show assigned profiles
   - Warehouse dropdown should show allowed warehouses

#### Test 2: Create POW Session

1. **Start Session**:
   - Select a POW Profile from dropdown
   - Choose a default warehouse (optional)
   - Click **"Start Session"**

2. **Verify Session Creation**:
   - Session should be created successfully
   - Session status should show "Open"
   - Session ID should be generated

#### Test 3: Test Transfer Operations

1. **Transfer Send**:
   - Click **"Transfer Send"** button
   - Select source and target warehouses
   - Add an item with quantity
   - Click **"Send Transfer"**

2. **Verify Transfer**:
   - Transfer should be created successfully
   - Stock entry should be generated
   - Stock levels should be updated

#### Test 4: Test Item Inquiry

1. **Open Item Inquiry**:
   - Click **"Item Inquiry"** button
   - Search for an item
   - Verify item details display correctly

2. **Check Information**:
   - Item photo should display (if available)
   - Stock information should show for allowed warehouses
   - UOM conversions should work correctly

## 🔧 Configuration Examples

### Example 1: Simple Warehouse Setup

For a single warehouse operation:

```yaml
POW Profile: Single Warehouse
Warehouses:
  - Source: Main Warehouse
  - Target: Main Warehouse
  - Transit: Main Warehouse (if needed)
Operations:
  - Material Transfer: ✓
  - Stock Count: ✓
  - Item Inquiry: ✓
Users:
  - warehouse.operator@company.com
```

### Example 2: Multi-Warehouse Setup

For multiple warehouse operations:

```yaml
POW Profile: Multi-Warehouse Operations
Warehouses:
  - Source: [Warehouse A, Warehouse B]
  - Target: [Warehouse C, Warehouse D]
  - Transit: Central Transit Warehouse
Operations:
  - Material Transfer: ✓
  - Stock Count: ✓
  - Item Inquiry: ✓
Users:
  - warehouse.manager@company.com
  - warehouse.operator@company.com
```

### Example 3: Specialized Operations

For specific operations:

```yaml
POW Profile: Receiving Operations
Warehouses:
  - Source: Receiving Area
  - Target: [Storage A, Storage B]
  - Transit: Quality Check Area
Operations:
  - Purchase Receipt: ✓
  - Material Transfer: ✓
  - Item Inquiry: ✓
Users:
  - receiving.operator@company.com
```

## 📱 Mobile Setup

### Mobile Access

1. **Browser Access**:
   - Access via mobile browser
   - URL: `https://your-domain.com/app/pow-dashboard`
   - Login with mobile-optimized credentials

2. **Touch Optimization**:
   - Interface automatically adapts to mobile
   - Touch targets are optimized for fingers
   - Swipe gestures supported

### Mobile Features

- **Barcode Scanning**: Use camera for barcode scanning
- **Voice Input**: Voice-activated quantity entry
- **Offline Mode**: Basic offline functionality
- **GPS Location**: Location tracking for audit trails

## 🚨 Common Setup Issues

### Issue 1: Dashboard Not Loading

**Symptoms**: Dashboard shows blank or error page

**Solutions**:
1. Check user permissions
2. Verify POW Profile assignment
3. Clear browser cache
4. Check console for JavaScript errors

```bash
# Check user permissions
bench --site your-site-name console
```

```python
import frappe
user = "test@example.com"
roles = frappe.get_roles(user)
print(f"User roles: {roles}")

# Check if user has access to POW Profile
profiles = frappe.get_all("POW Profile User", 
    filters={"user": user}, 
    fields=["parent"])
print(f"User profiles: {profiles}")
```

### Issue 2: No Warehouses Showing

**Symptoms**: Warehouse dropdown is empty

**Solutions**:
1. Check POW Profile warehouse configuration
2. Verify warehouse permissions
3. Check warehouse status (enabled/disabled)

```python
# Check warehouse configuration
profile = frappe.get_doc("POW Profile", "your-profile-name")
print(f"Source warehouses: {[w.warehouse for w in profile.source_warehouse]}")
print(f"Target warehouses: {[w.warehouse for w in profile.target_warehouse]}")
```

### Issue 3: Transfer Operations Failing

**Symptoms**: Transfer creation fails with errors

**Solutions**:
1. Check stock availability
2. Verify warehouse permissions
3. Check UOM conversions
4. Validate business rules

```python
# Check stock availability
item_code = "ITEM-001"
warehouse = "WAREHOUSE-001"
stock = frappe.db.get_value("Bin", 
    {"item_code": item_code, "warehouse": warehouse}, 
    "actual_qty")
print(f"Stock for {item_code} in {warehouse}: {stock}")
```

## 📊 Performance Optimization

### Initial Performance Setup

1. **Database Optimization**:
   ```bash
   # Optimize database
   bench --site your-site-name optimize
   
   # Clear cache
   bench clear-cache
   ```

2. **Asset Optimization**:
   ```bash
   # Build assets
   bench build --app warehousesuite
   
   # Clear cache again
   bench clear-cache
   ```

3. **Monitoring Setup**:
   - Monitor database performance
   - Track user activity
   - Monitor system resources

### Performance Best Practices

1. **Regular Maintenance**:
   - Clear cache regularly
   - Optimize database weekly
   - Monitor performance metrics

2. **User Training**:
   - Train users on efficient workflows
   - Use keyboard shortcuts
   - Batch operations when possible

## 🔄 Next Steps

### After Basic Setup

1. **Advanced Configuration**:
   - Set up custom validation rules
   - Configure notification systems
   - Implement custom workflows

2. **User Training**:
   - Conduct user training sessions
   - Create user documentation
   - Set up help desk support

3. **Production Deployment**:
   - Test all operations thoroughly
   - Set up monitoring and alerts
   - Plan backup and recovery

### Ongoing Maintenance

1. **Regular Updates**:
   - Keep WarehouseSuite updated
   - Monitor for new features
   - Apply security patches

2. **Performance Monitoring**:
   - Monitor system performance
   - Track user satisfaction
   - Optimize based on usage patterns

3. **Continuous Improvement**:
   - Gather user feedback
   - Implement improvements
   - Plan feature enhancements

## 📞 Support Resources

### Documentation
- [Feature Documentation](features/)
- [Configuration Guide](configuration/)

### Support Channels
- **Email**: sagar1ratan1garg1@gmail.com
- **GitHub Issues**: [Create an issue](https://github.com/sagarrgarg/warehousesuite/issues)
- **Community**: ERPNext community forums

### Training Resources
- **Video Tutorials**: Available on YouTube
- **User Guides**: Comprehensive user documentation
- **Best Practices**: Industry best practices guide

---

**Congratulations!** You've successfully set up WarehouseSuite. Your warehouse operations are now ready to be more efficient and accurate.

**Next**: Explore the [Feature Documentation](features/) to learn about specific features in detail. 