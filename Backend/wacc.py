def calculate_wacc(ticker, beta):

    import yfinance as yf

    stock = yf.Ticker(ticker)
    info = stock.info or {}

    # =========================
    # FUNDAMENTALS
    # =========================
    equity = info.get("marketCap") or 0
    debt = info.get("totalDebt") or 0
    cash = info.get("totalCash") or 0
    interest_expense = info.get("interestExpense") or 0

    tax_rate = info.get("effectiveTaxRate") or 0.21

    # =========================
    # CAPITAL STRUCTURE
    # =========================
    enterprise_value = equity + debt - cash
    total_value = equity + debt

    if total_value == 0:
        return {"error": "Invalid capital structure"}

    e_weight = equity / total_value
    d_weight = debt / total_value

    # =========================
    # COST OF EQUITY
    # =========================
    risk_free_rate = 0.0445
    market_risk_premium = 0.055

    cost_of_equity = risk_free_rate + beta * market_risk_premium

    # =========================
    # COST OF DEBT
    # =========================
    if debt > 0 and interest_expense:
        cost_of_debt = abs(interest_expense) / debt
    else:
        cost_of_debt = 0.04

    after_tax_debt = cost_of_debt * (1 - tax_rate)

    # =========================
    # WACC
    # =========================
    wacc = (e_weight * cost_of_equity) + (d_weight * after_tax_debt)

    return {
        "equity": equity,
        "debt": debt,
        "cash": cash,
        "enterprise_value": enterprise_value,

        "e_weight": e_weight,
        "d_weight": d_weight,

        "beta": beta,
        "cost_of_equity": cost_of_equity,

        "cost_of_debt": cost_of_debt,
        "after_tax_debt": after_tax_debt,
        "tax_rate": tax_rate,

        "wacc": wacc
    }