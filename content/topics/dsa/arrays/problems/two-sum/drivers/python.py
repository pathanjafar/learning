{{SOLUTION}}

import sys, json
_lines = sys.stdin.read().splitlines()
nums = json.loads(_lines[0])
target = int(_lines[1])
print(json.dumps(twoSum(nums, target)))
