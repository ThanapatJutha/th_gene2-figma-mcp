---
name: create-ds-component-page
description: >
  Full workflow for creating a Design System component page in Figma.
  Use when user mentions "create DS page", "design system page", "component page",
  a UI library (shadcn/ui, MUI, Chakra, etc.), or wants to build Figma components
  for Button, Badge, Card, etc. Covers the full pipeline: parse → explore → suggest
  → build showcase → capture to Figma → post-process → save artifacts.
---

# Create DS Component Page

## Usecase detection

When a user prompt mentions any of these:
- A UI library name or URL (shadcn/ui, MUI, Chakra UI, etc.)
- "Create DS page for…", "design system page…", "component page…"
- "Create Figma components for Button/Card/…"
- A component name + library reference

→ This is the Create DS Component Page usecase.

---

## CRITICAL: Two layout strategies

| Layout | Used for | Calculation | Example (4 variants × 3 sizes) |
|--------|----------|-------------|---------------------------------|
| **Per-property** | Display sections only | Sum of all options | 4 + 3 = **7 items** |
| **Cross-product** | Master components (COMPONENT_SET) | Product of all options | 4 × 3 = **12 masters** |

- **Display sections** show one section per property. Each item sets only ONE property.
- **Master components** must have ALL property combinations for Figma's variant picker.

---

## Workflow: Parse → Explore → Suggest → Confirm → Build → Capture → Post-process → Save

### Step 1: Parse
Extract component name(s), library, Figma file key from user prompt.

### Step 2: Explore library
Read component source code + apply built-in knowledge to detect properties
(variant, size, state, etc.).

### Step 3: Suggest properties
Present properties table to user for confirmation:
- Show each property with its options
- User can add/remove/change before proceeding
- Display sections: per-property (e.g., 4+3=7)
- Masters: cross-product (e.g., 4×3=12)

### Step 4: Build showcase page
Create/update page at `figma/showcase/src/pages/{Name}.tsx`:
- Uses `DSPageTemplate` component for consistent layout
- Start dev server: `cd figma/showcase && ./node_modules/.bin/vite --port 5173`
- **NEVER** use `npx vite` — it may use globally cached Vite 6 which is incompatible
- Use `?component=Name` query param, NOT hash routing — Figma capture uses the hash

**Property option ordering:** The **first option** of each property is used as the
default value for property section rendering AND instance swap matching. Always put
the most representative / "default" value first in the options array.

Example:
```
// ✅ "default" first — used as the fallback in property sections
{ name: "variant", options: [
  { value: "default", label: "Default" },  // ← first = swap default
  { value: "secondary", label: "Secondary" },
  ...
]}
// ❌ "sm" first — would make all property section items render at sm size
{ name: "size", options: [
  { value: "sm", label: "Small" },
  { value: "default", label: "Default" },  // this should be first
  ...
]}
```

### Step 5: Capture to Figma
Use `generate_figma_design` with `?component={Name}` URL.

### Step 6: Post-process (CRITICAL)
Create Figma page, move captured frame, then:

#### 6a: Read the captured tree and locate sections

⚠️ **NEVER parse tree JSON with Python/Node scripts.** Always use bridge MCP tools directly.

```
tree = bridge_read_tree(capturedFrameId, depth=5)
```

Navigate the tree to find key containers. Typical captured structure:
```
Captured frame (from generate_figma_design)
└── DSPageTemplate root (PAGE_W wide)
    ├── Header section
    └── Body section (paddingLeft=80, paddingRight=80)
        ├── Property section: {prop1}
        │   ├── SectionHeader "👉 Property: {prop1}"
        │   ├── Items row (flex, CONTENT_W wide)
        │   │   ├── Cell (200×120) — component + label
        │   │   └── ...
        │   └── HorizontalDivider (optional)
        ├── Property section: {prop2}
        │   └── ...
        ├── HorizontalDivider (before masters)
        ├── SectionHeader "✏️ Master Components"
        └── Master container (CONTENT_W, flex-wrap)
            ├── ComponentFrame (bare, no wrapper)
            ├── ComponentFrame
            └── ...
```

Find the **master container**: the last major FRAME child of the body section,
after the "✏️ Master Components" section header. Its direct children are bare
component frames in **cross-product order** (matching `crossProduct(properties)`
from DSPageTemplate).

Also note each **property section's items row** — you'll need these for step 6d.

#### 6b: Promote, name, and combine in one shot

