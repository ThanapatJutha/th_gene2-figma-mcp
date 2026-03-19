# Epic 11: Create Design System Component Page

> User asks Copilot to create a Design System component page for a given component (Button, Card, etc.) based on a UI library reference. Copilot builds a structured Figma page with **header + variants table + master components**, creates design tokens, and saves code artifacts — producing a result matching the team's DS page template (see: `DS-creation-test` → `Button-example` page).

## Context

### The problem

Epic 7 (Bootstrap from URL) captures raw HTML into Figma and promotes flat frames to components. The result is a **bag of unstructured components** — no documentation header, no variant/state matrix, no design tokens. This doesn't match how professional design system teams organize their Figma files.

Our team's DS framework structures each component as a **dedicated Figma page** with three sections:

| Section | Content | Example (Button) |
|---------|---------|-------------------|
| **1 — Header** | Component name, description, breadcrumb, links | `PALO IT · Components → Button` + description |
| **2 — Variants table** | Grid of component instances across variant rows × state columns, with badges for sub-options | Solid / Outline / Dim / Ghost × Default / Hover / Pressed / Disabled |
| **3 — Master components** | All variant combinations as Figma components with property-based naming | `size=md, variant=solid, state=default, type=default` |

### The solution — Template-based DS page creation

Instead of capturing HTML and reorganizing it, Copilot builds the DS page **programmatically** using the bridge MCP tools, guided by:

1. **A reference URL** — tells Copilot which UI library to use (e.g., `https://ui.shadcn.com/`)
2. **A Figma template** — pre-seeded template components in the target Figma file (`T Header`, `T Section Header`, `T Divider`, `Badge`, `Divider`) that Copilot discovers and instances
3. **Component knowledge** — Copilot infers variants/states from the library, asks user to clarify if ambiguous
4. **Design tokens from user** — e.g., "use green-500 as primary color"

### Architecture

```
User prompt:
  "Create DS for Button based on https://ui.shadcn.com/
   Use green-500 as primary color"
       │
       ▼
  ┌────────────────────────────────────────────────────────────┐
  │ Copilot (Agent Mode)                                       │
  │                                                            │
  │ 1. Identify library + component from URL/prompt            │
  │ 2. Infer variants & states (ask user if ambiguous)         │
  │ 3. Create/update design tokens (Figma variables)           │
  │ 4. Discover template components in Figma file              │
  │ 5. Create new page for component                           │
  │ 6. Build Section 1: Header (using T Header template)       │
  │ 7. Build Section 2: Variants table (grid of instances)     │
  │ 8. Build Section 3: Master components (property naming)    │
  │ 9. Save .figma.tsx + connections.json                      │
  └──────────────┬─────────────────────────────────────────────┘
                 │
                 ▼ (bridge MCP tools)
  ┌────────────────────────────────────────────────────────────┐
  │ Figma File                                                 │
  │                                                            │
  │ Page: "Button"                                             │
  │ ├─ Section 1: Header                                       │
  │ │   └─ T Header instance (name, description, links)        │
  │ ├─ Section 2: Variants                                     │
  │ │   ├─ T Section Header instance ("✏️ Variants")           │
  │ │   └─ Grid: variant rows × state columns                  │
  │ │       ├─ Row: Solid     [Default] [Hover] [Pressed] […]  │
  │ │       ├─ Row: Outline   [Default] [Hover] [Pressed] […]  │
  │ │       └─ …                                               │
  │ ├─ Section 3: Master Components                            │
  │ │   ├─ T Section Header instance ("✏️ Master Component")   │
  │ │   └─ Component variants with property naming             │
  │ │       ├─ size=lg, variant=solid, state=default, type=…   │
  │ │       ├─ size=md, variant=solid, state=default, type=…   │
  │ │       └─ …                                               │
  │ └─ T Divider instances (between sections)                  │
  │                                                            │
  │ Design Tokens (Variables):                                 │
  │ ├─ color/primary/500 = #22C55E                             │
  │ ├─ color/primary/600 = #16A34A                             │
  │ └─ …                                                       │
  └────────────────────────────────────────────────────────────┘
```

### Why this replaces Epic 7

| Aspect | Epic 7 (Capture → Componentize) | Epic 11 (Create DS Page) |
|--------|----------------------------------|--------------------------|
| **Output quality** | Flat captured layers, no structure | Professional 3-section DS page |
| **Design tokens** | ❌ None | ✅ Figma variables created |
| **Variant coverage** | Whatever the captured page showed | Full matrix (all variant × state combos) |
| **Template consistency** | Every capture looks different | Consistent template across all components |
| **Variants table** | ❌ None | ✅ Structured grid with instances |
| **Component naming** | `Category / Variant` | Property-based: `size=md, variant=solid, …` |
| **Showcase app needed?** | Yes (Prompt 1) | No (built programmatically) |

