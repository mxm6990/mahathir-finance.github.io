@app.route("/peer_beta", methods=["POST"])
def peer_beta_api():
    import beta_extended  # 👈 FORCE fresh import

    data = request.get_json()
    tickers = data.get("tickers", [])

    result = beta_extended.peer_beta_dynamic(tickers)

    return jsonify(result)