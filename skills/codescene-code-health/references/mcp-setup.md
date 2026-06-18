# MCP Setup

Read this when CodeScene MCP tools are not available, when a user asks to install CodeScene for an agent, or when adapting the skill to a new project or machine.

## Prerequisites

- Node.js and `pnpm`.
- A CodeScene access token exported as `CS_ACCESS_TOKEN`.
- A local git repository when running file, branch, or pre-commit analysis.

The skill can be installed without the MCP server, but the useful CodeScene operations need the server.

Get CodeScene MCP access from [CodeScene CodeHealth MCP](https://codescene.com/product/code-health-mcp). For token details, [CodeScene's MCP documentation](https://codescene.io/docs/developer-tools/mcp/codescene-mcp-server.html) says the server needs `CS_ACCESS_TOKEN`; CodeScene Cloud users can create it at `https://codescene.io/users/me/pat`, while on-prem users use their own CodeScene host token URL.

## Helper Script

After installing the skill, run this to configure Codex, Claude Code, and Cursor at user scope:

```bash
node ~/.agents/skills/codescene-code-health/scripts/install-mcp.mjs --scope user --apply
```

For project scope, run from the project root:

```bash
node .agents/skills/codescene-code-health/scripts/install-mcp.mjs --scope project --apply
```

The helper avoids writing the CodeScene token into agent config by default. It configures Codex to forward `CS_ACCESS_TOKEN`, Cursor to read `${env:CS_ACCESS_TOKEN}`, and Claude Code to use the launching environment. Pass `--store-claude-token` only when you explicitly accept storing `CS_ACCESS_TOKEN` in Claude Code config.

## Codex

The helper writes this block to `~/.codex/config.toml` for user scope or `.codex/config.toml` for project scope:

```toml
[mcp_servers.codescene]
command = "pnpm"
args = ["dlx", "--package", "@codescene/codehealth-mcp@1.3.4", "cs-mcp"]
env_vars = ["CS_ACCESS_TOKEN"]
```

Restart Codex after changing the config. In the Codex TUI or app, use `/mcp` to check that the server is available.

## Claude Code

The helper runs this command for user or project scope:

```bash
claude mcp add codescene --scope <user|project> -- pnpm dlx --package @codescene/codehealth-mcp@1.3.4 cs-mcp
claude mcp list
```

Use project scope only when the repository should share MCP configuration with the team. Do not commit secrets in `.mcp.json`.

## Cursor

The helper writes a `codescene` server to `~/.cursor/mcp.json` for user scope or `.cursor/mcp.json` for project scope:

```json
{
  "mcpServers": {
    "codescene": {
      "command": "pnpm",
      "args": ["dlx", "--package", "@codescene/codehealth-mcp@1.3.4", "cs-mcp"],
      "env": {
        "CS_ACCESS_TOKEN": "${env:CS_ACCESS_TOKEN}"
      }
    }
  }
}
```

After writing the file, open Cursor settings and check the MCP tools list if the server does not appear automatically.

## Troubleshooting

- If tools do not appear, restart the agent session after adding the server.
- If startup fails on the first run, run the configured command directly: `pnpm dlx --package @codescene/codehealth-mcp@1.3.4 cs-mcp`.
- If the server starts but tools are missing, confirm `CS_ACCESS_TOKEN` is visible to the agent process.
- If a project has both user-level and project-level MCP entries, inspect precedence in that agent's MCP docs and remove duplicates if needed.