### Tools used

**Bridge MCP tools:**

| Tool | Used for |
|------|---------|
| `bridge_ping` | Verify plugin connection |
| `bridge_read_config` | Read figma.config.json (file key, settings) |
| `bridge_list_components` | Discover template components (T Header, Badge, Divider, etc.) |
| `bridge_create_page` | Create new page for the component |
| `bridge_set_current_page` | Switch to the new page |
| `bridge_create_node` | Create frames (Body, Variants grid, cells, etc.) |
| `bridge_create_instance` | Create instances of template components and master components |
| `bridge_create_component` | Promote variant frames to master components |
| `bridge_update_node` | Set position, dimensions, text, fills |
| `bridge_create_variable` | Create design tokens (colors, spacing, etc.) |
| `bridge_read_variables` | Read existing design tokens |
| `bridge_save_component_spec` | Save .figma.tsx React component file |
| `bridge_save_connections` | Save code ↔ Figma mappings |
| `bridge_reorder_children` | Order children within frames |

**Figma official MCP (optional):**

| Tool | Used for |
|------|---------|
| `get_screenshot` | Capture screenshot of result for verification |
| `get_design_context` | Read existing component designs for reference |

---

## Prompt Flow

Unlike Epic 7's multi-prompt approach, this usecase works best in **2 prompts** (or 1 if the user is experienced):

### Prompt 1 — Create the DS component page

```
Create a Design System page for Button based on https://ui.shadcn.com/.

Use green-500 (#22C55E) as the primary color.

The page should have 3 sections matching our DS template:
1. Header — component name, description, links
2. Variants table — all variants × states in a grid
3. Master components — all variant combinations with property naming

Create the design tokens as Figma variables.
```

**What happens:**
1. Copilot identifies the component (Button) and library (shadcn/ui)
2. Infers variants: solid, outline, dim, ghost + destructive variants
3. Infers states: default, hover, pressed/selected, disabled
4. Infers sizes: sm, md, lg
5. Presents variant plan to user for confirmation (if not obvious)
6. Creates design tokens as Figma variables
7. Discovers templates in the Figma file (T Header, T Section Header, etc.)
8. Creates a new "Button" page
9. Builds all 3 sections using templates + master components
10. Saves .figma.tsx + connections.json

### Prompt 2 (optional) — Refine or add more components

```
Now create a DS page for Card using the same template and tokens.
```

---

## User Stories

### 11.1 — Infer component variants from library reference

**As a** developer
**I want** Copilot to understand a component's variants and states from a library URL or name
**So that** I don't have to manually list every variant combination

**Acceptance Criteria:**
- [x] Given a library URL (e.g., `https://ui.shadcn.com/`) and component name (e.g., "Button"), Copilot produces a variant plan
- [x] Variant plan includes: variant names, state names, size names, type names
- [x] If Copilot is unsure about variants, it asks the user to clarify before proceeding
- [x] Works with common UI libraries: shadcn/ui, MUI, Chakra UI, Ant Design
- [x] User can override or extend the inferred variants (e.g., "also add a 'dim' variant")

**Tasks:**
- [x] Update copilot-instructions with variant inference rules
- [x] Add prompt template for variant clarification
- [x] Document expected variant structures for common libraries (shadcn Button, Card, etc.)

---

### 11.2 — Create design tokens as Figma variables

**As a** developer
**I want** Copilot to create design tokens (colors, spacing, typography) as Figma variables
**So that** all components use consistent, reusable values

**Acceptance Criteria:**
- [x] Copilot creates color variables from user input (e.g., "green-500 as primary" → `color/primary/500 = #22C55E`)
- [x] Variables are created using `bridge_create_variable`
- [x] Existing variables are checked first via `bridge_read_variables` (no duplicates)
- [x] Variables are applied to master component fills, strokes, text colors
- [x] Token naming follows convention: `color/primary/500`, `color/destructive/500`, etc.

**Tasks:**
- [x] Update copilot-instructions with design token creation rules
- [x] Add token naming convention documentation
- [x] Define minimum token set for a component (primary, destructive, disabled, hover, pressed)

---

### 11.3 — Discover and use Figma templates

**As a** developer
**I want** Copilot to discover pre-seeded template components in the Figma file
**So that** every DS page has consistent structure and branding