Pre-compute the cross-product to build variant names:
```
properties = [{name: "variant", options: ["default","secondary",...]}, ...]

crossProduct = all combinations in nested-loop order
   → ["variant=default, size=sm, mode=light, withIcon=false",
      "variant=default, size=sm, mode=light, withIcon=true",
      ...]
```

Read master container children:
```
masterContainer = bridge_read_node(masterContainerId, depth=1)
children = masterContainer.children  // bare component frames
```

Build the nodes array, pairing each child ID with its variant name by index:
```
nodes = children.map((child, i) => ({
  nodeId: child.id,
  variantName: crossProduct[i]   // e.g. "variant=default, size=sm"
}))
```

Call `bridge_promote_and_combine` — this promotes, renames, AND combines in one call:
```
result = bridge_promote_and_combine(
  nodes=nodes,
  setName="{ComponentName}",
  parentId=masterContainer.id
)
```

Response contains:
```
{
  componentSetId: "123:456",
  componentSetName: "Button",
  components: [{ id: "123:457", name: "variant=default, size=sm, ...", ... }, ...]
}
```

The COMPONENT_SET is placed inside `parentId` (the master container).
No further moving is needed.

#### 6c: Swap property section items with instances (REQUIRED)

Each property section shows one-property-at-a-time variations. Each item was
rendered with **all other properties set to their first-option default**
(DSPageTemplate computes `defaults` from `properties[*].options[0].value`).

For each property section:
1. Find the **items row** (the flex container after the SectionHeader)
2. Each cell (200×120) has children:
   - First FRAME child → the **component frame** (swap target)
   - Last child → the **label text** (keep as-is)
3. Determine which master variant matches:
   - The varying property uses the cell's value
   - All other properties use their **first option** (default)
   - Build the variant name: `{prop1}={default}, ..., {propN}={value}, ...`
4. Find the matching component from `result.components` by name

Collect all swaps, then execute in one batch:
```
swaps = []
for each propertySection:
  for each cell in itemsRow.children:
    componentFrame = cell.children[0]   // first FRAME child
    variantName = buildVariantName(prop, value, defaults)
    masterId = componentLookup[variantName]   // from step 6b result
    swaps.push({ nodeId: componentFrame.id, componentId: masterId })

bridge_swap_batch(swaps=swaps)
```

**Example** (Button with properties: variant, size, mode, withIcon):
- Defaults: variant=default, size=sm, mode=light, withIcon=false
- Property section "variant", item "destructive":
  → swap with master `variant=destructive, size=sm, mode=light, withIcon=false`
- Property section "size", item "lg":
  → swap with master `variant=default, size=lg, mode=light, withIcon=false`

After swapping, property display items are real component instances that update
when the master component changes.

### Step 7: Save artifacts
- `bridge_save_component_spec` → `.figma.tsx` in `figma/components/`
  - **MUST be a wrapper that imports the component from the library** — never paste raw source code
  - Include JSDoc with library, variants, sizes, Figma page node, component set ID, source path
  - Re-export the component for convenience
- `bridge_save_connections` → all component mappings

✅ **Done only when the completion gate is satisfied:**
- [ ] Figma page created (one page per component)
- [ ] Master components with property-based naming
- [ ] Design tokens created as Figma variables
- [ ] Templates discovered and instanced (or fallbacks used)
- [ ] `.figma.tsx` file saved
- [ ] `connections.json` saved
- [ ] Work is NOT only in `figma/showcase/`

---

## Direct bridge workflow (fallback)

Use when the capture workflow isn't feasible. Build order (mandatory):
**Section 3 (Master Components) → Section 1 (Header) → Dividers → Save artifacts**

Section 3 first because Section 2 (if added later) needs master component IDs.

### Section 1 — Header builder

```
# If T_HEADER template found:
headerNode = bridge_create_instance(componentId=T_HEADER.id)
bridge_update_node(breadcrumbTextId, { characters: "PALO IT · Components → {Name}" })
bridge_update_node(titleTextId, { characters: "{Name}" })
bridge_update_node(descriptionTextId, { characters: "{description}" })

# If T_HEADER NOT found → fallback:
headerFrame = bridge_create_node(FRAME, name="Header", {
  width: 1200, height: 200, fills: [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }]
})
bridge_create_node(TEXT, parent=headerFrame.id, {
  characters: "PALO IT · Components → {Name}",
  x: 40, y: 24, fontSize: 14,
  fills: [{ type: "SOLID", color: { r: 0.45, g: 0.45, b: 0.45 } }]
})
bridge_create_node(TEXT, parent=headerFrame.id, {
  characters: "{Name}", x: 40, y: 56, fontSize: 32, fontWeight: 700,
  fills: [{ type: "SOLID", color: { r: 0.09, g: 0.09, b: 0.09 } }]
})
bridge_create_node(TEXT, parent=headerFrame.id, {
  characters: "{description}", x: 40, y: 108, fontSize: 16,
  fills: [{ type: "SOLID", color: { r: 0.45, g: 0.45, b: 0.45 } }]
})
bridge_create_node(TEXT, parent=headerFrame.id, {
  characters: "📖 Documentation →", x: 40, y: 152, fontSize: 14,
  fills: [{ type: "SOLID", color: { r: 0.23, g: 0.51, b: 0.97 } }]
})
```

