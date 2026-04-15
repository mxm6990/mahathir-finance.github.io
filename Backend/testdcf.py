from dcf import calculate_dcf

fcf_list = [100, 110, 120, 130, 140]
discount_rate = 0.10
terminal_growth = 0.03

result = calculate_dcf(fcf_list, discount_rate, terminal_growth)

print(result)