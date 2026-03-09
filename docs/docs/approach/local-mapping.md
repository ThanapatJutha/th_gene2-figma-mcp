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

### Attempt 2: Local mapping file ✅

We created `figma-sync.map.json` — a simple JSON file committed to git that stores the same mapping data locally.

## The Solution: `figma-sync.map.json`

```json
{
  "version": 1,
  "figmaFileKey": "ghwHnqX2WZXFtfmsrbRLTg",
  "components": [
    {
      "name": "HeaderCard",
      "file": "poc-react/src/components/HeaderCard.tsx",
      "figmaNodeId": "1:5",
      "figmaFileKey": "ghwHnqX2WZXFtfmsrbRLTg",
      "selector": ".card:first-child"
    }
  ]
}
```

### Schema

| Field | Type | Description |
|---|---|---|
| `version` | `1` | Schema version for forward compatibility |
| `figmaFileKey` | string | Default Figma file key |
| `components` | array | List of component mappings |

### Component Mapping Fields

| Field | Required | Description |
|---|---|---|
| `name` | ✅ | React component name, e.g. `"HeaderCard"` |
| `file` | ✅ | Path to `.tsx` file relative to repo root |
| `figmaNodeId` | ✅ | Figma node ID, e.g. `"1:5"` |
| `figmaFileKey` | ✅ | Figma file key |
| `selector` | ❌ | CSS selector for push sync DOM targeting |

## How Node IDs Were Discovered

Node IDs were found using the MCP `get_metadata` tool, which returns the Figma file's node tree:

```xml
<document name="poc-react">
  <canvas name="Page 1" id="0:1">
    <frame name="Frame 1" id="1:2">
      <frame name="HeaderCard" id="1:5">...</frame>
      <frame name="CounterCard" id="1:17">...</frame>
      <frame name="ToggleSwitch" id="1:42">...</frame>
    </frame>
  </canvas>
</document>
```

You can also discover node IDs by prompting Copilot:

> **"Get the metadata for my Figma file ghwHnqX2WZXFtfmsrbRLTg and show me the node tree"**

Copilot will call `get_metadata` and return the full node tree with IDs.

## Comparison: Local File vs Code Connect

| Aspect | Local File | Code Connect |
|---|---|---|
| **Storage** | Git repo (`figma-sync.map.json`) | Figma servers |
| **Plan required** | Any | Org/Enterprise |
| **Visible in Figma Dev Mode** | ❌ | ✅ |
| **Version controlled** | ✅ | ❌ |
| **Works offline** | ✅ | ❌ |
| **MCP integration** | Via Copilot context | Native |

## Migration Path

If the Figma plan is upgraded to Org/Enterprise:

1. Read all entries from `figma-sync.map.json`
2. Call `add_code_connect_map` for each component
3. Mappings move to Figma → designers see linked code in Dev Mode
4. Local file becomes an optional backup
