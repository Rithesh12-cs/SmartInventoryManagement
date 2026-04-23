import os
import sys
import warnings
import pandas as pd
import numpy as np
import joblib
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error
from statsmodels.tsa.arima.model import ARIMA
import matplotlib.pyplot as plt

HAS_LSTM = True
try:
    from keras.models import Sequential, model_from_json
    from keras.layers import LSTM, Dense, Dropout
    from keras.optimizers import Adam
    from keras.callbacks import EarlyStopping
except ModuleNotFoundError:
    HAS_LSTM = False
    print('WARNING: TensorFlow/Keras is unavailable in this environment. LSTM training will be skipped.')

ROOT_DIR = os.path.abspath(os.path.dirname(__file__))
DATA_PATH = os.path.join(ROOT_DIR, 'data', 'retail_store_inventory.csv')
MODEL_DIR = os.path.join(ROOT_DIR, 'models')
os.makedirs(MODEL_DIR, exist_ok=True)

# Avoid local file name conflict with installed prophet package
if ROOT_DIR in sys.path:
    sys.path.remove(ROOT_DIR)
from prophet import Prophet
sys.path.insert(0, ROOT_DIR)

warnings.filterwarnings('ignore')

if HAS_LSTM:
    class KerasPickleWrapper:
        def __init__(self, model=None):
            self.model = model

        def __getstate__(self):
            state = self.__dict__.copy()
            if self.model is not None:
                state['model_config'] = self.model.to_json()
                state['model_weights'] = self.model.get_weights()
                state.pop('model')
            return state

        def __setstate__(self, state):
            config = state.pop('model_config')
            weights = state.pop('model_weights')
            model = model_from_json(config)
            model.set_weights(weights)
            state['model'] = model
            self.__dict__.update(state)

        def predict(self, *args, **kwargs):
            return self.model.predict(*args, **kwargs)

        def summary(self):
            return self.model.summary()

    def train_lstm_model(df):
        daily = df.groupby('Date').agg({
            'Units Sold': 'sum',
            'Demand Forecast': 'sum',
            'Inventory Level': 'sum',
            'Units Ordered': 'sum',
            'Price': 'mean',
            'Discount': 'mean',
            'Competitor Pricing': 'mean',
            'Holiday/Promotion': 'sum'
        }).reset_index()

        daily['DayOfWeek'] = daily['Date'].dt.dayofweek
        daily['Month'] = daily['Date'].dt.month
        daily['Lag_1'] = daily['Units Sold'].shift(1)
        daily['Lag_7'] = daily['Units Sold'].shift(7)
        daily['Rolling_Mean_7'] = daily['Units Sold'].rolling(window=7).mean()
        daily.dropna(inplace=True)

        feature_names = [
            'Units Sold', 'Demand Forecast', 'Inventory Level', 'Units Ordered',
            'Price', 'Discount', 'Competitor Pricing', 'Holiday/Promotion',
            'DayOfWeek', 'Month', 'Lag_1', 'Lag_7', 'Rolling_Mean_7'
        ]

        scaler = MinMaxScaler()
        data_scaled = scaler.fit_transform(daily[feature_names])

        seq_length = 60
        X, y = [], []
        target_index = feature_names.index('Units Sold')
        for i in range(len(data_scaled) - seq_length):
            X.append(data_scaled[i:i+seq_length, :])
            y.append(data_scaled[i+seq_length, target_index])
        X = np.array(X)
        y = np.array(y)

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, shuffle=False)

        model = Sequential([
            LSTM(128, activation='tanh', return_sequences=True, input_shape=(seq_length, X.shape[2])),
            Dropout(0.2),
            LSTM(64, activation='tanh'),
            Dropout(0.2),
            Dense(32, activation='relu'),
            Dense(1)
        ])

        optimizer = Adam(learning_rate=0.001)
        model.compile(optimizer=optimizer, loss='mse')

        early_stopping = EarlyStopping(monitor='val_loss', patience=15, restore_best_weights=True)
        history = model.fit(
            X_train, y_train,
            epochs=120,
            batch_size=32,
            validation_split=0.1,
            callbacks=[early_stopping],
            verbose=1
        )

        lstm_predictions = model.predict(X_test)
        y_test_inv = np.zeros((len(y_test), data_scaled.shape[1]))
        y_pred_inv = np.zeros((len(y_test), data_scaled.shape[1]))
        y_test_inv[:, target_index] = y_test
        y_pred_inv[:, target_index] = lstm_predictions[:, 0]

        y_test_actual = scaler.inverse_transform(y_test_inv)[:, target_index]
        y_pred_actual = scaler.inverse_transform(y_pred_inv)[:, target_index]

        rmse = np.sqrt(mean_squared_error(y_test_actual, y_pred_actual))
        mae = mean_absolute_error(y_test_actual, y_pred_actual)

        print('LSTM training complete')
        print(f'LSTM RMSE: {rmse:.4f}')
        print(f'LSTM MAE: {mae:.4f}')

        wrapper = KerasPickleWrapper(model=model)
        joblib.dump(
            {
                'model': wrapper,
                'scaler': scaler,
                'seq_length': seq_length,
                'feature_names': feature_names
            },
            os.path.join(MODEL_DIR, 'lstm_model.pkl'),
            compress=3
        )

        return history
