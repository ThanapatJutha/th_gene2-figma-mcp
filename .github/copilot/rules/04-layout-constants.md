# Rule 4 — Layout Constants & Construction Patterns

Pre-defined constants and patterns for building DS component pages.
Copilot MUST use these constants — no ad-hoc positioning math.

---

## Build order (mandatory)

Always build sections in this order:

1. **Section 3 — Master components** (created first so instances exist)
2. **Section 2 — Variants table** (instances reference masters from step 1)
3. **Section 1 — Header** (placed at top, depends on nothing)

---

## Page-level section positioning

Each section is separated by a divider with spacing:

```
HEADER_HEIGHT  = 200   # T Header or fallback frame height
DIVIDER_GAP    = 40    # space before/after each divider
DIVIDER_HEIGHT = 1     # divider line thickness
PAGE_WIDTH     = 1200  # standard page content width
```

### Section Y offsets (Prompt 1 — Header + Masters only)

```
Header:           y = 0
Divider 1:        y = HEADER_HEIGHT + DIVIDER_GAP = 240
Master Header:    y = 240 + DIVIDER_HEIGHT + DIVIDER_GAP = 281
Master Grid:      y = 281 + 48 + 16 = 345   (section header height + gap)
```

### Section Y offsets (Prompt 2 — with Variants table inserted)

```
Header:           y = 0
Divider 1:        y = 240
Variants Header:  y = 281
Variants Table:   y = 281 + 48 + 16 = 345
Divider 2:        y = 345 + tableHeight + DIVIDER_GAP
Master Header:    y = Divider 2 + DIVIDER_HEIGHT + DIVIDER_GAP
Master Grid:      y = Master Header + 48 + 16
```

---

## Section 1 — Header layout constants

```
HEADER_WIDTH        = 1200
HEADER_HEIGHT       = 200
HEADER_PAD_X        = 40    # left padding for text
HEADER_PAD_Y        = 24    # top padding
BREADCRUMB_FONT     = 14
BREADCRUMB_COLOR    = #737373
TITLE_FONT          = 32
TITLE_FONT_WEIGHT   = 700
TITLE_COLOR         = #171717
TITLE_Y             = 56
DESCRIPTION_FONT    = 16
DESCRIPTION_COLOR   = #737373
DESCRIPTION_Y       = 108
LINK_FONT           = 14
LINK_COLOR          = #3B82F6
LINK_Y              = 152
```

---

## Section 2 — Variants table layout constants

```
CELL_WIDTH   = 160   # px per state column
CELL_HEIGHT  = 80    # px per row
GAP_X        = 16    # horizontal gap between columns
GAP_Y        = 12    # vertical gap between rows
LABEL_WIDTH  = 200   # row label column width
SECTION_PAD  = 40    # padding before/after section
```

### Row-by-row construction pattern

Build the variants table one row at a time:

```
for each variantIndex, variant in enumerate(variants):
  1. bridge_create_node(FRAME, name="Row: {variant}")
     → set y = variantIndex * (CELL_HEIGHT + GAP_Y)
     → set width = LABEL_WIDTH + numStates * (CELL_WIDTH + GAP_X)
     → set height = CELL_HEIGHT

  2. bridge_create_node(TEXT, parent=rowFrame)
     → set text = variant name (e.g., "Solid")
     → set x = 0, width = LABEL_WIDTH

  3. for each stateIndex, state in enumerate(states):
       bridge_create_instance(masterComponentId, parent=rowFrame)
       → set x = LABEL_WIDTH + stateIndex * (CELL_WIDTH + GAP_X)
```

**Bridge calls per row:** 1 frame + 1 text + N instances = ~6 calls (for 4 states)
**Total calls for 7 variant rows:** ~42 bridge calls (predictable, manageable)

### Column header row

Before the data rows, create a header row with state labels:

```
bridge_create_node(FRAME, name="Column Headers")
→ y = -CELL_HEIGHT - GAP_Y  (above first data row)

for each stateIndex, state in enumerate(states):
  bridge_create_node(TEXT, parent=headerRow)
  → text = state name (e.g., "Default", "Hover", "Pressed", "Disabled")
  → x = LABEL_WIDTH + stateIndex * (CELL_WIDTH + GAP_X)
```

