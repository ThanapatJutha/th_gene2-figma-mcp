# Usecase 1 — Bootstrap from URL

> **Note:** The 3-prompt workflow summary and completion gate are already in
> `.github/copilot-instructions.md` section 6. This file provides additional detail.

Goal: Build a Figma component library from a URL (external or localhost).

## Usecase detection

When a user prompt looks like it matches this usecase (mentions a URL, a UI
library, "create Figma components from…", "capture…", etc.):

1. **If confident it's this usecase →** Suggest the 3-prompt approach:
   > "This looks like a Bootstrap-from-URL task. For best results I recommend
   > splitting this into 3 prompts: (1) build showcase, (2) capture into Figma,
   > (3) componentize & persist. Shall I start with Prompt 1?"
2. **If not sure →** Ask the user to confirm which usecase applies.
3. **If the user insists on doing everything in one prompt →** Proceed, but
   warn that quality may be lower because the context window must cover
   scaffold + capture + componentize in a single session.

## Why 3 prompts?

Each prompt is a natural stopping point that produces a verifiable result:
- Prompt 1 → dev server running, components visible in browser
- Prompt 2 → frames visible in the Figma file
- Prompt 3 → `.figma.tsx` components + connections saved (completion gate met)

Combining all 3 in one session risks context overflow and makes debugging
harder when any step fails.

## Prompt 1 — Build showcase app (skip for external URL)

- Use `figma/pages/showcase` as temporary capture UI.
- Scaffold Vite + React if needed.
- Install and use the exact detected library.
- Render full variant coverage (simple + complex states visible).
- Serve locally (typically `http://localhost:5173`).

Important: This step alone is not completion.

### Scaffold checklist (do every time)
1. **Check Node version** — scaffolding tools have minimum Node requirements
   (e.g., Vite 6+ needs Node ≥ 20.19 or ≥ 22.12). Run `node --version` first.
   If too old, upgrade via `nvm install <version>` before scaffolding.
2. **Remove nested `.git`** — `create-vite` (and similar tools) create their
   own `.git` inside the scaffolded folder. This breaks VS Code's git
   tracking. Always run `rm -rf .git` inside the scaffold folder immediately.
3. **Read the detected library's setup docs** — don't assume config patterns.
   For example, Tailwind CSS v4 uses `@import "tailwindcss"` instead of a
   config file; other libraries have their own init quirks. When in doubt,
   check the library's latest docs before configuring.
4. **Verify dev server starts** — after installing dependencies and
   configuring the project, start the dev server and confirm it responds
   (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5173/` → 200)
   before telling the user Prompt 1 is done.
5. **Ensure `nvm use` in new terminals** — each new terminal may revert to the
   system Node. Source nvm and switch to the required version before running
   commands.

## Prompt 2 — Capture into Figma

- Read `figma/config/figma.config.json` → get `figmaFileKey`. If user provided a
  file key or URL in their prompt, use that instead.
- Capture URL into target Figma file using official `figma` MCP.
- **Copilot decides the capture strategy** — for external URLs, prefer
  Playwright-based capture (slow-scroll, force eager images, resize viewport)
  to handle lazy-loaded content. The user does NOT need to specify this.
- Poll capture status until completed.

Important: Capture alone is still not completion.

## Prompt 3 — Componentize and persist code artifacts

1. Discover frames/layers in captured output
2. Promote candidates to components (consistent `Category / Variant` naming)
3. Save a **React UI component** (`.figma.tsx`) for EVERY promoted component to
   `figma/components/`. The component should import and render the project's
   actual UI library component with all visual variants. No business logic.
4. Save mappings to `figma/app/.figma-sync/connections.json`
5. Remove temporary capture layers/pages if needed

## Completion gate

Must all be true:
- Components promoted in Figma
- `.figma.tsx` React component files created/updated in `figma/components/`
- Mappings saved under `figma/app/.figma-sync`
- Work is not only in `figma/pages/showcase/`