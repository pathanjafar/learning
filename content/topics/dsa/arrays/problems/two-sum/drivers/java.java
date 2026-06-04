import java.util.*;
import java.util.stream.*;

{{SOLUTION}}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line1 = sc.nextLine().replaceAll("[\\[\\]\\s]", "");
        int[] nums = line1.isEmpty()
            ? new int[]{}
            : Arrays.stream(line1.split(",")).mapToInt(Integer::parseInt).toArray();
        int target = Integer.parseInt(sc.nextLine().trim());
        int[] res = new Solution().twoSum(nums, target);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < res.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(res[i]);
        }
        sb.append("]");
        System.out.println(sb);
    }
}
