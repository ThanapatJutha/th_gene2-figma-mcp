# Gene2 Figma MCP — Copilot Instructions

> **Auto-read by Copilot on every prompt.** This is the ONLY file Copilot reads
> automatically. All critical rules MUST live here. Sub-files exist for
> deep reference only — read them with tools when you need extra detail.

---

## 1 · Architecture

`gene2-figma-mcp` bridges VS Code ↔ Figma via two MCP servers:

| Server | Transport | Purpose |
|--------|-----------|---------|
| `figma` | HTTP (`mcp.figma.com`) | Official Figma MCP — capture, design context |
| `figma-bridge` | stdio (local) | Custom bridge — node CRUD, components, specs, tokens |

Data flow: **Copilot → MCP → Bridge (port 9001) → Figma Plugin**

Prerequisites: bridge running (`npm run bridge`), Figma plugin connected,
agent mode enabled, valid Figma file key.

### Figma file key

Many operations need the target Figma file key. To find it:
1. **Check `figma/config/figma.config.json`** — look for `figmaFileKey`.
2. If not configured, **ask the user** for the Figma file URL or key.
3. **Never guess or fabricate a file key.** An invalid key silently fails.

---

## 2 · Project structure (never violate)

| Path | Purpose |
|------|---------|
| `src/` | Runtime / product code (business logic lives here) |
| `figma/components/*.figma.tsx` | **React UI components** — visual shell only (style + layout, NO business logic) |
| `figma/config/figma.config.json` | Project config (file key, component spec dir, etc.) — **persistent, never deleted** |
| `figma/app/.figma-sync/connections.json` | Code ↔ Figma mappings (written by bridge) |
| `figma/pages/showcase/` | **Temporary** capture helper — NOT a deliverable |
| `packages/gene2-figma-mcp/src/bridge/` | Bridge implementation (serves WS + dashboard on port 9001) |
| `packages/gene2-figma-mcp/dashboard/` | Standalone Vite + React dashboard UI — served at `http://localhost:9001/ui/` |
| `figma-docs/plugin/` | Plugin implementation |

**Rule:** `figma/components/*.figma.tsx` files are **real, renderable React components** that wrap the project's UI library. They contain only visual/style code — never business logic.
**Rule:** Changes *only* in `figma/pages/showcase/` are **partial progress**, not completion.

---

## 3 · Global completion invariant

A Figma-library task is **complete** only when ALL of these exist:

- [ ] Components promoted in Figma (via `bridge_create_component`)
- [ ] `.figma.tsx` React component files saved in `figma/components/` (via `bridge_save_component_spec`)
- [ ] Mappings saved in `figma/app/.figma-sync/connections.json` (via `bridge_save_connections`)
- [ ] Work is NOT only in `figma/pages/showcase/`

---

## 4 · Source-of-truth order

Always consult in this order before making changes:
1. `figma/config/figma.config.json` (project config, file key)
2. `connections.json` (mapping state)
3. `figma/components/*.figma.tsx` (React UI components)
4. Live node data from bridge read calls

---

## 5 · MCP tools available

### Plugin commands (require bridge + plugin)

| Tool | Use for |
|------|---------|
| `bridge_ping` | Check plugin connectivity |
| `bridge_read_node` | Read node properties (type, fills, text, children) |
| `bridge_read_tree` | Read full node tree |
| `bridge_list_layers` | List layers + component-candidate detection |
| `bridge_list_components` | List existing Figma Components on page |
| `bridge_create_component` | **Promote** frame/group → reusable Component |
| `bridge_create_instance` | Create instance of a master component |
| `bridge_create_node` | Create FRAME or TEXT (fallback) |
| `bridge_update_node` | Update position, text, fills, dimensions |
| `bridge_delete_node` | Delete a node |
| `bridge_move_node` | Move node across pages/frames |
| `bridge_reorder_children` | Reorder children of a frame |
| `bridge_create_page` | Create a new Figma page |
| `bridge_set_current_page` | Switch active page |
| `bridge_read_variables` | Read design tokens |
| `bridge_create_variable` | Create design token |
| `bridge_update_variable` | Update design token |

