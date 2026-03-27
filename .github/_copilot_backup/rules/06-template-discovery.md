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

---

## Discovery process

Templates may be from a **team/shared library**, not local components.
To discover them:

1. **Check existing pages first:** Switch to a reference page (e.g., Button-example)
   that already uses templates and read instance nodes to get `mainComponentId`.
2. **Read instance nodes:** `bridge_read_node(instanceId)` now returns
   `mainComponentId` and `mainComponentName` for INSTANCE nodes.
3. **Store the master component IDs** for use in `bridge_create_instance`.

```
# Switch to reference page with known template usage
bridge_set_current_page(referencePageId)

# Read instances to find template master component IDs
tHeaderInstance = bridge_read_node("1:777")  # T Header instance
→ tHeaderInstance.mainComponentId = "4059:5359"  # library component ID

tSectionHeaderInstance = bridge_read_node("1:780")
→ mainComponentId for T Section Header

tDividerInstance = bridge_read_node("1:931")
→ mainComponentId for T Divider

# Switch back to target page
bridge_set_current_page(targetPageId)

# Now instance using the discovered master IDs
bridge_create_instance(componentId=mainComponentId, parentId=parentFrame)
```

**If no reference page exists:** Use fallback frames (see below).

---

## Instancing templates

Use `bridge_create_instance` with the discovered master component ID:

```
bridge_create_instance(componentId=T_HEADER_MASTER_ID, parentId=wrapperFrame.id)
```

### T Header instance customization

After instancing `T Header`, find and update these text children:
- **Breadcrumb:** `PALO IT · Components → {ComponentName}`
- **Title:** `{ComponentName}`
- **Description:** Auto-generated or user-provided

Use `bridge_read_node(instanceId, depth=3)` to find the text node IDs
inside the instance, then `bridge_update_node` to set characters.

### T Section Header instance customization

After instancing `T Section Header`, update:
- **Label text:** `✏️ Variants` or `✏️ Master Component`

### T Divider

No customization needed — just instance it.

---

## Fallback behavior (when templates are missing)

If no reference page exists or templates can't be found, create substitute frames.
Use the same structural pattern but with simple frames:

| Missing Template | Fallback |
|------------------|----------|
| `T Header` | Create FRAME (width=PAGE_WIDTH, height=476, layoutMode=VERTICAL) with gradient strip + content frame with text children |
| `T Section Header` | Create FRAME (width=CONTENT_WIDTH, height=80, layoutMode=HORIZONTAL, paddingTop=40, paddingBottom=40) with TEXT child |
| `T Divider` | Create FRAME (width=CONTENT_WIDTH, height=120) with child frame (width=CONTENT_WIDTH, height=0, y=60) |

**Fallback dimensions must match template dimensions** for consistent layout.

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
