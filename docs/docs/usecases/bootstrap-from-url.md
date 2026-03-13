---
sidebar_position: 3
slug: /usecases/bootstrap-from-url
---

# Create Figma Components from Any URL

Capture any web page into Figma, then promote the key UI pieces into reusable master components. This workflow supports **two use cases** — pick the one that fits:

| Use Case | Description | Start from |
|---|---|---|
| **A) UI Library** — shadcn/ui, MUI, Chakra UI, etc. | You want a Figma component library for a specific UI framework. Copilot builds a local showcase app that renders every variant, captures it into Figma, then organizes the pieces into master components. | **Prompt 1** → 2 → 3 |
| **B) Any Website** — external site or local dev server | You already have a URL — an external site like `https://ui.shadcn.com/examples/dashboard` or a local dev server like `http://localhost:3000`. Copilot captures it directly and organizes the components. | **Prompt 2** → 3 *(skip Prompt 1)* |

---

## Before You Start

Make sure you have:

1. **Bridge server running** — `npm run bridge` in your terminal
2. **Figma plugin connected** — Open Figma → Plugins → Figma Sync Bridge → 🟢 Connected
3. **Copilot in Agent Mode** — Open VS Code Chat → select **Agent** mode
4. **Your Figma file key** — Copy from the URL: `figma.com/design/`**`YOUR_FILE_KEY`**`/…`
5. **Read [Copilot Instructions](/docs/setup/instruction-guide)** — Complete reference covering all workflows, layout conventions, and troubleshooting

:::danger Don't touch Figma while Copilot is working
While Copilot is actively executing commands through the bridge, **do not switch pages or open a different Figma file**. All bridge commands operate on the currently active page — switching mid-operation will cause commands to target the wrong page, fail to find nodes, or create components in the wrong location. Wait for Copilot to finish its current batch before navigating in Figma.
:::

---

## Prompt 1 — Build a Showcase App

> **Use Case A only.** Skip this step if you already have a URL to capture (Use Case B).

If you want to build a Figma component library for a UI library (e.g., shadcn/ui, MUI, Chakra UI), the best approach is to **render real components** in a local app and capture them — not draw them by hand.

This project includes a ready-made template in the `demo/` folder. Paste this into Copilot:

:::note 💬 Prompt
I want to create a Figma component library for [your library, e.g. shadcn/ui]. Use the `demo/` folder as a template — scaffold a Vite + React showcase app that renders every component variant (buttons, badges, cards, alerts, etc.) in a clean grid with white background and clear labels. Install the components, then serve it on localhost:5173.
:::

**What happens:**
- Copilot scaffolds (or updates) a Vite + React app in `demo/`
- Installs the target component library and its dependencies
- Creates a showcase page (`App.tsx`) that renders every variant side by side
- Starts the dev server at `http://localhost:5173`

:::tip Why render instead of drawing?
Capturing real HTML preserves exact fonts, shadows, border-radius, padding, and all CSS from the real library. Building Figma nodes one-by-one with AI produces flat rectangles that don't match the actual library.
:::

---

## Prompt 2 — Capture the URL into Figma

Once your page is ready (external site or local dev server), paste this into Copilot:

:::note 💬 Prompt — External URL
Capture the UI from `https://ui.shadcn.com/examples/dashboard` into my Figma file (key: `YOUR_FILE_KEY`). Use Playwright to handle lazy-loading — slow-scroll the full page, force eager images, resize viewport to full height, then capture. Add it as a new page in the existing file. Poll until the capture is complete.
:::

:::note 💬 Prompt — Local Project
Capture the UI from `http://localhost:5173` into my Figma file (key: `YOUR_FILE_KEY`). Use Playwright to capture the full page. Add it as a new page in the existing file. Poll until the capture is complete.
:::

Here's an example of a website before capture — this is what Copilot will capture and import into Figma:

![Example website to capture — a dashboard with components like cards, charts, and navigation](/img/bootstrap-example-website.png)

**What happens:**
- Copilot uses Playwright to open the URL, handle lazy-loading (for external sites), and take a full-page capture
- The capture is imported into your Figma file as a **temporary new page**
- The capture preserves **real CSS layout** — fonts, colors, spacing, shadows, auto-layout — exactly as rendered in the browser

:::caution This page is temporary
The captured page is a raw dump of the website — it contains every HTML element as a Figma layer. You'll extract the useful components from it in Prompt 3, and **the raw capture page will be deleted** after the components are organized.
:::

**✅ Check your result in Figma:**

You should see a new page with editable layers that match the original website — editable layers preserving the original CSS layout:

![Captured page in Figma — editable layers matching the original website](/img/bootstrap-captured-in-figma.png)

---

## Prompt 3 — Organize into a Component Library

Once you've verified the capture looks good, paste this into Copilot:

:::note 💬 Prompt
Look at the captured page in Figma. Find the key UI components — things like Buttons, Badges, Cards, Alerts, etc. For each component, promote it to a master component using the `Category / Variant` naming convention (e.g. "Button / Default", "Badge / Secondary"). Arrange them in a clean grid layout. Then delete the raw capture page.
:::

**What happens:**
- Copilot scans the captured layers and identifies the reusable UI pieces
- Each component is promoted to a **master component** with variant group naming
- Components are arranged in a tidy grid (small controls in a row, cards stacked, etc.)
- The raw capture page is cleaned up

**✅ Check your result in Figma:**

You should see master components organized in Figma's Assets panel by category:

![📦 Components page with all master components in a wrapper frame](/img/bootstrap-components-page.png)

---

## Full Workflow Example

### Use Case A — UI Library (all 3 prompts)

| # | Prompt | What it does |
|---|--------|-------------|
| 1 | *"Build a showcase app for shadcn/ui using the `demo/` template. Render all variants. Serve on localhost:5173."* | Scaffolds app, installs library, starts dev server |
| 2 | *"Capture `http://localhost:5173` into my Figma file (key: `ABC123`). Use Playwright. Poll until complete."* | Full-page capture → Figma page |
| 3 | *"Find all components in the capture. Promote each to a master component with `Category / Variant` naming. Arrange in a grid. Delete the capture page."* | Components organized & promoted |

### Use Case B — Any Website (prompts 2 & 3 only)

| # | Prompt | What it does |
|---|--------|-------------|
| 2 | *"Capture `https://ui.shadcn.com/examples/dashboard` into my Figma file (key: `ABC123`). Use Playwright to handle lazy-loading — slow-scroll, force eager images, resize viewport. Poll until complete."* | Full-page capture → Figma page |
| 3 | *"Find all components in the capture. Promote each to a master component with `Category / Variant` naming. Arrange in a grid. Delete the capture page."* | Components organized & promoted |

---

## Tips for Best Results

- **Start with a rich page** — Dashboards or kitchen-sink pages give you 10–20 components in one capture
- **Be specific in Prompt 3** — Name the components you want (e.g., "Buttons, Badges, Cards, Alerts") so Copilot picks the right layers
- **One URL per prompt** — Don't ask Copilot to capture multiple URLs at once
- **Always check between prompts** — Open Figma after each prompt to verify the result before moving on
- **Repeat for more components** — Capture additional URLs and merge into your existing component library incrementally
- **Use `Category / Variant` naming** — e.g., "Button / Default", "Button / Destructive" — this creates variant groups in Figma's Assets panel
