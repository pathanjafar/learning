class Solution {
    public int trap(int[] height) {
        if (height.length == 0) return 0;
        int l = 0, r = height.length - 1;
        int lmax = height[l], rmax = height[r], water = 0;
        while (l < r) {
            if (lmax < rmax) {
                l++;
                lmax = Math.max(lmax, height[l]);
                water += lmax - height[l];
            } else {
                r--;
                rmax = Math.max(rmax, height[r]);
                water += rmax - height[r];
            }
        }
        return water;
    }
}
