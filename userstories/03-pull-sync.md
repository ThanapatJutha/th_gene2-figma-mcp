# Epic 3: Pull Sync (Figma → Code)

> Read the current Figma design state and apply changes back to code components and tokens.

## Context

### Available read tools

| Tool | What it returns | Rate limit |
|---|---|---|
| `get_design_context` | Code (React+Tailwind), screenshot, metadata, Code Connect hints | 6/month |
| `get_variable_defs` | Variables and styles (colors, spacing, typography) | 6/month |
| `get_metadata` | Sparse XML tree (node IDs, names, types, positions, sizes) | 6/month |
| `get_screenshot` | Screenshot of a node | 6/month |

All read tools share the **6 calls/month** budget on the free plan. Use wisely.

### Strategy

- Use `get_design_context` for the **full component** context (code + screenshot) — this is the richest tool
- Use `get_metadata` to get the **node tree structure** cheaply (1 call covers all nodes)
- Use `get_variable_defs` for **design token** extraction
- Let Copilot diff the Figma state against current code and apply changes

### Rate-limit mitigation (future)

If 6/month is too limiting, Epic 4 (Figma Plugin Bridge) provides unlimited reads via the Plugin API.

---

## User Stories

### 3.1 — Pull design context for a component

**As a** developer  
**I want to** pull the latest Figma design for a specific component  
**So that** I can see what the designer changed and update my code  

**Acceptance Criteria:**
- [ ] Copilot calls `get_design_context` with the component's node ID (from mapping)
- [ ] Returns generated code, screenshot, and any Code Connect hints
- [ ] Copilot shows a diff summary: what changed vs current code
- [ ] Developer can accept/reject changes

**Tasks:**
- [ ] Look up Figma node ID from `figma-sync.map.json` or Code Connect
- [ ] Call `get_design_context` with `nodeId` and `fileKey`
- [ ] Parse the returned code/metadata
- [ ] Diff against current component file
- [ ] Present changes to developer

---

### 3.2 — Pull design tokens / variables

**As a** developer  
**I want to** pull the current design tokens (colors, spacing, typography) from Figma  
**So that** my CSS custom properties stay in sync with the design  

**Acceptance Criteria:**
- [ ] `get_variable_defs` returns token values from the Figma file
- [ ] Tokens are mapped to CSS custom properties in `poc-react/src/styles.css`
- [ ] Changed tokens are highlighted; developer can accept/reject
- [ ] Accepted changes update `styles.css`

**Tasks:**
- [ ] Call `get_variable_defs` for the Figma file's root/page node
- [ ] Parse variable names and values (colors, spacing, etc.)
- [ ] Map Figma variable names → CSS custom property names
- [ ] Diff against current `:root` variables in `styles.css`
- [ ] Apply accepted changes

---

### 3.3 — Pull full page structure

**As a** developer  
**I want to** get an overview of all nodes in the Figma page  
**So that** I can detect if components were added, removed, or reorganized  

**Acceptance Criteria:**
- [ ] `get_metadata` returns XML tree of the Figma page
- [ ] Tree is parsed to identify component-level nodes
- [ ] New/removed components are flagged
- [ ] Developer can drill into specific nodes with `get_design_context`

**Tasks:**
- [ ] Call `get_metadata` for the Figma file page
- [ ] Parse XML to extract component nodes (names, IDs, types)
- [ ] Compare against current `figma-sync.map.json` component list
- [ ] Report additions/deletions/changes
- [ ] Allow drill-down for detailed context (uses another rate-limited call)

---

### 3.4 — Pull via Copilot agent conversation

**As a** developer using Copilot  
**I want to** say "pull the latest design from Figma" in chat  
**So that** I get a summary of what changed and can apply updates conversationally  

**Acceptance Criteria:**
- [ ] Copilot understands intent and calls appropriate MCP tools
- [ ] Presents a human-readable diff of design vs code
- [ ] Can apply changes to component files and CSS on confirmation
- [ ] Warns about rate-limit budget ("you have X calls remaining this month")

**Tasks:**
- [ ] Document recommended prompt patterns
- [ ] Test conversational flow end-to-end
- [ ] Implement rate-limit awareness (track calls used)

---

### 3.5 — Pull via Figma Plugin bridge (stretch — unlimited reads)

**As a** developer  
**I want to** pull Figma data via the Plugin bridge  
**So that** I'm not limited to 6 reads/month  

**Acceptance Criteria:**
- [ ] Plugin reads node tree, properties, and variables
- [ ] Data sent to local bridge server via WebSocket
- [ ] CLI `figma-sync pull --bridge` uses bridge data instead of MCP tools
- [ ] No MCP rate-limit consumption

> ⚠️ Depends on Epic 4 (Figma Plugin Bridge)

**Tasks:**
- [ ] Implement `read-tree` command in plugin
- [ ] Implement `read-node` command in plugin
- [ ] Implement `read-variables` command in plugin
- [ ] Wire CLI `pull --bridge` flag to bridge connection

---

## Definition of Done

- [ ] Can pull design context for any mapped component
- [ ] Can pull and diff design tokens against CSS
- [ ] Copilot can trigger pull conversationally
- [ ] Changes are applied to code files on developer approval
