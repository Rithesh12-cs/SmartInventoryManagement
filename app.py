from datetime import datetime, timedelta
import os
import sys
import pandas as pd
import joblib
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from bson import ObjectId
import urllib.parse

# Avoid local file name conflict with installed prophet package
ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
if ROOT_DIR in sys.path:
    sys.path.remove(ROOT_DIR)
try:
    from prophet import Prophet
except ImportError:
    Prophet = None
sys.path.insert(0, ROOT_DIR)

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET_KEY', 'super-secret-key')
app.permanent_session_lifetime = timedelta(hours=6)

# Connect to MongoDB
try:
    password = urllib.parse.quote_plus("Ve1nk0y2@40")
    uri = f"mongodb+srv://ritheshbilli_db_user:{password}@cluster0.6lj6frr.mongodb.net/"
    client = MongoClient(uri)
    db = client['smart_inventory_db']
    users_col = db['users']
    uploads_col = db['uploads']
    predictions_col = db['predictions']
    print("Connected to MongoDB successfully")
except Exception as e:
    print(f"Error connecting to MongoDB: {e}")
    # Fallback to in-memory storage for demo
    users_col = None
    uploads_col = None
    predictions_col = None

MODEL_DIR = os.path.join(os.path.abspath(os.path.dirname(__file__)), 'models')
ARIMA_MODEL_PATH = os.path.join(MODEL_DIR, 'arima_model.pkl')
PROPHET_MODEL_PATH = os.path.join(MODEL_DIR, 'prophet_model.pkl')

arima_model = None
prophet_model = None


def load_models():
    global arima_model, prophet_model
    if os.path.exists(ARIMA_MODEL_PATH):
        try:
            arima_model = joblib.load(ARIMA_MODEL_PATH)
            print('Loaded ARIMA model from models/arima_model.pkl')
        except Exception as e:
            print(f'Failed to load ARIMA model: {e}')

    if os.path.exists(PROPHET_MODEL_PATH):
        try:
            prophet_model = joblib.load(PROPHET_MODEL_PATH)
            print('Loaded Prophet model from models/prophet_model.pkl')
        except Exception as e:
            print(f'Failed to load Prophet model: {e}')


load_models()


# In-memory storage for demo when MongoDB is not available
demo_users = []
demo_uploads = []
demo_predictions = []

def create_default_users():
    global users_col, uploads_col, predictions_col
    
    try:
        if users_col is not None and users_col.count_documents({}) == 0:
            users_col.insert_many([
                {
                    'email': 'manager@smartinv.com',
                    'name': 'Manager User',
                    'role': 'manager',
                    'password_hash': generate_password_hash('Manager123!')
                },
                {
                    'email': 'employee@smartinv.com',
                    'name': 'Employee User',
                    'role': 'employee',
                    'password_hash': generate_password_hash('Employee123!')
                }
            ])
            print('Created default manager and employee accounts')
    except Exception as e:
        print(f"MongoDB operation failed ({e}), using demo mode")
        users_col = None
        uploads_col = None
        predictions_col = None
    
    if users_col is None:
        # Create demo users in memory
        if not demo_users:
            demo_users.extend([
                {
                    'email': 'manager@smartinv.com',
                    'name': 'Manager User',
                    'role': 'manager',
                    'password_hash': generate_password_hash('Manager123!')
                },
                {
                    'email': 'employee@smartinv.com',
                    'name': 'Employee User',
                    'role': 'employee',
                    'password_hash': generate_password_hash('Employee123!')
                }
            ])
            print('Created default manager and employee accounts in demo mode')


create_default_users()


def login_required(func):
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


def manager_required(func):
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        if session.get('role') != 'manager':
            return jsonify({'success': False, 'message': 'Manager access required'}), 403
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


def clean_object_id(doc):
    if not doc:
        return None
    doc = dict(doc)
    if '_id' in doc:
        doc['_id'] = str(doc['_id'])
    return doc


def parse_uploaded_csv(file):
    try:
        df = pd.read_csv(file)
    except Exception as exc:
        raise ValueError('Unable to read CSV file. Please upload a valid CSV.') from exc

    if df.empty:
        raise ValueError('Uploaded CSV contains no data.')

    date_columns = [c for c in df.columns if c.lower() in ('date', 'ds', 'timestamp')]
    if not date_columns:
        raise ValueError('CSV must include a date column named Date, ds, or timestamp.')

    date_col = date_columns[0]
    df[date_col] = pd.to_datetime(df[date_col], errors='coerce')
    if df[date_col].isna().all():
        raise ValueError('Date column could not be parsed. Use YYYY-MM-DD or a valid date format.')

    value_columns = [c for c in df.columns if c.lower() in ('units sold', 'units_sold', 'y', 'value', 'demand')]
    if not value_columns:
        numeric_cols = df.select_dtypes(include=['number']).columns.tolist()
        if len(numeric_cols) > 0:
            value_columns = [numeric_cols[0]]

    if not value_columns:
        raise ValueError('CSV must include a numeric value column such as Units Sold or y.')

    value_col = value_columns[0]
    df = df[[date_col, value_col]].dropna()
    df = df.sort_values(date_col)
    last_date = df[date_col].max().date()
    row_count = len(df)
    preview = df.head(5).to_dict(orient='records')

    return {
        'date_column': date_col,
        'value_column': value_col,
        'last_date': last_date.strftime('%Y-%m-%d'),
        'row_count': row_count,
        'preview': preview
    }


