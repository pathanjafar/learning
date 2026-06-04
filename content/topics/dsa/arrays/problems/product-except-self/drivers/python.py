{{SOLUTION}}

import sys, json
nums = json.loads(sys.stdin.readline())
print(json.dumps(productExceptSelf(nums)))
