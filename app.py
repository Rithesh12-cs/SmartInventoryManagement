from flask import Flask, render_template, request, jsonify
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime, timedelta
import json

app = Flask(__name__)

# Connect to MongoDB
try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['smart_inventory_db']
    print("Connected to MongoDB successfully")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")

# ======= ROUTES =======
@app.route('/')
def dashboard():
    return render_template('dashboard.html')

@app.route('/login')
def login():
    return render_template('login.html')

# ======= API ENDPOINTS =======

# Get all products
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = list(db['products'].find({}, {'_id': 0}))
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get products by category
@app.route('/api/products/category/<category>', methods=['GET'])
def get_products_by_category(category):
    try:
        products = list(db['products'].find({'category': category}, {'_id': 0}))
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get inventory data for dashboard
@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    try:
        # Get latest inventory data (last 30 days)
        thirty_days_ago = datetime.now() - timedelta(days=30)
        inventory = list(db['inventory'].find(
            {'date': {'$gte': thirty_days_ago}},
            {'_id': 0}
        ).sort('date', -1).limit(100))
        return jsonify(inventory)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get inventory summary
@app.route('/api/inventory/summary', methods=['GET'])
def get_inventory_summary():
    try:
        pipeline = [
            {
                '$group': {
                    '_id': '$category',
                    'total_stock': {'$sum': '$inventory_level'},
                    'total_sold': {'$sum': '$units_sold'},
                    'count': {'$sum': 1}
                }
            },
            {'$sort': {'total_stock': -1}}
        ]
        summary = list(db['inventory'].aggregate(pipeline))
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get low stock items
@app.route('/api/inventory/low-stock', methods=['GET'])
def get_low_stock():
    try:
        # Get items where inventory is below 80% of demand forecast
        low_stock = list(db['inventory'].find(
            {'$expr': {'$lt': ['$inventory_level', 50]}},
            {'_id': 0}
        ).sort('inventory_level', 1).limit(20))
        return jsonify(low_stock)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get store data
@app.route('/api/stores', methods=['GET'])
def get_stores():
    try:
        stores = list(db['stores'].find({}, {'_id': 0}))
        return jsonify(stores)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get forecast data
@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    try:
        # Get demand forecast by product
        pipeline = [
            {
                '$group': {
                    '_id': '$product_id',
                    'name': {'$first': '$category'},
                    'forecast': {'$avg': '$demand_forecast'},
                    'stock': {'$first': '$inventory_level'},
                    'accuracy': {'$sum': 1}
                }
            },
            {'$sort': {'forecast': -1}},
            {'$limit': 5}
        ]
        forecast = list(db['inventory'].aggregate(pipeline))
        return jsonify(forecast)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Get alerts
@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    try:
        # Get low stock alerts
        alerts = []
        low_stock_items = list(db['inventory'].find(
            {'inventory_level': {'$lt': 50}},
            {'_id': 0, 'product_id': 1, 'inventory_level': 1, 'category': 1}
        ).limit(10))
        
        for item in low_stock_items:
            alerts.append({
                'id': len(alerts) + 1,
                'type': 'critical' if item['inventory_level'] == 0 else 'warning',
                'title': f"Low Stock: {item['category']} ({item['product_id']})",
                'desc': f"Only {item['inventory_level']} units remaining",
                'time': 'Recently',
                'icon': '⚠' if item['inventory_level'] > 0 else '❌'
            })
        
        return jsonify(alerts)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Update product stock (POST)
@app.route('/api/products/update', methods=['POST'])
def update_product():
    try:
        data = request.json
        product_id = data.get('product_id')
        new_stock = data.get('stock')
        
        result = db['products'].update_one(
            {'product_id': product_id},
            {'$set': {'stock': new_stock}}
        )
        
        if result.modified_count:
            return jsonify({'success': True, 'message': 'Product updated'})
        else:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
