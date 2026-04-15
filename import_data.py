import pandas as pd
from pymongo import MongoClient
from datetime import datetime

# Connect to MongoDB
try:
    client = MongoClient('mongodb://localhost:27017/')
    db = client['smart_inventory_db']
    print("Connected to MongoDB successfully")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    exit(1)

# Read CSV data
csv_file = 'data/retail_store_inventory.csv'
try:
    df = pd.read_csv(csv_file)
    print(f"Loaded {len(df)} records from CSV")
except Exception as e:
    print(f"Error reading CSV: {e}")
    exit(1)

# Process and insert data
collections = {
    'inventory': db['inventory'],
    'products': db['products'],
    'stores': db['stores']
}

# Clear existing data
for col in collections.values():
    col.delete_many({})

# Insert inventory data
inventory_records = []
products = {}
stores = {}

for idx, row in df.iterrows():
    # Convert Date to datetime
    try:
        date = pd.to_datetime(row['Date'])
    except:
        date = datetime.now()
    
    # Create inventory record
    inventory_record = {
        'date': date,
        'store_id': str(row['Store ID']),
        'product_id': str(row['Product ID']),
        'category': row['Category'],
        'region': row['Region'],
        'inventory_level': int(row['Inventory Level']),
        'units_sold': int(row['Units Sold']),
        'units_ordered': int(row['Units Ordered']),
        'demand_forecast': float(row['Demand Forecast']),
        'price': float(row['Price']),
        'discount': int(row['Discount']),
        'weather_condition': row['Weather Condition'],
        'holiday_promotion': int(row['Holiday/Promotion']),
        'competitor_pricing': float(row['Competitor Pricing']),
        'seasonality': row['Seasonality']
    }
    inventory_records.append(inventory_record)
    
    # Collect unique products
    if row['Product ID'] not in products:
        products[row['Product ID']] = {
            'product_id': str(row['Product ID']),
            'category': row['Category'],
            'price': float(row['Price']),
            'stock': int(row['Inventory Level']),
            'reorder': int(row['Units Ordered']),
            'supplier': f'Supplier-{row["Region"]}'
        }
    
    # Collect unique stores
    if row['Store ID'] not in stores:
        stores[row['Store ID']] = {
            'store_id': str(row['Store ID']),
            'region': row['Region'],
            'total_products': 0,
            'total_stock': 0
        }

# Insert inventory records
if inventory_records:
    result = collections['inventory'].insert_many(inventory_records)
    print(f"Inserted {len(result.inserted_ids)} inventory records")

# Insert products
if products:
    products_list = list(products.values())
    result = collections['products'].insert_many(products_list)
    print(f"Inserted {len(result.inserted_ids)} unique products")

# Insert stores
if stores:
    stores_list = list(stores.values())
    result = collections['stores'].insert_many(stores_list)
    print(f"Inserted {len(result.inserted_ids)} stores")

# Create indexes for better performance
collections['inventory'].create_index('date')
collections['inventory'].create_index('store_id')
collections['inventory'].create_index('product_id')
collections['products'].create_index('product_id')
collections['stores'].create_index('store_id')

print("\nData import completed successfully!")
print(f"Total inventory records: {collections['inventory'].count_documents({})}")
print(f"Total products: {collections['products'].count_documents({})}")
print(f"Total stores: {collections['stores'].count_documents({})}")