#### Auto-generated descriptions

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

Generic fallback: "Displays a {component name}. {Brief purpose}. Supports {key variants/features}."

### Section 3 — Master component builder

Default matrix: `SIZES=[lg, md]`, `VARIANTS=[6]`, `STATES=[4]`, `TYPES=[1]` = **48 components**

```
componentIndex = 0
allComponents = []

for each size in [lg, md]:
  for each variant in [solid, outline, dim, ghost, destructive-solid, destructive-outline]:
    for each state in [default, hover, pressed, disabled]:
      name = "size={size}, variant={variant}, state={state}, type=default"
      col = componentIndex % 6
      row = floor(componentIndex / 6)
      x = col * (MASTER_COL_WIDTH + MASTER_GAP)
      y = row * (MASTER_ROW_HEIGHT + MASTER_GAP)

      node = bridge_create_node(FRAME, name=name, parent=masterContainer.id, {
        x, y,
        width: SIZE_DIMENSIONS[size].minWidth,
        height: SIZE_DIMENSIONS[size].height,
        fills: TOKEN_FILLS[variant][state],
        cornerRadius: 6, layoutMode: "HORIZONTAL",
        paddingLeft: 12, paddingRight: 12,
        counterAxisAlignItems: "CENTER"
      })

      bridge_create_node(TEXT, parent=node.id, {
        characters: "{ComponentName}",
        fontSize: SIZE_FONT[size],
        fills: TEXT_COLOR_FOR[variant][state]
      })

      result = bridge_create_component(node.id)
      allComponents.push({ figmaNodeId: result.id, figmaComponentName: name, ... })
      componentIndex++
```

**Bridge calls per component:** 3 (create frame + create text + promote)
**Total for 48 components:** ~144 bridge calls (24 per size tier)

### Section 2 — Variants table builder (Prompt 2)

Built after master components exist. Uses `DISPLAY_SIZE = "md"` for all instances.

```
# Read existing masters → build lookup map
masters = bridge_list_components()
masterLookup = { "size=md, variant=solid, state=default, type=default": nodeId, ... }

# Build rows: one per variant, columns = states
for each variant in variants:
  rowFrame = bridge_create_node(FRAME, ...)
  bridge_create_node(TEXT, { characters: "{Variant Display Name}" })
  for each state in states:
    masterKey = "size={DISPLAY_SIZE}, variant={variant}, state={state}, type=default"
    bridge_create_instance(componentId=masterLookup[masterKey], parent=rowFrame.id)
```

After building, reorder page children:
```
bridge_reorder_children(pageId, [header, divider1, variantsSection, divider2, masterSection])
```

#### Variant display name mapping

| Internal | Display |
|----------|---------|
| `solid` | Solid |
| `outline` | Outline |
| `dim` | Dim |
| `ghost` | Ghost |
| `destructive-solid` | Destructive Solid |
| `destructive-outline` | Destructive Outline |

---

## Token-to-fill mapping

Map variant + state to design token fills for master component creation:

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

---

## Variant inference

### Inference process

1. Identify the library from the user's prompt
2. Identify the component
3. Apply known variant structure from tables below
4. If ambiguous → ask the user

### Known variant structures

#### shadcn/ui (Radix-based)

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | default, secondary, destructive, outline, ghost, link | default, hover, pressed, disabled | sm, md, lg, icon | default, icon-left, icon-right |
| **Badge** | default, secondary, destructive, outline | default | — | — |
| **Card** | default | default | — | with-header, with-footer, full |
| **Alert** | default, destructive | default | — | with-icon, without-icon |
| **Input** | default | default, focus, error, disabled | sm, md, lg | — |
| **Select** | default | default, open, disabled | — | — |
| **Checkbox** | default | unchecked, checked, indeterminate, disabled | — | — |
| **Switch** | default | off, on, disabled | — | — |
| **Avatar** | default | default, fallback | sm, md, lg | — |
| **Tabs** | default | default, active | — | — |

