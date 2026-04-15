@app.route("/price_history", methods=["POST", "OPTIONS"])
def price_history_api():

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