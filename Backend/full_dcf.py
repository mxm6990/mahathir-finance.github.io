import yfinance as yf

def get_fundamentals(ticker):
    stock = yf.Ticker(ticker)
    info = stock.info

    return {
        "ebitda": info.get("ebitda"),
        "revenue": info.get("totalRevenue"),
        "shares": info.get("sharesOutstanding"),
        "enterprise_value": info.get("enterpriseValue"),
        "market_cap": info.get("marketCap"),
        "debt": info.get("totalDebt"),
        "cash": info.get("totalCash"),
    }