#### MUI (Material UI)

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | contained, outlined, text | default, hover, pressed, disabled | small, medium, large | default, startIcon, endIcon |
| **TextField** | outlined, filled, standard | default, focus, error, disabled | small, medium | — |
| **Chip** | filled, outlined | default, disabled | small, medium | with-avatar, with-icon, deletable |

#### Chakra UI

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | solid, outline, ghost, link | default, hover, pressed, disabled, loading | xs, sm, md, lg | default, leftIcon, rightIcon |

#### Ant Design

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | primary, default, dashed, text, link | default, hover, pressed, disabled, loading | small, middle, large | default, icon |

### Mapping library variants to DS property values

```
shadcn "default"     → variant=solid
shadcn "secondary"   → variant=outline
shadcn "destructive" → variant=destructive-solid
shadcn "outline"     → variant=outline
shadcn "ghost"       → variant=ghost
shadcn "link"        → variant=link
```

If a library uses different naming, map to the closest DS equivalent.
Document the mapping in the variant plan output.

### Variant plan output format

Present to user before building:
```
I've analyzed {Component} from {Library}. Here's my plan:

**Variants:** ...
**States:** ...
**Sizes:** ...

**Display sections:** X + Y = Z items
**Master components:** X × Y = N masters

Want me to proceed, or would you like to adjust?
```

### Clarification rules

**Ask** when: library/component not in known list, custom variants mentioned, or ambiguous prompt.
**Do NOT ask** when: library and component are both known, user explicitly listed variants, or user said "use defaults".

---

## Layout constants

### Page structure

```
PAGE "{ComponentName}"
└── FRAME "{ComponentName}" (layoutMode=VERTICAL, width=PAGE_WIDTH)
    ├── FRAME "Header" (fallback) or INSTANCE "T Header"
    └── FRAME "Body" (layoutMode=VERTICAL, paddingLeft=80, paddingRight=80)
        ├── FRAME "Master component" (layoutMode=VERTICAL)
        │   ├── FRAME "Section Header"
        │   └── FRAME "Content wrapper" (cornerRadius=16, padding=40, white fill)
        └── (optional) FRAME "Variants" — added in Prompt 2
```

Key rules: wrapping VERTICAL auto layout frame, body uses `paddingLeft/Right=80`,
content wrappers use `cornerRadius=16, padding=40, white fill`.

### Page-level constants

```
PAGE_WIDTH      = 2164
CONTENT_WIDTH   = 2004   (PAGE_WIDTH - 2 × BODY_PAD_X)
BODY_PAD_X      = 80
CONTENT_PAD     = 40
CONTENT_RADIUS  = 16
```

### Header layout constants

```
HEADER_WIDTH=1200, HEADER_HEIGHT=200, HEADER_PAD_X=40, HEADER_PAD_Y=24
BREADCRUMB_FONT=14, BREADCRUMB_COLOR=#737373
TITLE_FONT=32, TITLE_FONT_WEIGHT=700, TITLE_COLOR=#171717, TITLE_Y=56
DESCRIPTION_FONT=16, DESCRIPTION_COLOR=#737373, DESCRIPTION_Y=108
LINK_FONT=14, LINK_COLOR=#3B82F6, LINK_Y=152
```

### Variants table layout constants

```
CELL_WIDTH=160, CELL_HEIGHT=80, GAP_X=16, GAP_Y=12
LABEL_WIDTH=200, SECTION_PAD=40
```

### Master component grid

```
MASTER_COL_WIDTH=120, MASTER_ROW_HEIGHT=60, MASTER_GAP=8, COLS_PER_ROW=6
```

Position formula:
```
x = (componentIndex % COLS_PER_ROW) * (MASTER_COL_WIDTH + MASTER_GAP)
y = floor(componentIndex / COLS_PER_ROW) * (MASTER_ROW_HEIGHT + MASTER_GAP)
```

### Component dimensions

```
SIZE_DIMENSIONS:
  sm: { height: 32, minWidth: 64 }    # added via follow-up only
  md: { height: 40, minWidth: 80 }
  lg: { height: 44, minWidth: 96 }

SIZE_FONT:
  sm: 12
  md: 14
  lg: 16
```

### Section positioning

```
masterSection.y = HEADER_HEIGHT + DIVIDER_GAP + 1 + DIVIDER_GAP
               = 200 + 40 + 1 + 40 = 281
```

### Master section (capture workflow)

The master section renders bare components using `<Fragment>` — no wrapper divs.
Each component's root element is a **direct child** of the master container.
Children are in cross-product order matching `crossProduct(properties)`.
Promote direct children of the master container — no inner/outer distinction needed.

