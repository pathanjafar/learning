class Solution {
    public int[] moveZeroes(int[] nums) {
        int pos = 0;
        for (int i = 0; i < nums.length; i++) {
            if (nums[i] != 0) {
                int t = nums[pos];
                nums[pos] = nums[i];
                nums[i] = t;
                pos++;
            }
        }
        return nums;
    }
}
