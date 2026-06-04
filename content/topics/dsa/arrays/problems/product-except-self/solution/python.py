def productExceptSelf(nums):
    n = len(nums)
    res = [1] * n
    pre = 1
    for i in range(n):
        res[i] = pre
        pre *= nums[i]
    post = 1
    for i in range(n - 1, -1, -1):
        res[i] *= post
        post *= nums[i]
    return res
