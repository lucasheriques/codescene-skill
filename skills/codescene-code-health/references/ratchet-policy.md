# Ratchet Policy

Use this when turning CodeScene output into an action plan or repository gate.

## Default Policy

- New scorable files should target `10.0` and should not land below `9.5` without an explicit reason.
- Touched files that are already healthy should not regress.
- Touched legacy files with low health should improve when practical.
- If a low-health legacy file stays flat, call that out as an explicit exception rather than hiding it.
- Critical product or production surfaces deserve stricter judgment than low-risk content or tooling files.

## Why Ratchet Instead Of Global 10/10

Many real repositories have important legacy hotspots. A hard global `10/10` rule can discourage agents from touching the files that most need careful improvement. A ratchet keeps velocity while making each touched area at least a little safer.

## Suggested Thresholds

These defaults came from the NaGringa rollout and are intentionally conservative:

- `CODESCENE_NEW_FILE_MIN_SCORE=9.5`
- `CODESCENE_HEALTHY_MIN_SCORE=9.0`
- `CODESCENE_REQUIRE_LEGACY_IMPROVEMENT=1`

Raise thresholds as the repository baseline improves. Do not lower thresholds quietly to pass a change.

## How To Act On Findings

1. Fix issues directly connected to the current change first.
2. Prefer extracting domain decisions from long orchestration code when the current change already crosses that boundary.
3. Prefer reducing conditional complexity, duplication, and long method bodies over style-only churn.
4. Keep unrelated refactors out of the current PR unless the user asked for a refactor.
5. Pair structural changes with the repository's focused tests or checks.

## Reporting Exceptions

Use this shape when an exception is warranted:

```text
CodeScene exception: <file> remains below the healthy threshold because <reason>. The touched behavior is covered by <tests/checks>, and broader refactoring is tracked separately or intentionally deferred.
```
