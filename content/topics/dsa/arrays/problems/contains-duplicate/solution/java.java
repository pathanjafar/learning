class Solution {
    public boolean containsDuplicate(int[] nums) {
        java.util.Set<Integer> seen = new java.util.HashSet<>();
        for (int n : nums) if (!seen.add(n)) return true;
        return false;
    }
}