def build_forecast_dates(last_date, horizon):
    dates = []
    start = datetime.strptime(last_date, '%Y-%m-%d').date() + timedelta(days=1)
    for i in range(horizon):
        dates.append((start + timedelta(days=i)).strftime('%Y-%m-%d'))
    return dates


def run_arima_forecast(horizon, last_date):
    if arima_model is None:
        raise RuntimeError('ARIMA model is unavailable.')

    raw = arima_model.forecast(steps=horizon)
    values = [float(v) for v in raw.tolist()] if hasattr(raw, 'tolist') else [float(v) for v in raw]
    dates = build_forecast_dates(last_date, horizon)
    return [{'date': dates[i], 'value': values[i]} for i in range(len(values))]


def run_prophet_forecast(horizon, last_date):
    if prophet_model is None:
        raise RuntimeError('Prophet model is unavailable.')

    start_date = datetime.strptime(last_date, '%Y-%m-%d').date() + timedelta(days=1)
    ds = pd.date_range(start=start_date, periods=horizon, freq='D')
    future = pd.DataFrame({'ds': ds})
    forecast = prophet_model.predict(future)
    values = forecast['yhat'].astype(float).tolist()
    dates = [d.strftime('%Y-%m-%d') for d in ds]
    return [{'date': dates[i], 'value': values[i]} for i in range(len(values))]


# ======= AUTH ROUTES =======
@app.route('/')
def home():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return redirect(url_for('login'))


@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'GET':
        return render_template('index.html')

    data = request.get_json(force=True, silent=True) or request.form
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''

    user = users_col.find_one({'email': email})
    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

    session.permanent = True
    session['user_id'] = str(user['_id'])
    session['email'] = user['email']
    session['name'] = user.get('name', '')
    session['role'] = user.get('role', 'employee')

    return jsonify({'success': True, 'message': 'Login successful', 'role': session['role']})


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'GET':
        return render_template('signup.html')

    data = request.get_json(force=True, silent=True) or request.form
    name = (data.get('name') or '').strip()
    email = (data.get('email') or '').strip().lower()
    password = data.get('password') or ''
    role = (data.get('role') or 'employee').strip().lower()

    if not name or not email or not password or role not in ('manager', 'employee'):
        return jsonify({'success': False, 'message': 'Please provide name, email, password, and role.'}), 400

    # Check if user already exists
    existing_user = None
    if users_col:
        existing_user = users_col.find_one({'email': email})
    else:
        existing_user = next((u for u in demo_users if u['email'] == email), None)

    if existing_user:
        return jsonify({'success': False, 'message': 'Email already registered.'}), 409

    new_user = {
        'name': name,
        'email': email,
        'role': role,
        'password_hash': generate_password_hash(password)
    }

    if users_col:
        users_col.insert_one(new_user)
    else:
        demo_users.append(new_user)

    return jsonify({'success': True, 'message': 'Signup successful. You may now log in.'})


@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))


@app.route('/dashboard')
def dashboard():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('dashboard.html')


@app.route('/current-user', methods=['GET'])
def current_user():
    if 'user_id' not in session:
        return jsonify({'user': None})

    user = None
    if users_col:
        try:
            user = users_col.find_one({'_id': ObjectId(session['user_id'])}, {'password_hash': 0})
        except:
            user = None
    else:
        # Demo mode - find user by email
        user = next((u for u in demo_users if u['email'] == session.get('email')), None)

    if not user:
        session.clear()
        return jsonify({'user': None})

    return jsonify({'user': {'email': user['email'], 'name': user.get('name', ''), 'role': user.get('role', 'employee')}})


@app.route('/upload-csv', methods=['POST'])
@manager_required
def upload_csv():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'CSV file is required.'}), 400

    csv_file = request.files['file']
    try:
        details = parse_uploaded_csv(csv_file)
    except ValueError as exc:
        return jsonify({'success': False, 'message': str(exc)}), 400

    upload_doc = {
        'user_id': session['user_id'],
        'user_email': session['email'],
        'filename': csv_file.filename,
        'uploaded_at': datetime.utcnow(),
        'date_column': details['date_column'],
        'value_column': details['value_column'],
        'last_date': details['last_date'],
        'row_count': details['row_count'],
        'preview': details['preview']
    }

    if uploads_col:
        upload_id = uploads_col.insert_one(upload_doc).inserted_id
        upload_doc['_id'] = upload_id
    else:
        # Demo mode - use in-memory storage
        upload_doc['_id'] = f"demo_{len(demo_uploads)}"
        demo_uploads.append(upload_doc)

    return jsonify({'success': True, 'upload_id': upload_doc['_id'], 'preview': details['preview'], 'last_date': details['last_date'], 'row_count': details['row_count']})