**Acceptance Criteria:**
- [x] Copilot uses `bridge_list_components` to find template components (names starting with `T ` — e.g., `T Header`, `T Section Header`, `T Divider`)
- [x] Also discovers helper components: `Badge`, `Divider`
- [x] Creates instances of templates using `bridge_create_instance`
- [x] Falls back to raw frames (`bridge_create_node`) if templates are not found
- [x] Reports which templates were found vs. which were missing

**Tasks:**
- [x] Document template component naming convention (`T ` prefix for templates)
- [x] Add template discovery step to copilot-instructions workflow
- [ ] Create a "Templates" page in the reference Figma file with initial templates
- [x] Define fallback behavior (what to create when templates are missing)

---

### 11.4 — Build Section 1: Component header

**As a** developer
**I want** Copilot to create a header section with component name, description, and links
**So that** each DS page is self-documenting

**Acceptance Criteria:**
- [x] Header includes: breadcrumb (`Components → {Name}`), component title, description text
- [x] Uses `T Header` template instance if available
- [x] Header spans the full page width (matching template dimensions)
- [x] Description text is auto-generated based on the component type (or provided by user)
- [x] Links section includes placeholder for documentation link

**Tasks:**
- [x] Add header creation logic to copilot-instructions
- [x] Define auto-generated descriptions for common component types
- [x] Verify T Header instance creation works with `bridge_create_instance`

---

### 11.5 — Build Section 2: Variants table

**As a** developer
**I want** Copilot to create a structured variants/states table
**So that** designers can see all component variations at a glance

**Acceptance Criteria:**
- [x] Table has columns: variant label + one column per state (Default, Hover, Pressed/Selected, Disabled)
- [x] Each row represents a variant (Solid, Outline, Dim, Ghost, Destructive Solid, etc.)
- [x] Row headers include badges for sub-options (Text only, Left Icon, Right Icon)
- [x] Each cell contains an **instance** of the corresponding master component
- [x] Table uses `T Section Header` ("✏️ Variants") and `Divider` between rows
- [x] Layout is clean with consistent cell sizes and spacing
- [x] Build order: Section 3 (masters) must be built before Section 2 (instances reference them)

> **Depends on:** Story 11.10 (layout constants & construction patterns)

**Tasks:**
- [x] Create variant table frame structure using layout constants from 11.10
- [x] Implement row-by-row construction following the pattern from 11.10
- [x] Enforce build order: Section 3 → Section 2 (instances reference existing masters)
- [x] Add Badge instances for sub-options in row headers
- [x] Define fallback: if instancing fails, create a placeholder text node with the variant name

---

### 11.6 — Build Section 3: Master components with property naming

**As a** developer
**I want** Copilot to create all variant combinations as Figma master components
**So that** designers can use them with Figma's variant picker

**Acceptance Criteria:**
- [x] Every combination of size × variant × state × type is created as a separate component
- [x] Components use property-based naming: `size=md, variant=solid, state=default, type=default`
- [x] Components are promoted using `bridge_create_component`
- [x] Component dimensions match the expected sizes (sm: 32h, md: 40h, lg: 44h for buttons)
- [x] Components are arranged in a structured grid within a "Master Component" section
- [x] Design token variables are applied to component fills and strokes
- [x] Section uses `T Section Header` ("✏️ Master Component")
- [x] Default matrix: 2 sizes (md, lg) × 6 variants × 4 states × 1 type = ~48 components (expandable via follow-up)

> **Depends on:** Story 11.10 (layout constants & construction patterns)

**Tasks:**
- [x] Create master components using batch-by-size-tier pattern from 11.10
- [x] Implement property naming pattern (strict string template, no freeform)
- [x] Define component dimension rules per size (md: 40h, lg: 44h)
- [x] Apply Figma variables to component fills/strokes
- [ ] Verify components appear in Figma's Assets panel with correct variant picker
- [x] Document follow-up prompt for adding `sm` size or extra `type` axis

---

### 11.7 — Save code artifacts (.figma.tsx + connections)

**As a** developer
**I want** Copilot to save .figma.tsx component files and connections.json
**So that** the code repo stays in sync with the Figma file

**Acceptance Criteria:**
- [x] `.figma.tsx` file saved in `figma/components/` for each component
- [x] `.figma.tsx` imports and renders the real UI library component with all visual variants
- [x] `connections.json` updated with mappings for all created master components
- [x] JSDoc comment includes Figma node ID and source file path
- [x] No business logic in `.figma.tsx` — visual/style only

**Tasks:**
- [x] Call `bridge_save_component_spec` with rendered React component
- [x] Call `bridge_save_connections` with all component mappings
- [x] Verify connections.json format matches schema (version, connections array)

---

