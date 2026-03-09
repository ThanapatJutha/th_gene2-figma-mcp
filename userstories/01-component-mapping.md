# Epic 1: Component Mapping

> Link React components to their Figma node counterparts so both push and pull sync know what maps to what.

## Context

The Figma MCP server provides `add_code_connect_map` (rate-limit exempt) and `get_code_connect_map` to manage mappings between Figma node IDs and code components. However, **Code Connect requires an Organization or Enterprise plan with a Developer seat** — it does not work on Pro/Full.

For this POC we use a **local mapping file** (`figma-sync.map.json`) as the source of truth. Node IDs were discovered via `get_metadata` from the MCP server.

### Figma file

| Field | Value |
|---|---|
| **File URL** | https://www.figma.com/design/ghwHnqX2WZXFtfmsrbRLTg |
| **File Key** | `ghwHnqX2WZXFtfmsrbRLTg` |
| **Account** | nviriyadamrongkij@palo-it.com (PALO IT Thailand, Pro/Full) |
| **Rate limit** | 200 calls/day (10/min) |

### Component → Node mapping

| Component | File | Figma Node ID |
|---|---|---|
| `HeaderCard` | `poc-react/src/components/HeaderCard.tsx` | `1:5` |
| `CounterCard` | `poc-react/src/components/CounterCard.tsx` | `1:17` |
| `ToggleSwitch` | `poc-react/src/components/ToggleSwitch.tsx` | `1:42` |

---

## User Stories

### 1.1 — Set up Code Connect mappings via MCP

> ⛔ **BLOCKED** — Code Connect requires Organization or Enterprise plan with Developer seat. Current account is Pro/Full.

**Status:** Skipped for POC. Will revisit if plan is upgraded.

**Tasks:**
- [x] Attempted `add_code_connect_map` — confirmed requires Org/Enterprise + Dev seat
- [x] Attempted `get_code_connect_suggestions` — same restriction

---

### 1.2 — Auto-suggest mappings with AI

> ⛔ **BLOCKED** — Same Code Connect plan restriction.

**Status:** Skipped for POC.

---

### 1.3 — Local mapping cache

**Status:** ✅ **DONE**

**Acceptance Criteria:**
- [x] `figma-sync map init` creates a new `figma-sync.map.json`
- [x] JSON contains `{ version, figmaFileKey, components: [{ name, file, figmaNodeId, figmaFileKey, selector }] }`
- [x] `figma-sync map add` adds/upserts a component mapping
- [x] `figma-sync map list` displays all mappings
- [x] File is committed to git

**Tasks:**
- [x] Define `figma-sync.map.json` schema (`src/types.ts`)
- [x] Create map utility module (`src/map.ts`)
- [x] Create node tree utility (`src/nodes.ts`)
- [x] Add `map` command to CLI with `init`, `add`, `list` subcommands (`src/cli.ts`)
- [x] Add `nodes` command to CLI for exploring Figma file tree
- [x] Create initial `figma-sync.map.json` with 3 component mappings
- [x] Node IDs discovered via MCP `get_metadata` (node tree exploration)

### Files created/modified

| File | Change |
|---|---|
| `src/types.ts` | New — schema types for map and Figma API |
| `src/map.ts` | New — read/write/upsert map utilities |
| `src/nodes.ts` | New — flatten and print Figma node trees |
| `src/cli.ts` | Modified — added `nodes` and `map` commands |
| `figma-sync.map.json` | New — the mapping file |

---

## Definition of Done

- [x] All 3 POC components are mapped (locally in `figma-sync.map.json`)
- [ ] ~~`get_code_connect_map` returns correct mappings~~ (blocked — needs Org plan)
- [x] Local `figma-sync.map.json` exists and is in git
- [x] `map` CLI command works for init, add, and list
