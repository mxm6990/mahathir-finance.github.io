import yfinance as yf
import numpy as np

def get_growth_rate(ticker):

    stock = yf.Ticker(ticker)

    try:
        financials = stock.financials
    except:
        return {"error": "No financial data"}

    if financials is None or financials.empty:
        return {"error": "Financials unavailable"}

    try:
        revenue = financials.loc["Total Revenue"]
    except:
        return {"error": "Revenue not found"}

    revenue = revenue.dropna().values[::-1]  # oldest → newest

    if len(revenue) < 3:
        return {"error": "Not enough history"}

    growth_rates = []

    for i in range(1, len(revenue)):
        g = (revenue[i] / revenue[i-1]) - 1
        growth_rates.append(g)

    avg_growth = np.mean(growth_rates)
    std_dev = np.std(growth_rates)

    upper = avg_growth + std_dev
    lower = avg_growth - std_dev

    return {
        "growth": float(avg_growth),
        "growth_rates": [float(g) for g in growth_rates],
        "avg_growth": float(avg_growth),
        "std_dev": float(std_dev),
        "upper": float(upper),
        "lower": float(lower),
        "years": len(growth_rates)
    }