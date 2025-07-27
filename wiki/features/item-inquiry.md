# Item Inquiry

The **Item Inquiry** system in WarehouseSuite provides comprehensive item lookup capabilities with real-time stock information, barcode support, UOM conversions, and mobile-optimized interface.

## 🎯 Overview

Item Inquiry enables warehouse operators to:
- **Quick Item Lookup**: Find items by code, name, or barcode
- **Comprehensive Details**: View complete item information
- **Real-Time Stock**: Check live stock levels across warehouses
- **UOM Conversions**: View all available UOMs and conversion factors
- **Barcode Support**: Handle multiple barcodes per item
- **Mobile Optimization**: Touch-friendly interface for mobile devices

## 🔍 Item Lookup Features

### Search Capabilities

#### Multiple Search Methods
- **Item Code**: Direct item code search
- **Item Name**: Search by item name or description
- **Barcode**: Scan or enter barcode
- **Partial Search**: Search with partial text
- **Fuzzy Search**: Intelligent search with typos

#### Search Interface
```
┌─────────────────────────────────────────────────────────────┐
│                    Item Inquiry                             │
├─────────────────────────────────────────────────────────────┤
│ Search Item: [________________] [🔍] [📷]                  │
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Search Results:                                        │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ │ ABC-001 | Apple iPhone 15 | Stock: 50 Pcs          │ │ │
│ │ │ ABC-002 | Samsung Galaxy S24 | Stock: 25 Pcs       │ │ │
│ │ │ ABC-003 | Google Pixel 8 | Stock: 15 Pcs           │ │ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Search Results

#### Result Display
- **Item Code**: Primary item identifier
- **Item Name**: Descriptive item name
- **Current Stock**: Available stock in allowed warehouses
- **Stock UOM**: Primary unit of measure
- **Quick Actions**: Direct access to item details

#### Result Filtering
- **Warehouse Filter**: Filter by specific warehouses
- **Stock Filter**: Show only items with stock
- **Category Filter**: Filter by item category
- **Status Filter**: Filter by item status

## 📋 Item Details Display

### Comprehensive Information

#### Basic Item Information
```
┌─────────────────────────────────────────────────────────────┐
│                    Item Details                             │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────┐  ┌─────────────────────────────────────────┐ │
│ │             │  │ Item Name: Apple iPhone 15              │ │
│ │   [Photo]   │  │ Item Code: ABC-001                      │ │
│ │             │  │ Category: Electronics > Mobile Phones   │ │
│ └─────────────┘  │ Brand: Apple                            │ │
│                  │ Stock UOM: Pcs                          │ │
│                  │ Weight: 171 g                           │ │
│                  │ Status: Active                          │ │
│                  └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Item Attributes
- **Item Code**: Unique item identifier
- **Item Name**: Descriptive name
- **Description**: Detailed item description
- **Category**: Item category and subcategory
- **Brand**: Item brand information
- **Stock UOM**: Primary unit of measure
- **Weight**: Item weight and weight UOM
- **Status**: Active/Inactive status
- **Variant Information**: Variant details if applicable

### Photo and Visual Information

#### Item Photos
- **Primary Photo**: Main item image
- **Multiple Photos**: Additional item images
- **High Resolution**: High-quality image display
- **Zoom Capability**: Image zoom and pan
- **Fallback Icon**: Default icon when no photo available

#### Visual Indicators
- **Status Colors**: Color-coded status indicators
- **Stock Indicators**: Visual stock level indicators
- **Warning Icons**: Warning indicators for issues
- **Badge System**: Information badges and labels

## 📊 Stock Information

### Real-Time Stock Data

#### Warehouse Stock Display
```
┌─────────────────────────────────────────────────────────────┐
│                    Stock Information                       │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Warehouse | UOM | Actual | Reserved | Available | Type │ │
│ │-----------|-----|--------|----------|-----------|------│ │
│ │ Main WH   | Pcs | 100    | 10       | 90        | Std  │ │
│ │ Branch WH | Pcs | 50     | 5        | 45        | Std  │ │
│ │ Transit WH| Pcs | 25     | 0        | 25        | Trans│ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Total Stock: 175 Pcs | Total Available: 160 Pcs            │
└─────────────────────────────────────────────────────────────┘
```

