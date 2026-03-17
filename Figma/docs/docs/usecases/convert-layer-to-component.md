---
sidebar_position: 1
slug: /usecases/convert-layer-to-component
---

# Convert Layer to Component

Convert any Figma frame, group, or rectangle layer into a **reusable Figma component** — entirely through a Copilot prompt.

## Why?

In Figma, components are the building blocks of a design system. Converting existing layers into components allows designers and developers to:

- Create **reusable**, consistent UI elements
- Enable **instances** that stay in sync with the master component
- Build a **component library** that mirrors your codebase

With the Figma Sync Bridge, you can do this **from VS Code** without switching to Figma manually.

## Prerequisites

Make sure the Plugin Bridge is fully set up:

- ✅ Bridge server running (`npm run bridge`)
- ✅ Figma plugin open and showing 🟢 **Connected**
- ✅ Copilot Agent Mode enabled in VS Code

See [Getting Started](/docs/getting-started) for the full setup guide.

![Plugin connected to the bridge](/img/plugin-connected.png)

:::tip
The plugin window must stay open in Figma while using bridge commands. You can resize it small and tuck it in a corner.
:::

## How to Prompt

### Basic: Convert by node ID

If you know the Figma node ID (visible in the URL when selecting a layer):

> **"Convert Figma node 1:17 to a component named CounterCard"**

### Using a Figma URL

You can paste a Figma URL directly — Copilot will extract the node ID:

> **"Change this layer to be a component https://www.figma.com/design/ghwHnqX2WZXFtfmsrbRLTg/Figma-Sync---POC-React-App?node-id=1-17"**

### Without specifying a name

Copilot will use the existing layer name:

> **"Convert node 1:17 to a component"**

### With a description

> **"Convert node 1:17 to a component named CounterCard with description 'A card that displays a counter with increment/decrement buttons'"**

## What Happens Behind the Scenes

```
Your prompt: "Convert node 1:17 to a component named CounterCard"
  │
  ▼
Copilot calls → bridge_create_component
  │  params: { nodeId: "1:17", name: "CounterCard" }
  ▼
Bridge WebSocket Server relays → Figma Plugin
  │
  ▼
Plugin executes:
  1. figma.getNodeByIdAsync("1:17")    → finds the frame
  2. figma.createComponent()            → creates a new component
  3. Copies size, position, styles      → matches the original
  4. Moves all children into component  → preserves the design
  5. Removes the original frame         → clean swap
  6. Selects the new component          → visible in Figma
  │
  ▼
Response: { id: "2:100", name: "CounterCard", type: "COMPONENT" }
```

## Expected Result

After the command executes:

| Before | After |
|--------|-------|
| 📁 Frame "Counter" | ◆ Component "CounterCard" |
| Layer type: `FRAME` | Layer type: `COMPONENT` |
| Not reusable | Reusable as instances |

In Figma's **Layers panel**, you'll see the ◆ diamond icon indicating the layer is now a component. It will also appear in the **Assets panel** for drag-and-drop reuse.

## Supported Layer Types

| Layer Type | Can Convert? | Notes |
|------------|-------------|-------|
| `FRAME` | ✅ Yes | Most common — copies layout, fills, strokes, auto-layout |
| `GROUP` | ✅ Yes | Moves children into a new component |
| `RECTANGLE` | ✅ Yes | Creates a component with the rectangle's dimensions |
| `TEXT` | ❌ No | Text nodes cannot be converted directly |
| `ELLIPSE` | ❌ No | Shape nodes are not supported |
| `COMPONENT` | ❌ No | Already a component |

## Troubleshooting

| Issue | Cause | Fix |
|-------|-------|-----|
| "Figma plugin not connected. Command queued" | Plugin window not open | Open the plugin in Figma — queued command will execute automatically |
| "Node not found: 1:17" | Wrong node ID or different file | Check the node ID in the Figma URL |
| "Cannot convert TEXT to component" | Unsupported node type | Wrap the text in a frame first, then convert the frame |
| Command succeeds but nothing changes | Looking at wrong page | Make sure you're on the right page in Figma |

## Example Prompts

Here are more prompt variations you can use:

| Prompt | What It Does |
|--------|-------------|
| *"Convert node 1:5 to a component"* | Uses existing layer name |
| *"Make this a component: [Figma URL]"* | Extracts node ID from URL |
| *"Convert node 1:17 to a component named CounterCard"* | Explicit name |
| *"Turn the frame at node 1:42 into a component called ToggleSwitch with description 'A toggle switch for boolean settings'"* | Name + description |
