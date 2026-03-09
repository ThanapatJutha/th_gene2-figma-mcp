# Epic 2: Push Sync (Code → Figma)

> After changes are made in code, push the updated UI back to Figma as editable design layers.

## Context

`generate_figma_design` is **rate-limit exempt** and creates **editable frames** in Figma. It supports:
- `newFile` — create a brand new Figma file
- `existingFile` — add/replace pages in an existing file (requires `fileKey`)
- `clipboard` — copy to clipboard for manual pasting

This is the primary mechanism for push sync. No custom plugin needed for this direction.

---

## User Stories

### 2.1 — Push full page via recapture

**As a** developer  
**I want to** push my current local UI to the existing Figma file  
**So that** the Figma file always reflects the latest code  

**Acceptance Criteria:**
- [ ] Running `figma-sync push` starts the dev server (if not running), captures the page, and sends it to the existing Figma file
- [ ] Uses `generate_figma_design` with `outputMode: "existingFile"` and the file key from `figma-sync.map.json`
- [ ] New page is added to the Figma file (not replacing existing pages)
- [ ] Copilot can trigger push via natural language ("push my UI to Figma")

**Tasks:**
- [ ] Add `push` command to CLI (`src/cli.ts`)
- [ ] Read `figmaFileKey` from `figma-sync.map.json`
- [ ] Ensure dev server is running (check port, start if needed)
- [ ] Inject capture script into `index.html` if not present
- [ ] Call `generate_figma_design` with `existingFile` mode
- [ ] Open capture URL in browser
- [ ] Poll for completion
- [ ] Output Figma file URL on success

---

### 2.2 — Push via Copilot agent conversation

**As a** developer using Copilot  
**I want to** say "push my changes to Figma" in chat  
**So that** the push sync happens conversationally without running CLI commands  

**Acceptance Criteria:**
- [ ] Copilot understands the intent and calls `generate_figma_design`
- [ ] Reuses the existing Figma file from previous captures
- [ ] Provides the Figma URL back to the user

**Tasks:**
- [ ] Document the recommended prompt patterns
- [ ] Test that Copilot correctly infers `existingFile` mode on subsequent pushes
- [ ] Verify editable frames appear in Figma

---

### 2.3 — Push specific component (stretch)

**As a** developer  
**I want to** push only a specific component's rendered output to Figma  
**So that** I can do targeted updates instead of full-page recapture  

**Acceptance Criteria:**
- [ ] `figma-sync push --component HeaderCard` captures only that component
- [ ] Uses `figmaselector` parameter to target a specific DOM element
- [ ] Updates only the relevant section in the Figma file

**Tasks:**
- [ ] Map component names to CSS selectors (via `figma-sync.map.json` or convention)
- [ ] Pass `figmaselector=<css>` in the capture URL hash
- [ ] Test that only the targeted element is captured
- [ ] Verify the result in Figma

---

### 2.4 — Push design tokens to Figma (stretch — requires Plugin)

**As a** developer  
**I want** CSS custom property changes to sync back to Figma variables  
**So that** token changes in code are reflected in Figma's variable system  

**Acceptance Criteria:**
- [ ] Changed CSS variables (e.g., `--accent: #ff0000`) are detected
- [ ] Corresponding Figma variables are updated via Plugin bridge

> ⚠️ **Note:** This requires Epic 4 (Figma Plugin Bridge) since the REST API cannot write variables on free plans and `generate_figma_design` captures rendered output, not token definitions.

**Tasks:**
- [ ] Parse CSS custom properties from `styles.css`
- [ ] Diff against last-known token state
- [ ] Send updates via Plugin bridge (depends on Epic 4)

---

## Definition of Done

- [ ] `figma-sync push` command works end-to-end
- [ ] Existing Figma file receives new page with updated UI
- [ ] Copilot can trigger push conversationally
- [ ] Frames in Figma are editable (not flattened images)
