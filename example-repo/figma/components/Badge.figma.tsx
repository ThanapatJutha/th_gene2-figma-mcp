import React from "react";
import { Badge } from "react-bootstrap";

/**
 * Figma DS Page: Badge
 * Library: Bootstrap 5 (react-bootstrap)
 * Master components: 6 variants × 2 pill = 12
 * Figma page node: 6:3
 * Component set: 6:75
 * Source: react-bootstrap/Badge
 */

const variants = ["primary", "secondary", "success", "danger", "warning", "info"] as const;
const pills = [false, true] as const;

export default function BadgeFigma() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 16 }}>
      {variants.map((variant) => (
        <div key={variant} style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {pills.map((pill) => (
            <Badge key={`${variant}-${pill}`} bg={variant} pill={pill}>
              Badge
            </Badge>
          ))}
        </div>
      ))}
    </div>
  );
}

export { Badge };
