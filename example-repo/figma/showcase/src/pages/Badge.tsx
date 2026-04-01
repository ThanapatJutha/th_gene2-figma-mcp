import { Badge as BsBadge } from "react-bootstrap";
import DSPageTemplate, {
  type PropertyDef,
} from "@/components/DSPageTemplate";

/**
 * Bootstrap 5 Badge — DS Page
 *
 * Properties:
 *   variant (6): primary, secondary, success, danger, warning, info
 *   pill    (2): false, true
 *
 * Display sections: 6 + 2 = 8 items
 * Master components: 6 × 2 = 12
 */

const properties: PropertyDef[] = [
  {
    name: "variant",
    options: [
      { value: "primary", label: "Primary" },
      { value: "secondary", label: "Secondary" },
      { value: "success", label: "Success" },
      { value: "danger", label: "Danger" },
      { value: "warning", label: "Warning" },
      { value: "info", label: "Info" },
    ],
  },
  {
    name: "pill",
    options: [
      { value: "false", label: "Default" },
      { value: "true", label: "Pill" },
    ],
  },
];

function renderBadge(props: Record<string, string>) {
  const { variant, pill } = props;
  const isPill = pill === "true";

  return (
    <BsBadge bg={variant} pill={isPill}>
      Badge
    </BsBadge>
  );
}

export default function BadgePage() {
  return (
    <DSPageTemplate
      componentName="Badge"
      description="Displays a badge or a component that looks like a badge. Used for status indicators and labels. Supports multiple color variants and pill shape."
      properties={properties}
      renderComponent={renderBadge}
    />
  );
}
