import java.util.*;

{{SOLUTION}}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.nextLine().replaceAll("[\\[\\]\\s]", "");
        int[] nums = line.isEmpty()
            ? new int[]{}
            : Arrays.stream(line.split(",")).mapToInt(Integer::parseInt).toArray();
        System.out.println(new Solution().containsDuplicate(nums) ? "true" : "false");
    }
}
