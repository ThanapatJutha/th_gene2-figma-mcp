# Rule 1 — Read and Update Nodes

Use for direct node manipulation tasks.

## Standard sequence

1. Read current node state
2. Apply minimal updates only
3. Re-read for verification when critical

## Supported properties

All three node-modifying commands (`bridge_create_node`, `bridge_update_node`,
`bridge_create_instance`) support the same property set via a shared handler:

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

### Key behavior

- **`create_node`** applies ALL properties in a single call (no separate
  `update_node` needed). Pass everything in the `properties` object.
- **`create_instance`** also applies properties via the same handler.
  It additionally supports `characters` to set the first TEXT child's text.
- **`read_node`** returns `mainComponentId` and `mainComponentName` for
  INSTANCE nodes — use this to discover template master component IDs.

Always follow global source-of-truth ordering before style-sensitive updates.