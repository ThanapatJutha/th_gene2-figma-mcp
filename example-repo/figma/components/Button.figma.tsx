import React from "react";
import { Button } from "react-bootstrap";

/**
 * Figma DS Page: Button
 * Library: Bootstrap 5 (react-bootstrap)
 * Master components: 6 variants × 2 outline × 3 sizes = 36
 * Figma page node: 6:2
 * Component set: 6:40
 * Source: react-bootstrap/Button
 */

const variants = ["primary", "secondary", "success", "danger", "warning", "info"] as const;
const outlines = [false, true] as const;
const sizes = ["default", "sm", "lg"] as const;

export default function ButtonFigma() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 16 }}>
      {variants.map((variant) =>
        outlines.map((outline) => (
          <div key={`${variant}-${outline}`} style={{ display: "flex", gap: 12, alignItems: "center" }}>
            {sizes.map((size) => {
              const bsVariant = outline ? `outline-${variant}` : variant;
              const bsSize = size === "default" ? undefined : size;
              return (
                <Button key={`${variant}-${outline}-${size}`} variant={bsVariant} size={bsSize as any}>
                  Button
                </Button>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}

export { Button };