### 11.8 — Update copilot-instructions and docs

**As a** developer or contributor
**I want** all copilot-instructions and documentation updated for the new usecase
**So that** Copilot follows the new DS page workflow and users can learn it

**Acceptance Criteria:**
- [x] `.github/copilot-instructions.md` — Usecase 1 replaced with Create DS Component Page
- [x] `bootstrap-from-url.md` — Rewritten to describe the new workflow
- [x] `copilot-instructions.md` — Global completion invariant updated to include DS page structure
- [x] Template discovery rules added
- [x] Property-based naming rules added
- [x] Design token creation rules added

**Tasks:**
- [x] Rewrite Usecase 1 section in copilot-instructions.md
- [x] Rewrite bootstrap-from-url.md (Docusaurus docs)
- [x] Update completion gate (Section 3 in copilot-instructions)
- [x] Add new guardrails for template discovery, property naming, tokens
- [x] Verify Docusaurus builds cleanly

---

### 11.9 — Prepare Figma template file

**As a** developer
**I want** a reference Figma file with pre-seeded templates
**So that** Copilot can discover and instance templates for consistent DS pages

**Acceptance Criteria:**
- [ ] Figma file contains a "Templates" page (or templates on an existing page)
- [ ] Templates include: `T Header`, `T Section Header`, `T Divider`
- [ ] Helper components include: `Badge`, `Divider`
- [ ] Templates are published as Figma components (visible in Assets panel)
- [x] Template dimensions and styling match the Button-example reference
- [x] Instructions for users: how to copy templates into their own file

**Tasks:**
- [ ] Create/verify template components in the reference Figma file (`DS-creation-test`)
- [x] Document template specifications (dimensions, fills, fonts, etc.)
- [x] Add setup instructions to getting-started.md or bootstrap-from-url.md

---

### 11.10 — Define layout constants and construction patterns

**As a** developer
**I want** pre-defined layout constants and construction patterns documented in copilot-instructions
**So that** Section 2 and Section 3 builders follow a deterministic, formulaic approach instead of ad-hoc positioning

**Acceptance Criteria:**
- [x] Layout constants defined for the variants table (Section 2):
  ```
  CELL_WIDTH  = 160    # px per state column
  CELL_HEIGHT = 80     # px per row
  GAP_X       = 16     # horizontal gap
  GAP_Y       = 12     # vertical gap
  LABEL_WIDTH = 200    # row label column width
  ```
- [x] Row-by-row construction pattern documented:
  - Create row frame → set `y = rowIndex * (CELL_HEIGHT + GAP_Y)`
  - Add label text node at `x = 0`
  - Add instance per state column at `x = LABEL_WIDTH + colIndex * (CELL_WIDTH + GAP_X)`
  - Each row = **1 frame + 1 text + N instances** (~6 bridge calls per row)
- [x] Batch-by-size-tier strategy documented for master components (Section 3):
  - Default matrix: 2 sizes (md, lg), expandable to 3 via follow-up prompt
  - Create all components for one size before moving to the next
  - Each batch is independent — if one fails, the others are still valid
- [x] Strict mechanical loop template documented:
  ```
  for each size in [lg, md]:
    for each variant in [solid, outline, dim, ghost, destructive-solid, destructive-outline]:
      for each state in [default, hover, pressed, disabled]:
        for each type in [default]:   # expand to [default, icon-left] in follow-up
          → bridge_create_node(FRAME, name="size={size}, variant={variant}, state={state}, type={type}")
          → bridge_update_node(fills, dimensions)
          → bridge_create_component(nodeId)
  ```
- [x] Grid position formula for master component section: `x = col * (W + GAP)`, `y = row * (H + GAP)`
- [x] Escape valve documented: reduce `type` axis to 1 value if context is tight (~48 → ~24 components per batch)
- [x] Build order enforced: Section 3 (masters) → Section 2 (instances) → Section 1 (header)

**Tasks:**
- [x] Add layout constants to copilot-instructions
- [x] Document row-by-row construction pattern with exact bridge call sequence
- [x] Add batching-by-size pattern with exact loop template
- [x] Define reduced matrix defaults and follow-up expansion prompts
- [x] Document build order dependency chain

---

## Incremental Delivery Plan

| Phase | Stories | What's deliverable |
|-------|---------|-------------------|
| **Phase 1 — Foundation** | 11.1, 11.2, 11.3, 11.9, 11.10 | Variant inference, tokens, template discovery, template file, layout patterns |
| **Phase 2 — Page builder** | 11.4, 11.5, 11.6 | All 3 sections buildable via bridge tools |
| **Phase 3 — Persistence** | 11.7 | Code artifacts saved (.figma.tsx + connections) |
| **Phase 4 — Polish** | 11.8 | Docs and copilot-instructions updated |

