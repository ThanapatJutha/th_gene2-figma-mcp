# Usecase 1 — Create Design System Component Page

> **Note:** The workflow summary and completion gate are already in
> `.github/copilot-instructions.md` section 6. This file provides additional detail.

Goal: Create a structured Figma DS page for a UI component with header,
variants table, and master components — all built programmatically via
bridge MCP tools.

---

## Usecase detection

When a user prompt mentions any of these:
- A UI library name or URL (shadcn/ui, MUI, Chakra UI, etc.)
- "Create DS page for…", "design system page…", "component page…"
- "Create Figma components for Button/Card/…"
- A component name + library reference

→ This is the Create DS Component Page usecase.

**Suggest the 2-prompt approach:**
> "This looks like a Create DS Component Page task. I recommend 2 prompts:
> (1) create the DS page with header + master components, (2) optionally add
> the variants table. Shall I start?"

---

## Why 2 prompts?

Each prompt is a natural stopping point:
- Prompt 1 → Header + master components created, tokens applied, artifacts saved
- Prompt 2 (optional) → Variants table added with instances of masters

This keeps each session within context limits and produces a verifiable result.

---

## Prompt 1 — Create the DS component page

### Step-by-step workflow

1. **Identify library + component** from user's prompt
2. **Infer variants & states** using rules from `rules/05-variant-inference.md`
   - Present variant plan to user for confirmation
   - If ambiguous, ask before proceeding
3. **Create/check design tokens** using rules from `rules/02-design-tokens.md`
   - `bridge_read_variables` → check existing
   - `bridge_create_variable` → create missing tokens
   - Present token plan to user
4. **Discover templates** using rules from `rules/06-template-discovery.md`
   - `bridge_list_components` → find T Header, T Section Header, etc.
   - Report found vs. missing templates
5. **Create new page** for the component
   - `bridge_create_page(name="{ComponentName}")`
   - `bridge_set_current_page(pageId)`
6. **Build Section 3 — Master components** (built FIRST)
   - Follow batch-by-size-tier pattern from `rules/04-layout-constants.md`
   - Default: 2 sizes × 6 variants × 4 states × 1 type = 48 components
   - Use property naming: `size=md, variant=solid, state=default, type=default`
   - Apply design token variables to fills/strokes
7. **Build Section 1 — Header**
   - Instance `T Header` template (or fallback frame)
   - Set breadcrumb, title, description text
   - Position at top of page
8. **Add dividers** between sections
   - Instance `T Divider` or create fallback
9. **Save code artifacts**
   - `bridge_save_component_spec` → save `.figma.tsx` in `figma/components/`
   - `bridge_save_connections` → save all mappings

### Build order (mandatory)

```
Section 3 (Master Components) → Section 1 (Header) → Dividers → Save artifacts
```

Section 3 is built first because Section 2 (if added later) needs master
component IDs to create instances.

---

## Section builders (detailed bridge call sequences)

### Section 1 — Header builder

#### Step-by-step bridge calls

```
1. Discover T Header template:
   templates = bridge_list_components()
   T_HEADER = find(templates, name startsWith "T Header")

2a. If T_HEADER found → create instance:
   headerNode = bridge_create_instance(componentId=T_HEADER.id)
   bridge_update_node(headerNode.id, {
     x: 0,
     y: 0
   })
   # Update text overrides:
   bridge_update_node(breadcrumbTextId, {
     characters: "PALO IT · Components → {ComponentName}"
   })
   bridge_update_node(titleTextId, {
     characters: "{ComponentName}"
   })
   bridge_update_node(descriptionTextId, {
     characters: "{auto-generated description}"
   })

2b. If T_HEADER NOT found → create fallback:
   headerFrame = bridge_create_node(FRAME, name="Header", {
     width: 1200, height: 200,
     fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]
   })
   bridge_create_node(TEXT, parent=headerFrame.id, {
     characters: "PALO IT · Components → {ComponentName}",
     x: 40, y: 24, fontSize: 14,
     fills: [{ type: "SOLID", color: { r: 0.45, g: 0.45, b: 0.45 } }]
   })
   bridge_create_node(TEXT, parent=headerFrame.id, {
     characters: "{ComponentName}",
     x: 40, y: 56, fontSize: 32, fontWeight: 700,
     fills: [{ type: "SOLID", color: { r: 0.09, g: 0.09, b: 0.09 } }]
   })
   bridge_create_node(TEXT, parent=headerFrame.id, {
     characters: "{auto-generated description}",
     x: 40, y: 108, fontSize: 16,
     fills: [{ type: "SOLID", color: { r: 0.45, g: 0.45, b: 0.45 } }]
   })
   bridge_create_node(TEXT, parent=headerFrame.id, {
     characters: "📖 Documentation →",
     x: 40, y: 152, fontSize: 14,
     fills: [{ type: "SOLID", color: { r: 0.23, g: 0.51, b: 0.97 } }]
   })
```

