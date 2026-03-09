# Epic 6: Documentation & Component Map UI

> Provide a web-based documentation site with interactive UI so developers and designers can browse guides, CLI references, and view the component-to-Figma mapping visually.

## Context

The CLI tool works, but discoverability is low — you need to know the commands. We need:

1. **Documentation** — how to use the CLI, the MCP approach, the local mapping strategy
2. **Interactive Component Map** — a visual table showing each React component linked to its Figma node, with clickable Figma links
3. **Architecture overview** — explain the push/pull sync approach

### Tool choice: Docusaurus

| Criteria | Docusaurus |
|---|---|
| **Framework** | React (same as our project) |
| **MDX support** | ✅ Native — embed React components in markdown |
| **GitHub stars** | ~64k |
| **License** | MIT |
| **Maintained by** | Meta |
| **Custom pages** | ✅ Full React pages alongside docs |
| **Setup** | One command: `npx create-docusaurus` |

---

## User Stories

### 6.1 — Scaffold documentation site

**Status:** ✅ **DONE**

**Acceptance Criteria:**
- [x] Docusaurus project created in `docs/` folder
- [x] Runs locally via `npm run docs:dev` from repo root (port 4000)
- [x] TypeScript configured
- [x] Separate from CLI (`src/`) and sample app (`poc-react/`)

**Tasks:**
- [x] Run `npx create-docusaurus@latest docs classic --typescript`
- [x] Clean up default boilerplate
- [x] Configure `docusaurus.config.ts` with project name and links
- [x] Add `docs:dev`, `docs:build`, `docs:serve` scripts to root `package.json`

---

### 6.2 — Interactive Component Map page

**Status:** ✅ **DONE**

**Acceptance Criteria:**
- [x] A dedicated page at `/component-map` shows a card grid of all component mappings
- [x] Data inlined from `figma-sync.map.json` (static build compatible)
- [x] Each card shows: component name, file path, Figma node ID, CSS selector
- [x] "Open in Figma" link opens the node in Figma's web UI
- [x] "View Source" link opens the file on GitHub
- [x] Page is accessible from the main navigation
- [x] Search/filter functionality

**Tasks:**
- [x] Create `docs/src/components/ComponentMapTable.tsx`
- [x] Create `docs/src/components/ComponentMapTable.module.css`
- [x] Inline `figma-sync.map.json` data
- [x] Add Figma deep links and GitHub source links
- [x] Style with CSS modules matching Docusaurus theme
- [x] Add to navbar

---

### 6.3 — Getting Started guide

**Status:** ✅ **DONE**

**Acceptance Criteria:**
- [x] Doc page explains: what figma-sync is, prerequisites, setup steps
- [x] Includes how to configure `.env` with Figma token and file key
- [x] Shows first-run example with `map list`
- [x] Includes project structure overview

**Tasks:**
- [x] Write `docs/docs/getting-started.md`

---

### 6.4 — CLI Reference docs

**Status:** ✅ **DONE**

**Acceptance Criteria:**
- [x] Each CLI command documented: `file`, `images`, `nodes`, `map init`, `map add`, `map list`
- [x] Shows usage, options, and example output for each
- [x] Overview page with command table and environment variables

**Tasks:**
- [x] Write `docs/docs/cli/overview.md`
- [x] Write `docs/docs/cli/file.md`
- [x] Write `docs/docs/cli/images.md`
- [x] Write `docs/docs/cli/nodes.md`
- [x] Write `docs/docs/cli/map.md`

---

### 6.5 — MCP Approach & Local Mapping docs

**Status:** ✅ **DONE**

**Acceptance Criteria:**
- [x] Explains the MCP approach (Figma MCP server, rate limits, available tools)
- [x] Explains why local mapping was chosen over Code Connect
- [x] Documents the `figma-sync.map.json` schema
- [x] Includes comparison table: local file vs Code Connect
- [x] Includes migration path to Org/Enterprise plan

**Tasks:**
- [x] Write `docs/docs/approach/mcp-overview.md`
- [x] Write `docs/docs/approach/local-mapping.md`

---

### 6.6 — Architecture overview docs

**Status:** ✅ **DONE**

**Acceptance Criteria:**
- [x] Visualises the push/pull architecture (ASCII diagram)
- [x] Lists all epics and their status
- [x] MCP tool capabilities table with rate limits and plan requirements
- [x] Implementation order diagram

**Tasks:**
- [x] Write `docs/docs/architecture.md`

---

## Definition of Done

- [x] Docs site runs locally at `localhost:4000/figma-sync/`
- [x] Component Map page shows all 3 mappings with Figma + GitHub links
- [x] All doc sections are written and navigable (sidebar + navbar)
- [x] `npm run docs:dev` works from repo root
- [x] Homepage with feature overview and quick links
