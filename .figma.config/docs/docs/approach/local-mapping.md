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
  "rootDir": "."
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
| `rootDir` | string | Path to the target project — relative to figma-sync root (e.g. `.`, `../my-app`) or absolute |

### 2. `.figma-sync/connections.json` — Component Link Database

Links **code components** to **Figma master components** (Code Connect style). Created when a developer links a component via the **Dashboard** page, or auto-saved when Copilot resolves a component during push sync.

This answers: *"Which Figma component IS this code component?"*

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
| `figmaNodeId` | string | Figma node ID of the **master component**, e.g. `"1:5"` |
| `figmaComponentName` | string | Name of the Figma component |
| `codeComponent` | string | Exported code component name |
| `file` | string | File path relative to rootDir |
| `linkedAt` | string | ISO 8601 timestamp of when the link was created |

### 3. `.figma-sync/layer-map.json` — Layer Link Database

Links **sub-components in code** to **specific Figma layers/instances inside a parent frame**. Auto-generated during push sync when Copilot name-matches (or creates) children.

This answers: *"Inside this Figma frame, which child node is Button1? Button2?"*

```json
{
  "version": 1,
  "frames": {
    "20:1": {
      "codeComponent": "Card",
      "file": "src/components/Card.tsx",
      "children": {
        "Button1": { "nodeId": "20:5", "nodeType": "INSTANCE" },
        "Button2": { "nodeId": "20:8", "nodeType": "INSTANCE" },
        "Button3": { "nodeId": "20:15", "nodeType": "INSTANCE", "codeComponent": "Button3" }
      },
      "lastSyncedAt": "2026-03-11T10:30:00.000Z"
    }
  }
}
```

| Field | Type | Description |
|---|---|---|
| `frames` | object | Keyed by parent Figma node ID |
| `frames[].codeComponent` | string | Parent code component name (e.g. `"Card"`) |
| `frames[].file` | string | File path relative to rootDir |
| `frames[].children` | object | Keyed by child name as it appears in Figma |
| `children[].nodeId` | string | Figma child node ID (e.g. `"20:5"`) |
| `children[].nodeType` | string | `"INSTANCE"`, `"FRAME"`, `"TEXT"`, etc. |
| `children[].codeComponent` | string? | Code component name, if it maps to one |
| `frames[].lastSyncedAt` | string | ISO 8601 timestamp of last push sync |

### Why two files?

| | `connections.json` | `layer-map.json` |
|---|---|---|
| **Maps** | Code component ↔ Figma **master component** | Sub-component ↔ Figma **layer/instance inside a frame** |
| **Granularity** | 1 entry per component | 1 entry per parent, N children |
| **Created by** | Dashboard link UI or Copilot (push sync Step 3) | Copilot automatically during push sync |
| **Lifecycle** | Stable — rarely changes once linked | Dynamic — updated every push sync |
| **Git** | Optional (shareable with team) | Gitignored (personal, ephemeral) |
| **Purpose** | "HeaderCard in code IS HeaderCard in Figma" | "Inside Card's frame, node 20:5 is Button1" |

## How Linking Works

### Component connections (via Dashboard)

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
│              │  ◄── ws ──    │  save-connections  │──► .figma-sync/connections.json
└─────────────┘                 └──────────────────┘
```

### Layer map (via Copilot push sync)

1. Developer asks Copilot to push sync a component (e.g. "Push sync Card to Figma")
2. Copilot reads the Figma node tree via `bridge_read_node`
3. Copilot **name-matches** sub-components in code against children in the Figma node
4. Matched children are saved to `.figma-sync/layer-map.json` automatically
5. New children (exist in code but not in Figma) can be created via `bridge_create_instance`

```
┌─────────────┐                 ┌──────────────────┐
│  Copilot     │  ── MCP ──►   │  Bridge Server    │
│  (agent)     │               │                    │
│              │               │  read-node         │──► Figma Plugin
│  Push sync   │               │  create-instance   │──► Figma Plugin
│              │               │  save-layer-map    │──► .figma-sync/layer-map.json
│              │  ◄── MCP ──   │  read-layer-map    │──► .figma-sync/layer-map.json
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
| **Storage** | Local DB (`.figma-sync/connections.json` + `layer-map.json`) | Figma servers |
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
