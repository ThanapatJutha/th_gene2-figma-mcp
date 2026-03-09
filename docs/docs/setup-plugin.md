---
sidebar_position: 3
slug: /setup-plugin
---

# Setup Plugin Bridge

Step-by-step guide to set up the Figma Plugin Bridge so Copilot can **read, write, and create components** in your Figma file.

## Prerequisites

Before you start, make sure you have:

- ✅ **Figma desktop app** installed ([download](https://www.figma.com/downloads/))
- ✅ **VS Code** with **GitHub Copilot** enabled (Agent Mode)
- ✅ **Node.js 20+** installed
- ✅ This repo cloned and dependencies installed:

```bash
git clone https://github.com/patja60/figma-sync.git
cd figma-sync
npm install
```

---

## Step 1: Compile the Figma Plugin

The plugin is written in TypeScript and needs to be compiled before Figma can load it.

```bash
npm run plugin:build
```

This compiles `figma-plugin/code.ts` → `figma-plugin/code.js`.

### Verify

Check that the compiled file exists:

```bash
ls figma-plugin/code.js
```

You should see `figma-plugin/code.js` listed.

---

## Step 2: Start the Bridge Server

The bridge server is a local WebSocket relay that sits between Copilot and the Figma plugin.

```bash
npm run bridge
```

### Verify

You should see this output:

```
[bridge] WebSocket server listening on ws://localhost:9001
```

:::tip
Keep this terminal open — the bridge must be running whenever you use the plugin.
:::

---

## Step 3: Load the Plugin in Figma

1. Open the **Figma desktop app**
2. Open the Figma file you want to work with
3. Go to the menu: **Plugins → Development → Import plugin from manifest…**
4. Navigate to your repo folder and select:
   ```
   figma-sync/figma-plugin/manifest.json
   ```
5. The plugin **"Figma Sync Bridge"** will appear under **Plugins → Development**

### Run the plugin

1. **Plugins → Development → Figma Sync Bridge**
2. The plugin UI opens and **auto-connects** to `ws://localhost:9001`

### Verify

In the plugin UI, you should see:

```
🔗 Figma Sync Bridge
🟢 Connected
```

In the bridge server terminal, you should see:

```
[bridge] ✅ Figma plugin connected
```

:::caution
If the status shows 🔴 **Disconnected**, make sure the bridge server from Step 2 is still running. The plugin retries every 3 seconds.
:::

---

## Step 4: Verify the MCP Server

The `figma-bridge` MCP server is already configured in `.vscode/mcp.json`:

```json
{
  "servers": {
    "figma-bridge": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "src/bridge/mcp-server.ts"],
      "cwd": "${workspaceFolder}"
    }
  }
}
```

### Verify MCP is available

1. Open **Copilot Chat** in VS Code (⌘⇧I for Agent Mode)
2. Type the following prompt:

> **"Use bridge_ping to check if the Figma plugin is connected"**

### Expected result

Copilot should call `bridge_ping` and return:

```json
"pong"
```

If you see `"pong"`, **everything is working end-to-end** ✅

### Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Copilot says "tool not found" | MCP server not started | Restart VS Code or click "Start" on `figma-bridge` in MCP panel |
| `bridge_ping` returns error | Bridge server not running | Run `npm run bridge` in a terminal |
| Bridge says "plugin not connected" | Plugin not open in Figma | Open the plugin via Plugins → Development → Figma Sync Bridge |
| Plugin shows 🔴 Disconnected | Bridge server stopped | Restart `npm run bridge` — plugin auto-reconnects in 3s |

---

## Step 5: Try It Out

Now that everything is connected, here are real prompts to try in Copilot Agent Mode:

### 🔍 Read a node

> **"Read the properties of Figma node 1:5 using the bridge"**

**What happens:** Copilot calls `bridge_read_node` → bridge relays to plugin → plugin reads the node via `figma.getNodeByIdAsync("1:5")` → returns name, type, dimensions, fills, etc.

**Expected response:**
```json
{
  "id": "1:5",
  "name": "HeaderCard",
  "type": "FRAME",
  "visible": true,
  "width": 320,
  "height": 200,
  "fills": [...]
}
```

### 🌳 Read the page tree

> **"Show me the node tree of the current Figma page using the bridge"**

**What happens:** Copilot calls `bridge_read_tree` → returns the full page hierarchy with node IDs, names, and types.

### ⭐ Convert a frame to a component

This is the key capability that only the plugin can do.

> **"Convert Figma node 1:5 to a component named HeaderCard"**

**What happens:** Copilot calls `bridge_create_component` → plugin runs `figma.createComponent()` → moves all children from the frame into the new component → removes the original frame.

**Expected response:**
```json
{
  "id": "2:100",
  "name": "HeaderCard",
  "type": "COMPONENT",
  "width": 320,
  "height": 200,
  "childCount": 3
}
```

You'll see the frame change to a **component** (◆ icon) in Figma's layers panel.

### ✏️ Update text

> **"Update the text in Figma node 3:12 to say 'Welcome to Figma Sync'"**

**What happens:** Copilot calls `bridge_update_node` with `{ characters: "Welcome to Figma Sync" }` → plugin loads the font and updates the text → change appears immediately in Figma.

### 🎨 Read design tokens

> **"Read all the design variables from Figma using the bridge"**

**What happens:** Copilot calls `bridge_read_variables` → plugin reads all local variables via `figma.variables.getLocalVariablesAsync()` → returns names, types, values, and collections.

### ➕ Create a design token

> **"Create a color variable called 'brand-primary' with value #0D99FF in Figma"**

**What happens:** Copilot calls `bridge_create_variable` → plugin creates a new variable in the specified collection.

---

## Full Checklist

Use this checklist to confirm your setup:

- [ ] `npm install` completed without errors
- [ ] `npm run plugin:build` produces `figma-plugin/code.js`
- [ ] `npm run bridge` shows `WebSocket server listening on ws://localhost:9001`
- [ ] Plugin loaded in Figma via **Import plugin from manifest**
- [ ] Plugin UI shows 🟢 **Connected**
- [ ] Bridge terminal shows `✅ Figma plugin connected`
- [ ] Copilot `bridge_ping` returns `"pong"`
- [ ] `bridge_read_node` returns node data for a known node ID
- [ ] `bridge_create_component` converts a frame to a component in Figma

---

## Architecture Recap

```
You (natural language)
  │
  ▼
Copilot Agent Mode
  │ calls bridge_* MCP tools
  ▼
figma-bridge MCP Server (stdio)     ← src/bridge/mcp-server.ts
  │ in-process call
  ▼
Bridge WebSocket Server              ← src/bridge/server.ts
  │ ws://localhost:9001
  ▼
Figma Plugin UI (iframe)             ← figma-plugin/ui.html
  │ postMessage
  ▼
Figma Plugin Main Thread             ← figma-plugin/code.ts
  │ figma.* API calls
  ▼
Figma File (live changes)
```

---

## Quick Reference: All Bridge Tools

| Copilot Prompt | MCP Tool Called | What It Does |
|---|---|---|
| *"Ping the Figma bridge"* | `bridge_ping` | Check connection |
| *"Read node 1:5 from Figma"* | `bridge_read_node` | Get node properties |
| *"Show the Figma page tree"* | `bridge_read_tree` | Get node hierarchy |
| *"Convert node 1:5 to a component"* | `bridge_create_component` | Frame → Component |
| *"Update text in node 3:12"* | `bridge_update_node` | Modify node properties |
| *"Read Figma design tokens"* | `bridge_read_variables` | List all variables |
| *"Create a color variable"* | `bridge_create_variable` | New design token |
| *"Update variable value"* | `bridge_update_variable` | Modify token value |
