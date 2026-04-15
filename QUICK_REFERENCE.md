# Quick Reference Card

## 🚀 Getting Started (5 minutes)

### Windows
```bash
# 1. Install dependencies
pip install -r requirements.txt

# 2. Ensure MongoDB running
net start MongoDB

# 3. Import data
python import_data.py

# 4. Run app (one-click)
setup.bat

# OR step-by-step
python app.py
```

### macOS/Linux
```bash
pip install -r requirements.txt
brew services start mongodb-community  # macOS
sudo systemctl start mongod             # Linux
python import_data.py
python app.py
```

---

## 📊 Dashboard Access

```
Local:        http://localhost:5000
Login:        http://localhost:5000/login
Admin user:   sarah.chen@nexstock.ai
```

---

## 🔗 API Quick Reference

```bash
# Fetch all products
curl http://localhost:5000/api/products

# Get products by category
curl http://localhost:5000/api/products/category/Electronics

# Get inventory data
curl http://localhost:5000/api/inventory

# Get low stock items
curl http://localhost:5000/api/inventory/low-stock

# Get forecasts
curl http://localhost:5000/api/forecast

# Get alerts
curl http://localhost:5000/api/alerts

# Get stores
curl http://localhost:5000/api/stores

# Update product stock
curl -X POST http://localhost:5000/api/products/update \
  -H "Content-Type: application/json" \
  -d '{"product_id":"P0001","stock":100}'
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `app.py` | Flask backend + MongoDB API |
| `import_data.py` | CSV → MongoDB importer |
| `static/js/modules/api.js` | Frontend API layer |
| `static/js/modules/ui.js` | UI components |
| `static/js/modules/auth.js` | User management |
| `static/js/dashboard.js` | Main logic |
| `data/retail_store_inventory.csv` | Source data (15,000 records) |

---

## 🗄️ MongoDB Commands

```bash
# Connect to MongoDB
mongosh  # or 'mongo' for older versions

# List databases
show dbs

# Use database
use smart_inventory_db

# List collections
show collections

# Count documents
db.products.countDocuments()
db.inventory.countDocuments()
db.stores.countDocuments()

# Sample query
db.products.find().limit(5)

# Low stock items
db.inventory.find({inventory_level: {$lt: 50}}).limit(10)

# Aggregate by category
db.inventory.aggregate([
  {$group: {_id: "$category", total: {$sum: "$inventory_level"}}}
])
```

---

## 💻 Module Functions

### api.js
```javascript
initializeDataFromMongoDB()    // Load all data
fetchProducts()                 // GET /api/products
fetchInventorySummary()         // GET /api/inventory/summary
fetchLowStockItems()            // GET /api/inventory/low-stock
fetchForecastData()             // GET /api/forecast
fetchAlerts()                   // GET /api/alerts
fetchInventoryData()            // GET /api/inventory
getStockStatus(product)         // Get stock status
getStockBadge(product)          // Render status badge
getForecastBadge(product)       // Render forecast badge
```

### ui.js
```javascript
showPage(name)                  // Navigate to page
toggleSidebar()                 // Show/hide sidebar
showToast(msg, type)            // Show notification
animateCounters()               // Animate KPIs
chartDefaults()                 // Chart config
initOverview()                  // Initialize dashboard
initDemandChart(days)           // Render demand chart
initDonutChart()                // Render stock donut
renderCategoryBars()            // Show category bars
renderActivityFeed()            // Show activity
renderMLStatus()                // Show ML status
```

### auth.js
```javascript
renderUserTable()               // Render user table
filterUsers()                   // Search/filter users
openUserModal(id)               // Open edit modal
saveUser()                      // Save user
editUser(id)                    // Edit user
deleteUser(id)                  // Delete user
toggleSelectAll()               // Select all users
```

### dashboard.js
```javascript
renderInventoryTable()          // Show products table
filterInventory()               // Search products
renderForecastTable()           // Show forecast table
initAlerts()                    // Initialize alerts
clearAlerts()                   // Clear all alerts
resolveAlert(id)                // Resolve single alert
initReportCharts()              // Initialize reports
```

---

## 🔍 Debugging

### Check MongoDB connection
```bash
mongosh
> db.adminCommand({ping: 1})
{ ok: 1 }
```

### Check Flask API
```bash
# Terminal while app.py running
curl http://localhost:5000/api/products | python -m json.tool
```

### Browser console errors
```javascript
// F12 → Console
// Check for API errors:
fetch('/api/products').then(r => r.json()).then(console.log)

// Check data loaded:
console.log(PRODUCTS)
console.log(FORECAST_DATA)
console.log(ALERTS)
```

### Tail Flask logs
```bash
# Terminal will show:
# - [INFO] Connected to MongoDB
# - GET /api/products 200 50ms
# - etc.
```

---

## 🐛 Common Issues

| Issue | Solution |
|-------|----------|
| "Connection refused" | `net start MongoDB` (Windows) or check mongod running |
| "No such file" (import) | Run Python script from project root |
| "Port already in use" | `netstat -ano \| findstr :5000` then kill PID |
| "No data in dashboard" | Run `python import_data.py` to populate DB |
| "Blank charts" | Check browser console (F12) for API errors |
| "CORS error" | Should not occur (same origin requests) |

---

## 📈 Performance Tips

1. **Indexes created automatically** on: date, store_id, product_id
2. **API limits**: 100 inventory records, 20 low-stock items
3. **Parallel loading**: All data fetched simultaneously with `Promise.all()`
4. **Lazy rendering**: Only re-render on data change

---

## 🎯 Feature Checklist

- ✅ CSV data imported to MongoDB
- ✅ Flask API serving MongoDB data
- ✅ Frontend modules refactored
- ✅ Dashboard displays real data
- ✅ Products table shows inventory
- ✅ Charts render with forecasts
- ✅ Alerts show low-stock items
- ✅ User management functional
- ✅ Search/filter working
- ✅ Error handling in place

---

## 📝 Configuration

### MongoDB URI
```python
# app.py
client = MongoClient('mongodb://localhost:27017/')
db = client['smart_inventory_db']
```

### Flask Settings
```python
# app.py
app.run(debug=True, port=5000)
```

### Timeout/Performance
```javascript
// api.js - Adjust if needed
const API_BASE = '/api';
const TIMEOUT = 5000; // ms
```

---

## 🌐 Endpoints Summary

| Method | Endpoint | Returns |
|--------|----------|---------|
| GET | `/api/products` | Product array |
| GET | `/api/products/category/:cat` | Filtered products |
| GET | `/api/inventory` | Raw inventory |
| GET | `/api/inventory/summary` | Category summary |
| GET | `/api/inventory/low-stock` | Low stock items |
| GET | `/api/forecast` | Forecast data |
| GET | `/api/alerts` | Alert array |
| GET | `/api/stores` | Store array |
| POST | `/api/products/update` | Success/error |

---

## 💾 Data Backup

```bash
# Export MongoDB collection to JSON
mongoexport --db smart_inventory_db --collection products --out backup.json

# Import back
mongoimport --db smart_inventory_db --collection products --file backup.json
```

---

## 🎓 Learning Resources

Inside the project:
- `MONGODB_SETUP.md` - Full setup guide
- `INTEGRATION_SUMMARY.md` - What's been integrated
- `ARCHITECTURE.md` - System architecture & data flow
- `QUICK_REFERENCE.md` - This file

---

**Keep this card handy for quick reference!** 📌
