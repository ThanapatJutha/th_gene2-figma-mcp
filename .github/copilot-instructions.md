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
| `figma/showcase/` | **Capture helper** — Vite + React app for rendering components before Figma capture |
| `figma/showcase/src/components/DSPageTemplate.tsx` | **Reusable template** for DS page layout (header + per-property sections + masters) |
| `figma/showcase/src/pages/*.tsx` | Component-specific pages using DSPageTemplate |
| `packages/gene2-figma-mcp/src/bridge/` | Bridge implementation (serves WS + dashboard on port 9001) |
| `packages/gene2-figma-mcp/dashboard/` | Standalone Vite + React dashboard UI — served at `http://localhost:9001/ui/` |
| `figma-docs/plugin/` | Plugin implementation |

**Rule:** `figma/components/*.figma.tsx` files are **real, renderable React components** that wrap the project's UI library. They contain only visual/style code — never business logic.
**Rule:** Changes *only* in `figma/showcase/` are **partial progress**, not completion. Post-processing in Figma is required.

---

## 3 · Global completion invariant

A Figma-library task is **complete** only when ALL of these exist:

- [ ] Figma page created for the component (one page per component)
- [ ] Master components created with property-based naming (`size=md, variant=solid, …`)
- [ ] Design tokens created as Figma variables and applied to components
- [ ] Templates discovered and instanced (or fallbacks used)
- [ ] `.figma.tsx` React component files saved in `figma/components/` (via `bridge_save_component_spec`)
- [ ] Mappings saved in `figma/app/.figma-sync/connections.json` (via `bridge_save_connections`)
- [ ] Work is NOT only in `figma/showcase/`

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
| `bridge_combine_as_variants` | Combine COMPONENTs into COMPONENT_SET |
| `bridge_swap_with_instance` | Replace a node with a component instance |
| `bridge_promote_and_combine` | **Batch:** promote frames → COMPONENTs → COMPONENT_SET in one call |
| `bridge_swap_batch` | **Batch:** swap multiple nodes with component instances |
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

## 6 · Usecase 1 — Create DS Component Page

> **STOP:** Before starting, read `.github/copilot/usecases/01-create-ds-component-page.md`
> for full detail. The summary below is the minimum behavioral contract.

### Usecase detection

When a user prompt mentions a UI library (URL or name), a component name,
or phrases like "create DS page", "design system page", "component page":

1. **If confident it's this usecase →** Proceed with the workflow.
2. **If not sure →** Ask the user to confirm which usecase applies.

### Workflow: Parse → Explore → Suggest → Confirm → Build → Capture → Post-process → Save

1. **Parse** — extract component name(s), library, Figma file key from user prompt
2. **Explore library** — read component source code + apply built-in knowledge
   to detect properties (variant, size, state, etc.)
3. **Suggest properties** — present properties table to user for confirmation
   - Show each property with its options
   - User can add/remove/change before proceeding
   - Display sections are **per-property**: 4 variants + 3 sizes = 7 display items
   - Master components are **cross-product**: 4 variants × 3 sizes = 12 masters (required for Figma variant picker)
4. **Build showcase page** — create/update React page at `figma/showcase/src/pages/{Name}.tsx`
   - Uses `DSPageTemplate` component for consistent layout
   - Start dev server: `cd figma/showcase && ./node_modules/.bin/vite --port 5173`
5. **Capture to Figma** — `generate_figma_design` with `?component={Name}` URL
6. **Post-process** — create Figma page, move captured frame, then:
   - Identify the **inner component frames** inside each master cell (NOT the container cells — see guardrail 9)
   - `bridge_promote_and_combine` — promote inner component frames → COMPONENTs → COMPONENT_SET
   - `bridge_swap_batch` — swap property section items with real instances (optional)
7. **Save artifacts**
   - `bridge_save_component_spec` → `.figma.tsx` in `figma/components/`
   - `bridge_save_connections` → all component mappings

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
      "figmaComponentName": "size=md, variant=solid, state=default, type=default",
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
 * Figma DS Page: Button
 * Library: shadcn/ui
 * Master components: size=md,lg × variant=solid,outline,ghost,destructive × state=default,hover,pressed,disabled
 * Figma page node: 42:100
 * Source: src/components/ui/button.tsx
 */
