# NaGringa Case Study

This skill was extracted from the NaGringa monorepo quality workflow in June 2026.

## What Worked

NaGringa did not put a long CodeScene handbook into the always-loaded agent instructions. The durable setup was:

- A short root agent rule telling agents to prefer executable quality signals.
- A deeper architecture document for the operating model.
- Local scripts that humans can run.
- MCP tools that agents can call directly.
- A ratchet policy instead of a hard global score gate.

## Repository Setup

The repo used a project-local MCP server:

```toml
[mcp_servers.codescene]
command = "pnpm"
args = ["exec", "cs-mcp"]
```

The root `package.json` pinned the MCP package and exposed local commands:

```json
{
  "scripts": {
    "quality:codescene": "node scripts/codescene-local.mjs analyze",
    "quality:codescene:gate": "node scripts/codescene-local.mjs gate",
    "quality:codescene:local": "node scripts/codescene-local.mjs precommit",
    "quality:codescene:review": "node scripts/codescene-local.mjs review",
    "quality:codescene:score": "node scripts/codescene-local.mjs score",
    "quality:local": "bash scripts/quality-local.sh"
  },
  "devDependencies": {
    "@codescene/codehealth-mcp": "1.3.4"
  }
}
```

`quality:local` ran CodeScene automatically when `CS_ACCESS_TOKEN` was configured and skipped it with a clear message when it was not.

## Lessons To Reuse

- Keep global agent context small. Use a skill for the workflow and references for details.
- Use MCP directly when an agent is doing the work; use repo scripts when a human wants the same checks.
- Treat CodeScene as local-first. The NaGringa workflow did not require a CodeScene Cloud project gate in CI.
- Score gates should be file-level and branch-aware, not a vague "improve code quality" instruction.
- Low-score legacy files need a real decision: improve them, or document why the current change intentionally leaves them flat.
- Do not copy repo-specific checks into other projects. Extract the CodeScene workflow and let each repo keep its own lint, test, typecheck, and release commands.

## Portable Shape

For a new repo, start with:

1. Install this skill globally for the agents you use.
2. Configure CodeScene MCP globally for each agent.
3. Add repo-local scripts only if humans also need a one-command gate.
4. Adopt a ratchet policy before tightening thresholds.
5. Add CI only after the local signal is useful and stable.
