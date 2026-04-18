import pandas as pd
import numpy as np
from sklearn.preprocessing import MinMaxScaler
from sklearn.model_selection import train_test_split
from tensorflow.keras.models import Sequential
from tensorflow.keras.layers import LSTM, Dense, Dropout
from tensorflow.keras.optimizers import Adam
from tensorflow.keras.callbacks import EarlyStopping
from sklearn.metrics import mean_squared_error, mean_absolute_error
import matplotlib.pyplot as plt

# Load and preprocess data
df = pd.read_csv('/kaggle/input/retail-store-inventory-forecasting-dataset/retail_store_inventory.csv')
df['Date'] = pd.to_datetime(df['Date'])
df = df.sort_values('Date')

# Group by Date and include both 'Units Sold' and 'Demand Forecast'
daily_data = df.groupby('Date')[['Units Sold', 'Demand Forecast']].sum().reset_index()
daily_data.set_index('Date', inplace=True)

# Feature engineering: add day of week, month, and lag features
daily_data['DayOfWeek'] = daily_data.index.dayofweek
daily_data['Month'] = daily_data.index.month
daily_data['Lag_1'] = daily_data['Units Sold'].shift(1)
daily_data['Lag_7'] = daily_data['Units Sold'].shift(7)
daily_data['Rolling_Mean_7'] = daily_data['Units Sold'].rolling(window=7).mean()

# Drop NaNs introduced by lag features
daily_data.dropna(inplace=True)

# Normalize the data
scaler = MinMaxScaler()
data_scaled = scaler.fit_transform(daily_data)

# Create sequences with multiple features
def create_sequences(data, seq_length):
    X, y = [], []
    for i in range(len(data) - seq_length):
        X.append(data[i:(i + seq_length), :])
        y.append(data[i + seq_length, 1])  # Target is now 'Demand Forecast'
    return np.array(X), np.array(y)

seq_length = 90  # Increased sequence length for better context
X, y = create_sequences(data_scaled, seq_length)

# Split the data into training and testing sets
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Build the LSTM model
model = Sequential([
    LSTM(150, activation='relu', return_sequences=True, input_shape=(seq_length, X.shape[2])),
    Dropout(0.1),
    LSTM(150, activation='relu'),
    Dropout(0.1),
    Dense(100, activation='relu'),
    Dense(1)  # Output layer for predicting 'Demand Forecast'
])

# Compile the model with a custom learning rate
optimizer = Adam(learning_rate=0.0005)
model.compile(optimizer=optimizer, loss='mse')

# Early stopping to prevent overfitting
early_stopping = EarlyStopping(monitor='val_loss', patience=20, restore_best_weights=True)

# Train the model
history = model.fit(
    X_train, y_train,
    epochs=300,
    batch_size=64,
    validation_split=0.1,
    callbacks=[early_stopping],
    verbose=1
)

# Make predictions on the test set
lstm_predictions = model.predict(X_test)

# Inverse transform the predictions and actual values correctly
lstm_predictions_full = np.column_stack((np.zeros((lstm_predictions.shape[0], data_scaled.shape[1] - 1)), lstm_predictions))
y_test_full = np.column_stack((np.zeros((y_test.shape[0], data_scaled.shape[1] - 1)), y_test.reshape(-1, 1)))

lstm_predictions_inverse = scaler.inverse_transform(lstm_predictions_full)[:, -1]
y_test_actual_inverse = scaler.inverse_transform(y_test_full)[:, -1]

# Calculate RMSE and MAE for LSTM predictions
lstm_rmse = np.sqrt(mean_squared_error(y_test_actual_inverse, lstm_predictions_inverse))
lstm_mae = mean_absolute_error(y_test_actual_inverse, lstm_predictions_inverse)

print("LSTM RMSE:", lstm_rmse)
print("LSTM MAE:", lstm_mae)

# Plot the results
plt.figure(figsize=(12, 6))
plt.plot(y_test_actual_inverse, label='Actual Demand Forecast')
plt.plot(lstm_predictions_inverse, label='LSTM Predictions')
plt.title('Actual vs Predicted Demand Forecast')
plt.xlabel('Time')
plt.ylabel('Demand Forecast')
plt.legend()
plt.show()

# Plot the training history to visualize loss over epochs
plt.figure(figsize=(12, 6))
plt.plot(history.history['loss'], label='Training Loss')
plt.plot(history.history['val_loss'], label='Validation Loss')
plt.title('Model Loss')
plt.xlabel('Epoch')
plt.ylabel('Loss')
plt.legend()
plt.show()