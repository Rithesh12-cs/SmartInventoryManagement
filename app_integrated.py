from datetime import datetime, timedelta, timezone
import os
import sys
import pandas as pd
import joblib
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from pymongo import MongoClient
from bson import ObjectId
import urllib.parse
from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from sklearn.metrics import mean_squared_error, mean_absolute_error
from math import sqrt
import numpy as np

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
app.secret_key = os.environ.get('SECRET_KEY', 'super-secret-key-change-in-production')
app.permanent_session_lifetime = timedelta(hours=6)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization'
    return response

# Connect to MongoDB
try:
    password = urllib.parse.quote_plus("Ve1nk0y2")
    uri = f"mongodb+srv://ritheshbilli_db_user:{password}@cluster0.6lj6frr.mongodb.net/"
    client = MongoClient(uri)
    db = client['smart_inventory_db']
    users_col = db['users']
    uploads_col = db['uploads']
    predictions_col = db['predictions']
    products_col = db['products']
    inventory_col = db['inventory']
    stores_col = db['stores']
    print("✓ Connected to MongoDB successfully")
except Exception as e:
    print(f"✗ Error connecting to MongoDB: {e}")
    db = None
    users_col = None
    uploads_col = None
    predictions_col = None
    products_col = None
    inventory_col = None
    stores_col = None

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
            print('✓ Loaded ARIMA model from models/arima_model.pkl')
        except Exception as e:
            print(f'✗ Failed to load ARIMA model: {e}')
            train_arima_model()
    else:
        print('ARIMA model not found, training...')
        train_arima_model()

    if os.path.exists(PROPHET_MODEL_PATH):
        try:
            prophet_model = joblib.load(PROPHET_MODEL_PATH)
            print('✓ Loaded Prophet model from models/prophet_model.pkl')
        except Exception as e:
            print(f'✗ Failed to load Prophet model: {e}')
            train_prophet_model()
    else:
        print('Prophet model not found, training...')
        train_prophet_model()


load_models()

def train_arima_model():
    global arima_model
    try:
        df = pd.read_csv('data/retail_store_inventory.csv')
        df['Date'] = pd.to_datetime(df['Date'])
        df.set_index('Date', inplace=True)

        daily_demand = df.resample('D')['Units Sold'].sum()

        train_size = int(len(daily_demand) * 0.8)
        train = daily_demand[:train_size]

        model = ARIMA(train, order=(1, 1, 1))
        arima_model = model.fit()

        # Save the model
        joblib.dump(arima_model, ARIMA_MODEL_PATH)
        print('✓ Trained and saved ARIMA model')
        return True
    except Exception as e:
        print(f'✗ Failed to train ARIMA model: {e}')
        return False

def train_prophet_model():
    global prophet_model
    if Prophet is None:
        print('✗ Prophet not available')
        return False
    try:
        df = pd.read_csv('data/retail_store_inventory.csv')
        df['Date'] = pd.to_datetime(df['Date'])
        daily_sales = df.groupby('Date')['Units Sold'].sum().reset_index()
        daily_sales.rename(columns={'Date': 'ds', 'Units Sold': 'y'}, inplace=True)

        model = Prophet()
        prophet_model = model.fit(daily_sales)

        # Save the model
        joblib.dump(prophet_model, PROPHET_MODEL_PATH)
        print('✓ Trained and saved Prophet model')
        return True
    except Exception as e:
        print(f'✗ Failed to train Prophet model: {e}')
        return False

# In-memory storage for demo when MongoDB is not available
demo_users = []
demo_uploads = []
demo_predictions = []


