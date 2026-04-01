import { Fragment, type ReactNode } from "react";

// ── Layout constants (match Figma DS page structure) ─────────────────
const PAGE_W = 2164;
const HEADER_H = 476;
const BODY_PAD_X = 80;
const CONTENT_W = PAGE_W - BODY_PAD_X * 2; // 2004
const SECTION_HEADER_H = 80;
const DIVIDER_SECTION_H = 120;
const ITEM_CELL_W = 200;
const ITEM_CELL_H = 120;

// ── Types ────────────────────────────────────────────────────────────

export interface PropertyOption {
  value: string;
  label: string;
}

export interface PropertyDef {
  name: string;
  options: PropertyOption[];
}

export interface DSPageTemplateProps {
  componentName: string;
  description: string;
  properties: PropertyDef[];
  renderComponent: (props: Record<string, string>) => ReactNode;
  /** Override default cell size (200×120) for larger components */
  cellSize?: { width: number; height: number };
  /** Optional full-page example section rendered after masters */
  renderFullPageExample?: () => ReactNode;
}

// ── Shared sub-components ────────────────────────────────────────────

function SectionHeader({ title }: { title: string }) {
  return (
    <div
      style={{
        width: CONTENT_W,
        height: SECTION_HEADER_H,
        display: "flex",
        alignItems: "center",
        paddingLeft: 24,
        background: "#F5F5F5",
        borderRadius: 8,
        fontSize: 18,
        fontWeight: 700,
        color: "#333",
      }}
    >
      {title}
    </div>
  );
}

function HorizontalDivider() {
  return (
    <div
      style={{
        width: CONTENT_W,
        height: DIVIDER_SECTION_H,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", height: 1, background: "#E0E0E0" }} />
    </div>
  );
}

// ── Cross-product helper ─────────────────────────────────────────────

function crossProduct(properties: PropertyDef[]): Record<string, string>[] {
  if (properties.length === 0) return [{}];
  const [first, ...rest] = properties;
  const restCombos = crossProduct(rest);
  return first.options.flatMap((opt) =>
    restCombos.map((combo) => ({ [first.name]: opt.value, ...combo }))
  );
}

function comboLabel(combo: Record<string, string>): string {
  return Object.entries(combo)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
}

// ── Main Template ────────────────────────────────────────────────────

export default function DSPageTemplate({
  componentName,
  description,
  properties,
  renderComponent,
  cellSize,
  renderFullPageExample,
}: DSPageTemplateProps) {
  const cellW = cellSize?.width ?? ITEM_CELL_W;
  const cellH = cellSize?.height ?? ITEM_CELL_H;
  const defaults = Object.fromEntries(
    properties.map((p) => [p.name, p.options[0].value])
  );

  return (
    <div
      style={{
        width: PAGE_W,
        fontFamily: "Inter, system-ui, sans-serif",
        background: "#FFFFFF",
      }}
    >
      {/* ── Section 1: Header ──────────────────────────────── */}
      <div
        style={{
          width: PAGE_W,
          minHeight: HEADER_H,
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 24,
            background: "linear-gradient(90deg, #00C853, #00E676, #69F0AE)",
          }}
        />
        <div
          style={{
            flex: 1,
            paddingLeft: BODY_PAD_X,
            paddingRight: BODY_PAD_X,
            paddingTop: 48,
            paddingBottom: 48,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <span style={{ fontSize: 14, color: "#888", letterSpacing: 1 }}>
            PALO IT · Components → {componentName}
          </span>
          <h1
            style={{
              fontSize: 48,
              fontWeight: 800,
              margin: 0,
              color: "#1A1A1A",
            }}
          >
            {componentName}
          </h1>
          <p
            style={{
              fontSize: 16,
              color: "#666",
              margin: 0,
              maxWidth: 600,
            }}
          >
            {description}
          </p>
          <div style={{ display: "flex", gap: 16, marginTop: 8 }}>
            <a
              href="#"
              style={{
                fontSize: 14,
                color: "#0066CC",
                textDecoration: "none",
              }}
            >
              📖 Documentation
            </a>
            <a
              href="#"
              style={{
                fontSize: 14,
                color: "#0066CC",
                textDecoration: "none",
              }}
            >
              💻 Source Code
            </a>
          </div>
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────── */}
      <div
        style={{
          paddingLeft: BODY_PAD_X,
          paddingRight: BODY_PAD_X,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* ── Property Sections ─────────────────────────────── */}
        {properties.map((prop, i) => (
          <div key={prop.name}>
            <SectionHeader title={`👉 Property: ${prop.name}`} />

            <div
              style={{
                width: CONTENT_W,
                display: "flex",
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 0,
                marginTop: 16,
              }}
            >
              {prop.options.map((opt) => (
                <div
                  key={opt.value}
                  style={{
                    width: cellW,
                    height: cellH,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 12,
                    border: "1px solid #F0F0F0",
                  }}
                >
                  {renderComponent({ ...defaults, [prop.name]: opt.value })}
                  <span
                    style={{
                      fontSize: 11,
                      color: "#999",
                      fontFamily: "monospace",
                    }}
                  >
                    {prop.name}={opt.value}
                  </span>
                </div>
              ))}
            </div>

            {i < properties.length - 1 && <HorizontalDivider />}
          </div>
        ))}

        {/* ── Divider before masters ───────────────────────── */}
        <HorizontalDivider />

        {/* ── Master Components Section ────────────────────── */}
        <SectionHeader title="✏️ Master Components" />

        <div
          style={{
            width: CONTENT_W,
            marginTop: 24,
            padding: 24,
            display: "flex",
            flexDirection: "row",
            gap: 16,
            justifyContent: "flex-start",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          {crossProduct(properties).map((combo, i) => (
            <Fragment key={i}>{renderComponent(combo)}</Fragment>
          ))}
        </div>

        {/* ── Bottom divider ───────────────────────────────── */}
        <HorizontalDivider />

        {/* ── Full-page example (optional) ─────────────────── */}
        {renderFullPageExample && (
          <>
            <SectionHeader title="📱 Full-Page Example" />
            <div
              style={{
                width: CONTENT_W,
                marginTop: 24,
                position: "relative",
                overflow: "hidden",
                borderRadius: 16,
                border: "1px solid #E0E0E0",
              }}
            >
              {renderFullPageExample()}
            </div>
            <HorizontalDivider />
          </>
        )}
      </div>
    </div>
  );
}
