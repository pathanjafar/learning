{{SOLUTION}}

import sys, json
nums = json.loads(sys.stdin.readline())
print("true" if containsDuplicate(nums) else "false")
