---
name: codescene-code-health
description: Use when reviewing code quality with CodeScene Code Health MCP tools, before committing or pushing changes, when asked to run CodeScene, code-health, file score, file review, pre-commit safeguard, branch/change-set analysis, or when applying a ratcheted quality policy to touched code without broad unrelated refactors.
license: MIT
---

# CodeScene Code Health

## Overview

Use CodeScene as a focused code-health signal for the code already in scope. Prefer local MCP tools and repository checks over generic advice, and treat CodeScene as a ratchet: new code should be healthy, healthy touched files should not regress, and unhealthy touched files should improve or be called out explicitly.

## Initial Check

1. Confirm you are in a git repository before doing branch or change-set analysis.
2. Inspect the user's request, `git status`, and the touched files before selecting a CodeScene tool.
3. Check whether CodeScene MCP tools are available in the session. If they are missing, do not invent scores or reviews; use `references/mcp-setup.md` to help the user configure the server.
4. Preserve unrelated user work. Do not stage, revert, or refactor unrelated files to chase a score.
5. If the user asks you to set up MCP, use `scripts/install-mcp.mjs` as the opt-in helper. Do not store tokens in agent config unless the user explicitly asks for that.

## Tool Selection

- Use `pre_commit_code_health_safeguard` before commit, handoff, or push when the current modified/staged files are the unit of review.
- Use `analyze_change_set` for a branch-level review against a base ref such as `origin/main`.
- Use `code_health_score` for a quick numeric score on one or more specific files.
- Use `code_health_review` for detailed findings on a specific file when deciding what to improve.
- Use `explain_code_health` or `explain_code_health_productivity` only when the user asks what the metric means or why it matters.

## Workflow

1. Read the relevant diff and nearby code first. CodeScene output is more useful after you know the intent of the change.
2. Run the smallest CodeScene tool that answers the question.
3. Interpret findings through the ratchet policy in `references/ratchet-policy.md`.
4. Fix high-confidence issues that are within the requested scope and covered by the same validation path.
5. Avoid broad rewrites, style churn, or unrelated "score polishing" unless the user explicitly asks for a refactor.
6. Rerun the relevant CodeScene tool after meaningful changes.
7. Run the repository's focused tests or checks for the touched behavior; CodeScene does not replace tests.

## Interpreting Results

- Treat blocker-level CodeScene findings as review findings: fix them or explain why the current task cannot safely include the fix.
- For new files, aim for excellent structure immediately; avoid landing new low-health code.
- For healthy touched files, avoid regressions even if the code still passes tests.
- For low-health legacy files, improve the touched area when practical. If the score stays flat, document the exception instead of silently normalizing it.
- For critical surfaces such as auth, payments, subscriptions, access control, jobs, notifications, and production-runtime glue, use stricter judgment than for low-risk content code.

## Reporting

When reporting back, include:

- The CodeScene tool used and the scope reviewed.
- The main findings or a clear "no CodeScene issues found" statement.
- What was changed, if anything.
- The verification commands or checks that passed.
- Any residual risk or explicit ratchet exception.

## References

- Read `references/mcp-setup.md` when CodeScene MCP is missing or the user asks how to configure Codex or Claude Code.
- Read `references/ratchet-policy.md` before defining thresholds, exceptions, or repository quality gates.
- Read `references/nagringa-case-study.md` when adapting this workflow to another repository or explaining why the skill is shaped this way.
- Run `scripts/install-mcp.mjs --help` when the user wants this skill to help configure the CodeScene MCP server.
