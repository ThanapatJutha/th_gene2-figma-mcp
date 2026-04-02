---
name: figma-node-manipulation
description: >
  Patterns for reading, creating, updating, and deleting Figma nodes via bridge
  commands. Use when performing direct node manipulation tasks like updating text,
  changing fills, resizing frames, or repositioning elements in Figma.
---

# Figma Node Manipulation

## Standard sequence

1. Read current node state
2. Apply minimal updates only
3. Re-read for verification when critical

---

## Supported properties

All node-modifying commands (`bridge_create_node`, `bridge_update_node`,
`bridge_create_instance`) support the same property set:

| Property | Node types | Description |
|----------|-----------|-------------|
| `characters` | TEXT | Text content |
| `width`, `height` | FRAME, TEXT | Dimensions (via resize) |
| `x`, `y` | All (not PAGE/DOCUMENT) | Position |
| `fills` | FRAME, TEXT | Fill paints array |
| `strokes` | FRAME, TEXT | Stroke paints array |
| `strokeWeight` | FRAME, TEXT | Stroke width |
| `fontSize` | TEXT | Font size |
| `fontName` | TEXT | `{ family, style }` object |
| `cornerRadius` | FRAME | Corner rounding |
| `layoutMode` | FRAME | `"NONE"`, `"HORIZONTAL"`, `"VERTICAL"` |
| `primaryAxisSizingMode` | FRAME | `"FIXED"`, `"AUTO"` |
| `counterAxisSizingMode` | FRAME | `"FIXED"`, `"AUTO"` |
| `itemSpacing` | FRAME | Auto layout gap |
| `primaryAxisAlignItems` | FRAME | `"MIN"`, `"CENTER"`, `"MAX"`, `"SPACE_BETWEEN"` |
| `counterAxisAlignItems` | FRAME | `"MIN"`, `"CENTER"`, `"MAX"` |
| `paddingLeft/Right/Top/Bottom` | FRAME | Auto layout padding |
| `opacity` | All | Node opacity |
| `visible` | All | Visibility |
| `clipsContent` | FRAME | Clip overflow |
| `layoutAlign` | FRAME (child) | `"STRETCH"`, `"INHERIT"`, etc. |
| `layoutGrow` | FRAME (child) | Flex grow (0 or 1) |

---

## Key behaviors

- **`create_node`** applies ALL properties in a single call. Pass everything
  in the `properties` object — no separate `update_node` needed.
- **`create_instance`** also applies properties via the same handler. It
  additionally supports `characters` to set the first TEXT child's text.
- **`read_node`** returns `mainComponentId` and `mainComponentName` for
  INSTANCE nodes — use this to discover template master component IDs.

Always follow global source-of-truth ordering before style-sensitive updates.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Capture pending/hangs | Use timeout + polling, verify target URL reachable |
| Partial capture on external pages | Use lazy-load / full-page capture strategy |
| Bridge disconnected | Restart bridge (`npm run bridge`) and reconnect plugin |
| Overlapping frames | Assign explicit positions, verify after updates |
| Node update appears ignored | Re-read node and re-apply minimal patch |
| Convert failure for text nodes | Wrap text in a frame first |

**Restart rule:** After bridge/plugin source changes, restart bridge and reload
plugin before re-testing.
