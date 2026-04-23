import pandas as pd
from prophet import Prophet
from sklearn.metrics import mean_squared_error, mean_absolute_error
import numpy as np
import matplotlib.pyplot as plt

# Загрузка данных
df = pd.read_csv('/kaggle/input/retail-store-inventory-forecasting-dataset/retail_store_inventory.csv')

# Предобработка: группировка по дате и суммирование продаж
df['Date'] = pd.to_datetime(df['Date'])
daily_sales = df.groupby('Date')['Units Sold'].sum().reset_index()

# Prophet требует колонки 'ds' (дата) и 'y' (значение)
daily_sales.rename(columns={'Date': 'ds', 'Units Sold': 'y'}, inplace=True)

# Инициализация модели Prophet
model = Prophet()

# Обучение модели
model.fit(daily_sales)

# Создание датафрейма для прогноза (например, на 30 дней вперёд)
future = model.make_future_dataframe(periods=30)
forecast = model.predict(future)

plt.figure(figsize=(12, 6))

# Истинные значения (только на историческом периоде)
plt.plot(daily_sales['ds'], daily_sales['y'], label='Actual', color='red')

# Прогноз модели (и исторический период, и будущие 30 дней)
plt.plot(forecast['ds'], forecast['yhat'], label='Forecast', color='blue')

plt.fill_between(forecast['ds'], forecast['yhat_lower'], forecast['yhat_upper'], 
                 color='blue', alpha=0.2, label='Confidence Interval')

plt.title('Actual vs Forecasted Sales')
plt.xlabel('Date')
plt.ylabel('Units Sold')
plt.legend()
plt.grid(True)
plt.show()

# Оценка качества модели (используем последние 30 дней как тест)
actual = daily_sales.set_index('ds').iloc[-30:]
predicted = forecast.set_index('ds').loc[actual.index]['yhat']

rmse = np.sqrt(mean_squared_error(actual['y'], predicted))
mae = mean_absolute_error(actual['y'], predicted)

print("Prophet RMSE:", rmse)
print("Prophet MAE:", mae)