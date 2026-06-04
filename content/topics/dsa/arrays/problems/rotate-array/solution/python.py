def rotate(nums, k):
    n = len(nums)
    if n == 0:
        return nums
    k %= n
    return nums[n - k:] + nums[:n - k]
