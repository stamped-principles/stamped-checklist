#!/usr/bin/env python3
"""
Cross-schema referential integrity check for STAMPED.

Verifies that:
  1. Checklist.principles_version == PrincipleSet.version
  2. Every principle_code referenced in the checklist exists
     in the principles instance.
  3. Every principle_code matches the canonical pattern.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

PRINCIPLES_FILE = Path("stamped-principles.json")
CHECKLIST_FILE = Path("stamped-checklist.json")
CODE_PATTERN = re.compile(r"^[A-Z]\.[1-9][0-9]*$")


def fail(msg: str) -> None:
    print(f"::error::{msg}", file=sys.stderr)


def main() -> int:
    errors: list[str] = []

    principles = json.loads(PRINCIPLES_FILE.read_text())
    checklist = json.loads(CHECKLIST_FILE.read_text())

    # 1. Version alignment
    p_ver = principles.get("version")
    c_ver = checklist.get("principles_version")
    if p_ver != c_ver:
        errors.append(
            f"Version mismatch: principles={p_ver!r} "
            f"but checklist.principles_version={c_ver!r}"
        )

    # 2 & 3. Referential integrity + pattern
    valid_codes = {p["code"] for p in principles.get("principles", [])}

    for bad in (c for c in valid_codes if not CODE_PATTERN.match(c)):
        errors.append(f"Malformed principle code in principles set: {bad!r}")

    for group in checklist.get("data", []):
        level = group.get("level", "?")
        for entry in group.get("entries", []):
            codes = entry.get("principle_codes", [])
            for code in codes:
                if not CODE_PATTERN.match(code):
                    errors.append(
                        f"Malformed code {code!r} in level={level} entry"
                    )
                elif code not in valid_codes:
                    errors.append(
                        f"Unknown principle code {code!r} "
                        f"referenced in level={level} entry "
                        f"(not defined in {PRINCIPLES_FILE.name})"
                    )

    if errors:
        for e in errors:
            fail(e)
        print(f"\n{len(errors)} consistency error(s) found.", file=sys.stderr)
        return 1

    print("✓ Principles and checklist are consistent.")
    print(f"  principles version:     {p_ver}")
    print(f"  checklist references:   {c_ver}")
    print(f"  principle codes valid:  {len(valid_codes)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
