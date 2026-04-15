import requests

url = "http://127.0.0.1:5000/dcf"

data = {
    "fcf": [100, 110, 120, 130, 140],
    "discount_rate": 0.1,
    "terminal_growth": 0.03
}

response = requests.post(url, json=data)

print(response.json())