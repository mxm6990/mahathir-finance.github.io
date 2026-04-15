def calculate_dcf(fcf_list, discount_rate, terminal_growth):
    dcf_value = 0

    for t, fcf in enumerate(fcf_list, start=1):
        dcf_value += fcf / ((1 + discount_rate) ** t)

    terminal_value = (fcf_list[-1] * (1 + terminal_growth)) / (discount_rate - terminal_growth)
    discounted_tv = terminal_value / ((1 + discount_rate) ** len(fcf_list))

    total_value = dcf_value + discounted_tv

    return {
        "dcf_value": dcf_value,
        "terminal_value": terminal_value,
        "discounted_terminal": discounted_tv,
        "enterprise_value": total_value
    }