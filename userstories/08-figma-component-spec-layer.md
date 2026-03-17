# Epic 8: Figma Component Spec Layer (`/figma/components/*.figma.ts`)

> Add a dedicated design-contract layer between code components and live Figma nodes, so developer/designer changes can sync both ways with a stable, versioned source.

## Context

Today we have:

- Component linkage (`.figma-sync/connections.json`): **which code component maps to which Figma node**
- Live node reads (`bridge_read_node`): runtime snapshot from plugin
- Variable reads (`bridge_read_variables`): token catalog

What we do **not** have:

- A persisted component style/spec file in git
- A stable intermediate contract that Copilot can read directly for style reuse
- A spec-first workflow for two-way sync

This epic introduces:

- `figma/components/*.figma.ts` files (typed design contracts)
- MCP tools to generate and push specs
- Clear Copilot workflow for dev/design separation

---

## Decision Log

- [x] Reuse current MCP stack where possible
- [x] Use `TypeScript` spec files (`.figma.ts`) as canonical format
- [x] Keep `connections.json` as mapping index (unchanged role)
- [ ] Extend plugin node serialization for richer style fields

---

## User Stories

### 8.1 — Define canonical spec schema (`.figma.ts`)

**As a** developer  
**I want** a typed `FigmaComponentSpec` schema  
**So that** component specs are consistent, validated, and easy for Copilot to consume

**Acceptance Criteria:**
- [ ] `FigmaComponentSpec` type is defined in shared protocol/types
- [ ] Schema covers core visual fields: dimensions, fills, strokes, radii, typography, spacing, layout, visibility
- [ ] Schema includes metadata: `figmaNodeId`, `figmaComponentName`, `codeComponent`, `linkedAt`
- [ ] Schema supports children and variants
- [ ] Schema supports optional token references (variable names/ids)

**Tasks:**
- [ ] Add `FigmaComponentSpec` + helper subtypes in [src/protocol.ts](src/protocol.ts)
- [ ] Add schema version field (e.g. `specVersion: 1`)
- [ ] Create sample spec object for one existing component (HeaderCard or CounterCard)

---

### 8.2 — Generate spec files from existing mappings

**As a** developer  
**I want** to generate `/figma/components/*.figma.ts` from current Figma links  
**So that** every mapped component gets a local, versioned style contract

**Acceptance Criteria:**
- [ ] New MCP tool generates specs for all or selected mapped components
- [ ] Tool reads from existing `connections.json`
- [ ] Tool reads live node data via `bridge_read_node`
- [ ] Tool reads variables via `bridge_read_variables`
- [ ] Output files are written to `figma/components/*.figma.ts`
- [ ] Re-running generation updates files deterministically (stable order/format)

**Tasks:**
- [ ] Add local handler command: `generate-component-spec`
- [ ] Add MCP tool: `bridge_generate_component_spec`
- [ ] Implement writer utility with deterministic TS output
- [ ] Add `componentSpecDir` in [figma.config.json](figma.config.json)

---

### 8.3 — Enrich plugin serializer for full style fidelity

**As a** developer  
**I want** richer node serialization from the plugin  
**So that** generated `.figma.ts` files contain enough style detail for reliable two-way sync

**Acceptance Criteria:**
- [ ] `read-node` includes missing high-value fields (at minimum):
  - [ ] `opacity`
  - [ ] `effects`
  - [ ] text details (`lineHeight`, `letterSpacing`, align/decorations where available)
  - [ ] auto-layout details (`itemSpacing`, axis sizing/alignment)
  - [ ] token linkage (`boundVariables` or equivalent resolved references)
- [ ] Existing consumers of `bridge_read_node` remain backward compatible
- [ ] TypeScript build passes for plugin and bridge

**Tasks:**
- [ ] Extend `serializeNode()` in [figma-plugin/code.ts](figma-plugin/code.ts)
- [ ] Update shared serialized node type in [src/protocol.ts](src/protocol.ts)
- [ ] Validate on representative nodes (text, frame, component)

---

### 8.4 — Push `.figma.ts` spec deltas back to Figma

**As a** designer/developer  
**I want** to update Figma from local `.figma.ts` changes  
**So that** style edits in code can sync back to the mapped Figma component

**Acceptance Criteria:**
- [ ] New MCP tool reads a local spec file and targets mapped node
- [ ] Tool computes diff (spec vs live node)
- [ ] Tool applies minimal updates via `bridge_update_node`
- [ ] Dry-run mode shows proposed patch before applying
- [ ] Report includes applied and skipped fields

**Tasks:**
- [ ] Add local handler command: `push-component-spec`
- [ ] Add MCP tool: `bridge_push_component_spec`
- [ ] Implement diff engine + field-by-field updater
- [ ] Add safety: only mapped nodes from `connections.json` are writable

---

### 8.5 — Copilot-first developer workflow

**As a** team member  
**I want** any Copilot agent to know where style truth lives  
**So that** style copy/reuse requests are deterministic and consistent

**Acceptance Criteria:**
- [ ] Copilot instructions include explicit workflow:
  - “Read style from `figma/components/*.figma.ts` first”
  - “Generate/update spec before push/pull operations when stale”
- [ ] Example prompts for developers and designers are documented in repo instructions
- [ ] Existing workflows (bootstrap/componentize/push/pull) remain valid

**Tasks:**
- [ ] Update [.github/copilot-instructions.md](.github/copilot-instructions.md)
- [ ] Add guidance to docs pages under approach/usecases (no new standalone markdown requested in this step)
- [ ] Add one end-to-end validation script scenario

---

## Delivery Plan (Implementation Order)

1. **8.1 schema**
2. **8.2 generate tool (basic fields)**
3. **8.3 serializer enrichment**
4. **8.2 regenerate with enriched fields**
5. **8.4 push tool**
6. **8.5 copilot workflow updates**

---

## Definition of Done

- [ ] `figma/components/` exists with generated `.figma.ts` specs for mapped components
- [ ] Spec generation and push are available via MCP tools
- [ ] Plugin serializer includes required high-fidelity fields
- [ ] Changes in `.figma.ts` can be synced back to Figma for supported fields
- [ ] Team can ask Copilot to copy style from spec files reliably
