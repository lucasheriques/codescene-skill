# CodeScene Skill

[![skills.sh](https://skills.sh/b/lucasheriques/codescene-skill)](https://skills.sh/lucasheriques/codescene-skill)

An open Agent Skill for running CodeScene Code Health workflows from coding agents.

The goal is simple: make the useful CodeScene flow available in Codex, Claude Code, and other skill-aware agents without copying a pile of repository-specific scripts into every project.

Current release: `v0.1.1`.

## Install

With GitHub CLI:

```bash
gh skill install lucasheriques/codescene-skill codescene-code-health --agent codex --scope user
gh skill install lucasheriques/codescene-skill codescene-code-health --agent claude-code --scope user
```

Pin to the published release:

```bash
gh skill install lucasheriques/codescene-skill codescene-code-health --pin v0.1.1 --agent codex --scope user
```

Install the skill globally for Codex and Claude Code:

```bash
npx skills add lucasheriques/codescene-skill \
  --skill codescene-code-health \
  --global \
  --agent codex \
  --agent claude-code
```

From a local checkout:

```bash
npx skills add . \
  --skill codescene-code-health \
  --global \
  --agent codex \
  --agent claude-code
```

## Configure CodeScene MCP

The skill teaches the workflow. The CodeScene tools come from the CodeScene MCP server, so each agent still needs MCP setup.

Set your token:

```bash
export CS_ACCESS_TOKEN="..."
```

Then run the optional helper:

```bash
node ~/.agents/skills/codescene-code-health/scripts/install-mcp.mjs --agent both --apply
```

By default, the helper avoids writing your CodeScene token into agent config. Codex is configured to forward `CS_ACCESS_TOKEN` by name. Claude Code is configured at user scope and should be launched from an environment where `CS_ACCESS_TOKEN` is set. If you explicitly want Claude Code to store the token in `~/.claude.json`, pass `--store-claude-token`.

For Codex, add a user-level server to `~/.codex/config.toml`:

```toml
[mcp_servers.codescene]
command = "pnpm"
args = ["dlx", "--package", "@codescene/codehealth-mcp@1.3.4", "cs-mcp"]
env_vars = ["CS_ACCESS_TOKEN"]
```

For Claude Code:

```bash
claude mcp add codescene --scope user -- pnpm dlx --package @codescene/codehealth-mcp@1.3.4 cs-mcp
claude mcp list
```

Restart the agent session after adding the server.

## Use

Ask your agent for the workflow you want:

```text
Use $codescene-code-health to review my current changes before I commit.
```

```text
Run a CodeScene branch analysis against origin/main and help me fix the highest-signal findings.
```

```text
Score the files I touched and tell me whether the change respects our quality ratchet.
```

## What The Skill Does

The skill tells agents to:

- inspect the actual git diff before choosing a CodeScene tool;
- help configure the CodeScene MCP server when tools are missing;
- use `pre_commit_code_health_safeguard` for modified/staged files;
- use `analyze_change_set` for branch-level review;
- use `code_health_score` and `code_health_review` for file-level work;
- interpret results with a ratchet policy instead of broad refactors;
- rerun CodeScene and the repo's own focused checks after changes.

## Why This Exists

This repo came out of applying CodeScene inside the NaGringa monorepo.

What worked there was not a huge always-loaded prompt. The effective shape was:

- short agent instructions that route agents toward executable quality signals;
- CodeScene MCP tools for agent-driven review;
- local scripts for humans who want the same checks;
- a ratchet policy: new files need to be strong, healthy touched files should not regress, and low-health legacy files should improve or get an explicit exception.

NaGringa used a project-local MCP server:

```toml
[mcp_servers.codescene]
command = "pnpm"
args = ["exec", "cs-mcp"]
```

It also pinned `@codescene/codehealth-mcp` and exposed commands such as:

```json
{
  "quality:codescene": "node scripts/codescene-local.mjs analyze",
  "quality:codescene:gate": "node scripts/codescene-local.mjs gate",
  "quality:codescene:local": "node scripts/codescene-local.mjs precommit",
  "quality:codescene:review": "node scripts/codescene-local.mjs review",
  "quality:codescene:score": "node scripts/codescene-local.mjs score"
}
```

Those scripts were useful for that monorepo, but they also included NaGringa-specific lint, shell, Go, and typecheck behavior. This skill extracts only the portable part: how an agent should use CodeScene well.

## Goals

- Make CodeScene Code Health easy to use from Codex and Claude Code.
- Keep the skill portable across repositories.
- Keep credentials out of the skill and out of committed config.
- Encourage small, scoped fixes instead of drive-by rewrites.
- Help teams adopt a quality ratchet before tightening gates.

## Non-Goals

- Replace repository tests, typechecks, or linters.
- Require CodeScene Cloud project gates in CI.
- Force every repository into NaGringa's exact scripts.
- Store `CS_ACCESS_TOKEN` in this repository.

## Repository Layout

```text
skills/
  codescene-code-health/
    SKILL.md
    agents/openai.yaml
    references/
      mcp-setup.md
      nagringa-case-study.md
      ratchet-policy.md
    scripts/
      install-mcp.mjs
```

## Validate

List the skill through the open skills CLI:

```bash
npx skills add . --list
```

For Codex skill-shape validation, if you have Codex's system skill tools installed:

```bash
python3 ~/.codex/skills/.system/skill-creator/scripts/quick_validate.py skills/codescene-code-health
```

## License

MIT