Property sections still use 200×120 cells with labels:
```
ITEM_CELL_W     = 200
ITEM_CELL_H     = 120
```

Property section items are rendered with **all properties explicitly set**:
the varying property uses the displayed value, all other properties use
their **first option** (default). This guarantees each item matches exactly
one master variant for clean instance swapping.

### Property naming (strict format)

Format: `{property}={value}, {property}={value}`

- Values lowercase with hyphens for multi-word: `destructive-solid`
- No quotes, comma + single space between properties

Examples:
- ✅ `size=md, variant=solid, state=default, type=default`
- ✅ `variant=default, size=sm, withDot=false, withIcon=true`
- ❌ `variant=solid, size=md, state=default` (wrong order if size should come first)
- ❌ `size = md , variant = solid` (extra spaces)
- ❌ `size=md/variant=solid` (wrong separator)

---

## Template discovery

Templates use a `T ` prefix: `T Header`, `T Section Header`, `T Divider`.

### Discovery process

Templates may be from a shared library. To discover:

1. Switch to a reference page (e.g., Button-example) with known template usage
2. Read instance nodes: `bridge_read_node(instanceId)` → returns `mainComponentId`
3. Store master component IDs for `bridge_create_instance`

```
bridge_set_current_page(referencePageId)
tHeaderInstance = bridge_read_node("1:777")
→ tHeaderInstance.mainComponentId = "4059:5359"

bridge_set_current_page(targetPageId)
bridge_create_instance(componentId=mainComponentId, parentId=parentFrame)
```

### T Header customization

After instancing, find and update text children using `bridge_read_node(instanceId, depth=3)`:
- Breadcrumb, Title, Description text nodes

### Fallback behavior

| Missing Template | Fallback |
|------------------|----------|
| `T Header` | FRAME (width=PAGE_WIDTH, height=476, layoutMode=VERTICAL) with gradient strip + text children |
| `T Section Header` | FRAME (width=CONTENT_WIDTH, height=80, layoutMode=HORIZONTAL, paddingTop=40, paddingBottom=40) with TEXT child |
| `T Divider` | FRAME (width=CONTENT_WIDTH, height=120) with child frame (width=CONTENT_WIDTH, height=0, y=60) |

Fallback dimensions must match template dimensions for consistent layout.

### Template reference dimensions

| Template | Width | Height | Key properties |
|----------|-------|--------|----------------|
| `T Header` | 1200 | ~200 | White bg, breadcrumb, title, description |
| `T Section Header` | 1200 | 48 | Gray bg (#F5F5F5), label text, ✏️ prefix |
| `T Divider` | 1200 | 1 | Gray stroke (#E5E5E5) |
| `Badge` | auto | 24 | Rounded corners (12), gray bg (#F0F0F0) |

Always report found vs missing:
```
✅ Found: T Header, T Section Header, T Divider
⚠️ Missing: Badge (using fallback frames)
```

---

## Escape valve

If context window runs low mid-batch:
1. Reduce `TYPES` to `[default]` only
2. Complete current size tier, skip remaining
3. Tell user: "Created {N} of {total}. Run a follow-up prompt for remaining sizes."

### Follow-up expansion prompts

After initial creation, user can expand:
1. "Add size=sm variants to the {Component} master components. Use height=32, minWidth=64."
2. "Add type=icon-left variants to all existing {Component} master components."
3. "Now build the variants table (Section 2) using instances of the master components."

---

## Best practices

1. **Use batch tools** for post-processing: `bridge_promote_and_combine`, `bridge_swap_batch`
2. **One page per component** in Figma
3. **Must suggest properties first** before building
4. **Showcase is a capture helper** — never a deliverable on its own
5. **Cross-product for masters, per-property for display** — never confuse these
6. **Design tokens over hardcoded values** — always reference token names
7. **Batch by size tier** to avoid context overflow
8. **Build order:** Section 3 → Section 2 → Section 1 (masters need to exist first)
9. **Always use bridge MCP tools** — never shell out to Python/Node scripts to parse Figma tree data
10. **First option = default** — the first option of each property array is the default for property section rendering and instance swap matching. Put the most representative value first.
11. **Property section swap is REQUIRED** — after creating the COMPONENT_SET, always swap property section items with real instances. This ensures they update when the master changes.
12. **`bridge_promote_and_combine` is a one-shot call** — it takes `{ nodes: [{nodeId, variantName}], setName, parentId }` and handles promoting, naming, and combining. No separate rename step needed.