**Total bridge calls:** 2–6 (template) or 5–6 (fallback)

#### Auto-generated descriptions

Use these descriptions when the user doesn't provide one:

| Component | Description |
|-----------|-------------|
| **Button** | Displays a button or a component that looks like a button. Supports multiple variants, sizes, and states. |
| **Card** | Displays a card with header, content, and footer sections. Used to group related information. |
| **Badge** | Displays a badge or a component that looks like a badge. Used for status indicators and labels. |
| **Input** | Displays a text input field. Supports validation states and sizes. |
| **Select** | Displays a select dropdown. Allows users to choose from a list of options. |
| **Checkbox** | Displays a checkbox input. Supports checked, unchecked, and indeterminate states. |
| **Switch** | Displays a toggle switch. Used for binary on/off settings. |
| **Alert** | Displays a callout for important messages. Supports default and destructive variants. |
| **Avatar** | Displays a user avatar image with fallback. Supports multiple sizes. |
| **Tabs** | Displays a tabbed interface. Used to organize content into switchable panels. |

For components not in this table, generate a description following the pattern:
> "Displays a {component name}. {Brief purpose}. Supports {key variants/features}."

#### Header layout position

The header is always positioned at `y = 0` (top of page).
Width matches the page content width (default: 1200px).

After placing the header, the next section starts at:
```
HEADER_HEIGHT  = 200   # T Header height (or fallback frame height)
DIVIDER_GAP    = 40    # space before/after divider
```

---

### Section 3 — Master component builder

#### Pre-requisites

Before building master components:
1. Design tokens MUST exist (created in earlier step)
2. Template `T Section Header` should be discovered

#### Step-by-step bridge calls

```
# 1. Add section header
sectionHeader = bridge_create_instance(T_SECTION_HEADER.id)
  OR bridge_create_node(FRAME, name="Section Header: Master Component", {
    width: 1200, height: 48,
    fills: [{ type: "SOLID", color: { r: 0.96, g: 0.96, b: 0.96 } }]
  })
bridge_update_node(sectionHeader.textId, {
  characters: "✏️ Master Component"
})

# 2. Create container frame for grid
masterContainer = bridge_create_node(FRAME, name="Master Components", {
  width: 1200,
  fills: []   # transparent
})

# 3. Batch-by-size loop
componentIndex = 0
allComponents = []   # track for connections.json

for each size in [lg, md]:
  for each variant in [solid, outline, dim, ghost, destructive-solid, destructive-outline]:
    for each state in [default, hover, pressed, disabled]:
      for each type in [default]:

        name = "size={size}, variant={variant}, state={state}, type={type}"

        # 3a. Compute grid position
        col = componentIndex % 6    # COLS_PER_ROW
        row = floor(componentIndex / 6)
        x = col * (120 + 8)         # MASTER_COL_WIDTH + MASTER_GAP
        y = row * (60 + 8)          # MASTER_ROW_HEIGHT + MASTER_GAP

        # 3b. Create the frame
        node = bridge_create_node(FRAME, name=name, parent=masterContainer.id, {
          x: x, y: y,
          width: SIZE_DIMENSIONS[size].minWidth,
          height: SIZE_DIMENSIONS[size].height,
          fills: TOKEN_FILLS[variant][state]    # see token-to-fill mapping
        })

        # 3c. Add label text inside component
        bridge_create_node(TEXT, parent=node.id, {
          characters: "{ComponentName}",
          x: 12, y: centerVertical,
          fontSize: SIZE_FONT[size],
          fills: TEXT_COLOR_FOR[variant][state]
        })

        # 3d. Promote to component
        result = bridge_create_component(node.id)
        allComponents.push({
          figmaNodeId: result.id,
          figmaComponentName: name,
          codeComponent: "{ComponentName}",
          file: "src/components/ui/{component}.tsx"
        })

        componentIndex++
```

