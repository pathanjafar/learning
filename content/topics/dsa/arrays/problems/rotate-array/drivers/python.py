{{SOLUTION}}

import sys, json
_lines = sys.stdin.read().splitlines()
nums = json.loads(_lines[0])
k = int(_lines[1])
print(json.dumps(rotate(nums, k)))
