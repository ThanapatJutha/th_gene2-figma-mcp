---
sidebar_position: 3
slug: /usecases/bootstrap-from-url
---

# Create Figma Components from Any UI Library

You can create a full Figma component library from any live website — **Shadcn**, **Bootstrap**, **MUI**, **Chakra UI**, **Ant Design**, or your own app. Just give Copilot a URL and it will capture the real rendered page into Figma, then organize and promote the key UI pieces into reusable master components.

The whole process takes **2 steps** and about **5 minutes**.

---

## Before You Start

Make sure you have:

1. **Bridge server running** — `npm run bridge` in your terminal
2. **Figma plugin connected** — Open Figma → Plugins → Figma Sync Bridge → 🟢 Connected
3. **Copilot in Agent Mode** — Open VS Code Chat → select **Agent** mode
4. **Your Figma file key** — Copy from the URL: `figma.com/design/`**`YOUR_FILE_KEY`**`/…`
5. **Read [instruction.md for Copilot](/docs/usecases/instruction-guide)** — Complete runbook with detailed prompts, capture options, layout conventions, and troubleshooting

---

## Step 1 — Capture the Website into Figma

Paste this into Copilot:

:::note 💬 Prompt
Capture the UI from `https://ui.shadcn.com/examples/dashboard` into my Figma file (key: `YOUR_FILE_KEY`). Add it as a new page in the existing file. Poll until the capture is complete.
:::

Replace the URL with any page you want, for example:
- **Shadcn** — `https://ui.shadcn.com/examples/dashboard`
- **MUI** — `https://mui.com/material-ui/getting-started/templates/dashboard/`
- **Chakra UI** — `https://chakra-ui.com/docs/components`
- **Ant Design** — `https://ant.design/components/button`
- **Your own app** — `http://localhost:3000/dashboard`

**What happens:**
- Copilot opens the URL, takes a full-page capture, and imports it into your Figma file as a **temporary new page**
- The capture preserves **real CSS layout** — fonts, colors, spacing, shadows, auto-layout — exactly as rendered in the browser
- Copilot will tell you when it's done and which page was created

:::caution This page is temporary
The captured page is a raw dump of the website — it contains every HTML element as a Figma layer. You'll extract the useful components from it in Step 2, and **the raw capture page will be deleted** after the components are organized.
:::

**✅ Check your result in Figma:**

You should see a new page with editable layers that match the original website:

![Captured page in Figma — real CSS layout preserved as editable layers](/img/bootstrap-component-library-frame.png)

:::tip Why capture instead of building from scratch?
Capturing real HTML gives you pixel-perfect results. Building Figma nodes one-by-one with AI would lose layout fidelity — fonts get approximated, spacing is off, shadows are missed. The capture approach preserves everything.
:::

---

## Step 2 — Organize into a Component Library

Once you've verified the capture looks good, paste this into Copilot:

:::note 💬 Prompt
Look at the captured page in Figma. Find the key UI components — things like Sidebar, Stat Cards, Charts, Data Tables, Buttons, Headers, etc. Create a new page called '📦 Components' with a 'Component Library' frame. Move all the components into it, arrange them in a clean grid layout, and promote each one to a master component. Then delete the raw capture page.
:::

**What happens:**
- Copilot scans the captured layers and identifies the reusable UI pieces
- It creates a dedicated **📦 Components** page with a wrapper frame
- Each component is moved in, positioned in a tidy grid (small controls in a row, cards in a row, large layouts stacked), and promoted to a **master component**
- The raw capture page is cleaned up

**✅ Check your result in Figma:**

You should see a clean **📦 Components** page with a "Component Library" frame containing all your master components:

![📦 Components page with all master components in a wrapper frame](/img/bootstrap-components-page.png)

---

## Tips for Best Results

- **Start with a rich page** — Dashboards or kitchen-sink pages give you 10–20 components in one capture
- **Be specific in Step 2** — Name the components you want (e.g. "Sidebar, StatCards, DataTable") so Copilot picks the right layers
- **One URL per prompt** — Don't ask Copilot to capture multiple URLs at once
- **Always check between steps** — Open Figma after each step to verify the result before moving on
- **Repeat for more components** — Capture additional URLs and merge into your existing 📦 Components page incrementally