**Bridge calls per component:** 3 (create frame + create text + promote)
**Total for 48 components:** ~144 bridge calls (24 per size tier)

#### Token-to-fill mapping

Map variant + state to design token fills:

| Variant | State | Fill token | Text token | Border token |
|---------|-------|-----------|------------|-------------|
| solid | default | `color/primary/500` | `color/white` | — |
| solid | hover | `color/primary/600` | `color/white` | — |
| solid | pressed | `color/primary/700` | `color/white` | — |
| solid | disabled | `color/neutral/200` | `color/neutral/400` | — |
| outline | default | transparent | `color/primary/500` | `color/primary/500` |
| outline | hover | `color/primary/100` | `color/primary/600` | `color/primary/600` |
| outline | pressed | `color/primary/100` | `color/primary/700` | `color/primary/700` |
| outline | disabled | transparent | `color/neutral/400` | `color/neutral/200` |
| dim | default | `color/primary/100` | `color/primary/500` | — |
| dim | hover | `color/primary/100` | `color/primary/600` | — |
| dim | pressed | `color/primary/100` | `color/primary/700` | — |
| dim | disabled | `color/neutral/200` | `color/neutral/400` | — |
| ghost | default | transparent | `color/primary/500` | — |
| ghost | hover | `color/primary/100` | `color/primary/600` | — |
| ghost | pressed | `color/primary/100` | `color/primary/700` | — |
| ghost | disabled | transparent | `color/neutral/400` | — |
| destructive-solid | default | `color/destructive/500` | `color/white` | — |
| destructive-solid | hover | `color/destructive/600` | `color/white` | — |
| destructive-solid | pressed | `color/destructive/600` | `color/white` | — |
| destructive-solid | disabled | `color/neutral/200` | `color/neutral/400` | — |
| destructive-outline | default | transparent | `color/destructive/500` | `color/destructive/500` |
| destructive-outline | hover | `color/destructive/500` | `color/white` | `color/destructive/500` |
| destructive-outline | pressed | `color/destructive/600` | `color/white` | `color/destructive/600` |
| destructive-outline | disabled | transparent | `color/neutral/400` | `color/neutral/200` |

#### Component font sizes per size tier

```
SIZE_FONT:
  sm: 12    # (added via follow-up only)
  md: 14
  lg: 16
```

#### Master component section positioning

Position the master component section below the header + divider:
```
masterSection.y = HEADER_HEIGHT + DIVIDER_GAP + 1 + DIVIDER_GAP
               = 200 + 40 + 1 + 40 = 281
```

---

### Section 2 — Variants table builder (Prompt 2)

#### Pre-requisites

1. Master components MUST already exist on the page (from Prompt 1)
2. Template `T Section Header` should be discovered

#### Step-by-step bridge calls

