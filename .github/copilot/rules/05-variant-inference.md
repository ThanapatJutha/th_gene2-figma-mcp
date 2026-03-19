# Rule 5 — Variant Inference

When creating a DS component page, Copilot must infer the component's
variants and states from the library reference. This rule defines how.

---

## Inference process

1. **Identify the library** from the user's prompt (URL or name)
2. **Identify the component** (Button, Card, Badge, etc.)
3. **Apply known variant structure** from the table below
4. **If ambiguous → ask the user** before proceeding

---

## Known variant structures

### shadcn/ui (Radix-based)

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | default, secondary, destructive, outline, ghost, link | default, hover, pressed, disabled | sm, md (default), lg, icon | default, icon-left, icon-right |
| **Badge** | default, secondary, destructive, outline | default | — | — |
| **Card** | default | default | — | with-header, with-footer, full |
| **Alert** | default, destructive | default | — | with-icon, without-icon |
| **Input** | default | default, focus, error, disabled | sm, md, lg | — |
| **Select** | default | default, open, disabled | — | — |
| **Checkbox** | default | unchecked, checked, indeterminate, disabled | — | — |
| **Switch** | default | off, on, disabled | — | — |
| **Avatar** | default | default, fallback | sm, md, lg | — |
| **Tabs** | default | default, active | — | — |

### MUI (Material UI)

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | contained, outlined, text | default, hover, pressed, disabled | small, medium, large | default, startIcon, endIcon |
| **TextField** | outlined, filled, standard | default, focus, error, disabled | small, medium | — |
| **Chip** | filled, outlined | default, disabled | small, medium | with-avatar, with-icon, deletable |

### Chakra UI

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | solid, outline, ghost, link | default, hover, pressed, disabled, loading | xs, sm, md, lg | default, leftIcon, rightIcon |

### Ant Design

| Component | Variants | States | Sizes | Types |
|-----------|----------|--------|-------|-------|
| **Button** | primary, default, dashed, text, link | default, hover, pressed, disabled, loading | small, middle, large | default, icon |

---

## Variant plan output format

Before building, Copilot presents the variant plan to the user:

```
I've analyzed the Button component from shadcn/ui. Here's my plan:

**Variants:** solid, outline, dim, ghost, destructive-solid, destructive-outline
**States:** default, hover, pressed, disabled
**Sizes:** md, lg (add sm in a follow-up)
**Types:** default (add icon-left in a follow-up)

**Total master components:** 2 × 6 × 4 × 1 = 48

Want me to proceed, or would you like to adjust the variants?
```

---

## Clarification rules

Ask the user when:
- Library is not in the known list above
- Component is not in the known list for the identified library
- User's prompt mentions custom variants not in the standard set
- User's prompt is ambiguous (e.g., "create a button" without specifying library)

Do NOT ask when:
- Library and component are both in the known list
- User explicitly listed their variants in the prompt
- User said "use defaults" or similar

---

## Mapping library variants to DS property values

The variant names in the known structures above map to the property naming
convention in the DS page. Use these exact values:

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
