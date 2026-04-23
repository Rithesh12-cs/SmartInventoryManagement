# Smart Inventory Management System

A comprehensive inventory forecasting system that uses machine learning models (ARIMA and Prophet) to predict inventory needs. The system features role-based authentication with Manager and Employee access levels, allowing managers to upload data and generate predictions while employees can view results.

## 🚀 Features

- **Machine Learning Predictions**: Uses pre-trained ARIMA and Prophet models for accurate inventory forecasting
- **Role-Based Authentication**: Separate access levels for Managers and Employees
- **CSV Data Upload**: Easy data import with automatic column detection
- **Interactive Dashboard**: Modern web interface with charts and data visualization
- **RESTful API**: Complete API for integration with other systems
- **Session Management**: Secure user sessions with Flask
- **MongoDB Integration**: Robust data storage (with demo mode fallback)

## 🛠 Tech Stack

### Backend
- **Flask** - Web framework
- **MongoDB** - Database (with Atlas cloud support)
- **PyMongo** - MongoDB driver
- **Werkzeug** - Security utilities

### Machine Learning
- **ARIMA** - Statistical time series forecasting
- **Prophet** - Facebook's forecasting library
- **pandas** - Data manipulation
- **numpy** - Numerical computing
- **joblib** - Model serialization

### Frontend
- **HTML5/CSS3** - Modern web standards
- **JavaScript (ES6+)** - Interactive functionality
- **Chart.js** - Data visualization
- **Jinja2** - Template engine

## 📋 Prerequisites

- Python 3.8+
- MongoDB (local or Atlas cloud)
- Git

## 🔧 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartInventoryManagement
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   ```bash
   # Windows
   venv\Scripts\activate
   # Linux/Mac
   source venv/bin/activate
   ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

## ⚙️ Setup

### Database Configuration

The application supports both MongoDB Atlas (cloud) and local MongoDB:

1. **MongoDB Atlas (Recommended)**
   - Create account at [MongoDB Atlas](https://www.mongodb.com/atlas)
   - Create a cluster and database
   - Update connection string in `app.py`:
   ```python
   uri = f"mongodb+srv://username:password@cluster.mongodb.net/"
   ```

2. **Local MongoDB**
   - Install MongoDB locally
   - Update connection string in `app.py`:
   ```python
   client = MongoClient('mongodb://localhost:27017/')
   ```

### Model Training (Optional)

Pre-trained models are included, but you can retrain them:

```bash
python train_models.py
```

This will generate new `arima_model.pkl` and `prophet_model.pkl` files.

## 🚀 Running the Application

1. **Start the Flask server**
   ```bash
   python app.py
   ```

2. **Open your browser**
   ```
   http://127.0.0.1:5000
   ```

## 👥 Demo Accounts

The application comes with pre-configured demo accounts:

### Manager Account
- **Email**: manager@smartinv.com
- **Password**: Manager123!
- **Access**: Full system access including data upload and predictions

### Employee Account
- **Email**: employee@smartinv.com
- **Password**: Employee123!
- **Access**: View-only access to prediction results

## 📖 Usage

### For Managers
1. **Login** with manager credentials
2. **Upload CSV** data containing historical inventory data
3. **Generate Predictions** using ARIMA and Prophet models
4. **View Results** in charts and tables
5. **Compare Models** to choose the best forecasting approach

### For Employees
1. **Login** with employee credentials
2. **View Dashboard** with existing predictions
3. **Analyze Results** from manager-generated forecasts

### CSV Format Requirements
Your CSV file should contain:
- **Date column**: Named 'Date', 'ds', or 'timestamp' (YYYY-MM-DD format)
- **Value column**: Named 'Units Sold', 'y', or similar numeric data

Example CSV structure:
```csv
Date,Units Sold
2023-01-01,150
2023-01-02,145
2023-01-03,160
...
```

## 🔌 API Endpoints

### Authentication
- `POST /signup` - User registration
- `POST /login` - User authentication
- `GET /logout` - User logout
- `GET /current-user` - Get current user info

### Data Management
- `POST /upload-csv` - Upload CSV file (Manager only)
- `POST /predict` - Generate predictions (Manager only)
- `GET /results` - Get prediction results

### Legacy Endpoints
- `GET /api/products` - Get product data
- `GET /api/products/category/<category>` - Get products by category
- `GET /api/inventory` - Get inventory data

## 📁 Project Structure

```
SmartInventoryManagement/
├── app.py                 # Main Flask application
├── train_models.py        # Model training script
├── mongod.py             # MongoDB connection test
├── requirements.txt       # Python dependencies
├── README.md             # This file
├── data/
│   └── retail_store_inventory.csv  # Sample dataset
├── models/
│   ├── arima_model.pkl    # Pre-trained ARIMA model
│   └── prophet_model.pkl  # Pre-trained Prophet model
├── static/
│   ├── styles.css         # Main stylesheet
│   └── js/
│       ├── script.js      # Login page JavaScript
│       ├── signup.js      # Signup page JavaScript
│       ├── dashboard.js   # Dashboard functionality
│       └── modules/
│           ├── api.js     # API utilities
│           └── auth.js    # Authentication helpers
└── templates/
    ├── index.html         # Login page
    ├── signup.html        # Registration page
    ├── dashboard.html     # Main dashboard
    ├── forecast.html      # Prediction interface
    └── ...                # Other HTML templates
```

## 🔧 Configuration

### Environment Variables
Create a `.env` file for sensitive configuration:

```env
SECRET_KEY=your-secret-key-here
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
```

### Flask Configuration
Modify `app.py` for custom settings:

```python
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'default-secret')
app.permanent_session_lifetime = timedelta(hours=6)  # Session timeout
```

## 🐛 Troubleshooting

### Common Issues

1. **MongoDB Connection Failed**
   - Check your MongoDB URI
   - Ensure network connectivity for Atlas
   - Verify username/password credentials

2. **Model Loading Errors**
   - Ensure model files exist in `models/` directory
   - Check file permissions
   - Retrain models if corrupted

3. **Import Errors**
   - Activate virtual environment
   - Install all requirements: `pip install -r requirements.txt`
   - Check Python version compatibility

4. **Permission Errors**
   - Managers only: Upload and predict endpoints
   - Check user role in session

### Demo Mode
If MongoDB is unavailable, the app runs in demo mode with in-memory storage.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit changes: `git commit -am 'Add feature'`
4. Push to branch: `git push origin feature-name`
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For questions or issues:
- Create an issue on GitHub
- Check the troubleshooting section
- Review the API documentation

---

**Built with ❤️ using Flask, MongoDB, and Machine Learning**