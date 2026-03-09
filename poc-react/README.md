# Figma Sync – React POC

A small React + Vite proof-of-concept app used to test the **Figma MCP `generate_figma_design`** workflow — capturing a live local page and converting it into a Figma design file.

## Components

| Component | Description |
|---|---|
| `HeaderCard` | Title / subtitle banner |
| `CounterCard` | Interactive counter with +/− buttons |
| `ToggleSwitch` | Labelled toggle for compact mode |

## Running the dev server

```bash
cd poc-react
npm install
npm run dev          # → http://localhost:5173/
```

---

## Capturing to Figma (`generate_figma_design`)

This section documents how to push the running app into a Figma design file using the **Figma MCP server** in VS Code Copilot (Agent mode).

### Prerequisites

| Requirement | Details |
|---|---|
| **Figma MCP server** | Configured in `.vscode/mcp.json` and started via the Command Palette (`MCP: Open Workspace Folder MCP Configuration`) |
| **VS Code Copilot** | Agent mode with MCP tools enabled |
| **Dev server running** | `npm run dev` inside `poc-react/` |

### Step-by-step

1. **Start the dev server**

   ```bash
   cd poc-react
   npm run dev
   ```

   Confirm Vite is serving at `http://localhost:5173/`.

2. **Add the capture script** (already included)

   The Figma capture script is in [`index.html`](index.html):

   ```html
   <script src="https://mcp.figma.com/mcp/html-to-design/capture.js" async></script>
   ```

   > This script serialises the DOM and sends it to Figma's capture endpoint. You can remove it after you're done capturing.

3. **Run `generate_figma_design` from Copilot**

   In VS Code Copilot Chat (Agent mode), ask:

   > "Run figma generate_figma_design for our project"

   Copilot will:
   - Start the dev server if it isn't running.
   - Call `generate_figma_design` with `outputMode: "newFile"` and your chosen plan/team.
   - Receive a **capture ID**.
   - Open the page at `http://localhost:5173/#figmacapture=<captureId>&...` in a browser.
   - Poll the capture status until it completes.

4. **View the result**

   Once the capture status is `completed`, Copilot returns a Figma file URL:

   ```
   https://www.figma.com/design/<fileKey>
   ```

   Open it to see your React app converted into Figma layers.

### Capture options

| Option | Value | Description |
|---|---|---|
| `outputMode` | `newFile` | Creates a brand-new Figma file |
| | `existingFile` | Adds a page to an existing Figma file (requires `fileKey`) |
| | `clipboard` | Copies design to clipboard for manual pasting |
| `planKey` | `team::<id>` or `organization::<id>` | The Figma team/org to save the file under |

### Capturing additional pages

Each capture uses a **single-use capture ID**. To capture more pages into the same file:

1. Wait for the first capture to complete and note the `fileKey`.
2. Call `generate_figma_design` again with `outputMode: "existingFile"` and that `fileKey`.
3. A new capture ID is generated; open the target page with the new hash URL.

Alternatively, the browser shows a **capture toolbar** after the first capture — navigate to another page and re-capture from there.

### Troubleshooting

| Problem | Fix |
|---|---|
| Capture stays `pending` | Make sure the dev server is running (`lsof -i :5173`) and the page loaded in the browser |
| Dev server exits | Run `npm run dev` from inside `poc-react/`, not the repo root |
| `npx vite` picks wrong version | Use the local binary: `./node_modules/.bin/vite` |
| Capture script not loading | Check that the `<script>` tag is present in `index.html` and there are no CSP errors in the browser console |

---

## Generated Figma file

| Field | Value |
|---|---|
| **File** | [Figma Sync - POC React App](https://www.figma.com/design/EDZG608izjCi1omcemuN5w) |
| **Created** | 2026-03-09 |
| **Source** | `http://localhost:5173/` |
