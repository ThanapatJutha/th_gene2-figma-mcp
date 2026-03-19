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

- [ ] Figma page created for the component (one page per component)
- [ ] Master components created with property-based naming (`size=md, variant=solid, …`)
- [ ] Design tokens created as Figma variables and applied to components
- [ ] Templates discovered and instanced (or fallbacks used)
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

## 6 · Usecase 1 — Create DS Component Page

> **STOP:** Before starting, read `.github/copilot/usecases/01-create-ds-component-page.md`
> for full detail. The summary below is the minimum behavioral contract.

### Usecase detection

When a user prompt mentions a UI library (URL or name), a component name,
or phrases like "create DS page", "design system page", "component page":

1. **If confident it's this usecase →** Suggest the 2-prompt approach:
   > "This looks like a Create DS Component Page task. I recommend 2 prompts:
   > (1) create header + master components, (2) optionally add variants table.
   > Shall I start?"
2. **If not sure →** Ask the user to confirm which usecase applies.

### Why 2 prompts?

Each prompt is a natural stopping point:
- Prompt 1 → Header + master components created, tokens applied, artifacts saved
- Prompt 2 (optional) → Variants table added with instances of masters

### Prompt 1 — Create the DS component page

1. **Identify library + component** from user's prompt
2. **Infer variants & states** — use known structures from `rules/05-variant-inference.md`
   - Present variant plan to user for confirmation
   - If ambiguous, ask before proceeding
3. **Create design tokens** — `bridge_read_variables` then `bridge_create_variable`
   - Follow naming convention from `rules/02-design-tokens.md`
4. **Discover templates** — `bridge_list_components` to find `T Header`, `T Section Header`, etc.
   - Follow rules from `rules/06-template-discovery.md`
5. **Create new page** — `bridge_create_page` + `bridge_set_current_page`
6. **Build Section 3 — Master components** (built FIRST)
   - Follow batch-by-size-tier pattern from `rules/04-layout-constants.md`
   - Default: 2 sizes × 6 variants × 4 states × 1 type = 48 components
   - Property naming: `size=md, variant=solid, state=default, type=default`
   - Each component: `bridge_create_node` → `bridge_create_node(TEXT)` → `bridge_create_component`
   - Apply token fills using the token-to-fill mapping table (see usecase file)
   - Position in grid: `x = col * 128`, `y = row * 68` (6 cols per row)
   - Add `T Section Header` ("✏️ Master Component") above the grid
7. **Build Section 1 — Header**
   - Instance `T Header` (`bridge_create_instance`) or create fallback frame
   - Set breadcrumb: `"PALO IT · Components → {Name}"`
   - Set title: `"{Name}"`
   - Set description: auto-generate from component type (see usecase file for table)
   - Add documentation link placeholder
   - Position at `y = 0`
8. **Add dividers** between sections
   - Instance `T Divider` or create FRAME(width=1200, height=1, gray fill)
   - Use `DIVIDER_GAP = 40` spacing before/after
9. **Save code artifacts**
   - `bridge_save_component_spec` → `.figma.tsx` in `figma/components/`
   - `bridge_save_connections` → all component mappings

#### Build order (mandatory)

Section 3 (masters) → Section 1 (header) → Dividers → Save artifacts

Section 3 is built first so Section 2 (variants table) can instance them later.

### Prompt 2 (optional) — Add variants table

1. Read existing master components from the page (`bridge_list_components`)
2. Build lookup map: property name → master component ID
3. Add `T Section Header` ("✏️ Variants") at top of section
4. Create column header row with state labels (Default, Hover, Pressed, Disabled)
5. Build Section 2 using row-by-row pattern from `rules/04-layout-constants.md`
   - Each row = 1 variant, columns = states, cells = instances of masters
   - Use `DISPLAY_SIZE = "md"` for instances in the table
   - Each row: `bridge_create_node(FRAME)` → `bridge_create_node(TEXT)` label → N × `bridge_create_instance`
   - Fallback: if master not found, create placeholder TEXT node
6. Add dividers between sections
7. Reorder page: Header → Divider → Variants → Divider → Masters

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
2. **Showcase is temporary.** It exists only to render components for Figma capture. It is never a deliverable.
3. **Library detection:** Read target `package.json` and use the exact detected library. If unclear, ask.
4. **Property-based naming:** Use `size=md, variant=solid, state=default, type=default` for master components. See `rules/04-layout-constants.md` for exact format.
5. **Preserve dimensions** when converting to components. Validate no layout drift after conversion.
6. **Design tokens are mandatory.** Create Figma variables for colors — never hardcode hex values in master components. See `rules/02-design-tokens.md`.
7. **Template discovery first.** Before building a DS page, discover templates via `bridge_list_components`. Use fallbacks if templates are missing. See `rules/06-template-discovery.md`.
8. **Build order: Section 3 → 2 → 1.** Master components first, then variants table (if needed), then header. See `rules/04-layout-constants.md`.
9. **Figma file key:** Read from `figma/config/figma.config.json` first. If user provides one, use that. Never fabricate a key.
10. **One page per component.** Each component (Button, Card, etc.) gets its own Figma page.

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
