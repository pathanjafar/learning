import java.util.*;
import java.util.stream.*;

{{SOLUTION}}

public class Main {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        String line = sc.nextLine().replaceAll("[\\[\\]\\s]", "");
        int[] nums = line.isEmpty()
            ? new int[]{}
            : Arrays.stream(line.split(",")).mapToInt(Integer::parseInt).toArray();
        int k = Integer.parseInt(sc.nextLine().trim());
        int[] res = new Solution().rotate(nums, k);
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < res.length; i++) {
            if (i > 0) sb.append(", ");
            sb.append(res[i]);
        }
        sb.append("]");
        System.out.println(sb);
    }
}
