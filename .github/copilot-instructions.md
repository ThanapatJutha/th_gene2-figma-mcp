# Figma Sync — Copilot Instructions

> Auto-read by Copilot on every prompt.

This file is now a compact entry point. Detailed guidance is split for easier review.

## Mandatory guardrails (always enforce)

1. Treat `figma/components/*.figma.ts` and `figma/app/.figma-sync` as required completion artifacts for Figma-library tasks.
2. Treat `figma/pages/showcase/` as a temporary capture helper only.
3. Never place runtime/product components in `figma/components/`; keep runtime code in `src/`.
4. Before generating showcase UI, inspect target `package.json` and use the detected library exactly.

## Split instruction files

- Overview + global rules: `.github/copilot/00-overview-and-global-rules.md`
- Usecase 1 (Bootstrap from URL): `.github/copilot/usecases/01-bootstrap-from-url.md`
- Usecase 2 (Discover & Convert): `.github/copilot/usecases/02-discover-and-convert.md`
- Rule 1 (Read & Update Nodes): `.github/copilot/rules/01-read-and-update-nodes.md`
- Rule 2 (Design Tokens): `.github/copilot/rules/02-design-tokens.md`
- Rule 3 (Spec Layer): `.github/copilot/rules/03-component-spec-layer.md`
- Troubleshooting: `.github/copilot/04-troubleshooting.md`
- Best practices: `.github/copilot/05-component-creation-best-practices.md`
- File reference: `.github/copilot/06-file-reference.md`

## Review order

1. `00-overview-and-global-rules.md`
2. Usecase file needed for current task
3. Rule file(s) needed for current task
4. Troubleshooting and best-practice files as needed
