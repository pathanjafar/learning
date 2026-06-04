"""Thin async Judge0 client: batch-submit and poll. The browser never reaches this."""
import asyncio
import base64
import os
from typing import Any

import httpx

JUDGE0_URL = os.environ.get("JUDGE0_URL", "http://localhost:2358")

# Judge0 1.13.1 language ids
LANGUAGE_IDS: dict[str, int] = {
    "python": 71,      # Python 3.8.1
    "java": 62,        # OpenJDK 13.0.1
    "javascript": 63,  # Node.js 12.14.0
    "typescript": 74,  # TypeScript 3.7.4
}

# Per-submission sandbox limits (overridable via env; the grader always sets these explicitly
# so we never rely on the Judge0 server defaults).
LIMITS = {
    "cpu_time_limit": float(os.environ.get("EXEC_CPU_TIME_LIMIT", "5")),
    "wall_time_limit": float(os.environ.get("EXEC_WALL_TIME_LIMIT", "10")),
    "memory_limit": int(os.environ.get("EXEC_MEMORY_LIMIT_KB", "128000")),
    "max_processes_and_or_threads": int(os.environ.get("EXEC_MAX_PROCESSES", "60")),
    "enable_network": False,
}


def _b64(s: str) -> str:
    return base64.b64encode(s.encode()).decode()


def _unb64(s: str | None) -> str:
    return base64.b64decode(s).decode("utf-8", "replace") if s else ""


async def run_batch(source: str, language: str, stdins: list[str]) -> list[dict[str, Any]]:
    """Submit one job per test-case stdin and return Judge0 results in order."""
    language_id = LANGUAGE_IDS[language]
    submissions = [
        {
            "source_code": _b64(source),
            "language_id": language_id,
            "stdin": _b64(stdin),
            **LIMITS,
        }
        for stdin in stdins
    ]

    async with httpx.AsyncClient(base_url=JUDGE0_URL, timeout=60) as client:
        resp = await client.post(
            "/submissions/batch", params={"base64_encoded": "true"}, json={"submissions": submissions}
        )
        resp.raise_for_status()
        tokens = [row["token"] for row in resp.json()]

        # Poll until every job leaves the In Queue (1) / Processing (2) states.
        fields = "stdout,stderr,compile_output,message,status_id,time,memory,token"
        for _ in range(60):
            r = await client.get(
                "/submissions/batch",
                params={"tokens": ",".join(tokens), "base64_encoded": "true", "fields": fields},
            )
            r.raise_for_status()
            results = r.json()["submissions"]
            if all(res["status_id"] not in (1, 2) for res in results):
                break
            await asyncio.sleep(0.4)

    # Normalize: decode base64 text fields, keep ordering aligned to stdins.
    by_token = {res["token"]: res for res in results}
    normalized = []
    for tok in tokens:
        res = by_token[tok]
        normalized.append(
            {
                "status_id": res["status_id"],
                "stdout": _unb64(res.get("stdout")),
                "stderr": _unb64(res.get("stderr")),
                "compile_output": _unb64(res.get("compile_output")),
                "message": _unb64(res.get("message")),
                "time_ms": int(float(res["time"]) * 1000) if res.get("time") else None,
                "memory_kb": res.get("memory"),
            }
        )
    return normalized