@app.route('/predict', methods=['POST'])
@manager_required
def predict():
    data = request.get_json(force=True, silent=True) or request.form
    upload_id = data.get('upload_id')
    horizon = int(data.get('horizon') or 30)

    if not upload_id:
        return jsonify({'success': False, 'message': 'upload_id is required.'}), 400

    upload = None
    if uploads_col:
        try:
            upload = uploads_col.find_one({'_id': ObjectId(upload_id)})
        except Exception:
            upload = None
    else:
        # Demo mode - find upload in memory
        upload = next((u for u in demo_uploads if u['_id'] == upload_id), None)

    if not upload:
        return jsonify({'success': False, 'message': 'Upload not found.'}), 404

    try:
        arima_results = run_arima_forecast(horizon, upload['last_date'])
        prophet_results = run_prophet_forecast(horizon, upload['last_date'])
    except Exception as exc:
        return jsonify({'success': False, 'message': str(exc)}), 500

    summary = {
        'arima_total': sum(item['value'] for item in arima_results),
        'prophet_total': sum(item['value'] for item in prophet_results),
        'arima_first': arima_results[0]['value'] if arima_results else 0,
        'prophet_first': prophet_results[0]['value'] if prophet_results else 0,
    }

    prediction_doc = {
        'upload_id': str(upload['_id']),
        'uploaded_file': upload['filename'],
        'user_id': session['user_id'],
        'user_email': session['email'],
        'role': session['role'],
        'created_at': datetime.utcnow(),
        'horizon': horizon,
        'last_date': upload['last_date'],
        'arima': arima_results,
        'prophet': prophet_results,
        'summary': summary
    }

    if predictions_col:
        prediction_id = predictions_col.insert_one(prediction_doc).inserted_id
        prediction_doc['_id'] = prediction_id
    else:
        # Demo mode - use in-memory storage
        prediction_doc['_id'] = f"demo_pred_{len(demo_predictions)}"
        demo_predictions.append(prediction_doc)

    return jsonify({'success': True, 'prediction_id': prediction_doc['_id'], 'result': prediction_doc})


@app.route('/results', methods=['GET'])
@login_required
def results():
    if predictions_col:
        query = {}
        predictions = list(predictions_col.find(query).sort('created_at', -1))
    else:
        # Demo mode - use in-memory storage
        predictions = demo_predictions.copy()

    response = []
    for item in predictions:
        response.append({
            'prediction_id': str(item['_id']),
            'uploaded_file': item.get('uploaded_file'),
            'user_email': item.get('user_email'),
            'role': item.get('role'),
            'horizon': item.get('horizon'),
            'created_at': item.get('created_at').isoformat() if item.get('created_at') else None,
            'arima_total': item.get('summary', {}).get('arima_total'),
            'prophet_total': item.get('summary', {}).get('prophet_total'),
            'arima_first': item.get('summary', {}).get('arima_first'),
            'prophet_first': item.get('summary', {}).get('prophet_first'),
            'arima': item.get('arima'),
            'prophet': item.get('prophet')
        })
    return jsonify(response)


# ======= ROUTES =======
@app.route('/api/products', methods=['GET'])
def get_products():
    try:
        products = list(db['products'].find({}, {'_id': 0}))
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products/category/<category>', methods=['GET'])
def get_products_by_category(category):
    try:
        products = list(db['products'].find({'category': category}, {'_id': 0}))
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/inventory', methods=['GET'])
def get_inventory():
    try:
        thirty_days_ago = datetime.now() - timedelta(days=30)
        inventory = list(db['inventory'].find(
            {'date': {'$gte': thirty_days_ago}},
            {'_id': 0}
        ).sort('date', -1).limit(100))
        return jsonify(inventory)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


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


@app.route('/api/inventory/low-stock', methods=['GET'])
def get_low_stock():
    try:
        low_stock = list(db['inventory'].find(
            {'$expr': {'$lt': ['$inventory_level', 50]}},
            {'_id': 0}
        ).sort('inventory_level', 1).limit(20))
        return jsonify(low_stock)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stores', methods=['GET'])
def get_stores():
    try:
        stores = list(db['stores'].find({}, {'_id': 0}))
        return jsonify(stores)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/forecast', methods=['GET'])
def get_forecast():
    try:
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


@app.route('/api/alerts', methods=['GET'])
def get_alerts():
    try:
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