def create_default_users():
    global users_col
    
    try:
        if users_col is not None and users_col.count_documents({}) == 0:
            users_col.insert_many([
                {
                    'email': 'admin@nexstock.ai',
                    'name': 'Sarah Chen',
                    'role': 'admin',
                    'dept': 'Operations',
                    'password_hash': generate_password_hash('Admin123!'),
                    'avatar': '#3b82f6',
                    'created_at': datetime.utcnow()
                },
                {
                    'email': 'manager@nexstock.ai',
                    'name': 'James Okafor',
                    'role': 'manager',
                    'dept': 'Procurement',
                    'password_hash': generate_password_hash('Manager123!'),
                    'avatar': '#10b981',
                    'created_at': datetime.utcnow()
                },
                {
                    'email': 'viewer@nexstock.ai',
                    'name': 'Priya Patel',
                    'role': 'viewer',
                    'dept': 'Sales',
                    'password_hash': generate_password_hash('Viewer123!'),
                    'avatar': '#8b5cf6',
                    'created_at': datetime.utcnow()
                }
            ])
            print('✓ Created default admin, manager, and viewer accounts in MongoDB')
    except Exception as e:
        print(f"✗ MongoDB operation failed ({e}), using demo mode")
        users_col = None
    
    if users_col is None:
        # Create demo users in memory
        if not demo_users:
            demo_users.extend([
                {
                    'email': 'admin@nexstock.ai',
                    'name': 'Sarah Chen',
                    'role': 'admin',
                    'dept': 'Operations',
                    'password_hash': generate_password_hash('Admin123!'),
                    'avatar': '#3b82f6',
                    'created_at': datetime.utcnow()
                },
                {
                    'email': 'manager@nexstock.ai',
                    'name': 'James Okafor',
                    'role': 'manager',
                    'dept': 'Procurement',
                    'password_hash': generate_password_hash('Manager123!'),
                    'avatar': '#10b981',
                    'created_at': datetime.utcnow()
                },
                {
                    'email': 'viewer@nexstock.ai',
                    'name': 'Priya Patel',
                    'role': 'viewer',
                    'dept': 'Sales',
                    'password_hash': generate_password_hash('Viewer123!'),
                    'avatar': '#8b5cf6',
                    'created_at': datetime.utcnow()
                }
            ])
            print('✓ Created default accounts in demo mode')


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
        if session.get('role') not in ['admin', 'manager']:
            return jsonify({'success': False, 'message': 'Manager access required'}), 403
        return func(*args, **kwargs)
    wrapper.__name__ = func.__name__
    return wrapper


def admin_required(func):
    def wrapper(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'success': False, 'message': 'Authentication required'}), 401
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'message': 'Admin access required'}), 403
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
    return redirect(url_for('login_page'))


@app.route('/login', methods=['GET'])
def login_page():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('login.html')


@app.route('/signup', methods=['GET'])
def signup_page():
    if 'user_id' in session:
        return redirect(url_for('dashboard'))
    return render_template('signup.html')


@app.route('/api/auth/login', methods=['POST'])
def api_login():
    """API endpoint for user login"""
    data = request.get_json()
    email = data.get('email', '').strip()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'success': False, 'message': 'Email and password are required'}), 400

    user = None
    if users_col is not None:
        user = users_col.find_one({'email': email})
    else:
        # Demo mode
        user = next((u for u in demo_users if u['email'] == email), None)

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'success': False, 'message': 'Invalid email or password'}), 401

    session.permanent = True
    session['user_id'] = str(user.get('_id', email))
    session['email'] = user['email']
    session['name'] = user['name']
    session['role'] = user['role']
    session['dept'] = user.get('dept', 'Operations')
    session['avatar'] = user.get('avatar', '#3b82f6')

    return jsonify({
        'success': True,
        'message': 'Login successful',
        'user': {
            'id': session['user_id'],
            'email': user['email'],
            'name': user['name'],
            'role': user['role'],
            'dept': user.get('dept', ''),
            'avatar': user.get('avatar', '#3b82f6')
        }
    })


@app.route('/api/auth/signup', methods=['POST'])
def api_signup():
    """API endpoint for user signup"""
    data = request.get_json()
    email = data.get('email', '').strip()
    name = data.get('name', '').strip()
    password = data.get('password', '').strip()
    role = data.get('role', 'viewer').strip()

    if not email or not name or not password:
        return jsonify({'success': False, 'message': 'All fields are required'}), 400

    if len(password) < 6:
        return jsonify({'success': False, 'message': 'Password must be at least 6 characters'}), 400

    # Check if user already exists
    if users_col is not None:
        if users_col.find_one({'email': email}):
            return jsonify({'success': False, 'message': 'Email already registered'}), 409
    else:
        if any(u['email'] == email for u in demo_users):
            return jsonify({'success': False, 'message': 'Email already registered'}), 409

    user_doc = {
        'email': email,
        'name': name,
        'role': role,
        'dept': 'Operations',
        'password_hash': generate_password_hash(password),
        'avatar': '#3b82f6',
        'created_at': datetime.now(timezone.utc),
        'status': 'active'
    }

    if users_col is not None:
        result = users_col.insert_one(user_doc)
        user_id = str(result.inserted_id)
    else:
        # Demo mode
        user_id = f"demo_{len(demo_users)}"
        user_doc['_id'] = user_id
        demo_users.append(user_doc)

    # Auto-login after signup
    session.permanent = True
    session['user_id'] = user_id
    session['email'] = email
    session['name'] = name
    session['role'] = role
    session['dept'] = 'Operations'
    session['avatar'] = '#3b82f6'

    return jsonify({
        'success': True,
        'message': 'Account created successfully',
        'user': {
            'id': user_id,
            'email': email,
            'name': name,
            'role': role,
            'dept': 'Operations'
        }
    })


