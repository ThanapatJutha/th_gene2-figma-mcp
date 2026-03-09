# Epic 5: End-to-End Demo

> Prove the full bidirectional loop works with concrete scenarios.

## Context

This epic validates all previous work with real demo scenarios. Each scenario exercises a complete round-trip between code and Figma.

---

## Demo Scenarios

### 5.1 — Designer changes color in Figma → code updates

**As a** designer  
**I want to** change a color in Figma and have the code update  
**So that** the code always matches the latest design  

**Scenario:**
1. Designer opens Figma file and changes `HeaderCard` background from purple (`#7c5cff`) to red (`#ff5c5c`)
2. Developer runs `figma-sync pull` (or asks Copilot: "pull latest from Figma")
3. Copilot calls `get_design_context` for the HeaderCard node
4. Copilot detects the color change and shows a diff
5. Developer accepts → `--accent` in `styles.css` is updated to `#ff5c5c`
6. Dev server hot-reloads and shows the new color

**Acceptance Criteria:**
- [ ] Color change is detected in pull
- [ ] Diff clearly shows old vs new value
- [ ] CSS custom property is updated
- [ ] Dev server reflects the change

**Tasks:**
- [ ] Make a test color change in Figma
- [ ] Run pull flow
- [ ] Verify diff output
- [ ] Accept and verify CSS update
- [ ] Screenshot before/after

---

### 5.2 — Developer changes component text → Figma updates

**As a** developer  
**I want to** change a component's text via Copilot and have Figma update  
**So that** the designer sees the latest copy in their design tool  

**Scenario:**
1. Developer asks Copilot: "Change the HeaderCard subtitle to 'Bidirectional sync demo'"
2. Copilot edits `HeaderCard.tsx`
3. Developer runs `figma-sync push` (or asks Copilot: "push to Figma")
4. `generate_figma_design` captures the running page to the existing Figma file
5. Designer opens Figma and sees the updated subtitle text as editable layers

**Acceptance Criteria:**
- [ ] Component text is changed in code
- [ ] Push sync captures the updated UI
- [ ] New page in Figma shows the updated text
- [ ] Text layers are editable (not rasterized)

**Tasks:**
- [ ] Edit component text
- [ ] Run push flow
- [ ] Verify Figma file has new page with updated text
- [ ] Verify editability of text layers
- [ ] Screenshot before/after

---

### 5.3 — New component added in code → appears in Figma

**As a** developer  
**I want to** add a new component in code and have it appear in Figma  
**So that** the designer can see new UI elements without manual Figma work  

**Scenario:**
1. Developer creates a new `StatusBadge` component
2. Developer adds it to `App.tsx`
3. Developer runs `figma-sync push`
4. Full-page recapture sends updated UI to Figma
5. New component appears as editable Figma layers
6. Developer runs `add_code_connect_map` to link the new component

**Acceptance Criteria:**
- [ ] New component renders locally
- [ ] Push captures the full page including the new component
- [ ] New component is visible and editable in Figma
- [ ] Code Connect mapping is added for the new component

**Tasks:**
- [ ] Create `StatusBadge.tsx` component
- [ ] Add to `App.tsx`
- [ ] Run push flow
- [ ] Add Code Connect mapping
- [ ] Verify in Figma

---

### 5.4 — Full round-trip: code → Figma → code

**As a** team  
**We want to** prove a full bidirectional round-trip  
**So that** we know the system works end-to-end  

**Scenario:**
1. **Push:** Developer changes `CounterCard` title → push to Figma
2. **Verify:** Designer sees updated title in Figma
3. **Edit in Figma:** Designer changes the button color
4. **Pull:** Developer pulls from Figma, sees color diff
5. **Apply:** Developer accepts → CSS updated
6. **Verify:** Dev server shows the designer's color

**Acceptance Criteria:**
- [ ] Full loop completes without errors
- [ ] Each step produces verifiable, visible results
- [ ] Total round-trip time < 5 minutes (manual trigger)

**Tasks:**
- [ ] Execute each step sequentially
- [ ] Document each step with screenshots
- [ ] Record timing for each step
- [ ] Write up results in a demo report

---

### 5.5 — Surgical node update via Plugin bridge (stretch)

**As a** developer  
**I want to** update a single text node in Figma without recapturing the whole page  
**So that** targeted changes are fast and don't affect other parts of the design  

**Scenario:**
1. Developer changes `HeaderCard` subtitle in code
2. `figma-sync push --bridge --component HeaderCard` sends the update via Plugin
3. Plugin receives `update-node { nodeId, properties: { characters: "New subtitle" } }`
4. Only the subtitle text changes in Figma — all other layers untouched

**Acceptance Criteria:**
- [ ] Only the targeted node is modified
- [ ] Other Figma layers are not affected
- [ ] Change is visible immediately in Figma
- [ ] Faster than full-page recapture

> ⚠️ Depends on Epic 4 (Figma Plugin Bridge)

**Tasks:**
- [ ] Identify text node ID in Figma
- [ ] Send update command via bridge
- [ ] Verify only targeted node changed
- [ ] Compare timing with full-page recapture

---

## Definition of Done

- [ ] Scenarios 5.1–5.4 complete successfully
- [ ] Each scenario documented with screenshots/evidence
- [ ] Demo can be replayed by another developer following the docs
- [ ] Results summary written up
