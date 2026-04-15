import yfinance as yf
import numpy as np
import math

# -------------------------
# CLEAN FUNCTION (fix NaN)
# -------------------------
def clean_number(x):
    if x is None or (isinstance(x, float) and (math.isnan(x) or math.isinf(x))):
        return 0
    return float(x)

# -------------------------
# FULL MODEL
# -------------------------
def build_full_model(ticker):
    try:
        stock = yf.Ticker(ticker)
        income = stock.financials

        # -------------------------
        # GET REVENUE (CLEANED)
        # -------------------------
        revenue_series = income.loc["Total Revenue"]

        # Remove NaN values
        revenue_series = revenue_series.dropna()

        # Take last 5 years
        revenue = revenue_series.values[-5:]

        # Convert to millions + reverse order (old → new)
        revenue = (revenue[::-1] / 1e6).tolist()

        # -------------------------
        # GROWTH CALCULATION
        # -------------------------
        growth = []

        for i in range(1, len(revenue)):
            if revenue[i-1] != 0:
                g = (revenue[i] / revenue[i-1]) - 1
                growth.append(g)

        # Remove bad values
        growth = [g for g in growth if not np.isnan(g)]

        # -------------------------
        # STATS
        # -------------------------
        if len(growth) > 0:
            avg_growth = float(np.mean(growth))
            std_growth = float(np.std(growth))
        else:
            avg_growth = 0
            std_growth = 0

        upper = avg_growth + std_growth 
        lower = avg_growth - std_growth 

        # -------------------------
        # FORECAST
        # -------------------------
        forecast_years = 5
        forecast_revenue = []

        current = revenue[-1] if revenue[-1] != 0 else 1

        for _ in range(forecast_years):
            current *= (1 + avg_growth)
            forecast_revenue.append(current)

        # -------------------------
        # RETURN CLEAN JSON
        # -------------------------
        return {
            "last_revenue": clean_number(revenue[-1]),
            "historical_revenue": [clean_number(x) for x in revenue],
            "growth_rates": [clean_number(x) for x in growth],
            "avg_growth": clean_number(avg_growth),
            "std_dev": clean_number(std_growth),
            "upper": clean_number(upper),
            "lower": clean_number(lower),
            "forecast_revenue": [clean_number(x) for x in forecast_revenue]
        }

    except Exception as e:
        return {"error": str(e)}