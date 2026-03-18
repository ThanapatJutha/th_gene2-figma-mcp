# Epic 9: Reusable Onboarding Toolkit

> Evolve `gene2-figma-mcp` from a single-project POC into a distributable toolkit that any
> project can adopt via `npx gene2-figma-mcp init`, without cloning this repo.

---

## Part 1 — Architecture Assessment

### What exists today

The repo contains five distinct concerns mixed into one flat structure:

| Concern | Current location | Reusable? |
|---------|-----------------|-----------|
| **Bridge server** (WebSocket relay) | `figma-docs/bridge/src/server.ts` | ✅ Yes — core runtime |
| **MCP server** (tool registration) | `figma-docs/bridge/src/mcp-server.ts` | ✅ Yes — core runtime |
| **Bridge client** (WS client) | `figma-docs/bridge/src/bridge-client.ts` | ✅ Yes — core runtime |
| **Protocol types** | `figma-docs/bridge/src/protocol.ts` | ✅ Yes — core runtime |
| **Local handlers** (config/connections CRUD) | `figma-docs/bridge/src/local-handlers.ts` | ✅ Yes — core runtime |
| **Figma plugin** | `figma-docs/plugin/*` | ✅ Yes — but installed via Figma, not copied |
| **Copilot instructions** | `.github/copilot-instructions.md` + `.github/copilot/**` | ✅ Yes — template, needs parameterization |
| **MCP config** | `.vscode/mcp.json` | ✅ Yes — template, but currently has hardcoded node path |
| **Config file** | `figma/config/figma.config.json` | ✅ Yes — template (empty starter) |
| **Connections store** | `figma/app/.figma-sync/connections.json` | ✅ Yes — template (empty starter) |
| **Dashboard UI** (React page) | `figma-docs/docs/src/pages/dashboard.tsx` | ⚠️ Partially — tied to Docusaurus `Layout`, hardcoded GitHub URLs |
| **Settings UI** (React page) | `figma-docs/docs/src/pages/settings.tsx` | ⚠️ Partially — same coupling |
| **useBridge hook** | `figma-docs/docs/src/hooks/useBridge.ts` | ✅ Yes — standalone, only depends on WebSocket |
| **Docusaurus docs site** | `figma-docs/docs/` (config, sidebars, markdown) | ❌ No — project-specific, should stay central |
| **Docusaurus CSS modules** | `figma-docs/docs/src/pages/*.module.css` | ⚠️ Partially — styles are reusable but import pattern is Docusaurus-specific |
| **User stories** | `userstories/*` | ❌ No — repo-internal planning artifacts |
| **POC/demo folders** | `poc-react/`, `demo/`, `demo-2/`, `demo-3/`, `figma-shadcn-showcase/` | ❌ No — experimental, should be gitignored |
| **Showcase scaffold** | `figma/pages/showcase/` | ❌ No — temporary per-capture, never a deliverable |

### Key problems for reuse

1. **Hardcoded absolute path in `.vscode/mcp.json`**
   ```json
   "command": "/Users/thanapatjuthavantana/.nvm/versions/node/v20.11.1/bin/node"
   ```
   Every consumer would need to manually fix this. Should use `npx` or `node` (relying on PATH).

2. **Bridge source lives under `figma-docs/`**
   The name "figma-docs" implies documentation but contains the core runtime. Consumer projects shouldn't clone docs infrastructure to get the bridge.

3. **Dashboard is Docusaurus-coupled**
   `dashboard.tsx` and `settings.tsx` import `@theme/Layout` and use Docusaurus routing. A consumer project using Next.js or plain Vite can't use these pages without also installing Docusaurus.

4. **No init script**
   Today's getting-started flow is: clone repo → npm install → manually edit config. There is no `npx figma-sync init` that seeds only the files a consumer needs.

5. **Copilot instructions contain repo-specific paths**
   The instructions reference `figma-docs/bridge/src/*` and this repo's GitHub URL. A consumer's instructions should reference their own paths.