---

## Definition of Done

- [ ] User can prompt Copilot with a component name + library reference and get a full DS page
- [ ] DS page has 3 sections: Header, Variants Table, Master Components
- [ ] Master components use property-based naming (`size=md, variant=solid, …`)
- [ ] Design tokens created as Figma variables and applied to components
- [ ] Templates discovered and instanced from the Figma file
- [ ] One Figma page per component
- [ ] Variants table cells contain instances of master components
- [ ] `.figma.tsx` file saved in `figma/components/`
- [ ] `connections.json` updated with all component mappings
- [ ] Copilot-instructions and Docusaurus docs updated

---

## Success Probability Estimates

Estimated likelihood that Copilot produces the correct result **on the first prompt** once each story is fully implemented. These factor in: tool reliability, LLM context limits, layout complexity, and volume of bridge calls.

### Per-story estimates

| Story | Title | Success % | Risk factors |
|-------|-------|-----------|-------------|
| **11.1** | Infer variants from library | **75%** | LLM knows common libs well, but may miss library-specific variants or invent non-existent ones. User clarification step mitigates this. |
| **11.2** | Create design tokens | **85%** | Clear input→output. Risk: inconsistent naming if user gives ambiguous color descriptions. |
| **11.3** | Discover Figma templates | **80%** | `bridge_list_components` is reliable. Risk: template not found → fallback path needs testing. |
| **11.4** | Build Section 1: Header | **85%** | Simple structure, template-based. Low risk. |
| **11.5** | Build Section 2: Variants table | **70%** | Formulaic row-by-row construction with pre-defined layout constants eliminates positioning math. Build Section 3 first → instances already exist. ~6 bridge calls per row. |
| **11.6** | Build Section 3: Master components | **75%** | Batch-by-size-tier (2 sizes × ~32 components per batch). Reduced default matrix + strict loop template keeps each batch within context window. |
| **11.7** | Save code artifacts | **90%** | Well-established pattern from Epic 7/8. Low risk. |
| **11.8** | Update docs | **90%** | Pure text editing. No bridge dependency. |
| **11.9** | Prepare Figma template file | **70%** | Copilot can create templates, but visual fidelity (fonts, spacing, fills) needs human review. |
| **11.10** | Define layout constants & patterns | **95%** | Pure documentation task. No bridge dependency. Deterministic constants. |

### Overall usecase success rate

| Scenario | Success % | Notes |
|----------|-----------|-------|
| **First attempt (cold start)** | **50–55%** | User prompts once, gets a full Button DS page. Improved by formulaic layout + batching. |
| **With 1 retry / correction prompt** | **70–75%** | User spots issues, gives Copilot a follow-up fix prompt. Most realistic happy path. |
| **With 2–3 iterations** | **85–90%** | Iterative refinement. This is the expected workflow in practice. |
| **Section 1 + 3 only (reduced matrix)** | **75%** | Header + master components (2 sizes, default type only = ~48 components). Best MVP path. |
| **All 3 sections (full matrix)** | **55–60%** | All sections with 2 sizes × 6 variants × 4 states × 2 types. Follow-up prompt to expand. |

### Key risks & mitigations

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Context window overflow** (96+ components) | Section 3 incomplete | Batch by size tier (2 sizes default, ~32 per batch). Reduce `type` axis if still tight. |
| **Grid layout drift** (Section 2) | Cells overlap or misalign | Formulaic layout with pre-defined constants (CELL_WIDTH, GAP, etc.) — no runtime math. |
| **Template not found** | Header/dividers look wrong | Fallback to raw frames with documented dimensions. |
| **Token naming mismatch** | Colors don't match | Copilot confirms token plan before creating. |
| **Property naming typos** | Variant picker broken in Figma | Strict naming template in copilot-instructions: `size={s}, variant={v}, state={st}, type={t}`. |
| **Build order dependency** | Instances reference non-existent masters | Enforced order: Section 3 (masters) → Section 2 (instances) → Section 1 (header). |

### Recommendation

Start with **Section 1 + Section 3 (reduced matrix)** — header + master components with 2 sizes and `type=default` only (~48 components). This gives **~75% first-attempt success**. Then expand in follow-up prompts:

1. ✅ First prompt: Section 1 + 3 (md, lg × 6 variants × 4 states × default type)
2. 📎 Follow-up: Add `sm` size and/or `icon-left` type
3. 📎 Follow-up: Build Section 2 (variants table) — now that masters exist, instancing is straightforward