```
# 1. Read existing master components
masters = bridge_list_components()
# Build lookup: masterLookup["size=md, variant=solid, state=default, type=default"] = nodeId

# 2. Add section header
sectionHeader = bridge_create_instance(T_SECTION_HEADER.id)
  OR create fallback frame
bridge_update_node(sectionHeader.textId, {
  characters: "✏️ Variants"
})

# 3. Create container frame
tableFrame = bridge_create_node(FRAME, name="Variants Table", {
  width: LABEL_WIDTH + numStates * (CELL_WIDTH + GAP_X),
  fills: []   # transparent
})

# 4. Create column header row
colHeaderRow = bridge_create_node(FRAME, name="Column Headers", parent=tableFrame.id, {
  y: 0, height: 32
})
for each stateIndex, state in enumerate(states):
  bridge_create_node(TEXT, parent=colHeaderRow.id, {
    characters: state,       # "Default", "Hover", "Pressed", "Disabled"
    x: LABEL_WIDTH + stateIndex * (CELL_WIDTH + GAP_X),
    fontSize: 12, fontWeight: 600,
    fills: [{ type: "SOLID", color: { r: 0.45, g: 0.45, b: 0.45 } }]
  })

# 5. Build data rows (one per variant, using size=md as display size)
DISPLAY_SIZE = "md"   # variants table shows md size by default
ROW_START_Y = 32 + GAP_Y   # below column headers

for each variantIndex, variant in enumerate(variants):

  # 5a. Create row frame
  rowY = ROW_START_Y + variantIndex * (CELL_HEIGHT + GAP_Y)
  rowFrame = bridge_create_node(FRAME, name="Row: {variant}", parent=tableFrame.id, {
    y: rowY,
    width: LABEL_WIDTH + numStates * (CELL_WIDTH + GAP_X),
    height: CELL_HEIGHT,
    fills: []
  })

  # 5b. Add variant label
  bridge_create_node(TEXT, parent=rowFrame.id, {
    characters: "{Variant Display Name}",    # "Solid", "Outline", etc.
    x: 0, y: centerVertical,
    fontSize: 14, fontWeight: 500,
    fills: [{ type: "SOLID", color: { r: 0.09, g: 0.09, b: 0.09 } }]
  })

  # 5c. Add state instances
  for each stateIndex, state in enumerate(states):
    masterKey = "size={DISPLAY_SIZE}, variant={variant}, state={state}, type=default"
    masterId = masterLookup[masterKey]

    if masterId exists:
      bridge_create_instance(componentId=masterId, parent=rowFrame.id)
      → set x = LABEL_WIDTH + stateIndex * (CELL_WIDTH + GAP_X)
      → center within CELL_WIDTH × CELL_HEIGHT
    else:
      # Fallback: placeholder text
      bridge_create_node(TEXT, parent=rowFrame.id, {
        characters: "{variant} / {state}",
        x: LABEL_WIDTH + stateIndex * (CELL_WIDTH + GAP_X),
        y: centerVertical,
        fontSize: 11,
        fills: [{ type: "SOLID", color: { r: 0.64, g: 0.64, b: 0.64 } }]
      })

# 6. Add Badge instances for sub-options (optional, if Badge component exists)
# Below each variant label, add badges for type sub-options:
if BADGE component found:
  for each type in types:
    bridge_create_instance(componentId=BADGE.id, parent=rowFrame.id)
    → update text to type name ("Text only", "Left Icon", etc.)
    → position below variant label
```

**Bridge calls per row:** 1 frame + 1 text + N instances = ~6 calls (for 4 states)
**Total for 6 variant rows + column header:** ~42 bridge calls

#### Variant display name mapping

| Internal name | Display label |
|---------------|--------------|
| `solid` | Solid |
| `outline` | Outline |
| `dim` | Dim |
| `ghost` | Ghost |
| `destructive-solid` | Destructive Solid |
| `destructive-outline` | Destructive Outline |

#### Variants table positioning

Insert the variants table between header and master components:
```
variantsSection.y = HEADER_HEIGHT + DIVIDER_GAP + 1 + DIVIDER_GAP
                  = 281
# Push master components section down by table height
masterSection.y = variantsSection.y + tableHeight + DIVIDER_GAP + 1 + DIVIDER_GAP
```

#### After building Section 2, reorder page children:
```
bridge_reorder_children(pageId, [
  headerNode.id,
  divider1.id,
  variantsSectionHeader.id,
  tableFrame.id,
  divider2.id,
  masterSectionHeader.id,
  masterContainer.id
])
```

---

## Prompt 2 (optional) — Add variants table

After master components exist, user can add the variants table:

> "Now build the variants table (Section 2) for the Button DS page."

### Step-by-step

1. **Read master components** from the page
   - `bridge_list_components` → get all master component IDs
   - Build lookup map keyed by property name
2. **Build Section 2** using the Section 2 builder above
   - Each row = 1 variant, columns = states
   - Instance the matching master component in each cell
   - Use `DISPLAY_SIZE = "md"` for table instances
3. **Add section header** — Instance `T Section Header` ("✏️ Variants")
4. **Add column headers** — State labels above the grid
5. **Add dividers** — Between header and variants, between variants and masters
6. **Reorder page** — Header → Divider → Variants → Divider → Masters (top to bottom)

---

## Save code artifacts (final step of both prompts)

After building sections, save two artifacts: the `.figma.tsx` component file
and the `connections.json` mapping file.

### Step 1 — Generate and save `.figma.tsx`

The `.figma.tsx` file is a **real, renderable React component** that imports
and renders the project's actual UI library component in all visual variants.
It contains NO business logic — visual/style only.

