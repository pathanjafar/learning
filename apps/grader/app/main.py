"""Grader microservice.

Receives a submission + its test cases + (for FUNCTION problems) the per-language driver, wraps
the user's code, batches everything to Judge0, compares outputs, and returns a verdict. Hidden
test cases never leak their input/expected back to the caller.

Verdict precedence: CE > RE > TLE > MLE > WA > AC.
"""
from __future__ import annotations

import os
from typing import Literal

from fastapi import FastAPI
from pydantic import BaseModel

from .judge0 import run_batch
from .compare import compare

app = FastAPI(title="Reborn Grader")

MAX_OUTPUT_BYTES = int(os.environ.get("EXEC_MAX_OUTPUT_KB", "256")) * 1024

# Judge0 status_id -> our short verdict code.
#   3 Accepted | 5 TLE | 6 Compilation Error | 7-12 runtime errors | 13/14 internal
def _verdict_for(status_id: int) -> str:
    if status_id == 3:
        return "OK"          # ran cleanly; correctness decided by output compare
    if status_id == 5:
        return "TLE"
    if status_id == 6:
        return "CE"
    if status_id in (7, 8, 9, 10, 11, 12):
        return "RE"
    return "RE"              # 13/14 and anything unexpected


class TestCaseIn(BaseModel):
    input: str
    expected: str
    isHidden: bool = False
    compareMode: str = "TRIMMED"
    weight: int = 1


class GradeRequest(BaseModel):
    language: str
    code: str
    ioMode: Literal["STDIO", "FUNCTION"] = "FUNCTION"
    driver: str | None = None          # required when ioMode == FUNCTION
    testCases: list[TestCaseIn]


class CaseResult(BaseModel):
    index: int
    isHidden: bool
    status: str                        # AC | WA | TLE | RE | CE
    timeMs: int | None = None
    memoryKb: int | None = None
    # Only populated for NON-hidden cases:
    input: str | None = None
    expected: str | None = None
    actual: str | None = None
    stderr: str | None = None


class GradeResponse(BaseModel):
    verdict: str                       # AC | WA | TLE | MLE | RE | CE
    passed: int
    total: int
    score: float                       # weighted 0..1
    maxTimeMs: int | None = None
    maxMemoryKb: int | None = None
    compileOutput: str | None = None
    results: list[CaseResult]


def _wrap(req: GradeRequest) -> str:
    if req.ioMode == "FUNCTION":
        if not req.driver:
            raise ValueError("FUNCTION problems require a driver")
        return req.driver.replace("{{SOLUTION}}", req.code)
    return req.code  # STDIO: user program runs as-is


@app.get("/health")
async def health():
    return {"ok": True}


@app.post("/grade", response_model=GradeResponse)
async def grade(req: GradeRequest) -> GradeResponse:
    source = _wrap(req)
    stdins = [tc.input for tc in req.testCases]
    runs = await run_batch(source, req.language, stdins)

    results: list[CaseResult] = []
    passed = 0
    earned = 0
    total_weight = sum(tc.weight for tc in req.testCases) or 1
    max_time = 0
    max_mem = 0
    compile_output: str | None = None
    worst = "AC"
    precedence = {"AC": 0, "WA": 1, "MLE": 2, "TLE": 3, "RE": 4, "CE": 5}

    for i, (tc, run) in enumerate(zip(req.testCases, runs)):
        base = _verdict_for(run["status_id"])
        if base == "CE":
            compile_output = run["compile_output"] or run["message"]
            status = "CE"
        elif base == "OK":
            out = run["stdout"]
            if len(out.encode()) > MAX_OUTPUT_BYTES:
                status = "RE"  # output flood
            else:
                status = "AC" if compare(out, tc.expected, tc.compareMode) else "WA"
        else:
            status = base  # TLE / RE

        if status == "AC":
            passed += 1
            earned += tc.weight

        if run["time_ms"]:
            max_time = max(max_time, run["time_ms"])
        if run["memory_kb"]:
            max_mem = max(max_mem, run["memory_kb"])
        if precedence[status] > precedence[worst]:
            worst = status

        cr = CaseResult(index=i, isHidden=tc.isHidden, status=status, timeMs=run["time_ms"], memoryKb=run["memory_kb"])
        if not tc.isHidden:
            cr.input = tc.input
            cr.expected = tc.expected
            cr.actual = run["stdout"]
            cr.stderr = run["stderr"] or None
        results.append(cr)

        # A compile error fails the whole submission identically across cases; stop early.
        if status == "CE":
            worst = "CE"
            break

    verdict = "AC" if passed == len(req.testCases) and worst == "AC" else worst
    return GradeResponse(
        verdict=verdict,
        passed=passed,
        total=len(req.testCases),
        score=round(earned / total_weight, 4),
        maxTimeMs=max_time or None,
        maxMemoryKb=max_mem or None,
        compileOutput=compile_output,
        results=results,
    )
