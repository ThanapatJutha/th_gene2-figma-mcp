---
sidebar_position: 2
---

# Local Mapping Approach

## The Problem

To sync between code and Figma, we need a mapping that says:

> *"React component `HeaderCard` in `HeaderCard.tsx` corresponds to Figma node `1:5` in file `ghwHnqX2WZXFtfmsrbRLTg`"*

Figma offers this natively via **Code Connect**, but it requires an **Organization or Enterprise plan with a Developer seat**.

## What We Tried

### Attempt 1: Figma Code Connect via MCP

```
add_code_connect_map → ❌ "You need a Developer seat in an Organization or Enterprise plan"
get_code_connect_suggestions → ❌ Same error
```

Both Code Connect MCP tools are blocked on Pro/Full plans.

### Attempt 2: Local config + connection DB ✅

We adopted **the same conventions as Figma Code Connect** — a config file at the project root plus a local connection store — so that migration to the real Code Connect is straightforward if the plan is upgraded.

## The Solution

### 1. `figma.config.json` — Project Configuration

Created via the **Settings** page in the Dashboard UI. Tells the system where to find components and which Figma file to target.

```json
{
  "codeConnect": {
    "parser": "react",
    "include": ["src/components/**/*.tsx"],
    "exclude": ["**/*.test.*", "**/*.stories.*", "**/*.figma.*"],
    "label": "React",
    "language": "tsx"
  },
  "figmaFileKey": "ghwHnqX2WZXFtfmsrbRLTg",
  "rootDir": "demo"
}
```

| Field | Type | Description |
|---|---|---|
| `codeConnect.parser` | string | Framework parser (`react`, `vue`, `svelte`, etc.) |
| `codeConnect.include` | string[] | Glob patterns to find component files (relative to `rootDir`) |
| `codeConnect.exclude` | string[] | Glob patterns to skip |
| `codeConnect.label` | string | Label shown in Figma Dev Mode |
| `codeConnect.language` | string | Syntax highlighting language |
| `figmaFileKey` | string | Default Figma file key |
| `rootDir` | string | Path to the target project — relative to figma-sync root (e.g. `demo`, `../my-app`) or absolute |

### 2. `.figma-sync/connections.json` — Component Link Database

Created automatically when a developer links a code component to a Figma component via the **Dashboard** page. This file is **gitignored** (local to each developer).

```json
{
  "version": 1,
  "connections": [
    {
      "figmaNodeId": "1:5",
      "figmaComponentName": "HeaderCard",
      "codeComponent": "HeaderCard",
      "file": "src/components/HeaderCard.tsx",
      "linkedAt": "2026-03-10T10:30:00.000Z"
    }
  ]
}
```

| Field | Type | Description |
|---|---|---|
| `figmaNodeId` | string | Figma node ID, e.g. `"1:5"` |
| `figmaComponentName` | string | Name of the Figma component |
| `codeComponent` | string | Exported code component name |
| `file` | string | File path relative to rootDir |
| `linkedAt` | string | ISO 8601 timestamp of when the link was created |

## How Linking Works

1. Developer opens the **Dashboard** and connects to the bridge
2. The bridge fetches **live components** from the Figma plugin (COMPONENT_SET + COMPONENT nodes)
3. The bridge **scans project files** using the include/exclude globs from `figma.config.json`
4. For each Figma component, a dropdown shows matching code components
5. Developer selects and clicks **Link** — the connection is saved to `.figma-sync/connections.json`

```
┌─────────────┐                 ┌──────────────────┐
│  Dashboard   │  ── ws ──►    │  Bridge Server    │
│  (browser)   │               │                    │
│              │               │  list-components   │──► Figma Plugin
│  Link UI     │               │  list-project-     │──► Local filesystem
│              │               │    components      │
│              │  ◄── ws ──    │  save-connections  │──► .figma-sync/
└─────────────┘                 └──────────────────┘
```

## How Node IDs Were Discovered

Node IDs were found using the Figma plugin's `list-components` command, which returns all COMPONENT and COMPONENT_SET nodes from the open Figma file. You can also discover node IDs by:

- Using the plugin's `list-layers` command in the Dashboard Discover tab
- Prompting Copilot: *"Get the metadata for my Figma file ghwHnqX2WZXFtfmsrbRLTg"*
- Selecting a node in Figma and reading its ID from the URL

## Comparison: Local Approach vs Code Connect

| Aspect | Local (figma.config.json + .figma-sync/) | Code Connect |
|---|---|---|
| **Config** | `figma.config.json` (same schema) | `figma.config.json` |
| **Storage** | Local DB (`.figma-sync/connections.json`) | Figma servers |
| **Plan required** | Any | Org/Enterprise |
| **Visible in Figma Dev Mode** | ❌ | ✅ |
| **Version controlled** | Config: ✅ / Connections: optional | ❌ |
| **Works offline** | ✅ | ❌ |
| **Interactive UI** | ✅ Dashboard linking | ❌ CLI only |
| **Config format** | Code Connect aligned | Native |

## Migration Path

If the Figma plan is upgraded to Org/Enterprise:

1. Read all entries from `.figma-sync/connections.json`
2. Call `add_code_connect_map` for each connection
3. Mappings move to Figma → designers see linked code in Dev Mode
4. `figma.config.json` remains unchanged (same format)
5. Local connections file becomes an optional backup
