# Component Creation Best Practices

1. **Property-based naming** for master components: `size=md, variant=solid, state=default, type=default`. See `rules/04-layout-constants.md` for exact format.
2. **Preserve original dimensions** when converting to components. Validate no layout drift after conversion.
3. **One page per component** — each component (Button, Card, etc.) gets its own Figma page.
4. **Design tokens over hardcoded values** — always create Figma variables for colors. See `rules/02-design-tokens.md`.
5. **Template discovery first** — discover templates via `bridge_list_components` before building. See `rules/06-template-discovery.md`.
6. **Build order matters** — Section 3 (masters) → Section 2 (variants table) → Section 1 (header). See `rules/04-layout-constants.md`.
7. **Batch by size tier** — create all components for one size before moving to the next to avoid context overflow.
8. Keep capture helpers temporary; persist final specs/mappings in `figma/`.