6. **`local-handlers.ts` resolves paths from `process.cwd()`**
   This is correct for a toolkit (CWD = consumer project root), but the hardcoded `FIGMA_DIR`, `CONFIG_PATH`, `DB_DIR` constants assume the directory structure exists. If it doesn't, operations silently return defaults instead of guiding the user.

7. **No version contract between bridge and consumer files**
   If the bridge protocol changes, there's no way to detect that a consumer's `copilot-instructions.md` is stale.

8. **GitHub URL is hardcoded in dashboard**
   `githubFileUrl()` in `dashboard.tsx` points to `GLOBAL-PALO-IT/th_gene2-figma-mcp`. Consumer projects need their own repo URL.

---

## Part 2 — Target Model

### Distribution model (Phase 1 — monorepo, no npm publish)

```
Consumer Project/
├── .github/
│   └── copilot-instructions.md          ← seeded by init, parameterized
├── .vscode/
│   └── mcp.json                         ← seeded by init, portable (npx)
├── figma/
│   ├── config/
│   │   └── figma.config.json            ← seeded by init, user fills in fileKey
│   └── app/
│       └── .figma-sync/
│           ├── connections.json          ← seeded by init (empty)
│           └── layer-map.json           ← seeded by init (empty)
├── node_modules/
│   └── figma-sync/                      ← installed as dependency (later: npm)
│       ├── bin/
│       │   └── figma-sync.mjs           ← CLI entry: init, doctor, version
│       ├── bridge/
│       │   ├── server.ts
│       │   ├── mcp-server.ts
│       │   ├── bridge-client.ts
│       │   ├── local-handlers.ts
│       │   └── protocol.ts
│       ├── templates/
│       │   ├── copilot-instructions.md.hbs
│       │   ├── mcp.json.hbs
│       │   ├── figma.config.json
│       │   ├── connections.json
│       │   └── layer-map.json
│       └── dashboard/                   ← standalone dev-server (Vite) or
│           ├── index.html                  served by bridge on :9001/ui
│           ├── dashboard.tsx
│           ├── settings.tsx
│           └── useBridge.ts
└── src/                                 ← consumer's own code
```

### Init flow

```
$ npx figma-sync init

  figma-sync v0.2.0

  ✓ Created figma/config/figma.config.json
  ✓ Created figma/app/.figma-sync/connections.json
  ✓ Created figma/app/.figma-sync/layer-map.json
  ✓ Created .vscode/mcp.json
  ✓ Created .github/copilot-instructions.md

  Next steps:
  1. Open figma/config/figma.config.json and set your Figma file key
  2. Run: npx figma-sync bridge
  3. Open the Figma Sync Bridge plugin in Figma Desktop
  4. Start using Copilot in agent mode
```

### Dashboard after bootstrap

The dashboard is NOT responsible for first-time setup. It:
- Connects to the bridge WebSocket (same as today)
- Reads `figma.config.json` and `connections.json` via bridge commands
- Provides CRUD UI for linking, discovery, settings
- Is served either:
  - (Phase 1) By the bridge server itself on `http://localhost:9001/ui`
  - (Phase 2) As a standalone `npx figma-sync dashboard` command

### Docs stay central

Documentation (Docusaurus site) stays in this repo and is deployed to GitHub Pages. Consumer projects don't need docs source — they read docs online at `https://GLOBAL-PALO-IT.github.io/th_gene2-figma-mcp/`.

---

## Part 3 — Prioritized User Stories

---

### Story 9.1 — Extract bridge into a self-contained package structure

**As a** toolkit maintainer  
**I want** the bridge runtime (server, MCP, client, handlers, protocol) in a clean, self-contained directory  
**So that** it can later be published as an npm package without dragging in docs, demos, or POC code

**Problem being solved:**
The bridge code lives under `figma-docs/bridge/src/`, which is confusingly named and co-located with Docusaurus docs. Moving it to a dedicated package structure is prerequisite for everything else.

**Scope:**
- Create `packages/figma-sync/` (or `packages/core/`) with its own `package.json`, `tsconfig.json`
- Move `figma-docs/bridge/src/*` → `packages/figma-sync/src/bridge/`
- Update all import paths
- Update root `package.json` scripts (`bridge`, `bridge:mcp`) to point to new location
- Update `.vscode/mcp.json` to reference new path
- Update `.github/copilot-instructions.md` path references