export default function ButtonFigma() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 16 }}>
      {/* Solid variants */}
      <div style={{ display: "flex", gap: 12 }}>
        <Button variant="default">Solid Default</Button>
        <Button variant="default" disabled>Solid Disabled</Button>
      </div>
      {/* Outline variants */}
      <div style={{ display: "flex", gap: 12 }}>
        <Button variant="outline">Outline Default</Button>
        <Button variant="outline" disabled>Outline Disabled</Button>
      </div>
      {/* Ghost variants */}
      <div style={{ display: "flex", gap: 12 }}>
        <Button variant="ghost">Ghost Default</Button>
        <Button variant="ghost" disabled>Ghost Disabled</Button>
      </div>
      {/* Destructive variants */}
      <div style={{ display: "flex", gap: 12 }}>
        <Button variant="destructive">Destructive Default</Button>
        <Button variant="destructive" disabled>Destructive Disabled</Button>
      </div>
      {/* Sizes */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Button size="lg">Large</Button>
        <Button size="default">Medium</Button>
        <Button size="sm">Small</Button>
      </div>
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
2. **Showcase is a capture helper.** `figma/showcase/` renders components for Figma capture. It is never a deliverable on its own — post-processing in Figma is required.
3. **Library detection:** Read target `package.json` and use the exact detected library. If unclear, ask.
4. **Property-based naming:** Use `{property}={value}` format for master components (e.g., `variant=solid`). See `rules/04-layout-constants.md`.
5. **Preserve dimensions** when converting to components. Validate no layout drift after conversion.
6. **Two layout strategies — know which to use:**
   - **Display sections** (per-property): Each property gets its own section showing only that property's options. 4 variants + 3 sizes = 7 display items, NOT 12.
   - **Master components** (cross-product): ALL property combinations must exist for Figma's variant picker. 4 variants × 3 sizes = 12 master components. Without cross-product masters, users can't select arbitrary combinations like `variant=secondary, size=lg`.
7. **Must suggest properties first.** Before building, present detected properties to the user and get confirmation. See `rules/05-variant-inference.md`.
8. **Use batch tools for post-processing.** Use `bridge_promote_and_combine` and `bridge_swap_batch` instead of individual calls.
9. **Promote the INNER component frame, not the container cell.** Each master cell in the captured page has structure: Container (200×120) → ComponentFrame (~59×22) + LabelText. When promoting to a Figma Component, target the **inner component frame** (the actual visual element), NOT the outer container cell. Promoting the container would make the component include the label text and whitespace. Identify inner frames by their smaller dimensions and component-matching name (e.g., "Badge", "Button").
10. **Figma file key:** Read from `figma/config/figma.config.json` first. If user provides one, use that. Never fabricate a key.
11. **One page per component.** Each component (Button, Card, etc.) gets its own Figma page.
12. **Dev server:** Use `./node_modules/.bin/vite`, NOT `npx vite` — npx may use globally cached Vite 6 which is incompatible.
13. **Capture URL:** Use `?component=Name` query param, NOT hash routing (`#Name`) — Figma capture uses the hash.

---

## 10 · Deep-reference sub-files

Read these with tools when you need additional detail:

| File | When to read |
|------|-------------|
| `.github/copilot/00-overview-and-global-rules.md` | Architecture details, source-of-truth rules |
| `.github/copilot/usecases/01-create-ds-component-page.md` | Full Create DS Component Page workflow |
| `.github/copilot/usecases/02-discover-and-convert.md` | Full Discover & Convert workflow |
| `.github/copilot/rules/01-read-and-update-nodes.md` | Node manipulation patterns |
| `.github/copilot/rules/02-design-tokens.md` | Token naming convention, minimum token set, creation workflow |
| `.github/copilot/rules/03-component-spec-layer.md` | React UI component file rules |
| `.github/copilot/rules/04-layout-constants.md` | Layout constants, grid formulas, batch-by-size pattern, property naming |
| `.github/copilot/rules/05-variant-inference.md` | Known variant structures per library, clarification rules |
| `.github/copilot/rules/06-template-discovery.md` | Template naming, discovery process, fallback behavior |
| `.github/copilot/04-troubleshooting.md` | Common issues + fixes |
| `.github/copilot/05-component-creation-best-practices.md` | Naming, dimensions, drift |
| `.github/copilot/06-file-reference.md` | Full file map |
