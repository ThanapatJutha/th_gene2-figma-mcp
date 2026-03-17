# Rule 1 — Read and Update Nodes

Use for direct node manipulation tasks.

## Standard sequence

1. Read current node state
2. Apply minimal updates only
3. Re-read for verification when critical

## Typical updates

- Text (`characters`)
- Fills/colors
- Dimensions (`width`, `height`)
- Position (`x`, `y`)
- Deletion (when required)

Always follow global source-of-truth ordering before style-sensitive updates.