#### Stock Metrics
- **Actual Stock**: Current physical stock
- **Reserved Stock**: Stock reserved for orders
- **Available Stock**: Stock available for use
- **Ordered Stock**: Stock on order
- **Planned Stock**: Planned stock movements
- **Projected Stock**: Projected future stock

### Stock Filtering

#### Warehouse Filtering
- **Profile-Based**: Show only allowed warehouses
- **Warehouse Types**: Filter by warehouse type
- **Location Filter**: Filter by warehouse location
- **Status Filter**: Filter by warehouse status

#### Stock Thresholds
- **Low Stock**: Items below minimum stock
- **Out of Stock**: Items with zero stock
- **Overstock**: Items above maximum stock
- **Critical Stock**: Items requiring immediate attention

## 🏷️ Barcode Information

### Barcode Display

#### Multiple Barcodes
```
┌─────────────────────────────────────────────────────────────┐
│                    Barcode Information                     │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Barcode Type | Barcode | UOM | Description             │ │
│ │--------------|---------|-----|---------------------------│ │
│ │ EAN-13       | 1234567890123 | Pcs | Primary barcode   │ │
│ │ UPC-A        | 12345678901 | Pcs | US barcode          │ │
│ │ QR Code      | ABC-001-QR | Pcs | Internal QR code     │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Barcode Features
- **Multiple Types**: Support for various barcode types
- **UOM Association**: Barcode-specific UOM
- **Description**: Barcode description and purpose
- **Collapsible Display**: Expandable barcode list
- **Scan Support**: Direct barcode scanning

### Barcode Types Supported
- **EAN-13**: European Article Number
- **UPC-A**: Universal Product Code
- **Code 128**: Industrial barcode
- **QR Code**: Quick Response code
- **Data Matrix**: 2D barcode
- **Custom Codes**: Internal barcode systems

## 📏 UOM Conversions

### UOM Display

#### Conversion Table
```
┌─────────────────────────────────────────────────────────────┐
│                    UOM Conversions                         │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ UOM | Conversion Factor | Must be Whole Number | Type  │ │
│ │-----|-------------------|----------------------|-------│ │
│ │ Pcs | 1.0 (Base)       | No                   | Stock │ │
│ │ Box | 10.0             | Yes                  | Sales │ │
│ │ Carton| 100.0          | Yes                  | Pack  │ │
│ │ Kg   | 0.5             | No                   | Weight│ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Conversion Features
- **Conversion Factors**: Display conversion relationships
- **Whole Number Validation**: Show whole number requirements
- **UOM Types**: Categorize UOMs by type
- **Real-Time Conversion**: Live conversion calculations
- **Validation Rules**: UOM validation information

### Conversion Examples

#### Display Format
- **1 Box = 10 Pcs**: Clear conversion display
- **1 Carton = 100 Pcs**: Multiple unit conversions
- **1 Kg = 0.5 Pcs**: Weight-based conversions
- **Whole Number Only**: Highlight whole number requirements

#### Conversion Validation
- **Factor Validation**: Validate conversion factors
- **UOM Compatibility**: Check UOM compatibility
- **Whole Number Rules**: Enforce whole number rules
- **Error Handling**: Handle conversion errors

## 📱 Mobile Optimization

### Touch-Friendly Interface

#### Mobile Layout
- **Responsive Design**: Adapts to screen size
- **Touch Targets**: Minimum 44px touch areas
- **Swipe Gestures**: Swipe navigation support
- **Orientation Support**: Portrait and landscape modes

#### Mobile Features
- **Barcode Scanning**: Camera-based barcode scanning
- **Voice Search**: Voice-activated item search
- **Offline Mode**: Basic offline functionality
- **Fast Loading**: Optimized for mobile networks

### Mobile-Specific Features

#### Camera Integration
- **Barcode Scanner**: Scan barcodes with camera
- **Photo Capture**: Capture item photos
- **Image Recognition**: Recognize items from photos
- **QR Code Scanning**: Scan QR codes

#### Voice Features
- **Voice Search**: Search items by voice
- **Voice Navigation**: Navigate with voice commands
- **Voice Input**: Enter quantities by voice
- **Audio Feedback**: Audio confirmation for actions