#### How to detect the import path

1. Read the project's `package.json` to detect the UI library
2. Use `bridge_read_component_source(name="{ComponentName}")` to find the
   actual source file and import path
3. If source not found, use the library's standard import path:
   - shadcn/ui: `@/components/ui/{component}`
   - MUI: `@mui/material/{Component}`
   - Chakra UI: `@chakra-ui/react`
   - Ant Design: `antd`

#### File generation template

```tsx
import React from "react";
import { {ComponentName} } from "{importPath}";

/**
 * Figma DS Page: {ComponentName}
 * Library: {libraryName}
 * Master components: size={sizes} × variant={variants} × state={states}
 * Figma page node: {pageNodeId}
 * Source: {sourceFilePath}
 */
export default function {ComponentName}Figma() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 16 }}>
      {/* One group per variant */}
      {variants.map(variant => (
        <div style={{ display: "flex", gap: 12 }}>
          <{ComponentName} variant="{variant}">{variant} Default</{ComponentName}>
          <{ComponentName} variant="{variant}" disabled>{variant} Disabled</{ComponentName}>
        </div>
      ))}
      {/* Sizes */}
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        {sizes.map(size => (
          <{ComponentName} size="{size}">{size}</{ComponentName}>
        ))}
      </div>
    </div>
  );
}
```

#### Bridge call

```
bridge_save_component_spec(
  name: "{ComponentName}",      // e.g., "Button"
  content: "<full TSX string>"  // the generated file content
)
```

This saves to `figma/components/{ComponentName}.figma.tsx`.

#### Rules for `.figma.tsx` content

- ✅ Import the REAL component from the project's UI library
- ✅ Render every variant side-by-side in a visual grid
- ✅ Include both default and disabled states for each variant
- ✅ Show all sizes in a separate row
- ✅ Include JSDoc with Figma node ID, library name, source path
- ❌ No `onClick`, `onChange`, or event handlers
- ❌ No `useState`, `useEffect`, or hooks
- ❌ No API calls, data fetching, or business logic
- ❌ No router or navigation logic

### Step 2 — Save connections.json

Build the connections array from the `allComponents` list created during
the Section 3 master component builder.

#### Connection entry format

```jsonc
{
  "figmaNodeId": "42:100",           // from bridge_create_component result
  "figmaComponentName": "size=md, variant=solid, state=default, type=default",
  "codeComponent": "Button",         // PascalCase component name
  "file": "src/components/ui/button.tsx",  // source file path
  "linkedAt": "2026-03-19T12:00:00.000Z"   // ISO 8601 timestamp
}
```

#### Bridge call

```
bridge_save_connections(
  connections: [
    // One entry per master component created
    { figmaNodeId, figmaComponentName, codeComponent, file, linkedAt },
    { figmaNodeId, figmaComponentName, codeComponent, file, linkedAt },
    // ... (48 entries for default matrix)
  ]
)
```

#### Rules for connections

- Every master component MUST have a connection entry
- `figmaComponentName` MUST match the property-based name exactly
- `file` should point to the project's actual source file (detected via
  `bridge_read_component_source` or inferred from library)
- `linkedAt` uses current ISO timestamp
- If connections already exist (from previous runs), MERGE — don't replace.
  Read existing via `bridge_read_connections`, then append new entries.

### Step 3 — Verify and report

After saving, report the result:

```
✅ Saved figma/components/Button.figma.tsx (renders 6 variants × 2 sizes)
✅ Saved connections.json with 48 component mappings
```

If any save fails, report the error but don't block — the Figma components
are already created and usable.

---

## Completion gate

Must all be true:
- [ ] New Figma page created for the component
- [ ] Master components created with property-based naming
- [ ] Design tokens created as Figma variables
- [ ] Templates discovered and instanced (or fallbacks used)
- [ ] `.figma.tsx` React component file saved in `figma/components/`
- [ ] `connections.json` updated with all component mappings
- [ ] Work is NOT only in `figma/pages/showcase/`

---

## Example prompt

```
Create a Design System page for Button based on shadcn/ui.

Use green-500 (#22C55E) as the primary color.

The page should have:
1. Header — component name, description, links
2. Master components — all variant combinations with property naming

Create the design tokens as Figma variables.
```