@app.route('/api/auth/logout', methods=['POST'])
@login_required
def api_logout():
    """API endpoint for user logout"""
    session.clear()
    return jsonify({'success': True, 'message': 'Logged out successfully'})


@app.route('/logout', methods=['GET'])
def logout_page():
    """Clear session and redirect to login"""
    session.clear()
    return redirect(url_for('login_page'))


@app.route('/api/auth/profile', methods=['GET'])
@login_required
def api_profile():
    """Get current user profile"""
    return jsonify({
        'success': True,
        'user': {
            'id': session.get('user_id'),
            'email': session.get('email'),
            'name': session.get('name'),
            'role': session.get('role'),
            'dept': session.get('dept'),
            'avatar': session.get('avatar')
        }
    })


@app.route('/current-user', methods=['GET'])
def current_user():
    """Return the currently authenticated user if session exists"""
    if 'user_id' not in session:
        return jsonify({'authenticated': False}), 401
    return jsonify({
        'authenticated': True,
        'user': {
            'id': session.get('user_id'),
            'email': session.get('email'),
            'name': session.get('name'),
            'role': session.get('role'),
            'dept': session.get('dept'),
            'avatar': session.get('avatar')
        }
    })


@app.route('/api/auth/check', methods=['GET'])
def api_check_auth():
    """Check if user is authenticated"""
    if 'user_id' in session:
        return jsonify({
            'authenticated': True,
            'user': {
                'id': session.get('user_id'),
                'email': session.get('email'),
                'name': session.get('name'),
                'role': session.get('role')
            }
        })
    return jsonify({'authenticated': False})


@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')


@app.route('/api/upload', methods=['POST'])
@login_required
def upload():
    if 'file' not in request.files:
        return jsonify({'success': False, 'message': 'No file provided'}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'message': 'No file selected'}), 400

    try:
        parsed = parse_uploaded_csv(file)
        upload_doc = {
            'filename': file.filename,
            'user_id': session['user_id'],
            'user_email': session['email'],
            'role': session['role'],
            'created_at': datetime.now(timezone.utc),
            **parsed
        }

        if uploads_col is not None:
            result = uploads_col.insert_one(upload_doc)
            upload_doc['_id'] = str(result.inserted_id)
        else:
            upload_doc['_id'] = f"demo_upload_{len(demo_uploads)}"
            demo_uploads.append(upload_doc)

        return jsonify({'success': True, 'upload_id': upload_doc['_id'], 'data': upload_doc})
    except ValueError as e:
        return jsonify({'success': False, 'message': str(e)}), 400
    except Exception as e:
        return jsonify({'success': False, 'message': 'Upload failed'}), 500


@app.route('/api/uploads', methods=['GET'])
@login_required
def get_uploads():
    if uploads_col is not None:
        query = {'user_id': session['user_id']}
        uploads = list(uploads_col.find(query).sort('created_at', -1))
    else:
        uploads = [u for u in demo_uploads if u['user_id'] == session['user_id']]

    response = []
    for item in uploads:
        response.append({
            'upload_id': str(item['_id']),
            'filename': item['filename'],
            'row_count': item['row_count'],
            'last_date': item['last_date'],
            'created_at': item['created_at'].isoformat() if isinstance(item['created_at'], datetime) else item['created_at']
        })

    return jsonify(response)