## 🔧 Configuration

### Search Configuration

#### Search Settings
```javascript
// Search configuration
{
  "search": {
    "enable_fuzzy_search": true,      // Enable fuzzy search
    "search_limit": 50,               // Maximum search results
    "enable_barcode_search": true,    // Enable barcode search
    "enable_voice_search": true,      // Enable voice search
    "search_timeout": 5000            // Search timeout (ms)
  }
}
```

#### Filter Settings
- **Warehouse Filtering**: Enable warehouse-based filtering
- **Stock Filtering**: Enable stock-based filtering
- **Category Filtering**: Enable category-based filtering
- **Status Filtering**: Enable status-based filtering

### Display Configuration

#### Information Display
- **Show Photos**: Enable item photo display
- **Show Barcodes**: Enable barcode information
- **Show UOM Conversions**: Enable UOM conversion display
- **Show Stock Details**: Enable detailed stock information

#### Layout Options
- **Compact Mode**: Compact information display
- **Detailed Mode**: Detailed information display
- **Custom Layout**: Customizable layout options
- **Theme Support**: Multiple theme options

## 🚨 Troubleshooting

### Common Issues

#### Search Issues
1. **No Search Results**:
   - Check item availability
   - Verify search permissions
   - Check item status
   - Validate search terms

2. **Slow Search Performance**:
   - Optimize database queries
   - Check network connectivity
   - Clear browser cache
   - Monitor system resources

#### Display Issues
1. **Photos Not Loading**:
   - Check image file permissions
   - Verify image file paths
   - Check network connectivity
   - Validate image formats

2. **Stock Information Missing**:
   - Check warehouse permissions
   - Verify stock data availability
   - Check data synchronization
   - Validate user access

### Debug Information

#### Search Debugging
```javascript
// Enable search debugging
localStorage.setItem('item_inquiry_debug', 'true');

// Log search operations
console.log('Item Inquiry Debug:', {
    searchTerm: searchTerm,
    searchResults: searchResults,
    filters: appliedFilters
});
```

#### Performance Monitoring
```javascript
// Monitor search performance
performance.mark('search-start');
// ... search operations ...
performance.mark('search-end');
performance.measure('search-time', 'search-start', 'search-end');
```

## 📈 Best Practices

### Search Optimization

#### Efficient Searching
1. **Use Specific Terms**: Use specific item codes or names
2. **Use Barcode Scanning**: Scan barcodes for quick lookup
3. **Use Filters**: Apply relevant filters to narrow results
4. **Use Shortcuts**: Learn keyboard shortcuts for faster access

#### Data Management
1. **Keep Data Updated**: Ensure item data is current
2. **Use Proper Naming**: Use consistent item naming conventions
3. **Maintain Photos**: Keep item photos updated
4. **Update Barcodes**: Maintain accurate barcode information

### Performance Optimization

#### System Performance
1. **Database Optimization**: Optimize item search queries
2. **Caching**: Implement intelligent caching
3. **Indexing**: Proper database indexing
4. **Resource Management**: Optimize resource usage

#### User Experience
1. **Fast Response**: Ensure quick search response
2. **Intuitive Interface**: Design user-friendly interface
3. **Error Prevention**: Prevent common search errors
4. **Help System**: Provide comprehensive help

## 🔮 Future Enhancements

### Planned Features

#### Advanced Search Features
- **AI-Powered Search**: AI-assisted item search
- **Predictive Search**: Predictive search suggestions
- **Semantic Search**: Semantic search capabilities
- **Image Search**: Search items by image

#### Integration Enhancements
- **ERP Integration**: Enhanced ERPNext integration
- **Third-Party Integration**: External system integration
- **API Extensions**: Extended API capabilities
- **Real-Time Sync**: Real-time data synchronization

#### Mobile Enhancements
- **Native App**: Dedicated mobile applications
- **Offline Search**: Advanced offline search capabilities
- **Advanced Scanning**: Advanced barcode and QR code scanning
- **Voice Commands**: Voice-activated search

---

**Related Documentation**:
- [POW Dashboard](pow-dashboard.md)
- [Transfer Management](transfer-management.md)
- [Stock Counting](stock-counting.md)
- [POW Profiles](../configuration/pow-profiles.md) 