**Non-goals:**
- Publishing to npm (that's later)
- Moving the Figma plugin (it's distributed separately via Figma)
- Moving docs site

**Acceptance criteria:**
- [x] `npm run bridge` starts the bridge from the new location
- [x] MCP server starts correctly via `.vscode/mcp.json`
- [x] All local handler commands work (read-config, save-connections, etc.)
- [x] Plugin commands work when plugin is connected
- [x] No references to `figma-docs/bridge/` remain in active code paths
- [x] Old `figma-docs/bridge/` directory removed or redirected

**Technical notes:**
- Keep `figma-docs/docs/` where it is — it's the docs site, not the bridge
- The `figma-docs/plugin/` can stay for now (it's a Figma plugin, not consumer-distributed code)
- Use TypeScript project references or path aliases to avoid circular imports

**Files to create/modify:**
| Action | File |
|--------|------|
| Create | `packages/figma-sync/package.json` |
| Create | `packages/figma-sync/tsconfig.json` |
| Move | `figma-docs/bridge/src/*` → `packages/figma-sync/src/bridge/*` |
| Modify | Root `package.json` (scripts) |
| Modify | `.vscode/mcp.json` |
| Modify | `.github/copilot-instructions.md` |

**Priority:** P0 — blocks all other stories

---

### Story 9.2 — Create the `init` CLI command

**As a** developer adopting figma-sync in my project  
**I want** to run `npx figma-sync init` and get all required files seeded  
**So that** I don't have to manually create directories, copy config files, or guess the expected structure

**Problem being solved:**
Today's onboarding requires cloning the entire repo and knowing which files to keep. There's no guided setup. Files like `.vscode/mcp.json` ship with a hardcoded absolute path to a specific machine's Node binary.

**Scope:**
- Create `packages/figma-sync/bin/figma-sync.mjs` as CLI entry point
- Implement `init` subcommand that:
  1. Detects if already initialized (check for `figma/config/figma.config.json`)
  2. Prompts: "Figma file key (optional, can set later):"
  3. Prompts: "Project root directory (default: .):"
  4. Creates directory structure: `figma/config/`, `figma/app/.figma-sync/`
  5. Writes `figma/config/figma.config.json` with user input (or placeholder)
  6. Writes `figma/app/.figma-sync/connections.json` (empty: `{ "version": 1, "connections": [] }`)
  7. Writes `figma/app/.figma-sync/layer-map.json` (empty: `{ "version": 1, "frames": {} }`)
  8. Writes `.vscode/mcp.json` using `npx` (no hardcoded paths)
  9. Writes `.github/copilot-instructions.md` from template
  10. Prints next-steps instructions
- Template files stored in `packages/figma-sync/templates/`
- `.vscode/mcp.json` template uses `npx tsx` or resolves from installed package — no absolute paths
- If files already exist, prompt before overwriting

**Non-goals:**
- Interactive wizard with TUI framework (keep it simple `readline`)
- Installing the Figma plugin (that's manual via Figma)
- Auto-detecting UI library or framework

**Acceptance criteria:**
- [x] Running `node packages/gene2-figma-mcp/bin/gene2-figma-mcp.mjs init` in any directory creates the expected files
- [x] Created `.vscode/mcp.json` uses portable command (`npx gene2-figma-mcp mcp`)
- [x] Created `figma.config.json` includes the prompted file key (or placeholder)
- [x] Created `copilot-instructions.md` has correct paths relative to consumer project
- [x] Running init twice does not overwrite existing files without confirmation
- [x] All created files pass JSON/Markdown lint
- [x] No machine-specific paths in any generated file

**Technical notes:**
- Use `node:readline` for prompts (zero external deps for the CLI)
- Template substitution can be simple string replace (`{{figmaFileKey}}`, `{{rootDir}}`)
- `.vscode/mcp.json` should reference the bridge like:
  ```json
  {
    "figma-bridge": {
      "type": "stdio",
      "command": "npx",
      "args": ["tsx", "node_modules/figma-sync/src/bridge/mcp-server.ts"],
      "cwd": "${workspaceFolder}"
    }
  }
  ```
- Or if published as a package later:
  ```json
  {
    "figma-bridge": {
      "type": "stdio",
      "command": "npx",
      "args": ["figma-sync", "mcp"],
      "cwd": "${workspaceFolder}"
    }
  }
  ```

**Files to create/modify:**
| Action | File |
|--------|------|
| Create | `packages/figma-sync/bin/figma-sync.mjs` |
| Create | `packages/figma-sync/src/cli/init.ts` |
| Create | `packages/figma-sync/templates/figma.config.json` |
| Create | `packages/figma-sync/templates/connections.json` |
| Create | `packages/figma-sync/templates/layer-map.json` |
| Create | `packages/figma-sync/templates/mcp.json.template` |
| Create | `packages/figma-sync/templates/copilot-instructions.md.template` |
| Modify | `packages/figma-sync/package.json` (add `bin` field) |

**Priority:** P0 — this is the primary UX entry point

---

### Story 9.3 — Make `.vscode/mcp.json` portable

**As a** developer  
**I want** the MCP configuration to work on any machine without editing  
**So that** I can check it into version control and teammates can use it immediately

**Problem being solved:**
Current `.vscode/mcp.json` has:
```json
"command": "/Users/thanapatjuthavantana/.nvm/versions/node/v20.11.1/bin/node"
```
This breaks on every other machine. It also hardcodes the bridge path as `figma-docs/bridge/src/mcp-server.ts`, which won't exist in consumer projects.

**Scope:**
- Change the command to `npx` (or `node` relying on PATH)
- Change the bridge path to resolve from the installed package
- Test on macOS and Linux (Windows WSL if possible)
- Update the init template to generate the portable version

**Non-goals:**
- Supporting non-VS-Code editors

**Acceptance criteria:**
- [x] `.vscode/mcp.json` contains no absolute paths
- [x] Works with nvm, fnm, volta, and system Node
- [x] MCP server starts correctly when VS Code opens the workspace
- [x] The generated file is valid JSON with `${workspaceFolder}` for cwd

**Technical notes:**
- `npx tsx` is the safest cross-platform invocation
- If the package is installed locally, `npx` will find the bin without global install

**Files to create/modify:**
| Action | File |
|--------|------|
| Modify | `.vscode/mcp.json` (this repo's own copy) |
| Create/Modify | `packages/figma-sync/templates/mcp.json.template` |

**Priority:** P0 — without this, no consumer can use the toolkit

---

### Story 9.4 — Parameterize Copilot instructions template

**As a** developer  
**I want** the Copilot instructions file seeded into my project to reference correct paths and omit internal implementation details  
**So that** Copilot behaves correctly in my project context, not in the figma-sync repo context

**Problem being solved:**
The current `.github/copilot-instructions.md` is 280+ lines of detailed rules that reference:
- `figma-docs/bridge/src/` (won't exist in consumer project)
- This repo's GitHub URL
- Showcase scaffold patterns specific to this POC
- Internal sub-files under `.github/copilot/` that won't be copied

A consumer needs a **distilled version** that:
- References paths as they exist in the consumer project
- Includes the core behavioral rules (completion invariant, source-of-truth order, tool catalog)
- Omits internal implementation details of the bridge

**Scope:**
- Create a consumer-facing template: `copilot-instructions.md.template`
- Template includes:
  - Architecture overview (2 MCP servers, data flow)
  - Project structure table (consumer paths: `figma/config/`, `figma/components/`, `figma/app/.figma-sync/`)
  - Completion invariant
  - Source-of-truth order
  - MCP tool catalog (same tools, consumer doesn't need to know where the source lives)
  - Usecase summaries (bootstrap from URL, discover & convert)
  - Guardrails
- Template variables: `{{figmaFileKey}}`, `{{rootDir}}`
- Template does NOT include: deep-reference sub-files, bridge implementation notes, POC-specific scaffold checklists

**Non-goals:**
- Generating per-framework instructions (React vs Vue vs Svelte)
- Dynamic instruction generation at runtime

**Acceptance criteria:**
- [x] Template produces a valid Copilot instructions file
- [x] No references to `figma-docs/` in the generated file
- [x] No references to this repo's GitHub URL
- [ ] Copilot can successfully execute the Bootstrap-from-URL workflow using only the consumer's instructions
- [x] All MCP tool names are documented
- [x] Completion invariant and source-of-truth order are present

**Files to create/modify:**
| Action | File |
|--------|------|
| Create | `packages/figma-sync/templates/copilot-instructions.md.template` |
| Modify | `packages/figma-sync/src/cli/init.ts` (template rendering logic) |

**Priority:** P1 — required for Copilot to work in consumer projects

---

### Story 9.5 — Add `doctor` diagnostic command

**As a** developer  
**I want** to run `npx figma-sync doctor` and see what's correctly set up vs what's missing  
**So that** I can quickly diagnose why the workflow isn't working

**Problem being solved:**
The current onboarding has many moving parts: bridge server, Figma plugin, MCP config, config file, Node version. When something doesn't work, there's no diagnostic tool — users have to manually check each piece.

**Scope:**
- Add `doctor` subcommand to the CLI
- Checks:
  1. ✅/❌ `figma/config/figma.config.json` exists and has `figmaFileKey`
  2. ✅/❌ `figma/app/.figma-sync/connections.json` exists
  3. ✅/❌ `.vscode/mcp.json` exists and has `figma-bridge` server
  4. ✅/❌ `.github/copilot-instructions.md` exists
  5. ✅/❌ Node.js version ≥ 20
  6. ✅/❌ `tsx` is available
  7. ✅/❌ Bridge server is reachable on port 9001 (ping test)
  8. ✅/❌ Figma plugin is connected (via bridge ping)
  9. ⚠️ `.vscode/mcp.json` contains absolute paths (warning)
- Print summary with actionable fix suggestions

**Non-goals:**
- Auto-fixing issues
- Checking Figma file existence via API

**Acceptance criteria:**
- [x] `npx gene2-figma-mcp doctor` runs without errors even when nothing is set up
- [x] Each check prints clear pass/fail with description
- [x] Failed checks include a suggested fix
- [ ] Exit code 0 if all critical checks pass, 1 otherwise

**Files to create/modify:**
| Action | File |
|--------|------|
| Create | `packages/figma-sync/src/cli/doctor.ts` |
| Modify | `packages/figma-sync/bin/figma-sync.mjs` (add subcommand) |

**Priority:** P1 — critical for self-service debugging

---

### Story 9.6 — Decouple dashboard from Docusaurus

**As a** toolkit consumer  
**I want** to access the dashboard/settings UI without installing Docusaurus  
**So that** I can manage component mappings from any project

**Problem being solved:**
`dashboard.tsx` and `settings.tsx` import `@theme/Layout` from Docusaurus and use Docusaurus routing. The `useBridge.ts` hook is clean, but the pages are not portable. A consumer project using Next.js, Vite, or no framework at all can't use these.

**Scope:**
- Create a standalone dashboard app:
  - `packages/figma-sync/dashboard/` with its own `index.html`, Vite config
  - Port `dashboard.tsx` and `settings.tsx` to plain React (no `@theme/Layout`)
  - Port CSS modules to standalone CSS (no Docusaurus theme dependencies)
  - Keep `useBridge.ts` as-is (already framework-agnostic)
- Serve the dashboard from the bridge server:
  - Bridge already runs on port 9001
  - Add static file serving: `http://localhost:9001/ui/` → dashboard SPA
  - Or: add `npx figma-sync dashboard` command that starts a Vite dev server
- The Docusaurus docs site in `figma-docs/docs/` keeps its own copy of dashboard/settings for the central docs experience — but the canonical reusable version lives in the package

**Non-goals:**
- Full redesign of the dashboard UI
- Adding new dashboard features
- Replacing the Docusaurus docs site

**Acceptance criteria:**
- [ ] Dashboard loads at `http://localhost:9001/ui/` when bridge is running
- [ ] Settings page loads and can read/write config
- [ ] Dashboard connects to bridge and shows layers/components
- [ ] No Docusaurus dependencies in the standalone dashboard
- [ ] `useBridge.ts` is shared between dashboard and docs site (or duplicated with a note)

**Technical notes:**
- Use Vite to build the dashboard as a static SPA
- Bundle output into `packages/figma-sync/dashboard/dist/`
- Bridge server serves the dist folder as static files
- Consider adding a `--no-ui` flag to bridge for headless operation

**Files to create/modify:**
| Action | File |
|--------|------|
| Create | `packages/figma-sync/dashboard/index.html` |
| Create | `packages/figma-sync/dashboard/vite.config.ts` |
| Create | `packages/figma-sync/dashboard/src/App.tsx` |
| Create | `packages/figma-sync/dashboard/src/pages/Dashboard.tsx` |
| Create | `packages/figma-sync/dashboard/src/pages/Settings.tsx` |
| Create | `packages/figma-sync/dashboard/src/hooks/useBridge.ts` |
| Create | `packages/figma-sync/dashboard/src/styles/` |
| Modify | `packages/figma-sync/src/bridge/server.ts` (add static file serving) |

**Priority:** P2 — nice-to-have for MVP, can launch without it

---

### Story 9.7 — Add `bridge` CLI subcommand

**As a** developer  
**I want** to start the bridge server with `npx figma-sync bridge`  
**So that** I don't need to know the internal file paths or use `npm run bridge` from the toolkit repo

**Problem being solved:**
Today the bridge starts via `npm run bridge` which runs `tsx figma-docs/bridge/src/server.ts`. In a consumer project, there's no `npm run bridge` script — the user needs to know the exact path to the server entry point inside `node_modules`.

**Scope:**
- Add `bridge` subcommand to CLI
- Starts the WebSocket server on port 9001 (or `BRIDGE_PORT` env)
- Imports and runs the server directly (no child process spawn)
- Prints connection instructions on startup

**Non-goals:**
- Daemonizing the bridge
- Auto-restart on crash

**Acceptance criteria:**
- [x] `npx gene2-figma-mcp bridge` starts the WebSocket server
- [ ] Port is configurable via `BRIDGE_PORT` env var
- [x] Server logs show connection status
- [x] Ctrl+C cleanly shuts down

**Files to create/modify:**
| Action | File |
|--------|------|
| Create | `packages/figma-sync/src/cli/bridge.ts` |
| Modify | `packages/figma-sync/bin/figma-sync.mjs` (add subcommand) |

**Priority:** P1 — required for consumer projects to start the bridge

---

### Story 9.8 — Add version tracking to seeded files

**As a** toolkit maintainer  
**I want** seeded files to include a version marker  
**So that** I can detect stale consumer files and offer migration guidance

**Problem being solved:**
If the bridge protocol adds new commands, or the Copilot instructions add new rules, consumer projects with seeded files from an older version won't know they're stale. There's no way to diff "what init generated" vs "what the current version would generate."

**Scope:**
- Add a `_figmaSyncVersion` field to `figma.config.json`:
  ```json
  { "_figmaSyncVersion": "0.2.0", "figmaFileKey": "..." }
  ```
- Add a version comment to `copilot-instructions.md`:
  ```markdown
  <!-- figma-sync v0.2.0 — do not remove this line -->
  ```
- Add a version comment to `mcp.json`:
  ```jsonc
  // Generated by figma-sync v0.2.0
  ```
- `doctor` command checks version against installed package version and warns if stale
- Add `npx figma-sync upgrade` command that re-renders templates (with merge prompts for user-modified files)

**Non-goals:**
- Automatic migration scripts
- Semantic versioning policy definition

**Acceptance criteria:**
- [x] `init` writes version markers in all seeded files
- [x] `doctor` detects version mismatch and warns
- [ ] `upgrade` re-generates templates and prompts before overwriting modified files

**Files to create/modify:**
| Action | File |
|--------|------|
| Modify | All template files (add version markers) |
| Create | `packages/figma-sync/src/cli/upgrade.ts` |
| Modify | `packages/figma-sync/src/cli/doctor.ts` (add version check) |

**Priority:** P2 — important for maintenance, not blocking MVP

---

### Story 9.9 — Clean up repo structure and gitignore

**As a** toolkit maintainer  
**I want** POC artifacts, demo folders, and temporary files cleaned up  
**So that** the repo clearly separates the distributable toolkit from development experiments

**Problem being solved:**
The repo contains `poc-react/`, `demo/`, `demo-2/`, `demo-3/`, `figma-shadcn-showcase/`, and `figma/pages/showcase/` — all experimental artifacts from development. These confuse contributors and bloat the repo.

**Scope:**
- Add to `.gitignore`:
  - `poc-react/`
  - `demo/`
  - `demo-*/`
  - `figma-shadcn-showcase/`
  - `figma/pages/showcase/`
  - `tmp-*`
- Remove tracked POC files from git history (or just delete and commit)
- Update README with new repo structure
- Update `figma-docs/docs/` content if it references old paths

**Non-goals:**
- Rewriting git history

**Acceptance criteria:**
- [x] `git status` is clean after running init in the repo itself
- [x] No demo/POC folders are tracked
- [x] README reflects the current structure

**Files to create/modify:**
| Action | File |
|--------|------|
| Modify | `.gitignore` |
| Modify | `README.md` |
| Delete | `tmp-capture-demo3.cjs` and any stale files |

**Priority:** P1 — hygiene, should be done early

---

### Story 9.10 — End-to-end integration test

> **Moved to separate file:** See [`userstories/10-e2e-integration-test.md`](./10-e2e-integration-test.md)
>
> **Priority:** P2 — deferred past MVP

---

## Part 4 — MVP Recommendation

### MVP boundary: Stories 9.1 + 9.2 + 9.3 + 9.4 + 9.7 + 9.9

The minimum shippable toolkit that a consumer can use:

| # | Story | Why MVP |
|---|-------|---------|
| 9.1 | Extract bridge into package structure | Foundation — everything depends on this |
| 9.2 | Create `init` CLI command | Primary onboarding UX |
| 9.3 | Make `mcp.json` portable | Without this, nothing works on another machine |
| 9.4 | Parameterize Copilot instructions | Without this, Copilot doesn't know what to do |
| 9.7 | Add `bridge` CLI subcommand | Consumer needs a way to start the bridge |
| 9.9 | Clean up repo structure | Hygiene — do it before people start looking at the repo |

### What's deferred past MVP:

| # | Story | Why deferred |
|---|-------|-------------|
| 9.5 | `doctor` command | Nice-to-have; users can manually verify for now |
| 9.6 | Decouple dashboard from Docusaurus | Dashboard can be used from central docs site initially |
| 9.8 | Version tracking + upgrade | Only matters once there are multiple versions in the wild |
| 9.10 | E2E test | Important but manual testing suffices for first release |

### MVP consumer experience:

```bash
# In consumer project
npm install --save-dev ../path/to/figma-sync/packages/figma-sync
# (or later: npm install --save-dev figma-sync)

npx figma-sync init
# → Answer prompts
# → Files created

npx figma-sync bridge
# → Bridge running on :9001

# Open VS Code, Copilot agent mode works
```

---

## Part 5 — Implementation Roadmap

### Phase 1: Foundation (Stories 9.1, 9.9) — ~1 day

```
Day 1:
├── 9.9: Clean up repo (.gitignore, delete POC files)          [2h]
└── 9.1: Extract bridge into packages/figma-sync/              [4h]
    ├── Create package.json, tsconfig.json
    ├── Move bridge source files
    ├── Update all import paths
    ├── Update root scripts
    └── Verify bridge + MCP still work
```

### Phase 2: CLI + Templates (Stories 9.2, 9.3, 9.4, 9.7) — ~2 days

```
Day 2:
├── 9.3: Fix mcp.json to be portable                           [1h]
├── 9.4: Create copilot-instructions.md template                [3h]
│   ├── Distill 280-line instructions to consumer version
│   ├── Add template variables
│   └── Test with Copilot
└── 9.2: Build init CLI command                                 [3h]
    ├── CLI entry point + arg parsing
    ├── Template rendering
    ├── File writing with overwrite protection
    └── Next-steps output

Day 3:
├── 9.7: Add bridge CLI subcommand                              [2h]
└── Integration testing (manual)                                [2h]
    ├── Init in a fresh directory
    ├── Start bridge
    ├── Open in VS Code
    └── Run a Copilot workflow end-to-end
```

### Phase 3: Polish (Stories 9.5, 9.8, 9.10) — ~1 day

```
Day 4:
├── 9.5: Doctor command                                         [3h]
├── 9.8: Version tracking                                       [2h]
└── 9.10: E2E test script                                       [2h]
```

### Phase 4: Dashboard (Story 9.6) — ~2 days

```
Day 5-6:
└── 9.6: Decouple dashboard from Docusaurus                     [8h]
    ├── Create standalone Vite app
    ├── Port dashboard.tsx (remove @theme/Layout)
    ├── Port settings.tsx
    ├── Port CSS modules
    ├── Add static file serving to bridge
    └── Test full CRUD flow
```

---

## Part 6 — Risks and Migration Concerns

### Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **MCP server path changes break existing users** | Copilot stops working | Version marker in mcp.json + doctor command detects stale config |
| **Copilot instructions template gets out of sync with bridge capabilities** | Copilot tries to use tools that don't exist or misses new tools | CI check that template tool list matches MCP server tool registrations |
| **`npx tsx` resolution differs across Node version managers** | Bridge fails to start | Test on nvm, fnm, volta; document minimum Node version |
| **Dashboard CSS breaks without Docusaurus theme** | Ugly/broken UI | Design dashboard with its own minimal design system; don't rely on Docusaurus CSS variables |
| **Consumer modifies copilot-instructions.md and loses changes on upgrade** | User frustration | `upgrade` command diffs before overwriting; add a `# CUSTOM RULES` section that's preserved |
| **WebSocket port 9001 conflicts with other services** | Bridge can't start | `BRIDGE_PORT` env var already supported; `doctor` checks port availability |

### Brittle spots in current implementation

1. **`local-handlers.ts` path resolution** — `PROJECT_ROOT = resolve(process.cwd())` is correct but `CONFIG_PATH` has a fallback from `figma/config/figma.config.json` to root `figma.config.json`. This dual-path logic should be simplified: always use `figma/config/figma.config.json`.

2. **`bridge-client.ts` duplicates `LOCAL_COMMANDS` set** — The same list of local commands exists in both `server.ts` and `bridge-client.ts`. Adding a new local command requires updating both. Should be a shared constant from `protocol.ts`.

3. **`useBridge.ts` hardcodes `ws://localhost:9001`** — Should read from environment or accept a parameter for port configurability.

4. **`dashboard.tsx` hardcodes GitHub org URL** — `githubFileUrl()` points to `GLOBAL-PALO-IT/th_gene2-figma-mcp`. This should be configurable or removed for consumer version.

5. **`docusaurus.config.ts` hardcodes `baseUrl: '/figma-sync/'`** — Fine for central docs, but dashboard links from consumer projects would break if they assume this URL structure.

6. **No graceful handling of missing `figma/` directory** — If a consumer runs `read-config` before `init`, the handler returns `null` without guidance. Should return an error message suggesting `npx figma-sync init`.

### Migration path for this repo

After extracting the bridge into `packages/figma-sync/`, this repo itself should dogfood the toolkit:

1. Run `npx figma-sync init` in the repo root
2. Delete the old `figma-docs/bridge/` directory
3. Update `npm run bridge` to use `npx figma-sync bridge`
4. Keep `figma-docs/docs/` for the central documentation site
5. Keep `figma-docs/plugin/` for the Figma plugin source
6. The root `package.json` becomes a monorepo workspace root

```json
{
  "workspaces": ["packages/figma-sync", "figma-docs/docs"]
}
```
