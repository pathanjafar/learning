def trap(height):
    if not height:
        return 0
    l, r = 0, len(height) - 1
    lmax, rmax = height[l], height[r]
    water = 0
    while l < r:
        if lmax < rmax:
            l += 1
            lmax = max(lmax, height[l])
            water += lmax - height[l]
        else:
            r -= 1
            rmax = max(rmax, height[r])
            water += rmax - height[r]
    return water
