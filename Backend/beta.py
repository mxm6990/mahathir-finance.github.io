import yfinance as yf
import pandas as pd
import statsmodels.api as sm

def calculate_beta(ticker):

    stock_df = yf.download(ticker, period="1y", progress=False)
    market_df = yf.download("^GSPC", period="1y", progress=False)

    stock = stock_df["Close"]
    market = market_df["Close"]

    df = pd.concat([stock, market], axis=1)
    df.columns = ["stock", "market"]
    df = df.dropna()

    df["stock_ret"] = df["stock"].pct_change()
    df["market_ret"] = df["market"].pct_change()
    df = df.dropna()

    df = df.tail(200)

    X = sm.add_constant(df["market_ret"])
    Y = df["stock_ret"]

    model = sm.OLS(Y, X).fit()

    return {
        "beta": float(model.params["market_ret"]),
        "alpha": float(model.params["const"]),
        "r_squared": float(model.rsquared),
        "std_error": float(model.bse["market_ret"]),
        "observations": int(len(df)),

        # 🔥 ADD THESE (FOR FRONTEND CHART)
        "market_returns": df["market_ret"].tolist(),
        "stock_returns": df["stock_ret"].tolist()
    }