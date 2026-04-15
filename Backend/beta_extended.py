def peer_beta_dynamic(tickers):
    import yfinance as yf
    import numpy as np

    peers = []

    for t in tickers:
        try:
            t = t.strip().upper()

            stock = yf.Ticker(t)
            info = stock.info or {}

            beta = info.get("beta") or 1
            debt = info.get("totalDebt") or 0

            # 🔥 robust equity
            equity = (
                stock.fast_info.get("market_cap")
                or info.get("marketCap")
                or 1e9
            )

            asset_beta = beta / (1 + (debt / equity))

            peers.append({
                "ticker": t,
                "equity_beta": float(beta),
                "debt": float(debt) / 1e6,
                "equity": float(equity) / 1e6,
                "asset_beta": float(asset_beta)
            })

        except Exception as e:
            print(f"[ERROR] {t}: {e}")

    if not peers:
        return {"error": "No valid peer data"}

    avg_beta = np.mean([p["equity_beta"] for p in peers])
    avg_asset_beta = np.mean([p["asset_beta"] for p in peers])

    return {
        "peers": peers,
        "avg_beta": float(avg_beta),
        "avg_asset_beta": float(avg_asset_beta)
    }