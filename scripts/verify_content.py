#!/usr/bin/env python3
"""Offline content verifier for stored reference solutions.

For every problem under content/topics, wrap the reference solution in its driver, run it against
every test case (in each supported language), and confirm the output matches `expected`. Catches
I/O-format and solution bugs before anything is seeded or deployed.

Usage:  python scripts/verify_content.py
Exit code is non-zero if any case fails (so it can gate CI).
"""
import json
import os
import subprocess
import sys
import tempfile
from pathlib import Path

# Windows consoles default to cp1252 and choke on ✓/✗. Force UTF-8 stdout.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = Path(__file__).resolve().parents[1]
PROBLEMS_GLOB = "content/topics/**/problems/*/"

EXT = {"python": "py", "java": "java"}


def norm_lines(s: str):
    return [ln.rstrip() for ln in s.replace("\r\n", "\n").strip("\n").split("\n")]


def compare(actual: str, expected: str, mode: str) -> bool:
    mode = (mode or "TRIMMED").upper()
    if mode == "EXACT":
        return actual == expected
    if mode == "UNORDERED":
        return sorted(norm_lines(actual)) == sorted(norm_lines(expected))
    if mode == "FLOAT":
        a, e = actual.split(), expected.split()
        return len(a) == len(e) and all(abs(float(x) - float(y)) <= 1e-6 for x, y in zip(a, e))
    return norm_lines(actual) == norm_lines(expected)  # TRIMMED default


def run_python(source: str, stdin: str) -> str:
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / "main.py"
        f.write_text(source)
        p = subprocess.run([sys.executable, str(f)], input=stdin, capture_output=True, text=True, timeout=15)
        if p.returncode != 0:
            return f"__RUNTIME_ERROR__\n{p.stderr}"
        return p.stdout


def run_java(source: str, stdin: str) -> str:
    with tempfile.TemporaryDirectory() as d:
        f = Path(d) / "Main.java"
        f.write_text(source)
        c = subprocess.run(["javac", str(f)], capture_output=True, text=True, timeout=60, cwd=d)
        if c.returncode != 0:
            return f"__COMPILE_ERROR__\n{c.stderr}"
        p = subprocess.run(["java", "-cp", d, "Main"], input=stdin, capture_output=True, text=True, timeout=15)
        if p.returncode != 0:
            return f"__RUNTIME_ERROR__\n{p.stderr}"
        return p.stdout


RUNNERS = {"python": run_python, "java": run_java}


def verify_problem(pdir: Path) -> bool:
    slug = pdir.name
    tests = json.loads((pdir / "tests.json").read_text())
    has_drivers = (pdir / "drivers").is_dir()
    ok_all = True

    for lang, ext in EXT.items():
        sol = pdir / "solution" / f"{lang}.{ext}"
        if not sol.exists():
            continue
        solution = sol.read_text()
        if has_drivers:
            driver = (pdir / "drivers" / f"{lang}.{ext}").read_text()
            source = driver.replace("{{SOLUTION}}", solution)
        else:
            source = solution  # STDIO

        for i, t in enumerate(tests):
            try:
                out = RUNNERS[lang](source, str(t["input"]))
            except subprocess.TimeoutExpired:
                out = "__TIMEOUT__"
            passed = compare(out, str(t["expected"]), t.get("compareMode", "TRIMMED"))
            if not passed:
                ok_all = False
                print(f"  ✗ {slug} [{lang}] test {i + 1}: expected {t['expected']!r}, got {out[:80]!r}")
    if ok_all:
        langs = [l for l in EXT if (pdir / "solution" / f"{l}.{EXT[l]}").exists()]
        print(f"  ✓ {slug} ({', '.join(langs)}) — {len(tests)} tests each")
    return ok_all


def main():
    problem_dirs = sorted(
        p.parent for p in ROOT.glob("content/topics/**/problems/*/problem.yaml")
    )
    if not problem_dirs:
        print("No problems found.")
        return 0
    print(f"Verifying {len(problem_dirs)} problems...\n")
    all_ok = True
    for pdir in problem_dirs:
        if not verify_problem(pdir):
            all_ok = False
    print("\n" + ("ALL PASSED ✓" if all_ok else "FAILURES ✗"))
    return 0 if all_ok else 1


if __name__ == "__main__":
    sys.exit(main())
