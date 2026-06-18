#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";

const PACKAGE_SPEC = "@codescene/codehealth-mcp@1.3.4";
const SERVER_ARGS = ["dlx", "--package", PACKAGE_SPEC, "cs-mcp"];
const MCP_JSON_SERVER = {
  command: "pnpm",
  args: SERVER_ARGS,
  env: {
    CS_ACCESS_TOKEN: "${env:CS_ACCESS_TOKEN}",
  },
};
const CODEX_BLOCK = `[mcp_servers.codescene]
command = "pnpm"
args = ["dlx", "--package", "${PACKAGE_SPEC}", "cs-mcp"]
env_vars = ["CS_ACCESS_TOKEN"]
`;

const usage = `Usage:
  install-mcp.mjs [--agent codex|claude|claude-code|cursor|both|all] [--scope user|project] [--apply] [--store-claude-token]

Default mode prints the commands/config that would be used.

Options:
  --agent <name>          Agent to configure. Defaults to all.
  --scope <scope>         MCP config scope. Defaults to user.
  --apply                 Write config / run agent CLI commands.
  --store-claude-token    Store CS_ACCESS_TOKEN in Claude Code config. By default the helper avoids this.
  -h, --help              Show this help.
`;

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(usage.trim());
  process.exit(0);
}

if (!["codex", "claude", "claude-code", "cursor", "both", "all"].includes(options.agent)) {
  console.error(`Unknown agent: ${options.agent}`);
  console.error(usage.trim());
  process.exit(2);
}

if (!["user", "project"].includes(options.scope)) {
  console.error(`Unknown scope: ${options.scope}`);
  console.error(usage.trim());
  process.exit(2);
}

if (!process.env.CS_ACCESS_TOKEN) {
  console.warn("CS_ACCESS_TOKEN is not set. Configure it before using CodeScene MCP tools.");
}

const selectedAgents = getSelectedAgents(options.agent);

if (selectedAgents.includes("codex")) {
  configureCodex(options);
}

if (selectedAgents.includes("claude")) {
  configureClaude(options);
}

if (selectedAgents.includes("cursor")) {
  configureCursor(options);
}

function parseArgs(args) {
  const parsed = {
    agent: "all",
    scope: "user",
    apply: false,
    storeClaudeToken: false,
    help: false,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    switch (arg) {
      case "--agent":
        parsed.agent = args[index + 1] ?? "";
        index += 1;
        break;
      case "--scope":
        parsed.scope = args[index + 1] ?? "";
        index += 1;
        break;
      case "--apply":
        parsed.apply = true;
        break;
      case "--store-claude-token":
        parsed.storeClaudeToken = true;
        break;
      case "-h":
      case "--help":
        parsed.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function getSelectedAgents(agent) {
  if (agent === "all") {
    return ["codex", "claude", "cursor"];
  }
  if (agent === "both") {
    return ["codex", "claude"];
  }
  if (agent === "claude-code") {
    return ["claude"];
  }
  return [agent];
}

function configureCodex(options) {
  const configPath = getCodexConfigPath(options.scope);

  if (!options.apply) {
    console.log("\n# Codex config block");
    console.log(`# ${configPath}`);
    console.log(CODEX_BLOCK.trim());
    return;
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const current = fs.existsSync(configPath) ? fs.readFileSync(configPath, "utf8") : "";
  const next = upsertTomlTable(current, "mcp_servers.codescene", CODEX_BLOCK);
  fs.writeFileSync(configPath, next);
  console.log(`Configured Codex CodeScene MCP in ${configPath}`);
}

function configureClaude(options) {
  const args = ["mcp", "add", "codescene", "--scope", options.scope];

  if (options.storeClaudeToken) {
    if (!process.env.CS_ACCESS_TOKEN) {
      console.error("--store-claude-token requires CS_ACCESS_TOKEN to be set.");
      process.exit(1);
    }
    args.push("--env", `CS_ACCESS_TOKEN=${process.env.CS_ACCESS_TOKEN}`);
  }

  args.push("--", "pnpm", ...SERVER_ARGS);

  if (!options.apply) {
    console.log("\n# Claude Code command");
    console.log(["claude", ...redactTokenArgs(args)].join(" "));
    if (!options.storeClaudeToken) {
      console.log("# Launch Claude Code from a shell where CS_ACCESS_TOKEN is set.");
    }
    return;
  }

  const result = spawnSync("claude", args, { stdio: "inherit" });
  if (result.status !== 0) {
    console.error("Failed to configure Claude Code MCP.");
    process.exit(result.status ?? 1);
  }
}

function configureCursor(options) {
  const configPath = getCursorConfigPath(options.scope);
  const preview = JSON.stringify({ mcpServers: { codescene: MCP_JSON_SERVER } }, null, 2);

  if (!options.apply) {
    console.log("\n# Cursor mcp.json block");
    console.log(`# ${configPath}`);
    console.log(preview);
    return;
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  const current = readJsonConfig(configPath);
  const next = upsertMcpServer(current, "codescene", MCP_JSON_SERVER);
  fs.writeFileSync(configPath, `${JSON.stringify(next, null, 2)}\n`);
  console.log(`Configured Cursor CodeScene MCP in ${configPath}`);
}

function getCodexConfigPath(scope) {
  if (scope === "user") {
    return path.join(os.homedir(), ".codex", "config.toml");
  }

  return path.join(getGitRoot(), ".codex", "config.toml");
}

function getCursorConfigPath(scope) {
  if (scope === "user") {
    return path.join(os.homedir(), ".cursor", "mcp.json");
  }

  return path.join(getGitRoot(), ".cursor", "mcp.json");
}

function getGitRoot() {
  const result = spawnSync("git", ["rev-parse", "--show-toplevel"], {
    encoding: "utf8",
  });

  if (result.status !== 0) {
    console.error("Project scope requires running inside a git repository.");
    process.exit(result.status ?? 1);
  }

  return result.stdout.trim();
}

function readJsonConfig(configPath) {
  if (!fs.existsSync(configPath)) {
    return {};
  }

  const content = fs.readFileSync(configPath, "utf8").trim();
  if (!content) {
    return {};
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    console.error(`Could not parse ${configPath}: ${error.message}`);
    process.exit(1);
  }
}

function upsertMcpServer(config, serverName, serverConfig) {
  return {
    ...config,
    mcpServers: {
      ...(config.mcpServers ?? {}),
      [serverName]: serverConfig,
    },
  };
}

function upsertTomlTable(content, tableName, tableBlock) {
  const header = `[${tableName}]`;
  const lines = content.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === header);

  if (start === -1) {
    const trimmed = content.trimEnd();
    return `${trimmed}${trimmed ? "\n\n" : ""}${tableBlock.trimEnd()}\n`;
  }

  let end = lines.length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (/^\s*\[[^\]]+\]\s*$/.test(lines[index])) {
      end = index;
      break;
    }
  }

  const replacement = tableBlock.trimEnd().split("\n");
  const nextLines = [...lines.slice(0, start), ...replacement, ...lines.slice(end)];
  return `${nextLines.join("\n").trimEnd()}\n`;
}

function redactTokenArgs(args) {
  return args.map((arg) => (arg.startsWith("CS_ACCESS_TOKEN=") ? "CS_ACCESS_TOKEN=<redacted>" : shellQuote(arg)));
}

function shellQuote(value) {
  if (/^[a-zA-Z0-9_./:=@+-]+$/.test(value)) {
    return value;
  }
  return `'${value.replaceAll("'", "'\"'\"'")}'`;
}
