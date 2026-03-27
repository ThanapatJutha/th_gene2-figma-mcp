---
name: discover-and-convert
description: >
  Scan an existing Figma page, identify component candidates, and convert them
  to proper Figma components. Use when user asks to "discover components",
  "convert layers", "find component candidates", or wants to turn existing
  frames/groups into reusable Figma components.
---

# Discover and Convert

Goal: Scan an existing Figma page, identify component candidates, and convert
them to proper Figma components with specs and mappings.

---

## Steps

1. **List layers** — `bridge_list_layers` → identify component candidates
2. **Suggest candidates** — present to user for confirmation
3. **Convert** — `bridge_create_component` → promote eligible nodes (FRAME, GROUP — not TEXT)
4. **Save spec** — `bridge_save_component_spec` → save `.figma.tsx` for each
5. **Save mappings** — `bridge_save_connections` → save all component mappings

---

## Eligibility

| Node Type | Convertible? | Notes |
|-----------|-------------|-------|
| FRAME | ✅ Yes | Most common candidate |
| GROUP | ✅ Yes | Convert to component directly |
| RECTANGLE | ✅ Yes | Simple shape components |
| TEXT | ❌ No | Wrap in a FRAME first |
| COMPONENT | ❌ No | Already a component |

---

## Candidate heuristics

Identify likely components by:
- **Shallow hierarchy depth** — top-level reusable UI blocks
- **Reusable naming patterns** — card, button, header, sidebar, nav, table, chart, footer
- **Repeated visual structures** — similar dimensions/fills appearing multiple times
- **Semantic naming** — frames named after UI concepts

---

## Conversion workflow

```
1. bridge_list_layers(pageId)
   → returns layers with isComponentCandidate flag

2. Present candidates to user:
   "I found these potential components:
    - Frame 'Header' (200×60) — looks like a navigation header
    - Frame 'Card' (320×240) — repeated 3 times
    Convert all, or select specific ones?"

3. For each confirmed candidate:
   a. bridge_create_component(nodeId)
   b. Preserve original dimensions — validate no layout drift
   c. bridge_save_component_spec(name, content)

4. bridge_save_connections(connections)
   → save all new mappings
```

---

## Required outputs

A conversion task is complete only when ALL exist:
- Figma components created via `bridge_create_component`
- `.figma.tsx` files saved in `figma/components/`
- Mappings saved in `figma/app/.figma-sync/connections.json`

---

## Dimension preservation

When converting frames to components:
- Record original width/height before conversion
- Verify dimensions match after `bridge_create_component`
- If drift occurs, use `bridge_update_node` to restore original dimensions
