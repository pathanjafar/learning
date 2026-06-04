def maxProfit(prices):
    min_price = float("inf")
    profit = 0
    for p in prices:
        if p < min_price:
            min_price = p
        elif p - min_price > profit:
            profit = p - min_price
    return profit