@app.route('/api/predict', methods=['POST'])
@manager_required
def predict():
    data = request.get_json(force=True, silent=True) or request.form
    upload_id = data.get('upload_id')
    horizon = int(data.get('horizon') or 30)

    if not upload_id:
        return jsonify({'success': False, 'message': 'upload_id is required.'}), 400

    upload = None
    if uploads_col is not None:
        try:
            upload = uploads_col.find_one({'_id': ObjectId(upload_id)})
        except Exception:
            upload = None
    else:
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
        'created_at': datetime.now(timezone.utc),
        'horizon': horizon,
        'last_date': upload['last_date'],
        'arima': arima_results,
        'prophet': prophet_results,
        'summary': summary
    }

    if predictions_col is not None:
        prediction_id = predictions_col.insert_one(prediction_doc).inserted_id
        prediction_doc['_id'] = str(prediction_id)
    else:
        prediction_doc['_id'] = f"demo_pred_{len(demo_predictions)}"
        demo_predictions.append(prediction_doc)

    return jsonify({'success': True, 'prediction_id': prediction_doc['_id'], 'result': prediction_doc})


@app.route('/api/results', methods=['GET'])
@login_required
def results():
    if predictions_col is not None:
        query = {}
        predictions = list(predictions_col.find(query).sort('created_at', -1))
    else:
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


# ======= INVENTORY API ROUTES =======
@app.route('/api/products', methods=['GET'])
@login_required
def get_products():
    try:
        if products_col is None:
            return jsonify([])
        products = list(products_col.find({}, {'_id': 0}))
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/products/category/<category>', methods=['GET'])
@login_required
def get_products_by_category(category):
    try:
        if products_col is None:
            return jsonify([])
        products = list(products_col.find({'category': category}, {'_id': 0}))
        return jsonify(products)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/inventory', methods=['GET'])
@login_required
def get_inventory():
    try:
        if inventory_col is None:
            return jsonify([])
        thirty_days_ago = datetime.now() - timedelta(days=30)
        inventory = list(inventory_col.find(
            {'date': {'$gte': thirty_days_ago}},
            {'_id': 0}
        ).sort('date', -1).limit(100))
        return jsonify(inventory)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/inventory/summary', methods=['GET'])
@login_required
def get_inventory_summary():
    try:
        if inventory_col is None:
            return jsonify([])
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
        summary = list(inventory_col.aggregate(pipeline))
        return jsonify(summary)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/inventory/low-stock', methods=['GET'])
@login_required
def get_low_stock():
    try:
        if inventory_col is None:
            return jsonify([])
        low_stock = list(inventory_col.find(
            {'$expr': {'$lt': ['$inventory_level', 50]}},
            {'_id': 0}
        ).sort('inventory_level', 1).limit(20))
        return jsonify(low_stock)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/stores', methods=['GET'])
@login_required
def get_stores():
    try:
        if stores_col is None:
            return jsonify([])
        stores = list(stores_col.find({}, {'_id': 0}))
        return jsonify(stores)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/forecast', methods=['GET'])
@login_required
def get_forecast():
    try:
        if inventory_col is None:
            return jsonify([])
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
        forecast = list(inventory_col.aggregate(pipeline))
        return jsonify(forecast)
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/alerts', methods=['GET'])
@login_required
def get_alerts():
    try:
        if inventory_col is None:
            return jsonify([])
        alerts = []
        low_stock_items = list(inventory_col.find(
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
@manager_required
def update_product():
    try:
        if products_col is None:
            return jsonify({'success': False, 'message': 'Database not available'}), 500
        data = request.json
        product_id = data.get('product_id')
        new_stock = data.get('stock')
        
        result = products_col.update_one(
            {'product_id': product_id},
            {'$set': {'stock': new_stock}}
        )
        
        if result.modified_count:
            return jsonify({'success': True, 'message': 'Product updated'})
        else:
            return jsonify({'success': False, 'message': 'Product not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/api/models/retrain', methods=['POST'])
@admin_required
def retrain_models():
    try:
        arima_success = train_arima_model()
        prophet_success = train_prophet_model()
        
        if arima_success and prophet_success:
            return jsonify({'success': True, 'message': 'Models retrained successfully'})
        else:
            return jsonify({'success': False, 'message': 'Failed to retrain some models'}), 500
    except Exception as e:
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    print("\n" + "="*60)
    print("🚀 Smart Inventory Management System")
    print("="*60)
    print("\n📚 Demo Credentials:")
    print("  Admin:   admin@nexstock.ai / Admin123!")
    print("  Manager: manager@nexstock.ai / Manager123!")
    print("  Viewer:  viewer@nexstock.ai / Viewer123!")
    print("\n🌐 Access: http://localhost:5000")
    print("="*60 + "\n")
    app.run(debug=False, port=5000)