else:
    def train_lstm_model(df):
        print('Skipping LSTM training because TensorFlow/Keras is unavailable.')
        return None


def load_data():
    df = pd.read_csv(DATA_PATH)
    df['Date'] = pd.to_datetime(df['Date'])
    df.sort_values('Date', inplace=True)
    return df


def train_prophet_model(df):
    prophet_df = df.groupby('Date')['Units Sold'].sum().reset_index().rename(columns={'Date': 'ds', 'Units Sold': 'y'})
    model = Prophet(yearly_seasonality=True, weekly_seasonality=True, daily_seasonality=False)
    model.fit(prophet_df)

    joblib.dump(model, os.path.join(MODEL_DIR, 'prophet_model.pkl'), compress=3)

    future = model.make_future_dataframe(periods=30)
    forecast = model.predict(future)

    actual = prophet_df.set_index('ds')
    predicted = forecast.set_index('ds').loc[actual.index]['yhat']
    rmse = np.sqrt(mean_squared_error(actual['y'], predicted))
    mae = mean_absolute_error(actual['y'], predicted)

    print('Prophet training complete')
    print(f'Prophet RMSE: {rmse:.4f}')
    print(f'Prophet MAE: {mae:.4f}')

    return forecast


def train_arima_model(df):
    daily = df.groupby('Date')['Units Sold'].sum()
    train_size = int(len(daily) * 0.8)
    train, test = daily.iloc[:train_size], daily.iloc[train_size:]

    best_fit = None
    best_aic = np.inf
    candidate_orders = [(1, 1, 1), (2, 1, 2), (3, 1, 2), (5, 1, 0)]

    for order in candidate_orders:
        try:
            fit = ARIMA(train, order=order).fit()
            if fit.aic < best_aic:
                best_aic = fit.aic
                best_fit = fit
        except Exception:
            continue

    if best_fit is None:
        raise RuntimeError('ARIMA model fitting failed for all candidate orders.')

    forecast = best_fit.forecast(steps=len(test))
    rmse = np.sqrt(mean_squared_error(test, forecast))
    mae = mean_absolute_error(test, forecast)

    print('ARIMA training complete')
    print(f'ARIMA order: {best_fit.model_orders}')
    print(f'ARIMA RMSE: {rmse:.4f}')
    print(f'ARIMA MAE: {mae:.4f}')

    joblib.dump(best_fit, os.path.join(MODEL_DIR, 'arima_model.pkl'), compress=3)
    return forecast


def main():
    df = load_data()
    print('Loaded dataset rows:', len(df))
    train_lstm_model(df)
    train_prophet_model(df)
    train_arima_model(df)
    print('All models have been trained and saved to the models/ folder.')


if __name__ == '__main__':
    main()
