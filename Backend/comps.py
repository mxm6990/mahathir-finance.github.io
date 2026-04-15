import yfinance as yf
import numpy as np

def get_peer_multiples(tickers):

    multiples = []
    details = []

    for t in tickers:
        try:
            stock = yf.Ticker(t)
            info = stock.info or {}

            ev = info.get("enterpriseValue")
            ebitda = info.get("ebitda")

            if ev and ebitda and ebitda > 0:
                multiple = ev / ebitda
                multiples.append(multiple)

                details.append({
                    "ticker": t,
                    "multiple": multiple
                })

        except:
            continue

    if len(multiples) == 0:
        return {"error": "No valid peer data"}

    avg = float(np.mean(multiples))

    return {
        "peer_multiples": details,
        "average_multiple": avg
    }