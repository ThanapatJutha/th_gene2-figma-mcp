# Story 9.10 — End-to-end Integration Test

> Extracted from Epic 9 (reusable onboarding toolkit) for separate tracking.

---

**As a** toolkit maintainer  
**I want** an automated test that runs `init` → `bridge` → basic operations in a temp directory  
**So that** I can verify the toolkit works for consumers without manual testing

**Problem being solved:**
There are no tests. Changes to the bridge, templates, or CLI could silently break the consumer experience.

**Scope:**
- Create a test script (Node.js, not a heavy test framework) that:
  1. Creates a temp directory
  2. Runs `init` with default values
  3. Verifies all expected files exist
  4. Verifies file contents (no absolute paths, correct JSON structure)
  5. Starts bridge server
  6. Sends a `ping` command via WebSocket
  7. Sends `read-config` and verifies response matches seeded config
  8. Stops bridge server
  9. Cleans up temp directory

**Non-goals:**
- Unit tests for every function
- UI testing of dashboard
- Plugin integration testing

**Acceptance criteria:**
- [ ] Test script runs with `npm test` from root
- [ ] Test passes on clean checkout
- [ ] Test fails if init generates broken files

**Files to create/modify:**
| Action | File |
|--------|------|
| Create | `packages/gene2-figma-mcp/test/e2e-init.test.mjs` |
| Modify | Root `package.json` (add test script) |

**Priority:** P2 — important but can ship MVP without
