# Smart Inventory Management - MongoDB Setup Guide

## 🔧 Setup Instructions

### Prerequisites
- Python 3.8+
- MongoDB running locally on `mongodb://localhost:27017/`
- pip (Python package manager)

### Step 1: Install Dependencies

```bash
pip install -r requirements.txt
```

This will install:
- `flask` - Web framework
- `pymongo` - MongoDB driver
- `pandas` - Data processing
- `python-dotenv` - Environment variables

### Step 2: Ensure MongoDB is Running

Make sure MongoDB is running on your local machine:

```bash
# On Windows (if installed as service)
net start MongoDB

# Or start mongod manually
mongod
```

Connect and test:
```bash
mongosh  # or mongo for older versions
```

### Step 3: Import CSV Data to MongoDB

Run the data import script to load the retail inventory data:

```bash
python import_data.py
```

Expected output:
```
Connected to MongoDB successfully
Loaded [X] records from CSV
Inserted [Y] inventory records
Inserted [Z] unique products
Inserted [N] stores
Data import completed successfully!
```

### Step 4: Run the Application

```bash
python app.py
```

The app will start on `http://localhost:5000`

---

## 📊 Project Structure

```
SmartInventoryManagement/
├── app.py                           # Flask backend with MongoDB API
├── import_data.py                   # CSV to MongoDB import script
├── requirements.txt                 # Python dependencies
├── data/
│   └── retail_store_inventory.csv  # Source data
├── static/
│   ├── styles.css
│   └── js/
│       ├── dashboard.js            # Main dashboard logic
│       └── modules/
│           ├── api.js              # MongoDB API integration
│           ├── auth.js             # User management
│           └── ui.js               # UI components & charts
└── templates/
    ├── dashboard.html
    ├── login.html
    └── ...
```

---

## 🗄️ MongoDB Collections

### 1. **inventory**
Contains all inventory records from CSV with fields:
- `date` - Transaction date
- `store_id` - Store identifier
- `product_id` - Product identifier
- `category` - Product category
- `inventory_level` - Current stock
- `units_sold` - Units sold
- `demand_forecast` - Predicted demand
- And more...

### 2. **products**
Aggregated product data:
- `product_id` - Unique product ID
- `category` - Product category
- `price` - Unit price
- `stock` - Current stock level
- `reorder` - Reorder threshold
- `supplier` - Supplier name

### 3. **stores**
Store information:
- `store_id` - Unique store ID
- `region` - Store region
- `total_products` - Number of products
- `total_stock` - Total inventory

---

## 🔌 API Endpoints

### Product Endpoints

**Get all products:**
```bash
GET /api/products
```

**Get products by category:**
```bash
GET /api/products/category/<category>
```

### Inventory Endpoints

**Get inventory data (last 30 days):**
```bash
GET /api/inventory
```

**Get inventory summary by category:**
```bash
GET /api/inventory/summary
```

**Get low stock items:**
```bash
GET /api/inventory/low-stock
```

### Forecast Endpoints

**Get demand forecasts:**
```bash
GET /api/forecast
```

### Alert Endpoints

**Get active alerts:**
```bash
GET /api/alerts
```

### Store Endpoints

**Get all stores:**
```bash
GET /api/stores
```

### Update Endpoints

**Update product stock:**
```bash
POST /api/products/update
Content-Type: application/json

{
  "product_id": "P0001",
  "stock": 100
}
```

---

## 🎯 Frontend Modules

### **api.js** - Data Layer
Handles all MongoDB API communication:
- `initializeDataFromMongoDB()` - Load all data
- `fetchProducts()` - Get product list
- `fetchInventorySummary()` - Get inventory analysis
- `fetchLowStockItems()` - Get low stock alerts
- `fetchForecastData()` - Get demand forecasts
- `fetchAlerts()` - Get system alerts

### **ui.js** - UI Components
Manages all UI rendering:
- Page navigation - `showPage(name)`
- Notifications - `showToast(msg, type)`
- Chart rendering - `initDemandChart()`, `initDonutChart()`
- Overview displays - `renderActivityFeed()`, `renderMLStatus()`

### **auth.js** - User Management
Handles user operations:
- User table rendering - `renderUserTable()`
- User filtering - `filterUsers()`
- CRUD operations - `editUser()`, `saveUser()`, `deleteUser()`

### **dashboard.js** - Business Logic
Main application logic:
- Inventory management
- Forecast calculations
- Alerts & notifications
- Report generation

---

## 📈 Data Flow

```
CSV File
   ↓
import_data.py (one-time)
   ↓
MongoDB Collections
   ↓
Flask API (app.py)
   ↓
Frontend API Module (api.js)
   ↓
UI Modules (ui.js, auth.js)
   ↓
Dashboard Display
```

---

## 🐛 Troubleshooting

### MongoDB Connection Error
```
Error: MongoClient did not open a netty connection
```
**Solution:** Ensure MongoDB is running on `localhost:27017`

### Import Script Fails
```
Error: [Errno 2] No such file or directory: 'data/retail_store_inventory.csv'
```
**Solution:** Run the import script from the project root directory

### Dashboard Shows No Data
```
All API endpoints return empty arrays
```
**Solution:** Run `python import_data.py` to populate MongoDB

### Port Already in Use
```
OSError: [Errno 48] Address already in use
```
**Solution:** Change port in `app.py` or kill existing process on port 5000

---

## 🚀 Performance Tips

1. **Indexes:** MongoDB indexes are automatically created on:
   - `inventory.date`
   - `inventory.store_id`
   - `inventory.product_id`

2. **Query Limits:** API endpoints limit results to last 100 records by default

3. **Caching:** Consider implementing frontend caching for frequently accessed data

---

## 📝 Environment Variables (Optional)

Create `.env` file for custom settings:

```env
MONGODB_URI=mongodb://localhost:27017/
MONGODB_DB_NAME=smart_inventory_db
FLASK_ENV=development
FLASK_DEBUG=True
```

---

## ✅ Verification Checklist

- [ ] MongoDB is running
- [ ] Requirements installed: `pip install -r requirements.txt`
- [ ] Data imported: `python import_data.py`
- [ ] Flask app started: `python app.py`
- [ ] Dashboard loads at `http://localhost:5000`
- [ ] Products display in inventory table
- [ ] Alerts show low-stock items
- [ ] Charts render with forecast data

---

## 📞 Support

For issues or questions, check:
1. MongoDB logs: `mongod` console output
2. Flask logs: Terminal output when running `app.py`
3. Browser console: F12 → Console tab for JavaScript errors
4. Network tab: F12 → Network tab to inspect API calls