---

## Section 3 — Master components

### Default matrix (reduced for reliability)

```
SIZES    = [lg, md]           # 2 sizes (add sm as follow-up)
VARIANTS = [solid, outline, dim, ghost, destructive-solid, destructive-outline]  # 6
STATES   = [default, hover, pressed, disabled]  # 4
TYPES    = [default]          # 1 (add icon-left as follow-up)

Total = 2 × 6 × 4 × 1 = 48 components
```

### Batch-by-size-tier pattern

Create all components for one size before moving to the next.
Each batch is independent — if one fails, the others are still valid.

```
for each size in SIZES:
  for each variant in VARIANTS:
    for each state in STATES:
      for each type in TYPES:
        name = "size={size}, variant={variant}, state={state}, type={type}"

        1. bridge_create_node(FRAME, name=name)
           → width = SIZE_DIMENSIONS[size].width
           → height = SIZE_DIMENSIONS[size].height
           → fills = TOKEN_FILLS[variant][state]

        2. bridge_update_node(nodeId, fills, dimensions)

        3. bridge_create_component(nodeId)
```

### Component dimension rules

```
SIZE_DIMENSIONS:
  sm: { height: 32, minWidth: 64 }    # added via follow-up only
  md: { height: 40, minWidth: 80 }
  lg: { height: 44, minWidth: 96 }
```

### Grid layout for master component section

```
MASTER_COL_WIDTH  = 120   # px per component in grid
MASTER_ROW_HEIGHT = 60    # px per row in grid
MASTER_GAP        = 8     # gap between components
COLS_PER_ROW      = 6     # components per row (matches variant count)
```

Position formula:
```
x = (componentIndex % COLS_PER_ROW) * (MASTER_COL_WIDTH + MASTER_GAP)
y = floor(componentIndex / COLS_PER_ROW) * (MASTER_ROW_HEIGHT + MASTER_GAP)
```

### Escape valve

If context window is running low mid-batch:
1. Reduce `TYPES` to `[default]` only (cuts total in half)
2. Complete current size tier, skip remaining sizes
3. Tell user: "Created {N} of {total} components. Run a follow-up prompt to add the remaining sizes."

---

## Property naming pattern (strict)

**Format:** `size={size}, variant={variant}, state={state}, type={type}`

Rules:
- Use exact format above — no reordering, no extra spaces
- Values are lowercase with hyphens for multi-word: `destructive-solid`
- No quotes around values
- Comma + single space between properties

Examples:
- ✅ `size=md, variant=solid, state=default, type=default`
- ✅ `size=lg, variant=destructive-outline, state=hover, type=icon-left`
- ❌ `variant=solid, size=md, state=default` (wrong order)
- ❌ `size = md , variant = solid` (extra spaces)
- ❌ `size=md/variant=solid` (wrong separator)

---

## Follow-up expansion prompts

After initial creation succeeds, user can expand with:

1. **Add `sm` size:**
   > "Add size=sm variants to the Button master components. Use height=32, minWidth=64."

2. **Add `icon-left` type:**
   > "Add type=icon-left variants to all existing Button master components."

3. **Build variants table (Section 2):**
   > "Now build the variants table (Section 2) using instances of the master components you just created."

---

## Token-to-fill application rules

When creating master components, apply design token variables to fills
and text colors. The mapping depends on the variant and state.

### Priority order for fill application

1. Use `bridge_create_variable` result IDs to set fills by variable binding
2. If variable binding is not supported, use the hex value from the token
3. Never hardcode hex values — always reference the token name

### Component text label

Each master component contains a TEXT node showing the component name:
```
TEXT content   = "{ComponentName}"    # e.g., "Button"
TEXT x         = 12                   # left padding inside component
TEXT y         = centered vertically
TEXT fontSize  = SIZE_FONT[size]      # md=14, lg=16
```

For `disabled` state: set text opacity to 0.5 or use `color/neutral/400`.
