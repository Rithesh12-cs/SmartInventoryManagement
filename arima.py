from statsmodels.tsa.arima.model import ARIMA
from statsmodels.tsa.stattools import adfuller
from sklearn.metrics import mean_squared_error
from math import sqrt
import matplotlib.pyplot as plt
import pandas as pd
df= pd.read_csv('data\retail_store_inventory.csv')
df['Date'] = pd.to_datetime(df['Date'])
df.set_index('Date', inplace=True)

daily_demand = df.resample('D')['Units Sold'].sum()
daily_demand

def adf_test(series):
    result = adfuller(series)
    print(f"ADF Statistic: {result[0]}")
    print(f"p-value: {result[1]}")

adf_test(daily_demand)

train_size = int(len(daily_demand) * 0.8)
train, test = daily_demand[:train_size], daily_demand[train_size:]

model = ARIMA(train, order=(1, 1, 1))
model_fit = model.fit()

forecast = model_fit.forecast(steps=len(test))

rmse = sqrt(mean_squared_error(test, forecast))
print(f"RMSE: {rmse}")

                              # Plot actual vs forecasted values
plt.figure(figsize=(12, 6))
plt.plot(test.index, test, label='Actual')
plt.plot(test.index, forecast, label='Forecasted', color='red')
plt.title('ARIMA Model - Daily Demand Forecasting')
plt.xlabel('Date')
plt.ylabel('Units Sold')
plt.legend()
plt.show()