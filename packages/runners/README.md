# Runner harness templates

The offline content verifier executes whole programs over stdin/stdout. DSA problems are usually
**function-signature** ("implement `twoSum`"), so each `FUNCTION`-mode problem ships a thin
**driver** per language that: parses stdin → calls the user's solution → prints a canonical
result to stdout.

These files are **copy-to-author templates**. Each contains a `{{SOLUTION}}` placeholder; the
offline verifier replaces it with the stored reference solution. A real problem keeps
its own filled-in drivers under `content/.../problems/<slug>/drivers/<lang>.<ext>` (see the
`two-sum` sample).

For `STDIO`-mode problems there is no driver — the user's program is sent as-is and the test
case `input` is piped to its stdin.

## Output canonicalization

To keep one `expected` value valid across Python and Java, drivers must print results in an
identical textual form (e.g. `[0, 1]` with a space after the comma). When that's impractical,
set the test case's `compareMode` to `UNORDERED` or `FLOAT` instead of `EXACT`/`TRIMMED`.
