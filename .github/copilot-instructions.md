# Gene2 Figma MCP — Copilot Instructions

> **Always-on context.** Contains only broad standards and conventions that
> apply to every interaction. Specialized workflows live in
> `.github/skills/` and are loaded automatically when relevant.

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
| `bridge_read_node` | Read node properties |
| `bridge_read_tree` | Read full node tree |
| `bridge_list_layers` | List layers + component-candidate detection |
| `bridge_list_components` | List existing Figma Components on page |
| `bridge_create_component` | Promote frame/group → reusable Component |
| `bridge_create_instance` | Create instance of a master component |
| `bridge_create_node` | Create FRAME or TEXT |
| `bridge_update_node` | Update position, text, fills, dimensions |
| `bridge_delete_node` | Delete a node |
| `bridge_move_node` | Move node across pages/frames |
| `bridge_reorder_children` | Reorder children of a frame |
| `bridge_create_page` | Create a new Figma page |
| `bridge_set_current_page` | Switch active page |
| `bridge_combine_as_variants` | Combine COMPONENTs into COMPONENT_SET |
| `bridge_swap_with_instance` | Replace a node with a component instance |
| `bridge_promote_and_combine` | **Batch:** promote → COMPONENTs → COMPONENT_SET |
| `bridge_swap_batch` | **Batch:** swap multiple nodes with instances |
| `bridge_read_variables` | Read design tokens |
| `bridge_create_variable` | Create design token |
| `bridge_update_variable` | Update design token |

### Local commands (no plugin needed)

| Tool | Use for |
|------|---------|
| `bridge_read_config` | Read `figma.config.json` |
| `bridge_read_connections` | Read `connections.json` |
| `bridge_save_connections` | Save code ↔ Figma mappings |
| `bridge_list_component_specs` | List all `.figma.tsx` files |
| `bridge_read_component_spec` | Read a `.figma.tsx` file |
| `bridge_save_component_spec` | Save a `.figma.tsx` React component file |
| `bridge_list_project_components` | Scan codebase for exported components |
| `bridge_read_component_source` | Read component source + imports |
| `bridge_read_layer_map` | Read layer map |
| `bridge_save_layer_map` | Save layer map entry |

---

## 6 · Guardrails (always enforce)

1. **`.figma.tsx` = real renderable React components.** Visual/style only — no business logic. Business logic stays in `src/`.
2. **Showcase ≠ deliverable.** `figma/showcase/` is a capture helper — post-processing in Figma is always required.
3. **Library detection:** Read `package.json`, use the exact detected library. If unclear, ask.
4. **Property-based naming:** `{property}={value}` format (e.g., `variant=solid, size=md`).
5. **Preserve dimensions** when converting to components.
6. **Display sections vs. master components:** Display sections are per-property; master components are the cross-product of all properties (required for Figma's variant picker).
7. **Suggest properties first** before building. Get user confirmation.
8. **Batch tools for post-processing:** Use `bridge_promote_and_combine` and `bridge_swap_batch`.
9. **Promote direct children of the master container.** The showcase template renders bare components (no container cells or labels). Promote the direct children directly — no inner/outer frame distinction needed.
10. **Figma file key:** Read from config first. Never fabricate.
11. **One page per component.**
12. **Dev server:** Use `./node_modules/.bin/vite`, NOT `npx vite`.
13. **Capture URL:** Use `?component=Name` query param, NOT hash routing.
14. **Always use bridge MCP tools for Figma data.** Never parse tree JSON with scripts (Python, Node, etc.). Use `bridge_read_tree`, `bridge_read_node`, `bridge_list_layers`, `bridge_list_components` to inspect Figma data. Use `bridge_create_component`, `bridge_promote_and_combine` to modify. External scripts add fragility, terminal corruption, and bypass the bridge protocol.
15. **Capture-first for DS pages.** Always use the capture workflow (showcase → capture → post-process) for creating DS component pages. Direct bridge creation is a last resort — only when capture is explicitly unavailable or user requests it.

---

## 7 · Skills (auto-loaded when relevant)

Specialized multi-step workflows are defined as agent skills in `.github/skills/`.
Copilot loads them automatically based on the user's prompt — no manual reading needed.

| Skill | Triggers on |
|-------|------------|
| `create-ds-component-page` | "create DS page", "design system page", component + library name |
| `discover-and-convert` | "discover components", "convert layers", scanning existing Figma files |
| `figma-node-manipulation` | Node CRUD operations, reading/updating Figma nodes |
| `design-tokens` | Token creation, variables, design token management |
| `component-spec-layer` | `.figma.tsx` file creation, `connections.json` management |