### Local commands (no plugin needed)

| Tool | Use for |
|------|---------|
| `bridge_read_config` | Read `figma.config.json` |
| `bridge_read_connections` | Read `connections.json` |
| `bridge_save_connections` | **Save** code ↔ Figma mappings |
| `bridge_list_component_specs` | List all `.figma.tsx` component files |
| `bridge_read_component_spec` | Read a `.figma.tsx` file |
| `bridge_save_component_spec` | **Save** a `.figma.tsx` React component file |
| `bridge_list_project_components` | Scan codebase for exported components |
| `bridge_read_component_source` | Read component source + imports |
| `bridge_read_layer_map` | Read layer map |
| `bridge_save_layer_map` | Save layer map entry |

---

## 6 · Usecase 1 — Bootstrap from URL

> **STOP:** Before starting, read `.github/copilot/usecases/01-bootstrap-from-url.md`
> for full detail. The summary below is the minimum behavioral contract.

### Usecase detection

When a user prompt looks like it matches this usecase (mentions a URL, a UI
library, "create Figma components from…", "capture…", etc.):

1. **If confident it's this usecase →** Suggest the 3-prompt approach:
   > "This looks like a Bootstrap-from-URL task. For best results I recommend
   > splitting this into 3 prompts: (1) build showcase, (2) capture into Figma,
   > (3) componentize & persist. Shall I start with Prompt 1?"
2. **If not sure →** Ask the user to confirm which usecase applies.
3. **If the user insists on doing everything in one prompt →** Proceed, but
   warn that quality may be lower because the context window must cover
   scaffold + capture + componentize in a single session.

### Why 3 prompts?

Each prompt is a natural stopping point that produces a verifiable result:
- Prompt 1 → dev server running, components visible in browser
- Prompt 2 → frames visible in the Figma file
- Prompt 3 → `.figma.tsx` components + connections saved (completion gate met)

Combining all 3 in one session risks context overflow and makes debugging
harder when any step fails.

### Prompt 1 — Build showcase app (skip for external URL)
- Scaffold Vite + React in `figma/pages/showcase/`
- Read target `package.json` → detect and use the exact installed UI library
- Render **full variant coverage** (all states visible, no interactions needed)
- Serve on `http://localhost:5173`
- ⚠️ **This step alone is NOT completion**

#### Scaffold checklist (do every time)
1. **Check Node version** — scaffolding tools have minimum Node requirements
   (e.g., Vite 6+ needs Node ≥ 20.19 or ≥ 22.12). Run `node --version` first.
   If too old, upgrade via `nvm install <version>` before scaffolding.
2. **Remove nested `.git`** — `create-vite` (and similar tools) create their
   own `.git` inside the scaffolded folder. This breaks VS Code's git
   tracking. Always run `rm -rf .git` inside the scaffold folder immediately.
3. **Read the detected library's setup docs** — don't assume config patterns.
   For example, Tailwind CSS v4 uses `@import "tailwindcss"` instead of a
   config file; other libraries have their own init quirks. When in doubt,
   check the library's latest docs before configuring.
4. **Verify dev server starts** — after installing dependencies and
   configuring the project, start the dev server and confirm it responds
   (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → 200)
   before telling the user Prompt 1 is done.
5. **Ensure `nvm use` in new terminals** — each new terminal may revert to the
   system Node. Source nvm and switch to the required version before running
   commands.

### Prompt 2 — Capture into Figma
- Read `figma/config/figma.config.json` → get `figmaFileKey`. If user provided a
  file key or URL in their prompt, use that instead.
- Use official `figma` MCP to capture the URL into the target Figma file
- **Copilot decides the capture strategy** — for external URLs, prefer
  Playwright-based capture (slow-scroll, force eager images, resize viewport)
  to handle lazy-loaded content. The user does NOT need to specify this.
- Poll capture status until completed
- ⚠️ **Capture alone is still NOT completion**

