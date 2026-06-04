"""Output comparison strategies, selected per test case via `compareMode`."""
from __future__ import annotations


def _norm_lines(s: str) -> list[str]:
    return [ln.rstrip() for ln in s.replace("\r\n", "\n").strip("\n").split("\n")]


def compare(actual: str, expected: str, mode: str) -> bool:
    mode = (mode or "TRIMMED").upper()

    if mode == "EXACT":
        return actual == expected

    if mode == "TRIMMED":
        return _norm_lines(actual) == _norm_lines(expected)

    if mode == "UNORDERED":
        return sorted(_norm_lines(actual)) == sorted(_norm_lines(expected))

    if mode == "FLOAT":
        a, e = actual.split(), expected.split()
        if len(a) != len(e):
            return False
        try:
            return all(abs(float(x) - float(y)) <= 1e-6 for x, y in zip(a, e))
        except ValueError:
            return False

    # Unknown mode -> safest default.
    return _norm_lines(actual) == _norm_lines(expected)
