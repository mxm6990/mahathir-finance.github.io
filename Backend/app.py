from flask import Flask, request, jsonify
from flask_cors import CORS
import yfinance as yf

from fundamentals import get_fundamentals
from dcf import calculate_dcf
from beta import calculate_beta
from forecast import get_growth_rate
from full_model import build_full_model
from wacc import calculate_wacc
from comps import get_peer_multiples

import beta_extended

print("USING FILE:", beta_extended.__file__)

app = Flask(__name__)

CORS(
    app,
    resources={r"/*": {"origins": "*"}},
    allow_headers=["Content-Type"],
    methods=["GET", "POST", "OPTIONS"]
)

# =========================
# DCF
# =========================
@app.route("/dcf", methods=["POST"])
def dcf_api():
    data = request.get_json()

    result = calculate_dcf(
        data["fcf"],
        data["discount_rate"],
        data["terminal_growth"]
    )

    return jsonify(result)

# =========================
# BETA
# =========================
@app.route("/beta", methods=["POST"])
def beta_api():
    ticker = request.get_json()["ticker"]
    result = calculate_beta(ticker)
    return jsonify(result)

# =========================
# FORECAST
# =========================
@app.route("/forecast", methods=["POST"])
def forecast_api():
    ticker = request.get_json()["ticker"]
    growth = get_growth_rate(ticker)
    return jsonify({"growth": growth})

# =========================
# FULL MODEL
# =========================
@app.route("/full_model", methods=["POST", "OPTIONS"])
def full_model_api():

    if request.method == "OPTIONS":
        return jsonify({}), 200

    ticker = request.get_json()["ticker"]
    result = build_full_model(ticker)
    return jsonify(result)

# =========================
# PEER BETA
# =========================
@app.route("/peer_beta", methods=["POST"])
def peer_beta_api():
    data = request.get_json()
    tickers = data.get("tickers", [])

    result = beta_extended.peer_beta_dynamic(tickers)
    return jsonify(result)

# =========================
# WACC
# =========================
@app.route("/wacc", methods=["POST"])
def wacc_api():
    try:
        data = request.get_json()
        ticker = data.get("ticker")
        beta = data.get("beta")

        result = calculate_wacc(ticker, beta)
        return jsonify(result)

    except Exception as e:
        return jsonify({"error": str(e)}), 500

# =========================
# FUNDAMENTALS
# =========================
@app.route("/fundamentals", methods=["POST"])
def fundamentals_api():
    try:
        data = request.get_json()
        ticker = data.get("ticker")

        if not ticker:
            return jsonify({"error": "No ticker provided"}), 400

        result = get_fundamentals(ticker)
        return jsonify(result)

    except Exception as e:
        print("❌ FUNDAMENTALS ERROR:", e)
        return jsonify({"error": str(e)}), 500

# =========================
# COMPS
# =========================
@app.route("/comps", methods=["POST"])
def comps_api():
    data = request.get_json()
    tickers = data.get("tickers", [])
    return jsonify(get_peer_multiples(tickers))
# =========================
# 📈 PRICE HISTORY (FIXED WITH CORS)
# =========================
@app.route("/price_history", methods=["POST", "OPTIONS"])
def price_history_api():

    # 🔥 HANDLE PREFLIGHT (THIS FIXES YOUR ERROR)
    if request.method == "OPTIONS":
        return jsonify({}), 200

    try:
        data = request.get_json()
        ticker = data.get("ticker")

        if not ticker:
            return jsonify({"error": "No ticker provided"}), 400

        stock = yf.Ticker(ticker)
        hist = stock.history(period="6mo")

        if hist.empty:
            return jsonify({"error": "No data"}), 404

        dates = hist.index.strftime("%Y-%m-%d").tolist()
        prices = hist["Close"].tolist()

        return jsonify({
            "dates": dates,
            "prices": prices
        })

    except Exception as e:
        print("❌ PRICE HISTORY ERROR:", e)
        return jsonify({"error": str(e)}), 500

# =========================
# 🔥 STOCK PRICE (NEW FIX)
# =========================
@app.route("/price", methods=["POST"])
def price_api():
    try:
        data = request.get_json()
        ticker = data.get("ticker")

        if not ticker:
            return jsonify({"error": "No ticker provided"}), 400

        stock = yf.Ticker(ticker)
        hist = stock.history(period="1d")

        if hist.empty:
            return jsonify({"error": "No price data found"}), 404

        price = hist["Close"].iloc[-1]

        return jsonify({"price": float(price)})

    except Exception as e:
        print("❌ PRICE ERROR:", e)
        return jsonify({"error": str(e)}), 500

# =========================
# ROOT ROUTE (HEALTH CHECK)
# =========================
@app.route("/")
def home():
    return "API is running 🚀"


# =========================
# RUN SERVER
# =========================
if __name__ == "__main__":
    app.run(debug=True, port=5001)