### Prompt 3 — Componentize and persist code artifacts
1. `bridge_list_layers` — discover frames in captured output
2. `bridge_create_component` — promote candidates (use `Category / Variant` naming)
3. `bridge_save_component_spec` — save a **React UI component** (`.figma.tsx`) for
   EVERY promoted component. The component should import and render the
   project's actual UI library component with all visual variants. No business logic.
4. `bridge_save_connections` — save all code ↔ Figma mappings
5. Clean up temporary capture layers if needed

✅ **Done only when the completion gate (section 3) is satisfied.**

---

## 7 · Usecase 2 — Discover & Convert

> **STOP:** Before starting, read `.github/copilot/usecases/02-discover-and-convert.md`.

1. `bridge_list_layers` → identify component candidates
2. `bridge_create_component` → convert eligible nodes (FRAME, GROUP — not TEXT)
3. `bridge_save_component_spec` → save spec for each
4. `bridge_save_connections` → save mappings

✅ **Done only when the completion gate (section 3) is satisfied.**

---

## 8 · Artifact schemas (concrete examples)

### `connections.json`
```jsonc
{
  "version": 1,
  "connections": [
    {
      "figmaNodeId": "42:100",
      "figmaComponentName": "Button / Primary",
      "codeComponent": "Button",
      "file": "src/components/ui/button.tsx",
      "linkedAt": "2026-03-17T12:00:00.000Z"
    }
  ]
}
```

### `figma/components/Button.figma.tsx`

This is a **real React component** that wraps the project's UI library.
It renders the visual shell only — no business logic, no event handlers.

```tsx
import React from "react";
import { Button } from "@/components/ui/button";

/**
 * Figma component: Button / Primary
 * Figma node: 42:100
 * Source: src/components/ui/button.tsx
 */
export default function ButtonFigma() {
  return (
    <div style={{ display: "flex", gap: 12, padding: 16 }}>
      <Button variant="default">Default</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="destructive">Destructive</Button>
      <Button variant="outline">Outline</Button>
      <Button variant="ghost">Ghost</Button>
      <Button disabled>Disabled</Button>
    </div>
  );
}
```

**Key rules for `.figma.tsx` files:**
- Import and render the REAL component from the project's UI library
- Show all visual variants side-by-side
- No `onClick`, no `useState`, no business logic
- Include a JSDoc comment with the Figma node ID and source file path

---

## 9 · Guardrails (always enforce)

1. **`.figma.tsx` files ARE renderable React components.** They wrap the project's real UI library components — visual/style only, **no business logic**. Business logic stays in `src/`.
2. **Showcase is temporary.** It exists only to render components for Figma capture. It is never a deliverable.
3. **Library detection:** Before generating showcase UI, read target `package.json` and use the exact detected library. If unclear, ask.
4. **`Category / Variant` naming:** Use this pattern for promoted components (e.g., `Button / Primary`, `Card / With Footer`).
5. **Preserve dimensions** when converting to components. Validate no layout drift after conversion.
6. **Prefer design tokens** (variables) over hardcoded values where applicable.
7. **Figma file key:** Read from `figma/config/figma.config.json` first. If user provides one, use that. Never fabricate a key.

---

## 10 · Deep-reference sub-files

Read these with tools when you need additional detail:

| File | When to read |
|------|-------------|
| `.github/copilot/00-overview-and-global-rules.md` | Architecture details, source-of-truth rules |
| `.github/copilot/usecases/01-bootstrap-from-url.md` | Full Bootstrap from URL workflow |
| `.github/copilot/usecases/02-discover-and-convert.md` | Full Discover & Convert workflow |
| `.github/copilot/rules/01-read-and-update-nodes.md` | Node manipulation patterns |
| `.github/copilot/rules/02-design-tokens.md` | Variable/token operations |
| `.github/copilot/rules/03-component-spec-layer.md` | React UI component file rules |
| `.github/copilot/04-troubleshooting.md` | Common issues + fixes |
| `.github/copilot/05-component-creation-best-practices.md` | Naming, dimensions, drift |
| `.github/copilot/06-file-reference.md` | Full file map |
