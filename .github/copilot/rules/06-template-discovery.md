# Rule 6 — Template Discovery

Templates are pre-seeded Figma components that ensure consistent DS page
structure. Copilot discovers and instances them before building content.

---

## Template naming convention

Templates use a `T ` prefix (capital T, space):

| Template Name | Purpose | Used in |
|---------------|---------|---------|
| `T Header` | Page header with breadcrumb, title, description | Section 1 |
| `T Section Header` | Section label (e.g., "✏️ Variants", "✏️ Master Component") | Sections 2 & 3 |
| `T Divider` | Visual separator between sections | Between all sections |

Helper components (no `T ` prefix):

| Component Name | Purpose | Used in |
|----------------|---------|---------|
| `Badge` | Variant sub-option labels in table rows | Section 2 |
| `Divider` | Thin line separator within sections | Section 2 rows |

---

## Discovery process

1. Call `bridge_list_components` to get all components on the current page
   and any shared/published components.
2. Filter results for names starting with `T ` — these are templates.
3. Also look for `Badge` and `Divider` helpers.
4. Store discovered component IDs for instancing.

```
templates = bridge_list_components()
T_HEADER         = find(templates, name startsWith "T Header")
T_SECTION_HEADER = find(templates, name startsWith "T Section Header")
T_DIVIDER        = find(templates, name startsWith "T Divider")
BADGE            = find(templates, name == "Badge")
DIVIDER          = find(templates, name == "Divider")
```

---

## Instancing templates

Use `bridge_create_instance` with the discovered component ID:

```
bridge_create_instance(componentId=T_HEADER.id, parent=pageId)
→ then bridge_update_node to set position and text overrides
```

### T Header instance customization

After instancing `T Header`, update these text layers:
- **Breadcrumb:** `PALO IT · Components → {ComponentName}`
- **Title:** `{ComponentName}`
- **Description:** Auto-generated or user-provided

### T Section Header instance customization

After instancing `T Section Header`, update:
- **Label text:** `✏️ Variants` or `✏️ Master Component`

---

## Fallback behavior (when templates are missing)

If a template is not found, create a raw frame substitute:

| Missing Template | Fallback |
|------------------|----------|
| `T Header` | Create FRAME (width=1200, height=200) with TEXT children for breadcrumb, title, description |
| `T Section Header` | Create FRAME (width=1200, height=48) with TEXT child for section label |
| `T Divider` | Create FRAME (width=1200, height=1) with gray fill (#E5E5E5) |
| `Badge` | Create FRAME (width=auto, height=24) with TEXT child + rounded corners + gray fill |
| `Divider` | Create FRAME (width=1200, height=1) with light gray fill (#F0F0F0) |

Always report which templates were found vs. missing:

```
✅ Found: T Header, T Section Header, T Divider
⚠️ Missing: Badge (using fallback frames)
```

---

## Template page location

Templates should live on a dedicated **"Templates"** page in the Figma file.
This page contains:
- All `T ` prefixed template components
- Helper components (Badge, Divider)
- Usage examples

Copilot should check this page first when discovering templates. If the
templates are on a different page, `bridge_list_components` will still
find them as long as they are published components.

---

## Template specifications (reference dimensions)

Based on the `DS-creation-test` → `Button-example` reference:

| Template | Width | Height | Key properties |
|----------|-------|--------|----------------|
| `T Header` | 1200 | ~200 | White bg, breadcrumb at top, large title, description text |
| `T Section Header` | 1200 | 48 | Gray bg (#F5F5F5), left-aligned label text, ✏️ emoji prefix |
| `T Divider` | 1200 | 1 | Gray stroke (#E5E5E5), no fill |
| `Badge` | auto | 24 | Rounded corners (12), gray bg (#F0F0F0), small text |
| `Divider` | 1200 | 1 | Light gray (#F0F0F0) |
