import { Button as BsButton } from "react-bootstrap";
import DSPageTemplate, {
  type PropertyDef,
} from "@/components/DSPageTemplate";

/**
 * Bootstrap 5 Button — DS Page
 *
 * Properties:
 *   variant  (6): primary, secondary, success, danger, warning, info
 *   outline  (2): false, true
 *   size     (3): default, sm, lg
 *
 * Display sections: 6 + 2 + 3 = 11 items
 * Master components: 6 × 2 × 3 = 36
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
    name: "outline",
    options: [
      { value: "false", label: "Solid" },
      { value: "true", label: "Outline" },
    ],
  },
  {
    name: "size",
    options: [
      { value: "default", label: "Default" },
      { value: "sm", label: "Small" },
      { value: "lg", label: "Large" },
    ],
  },
];

function renderButton(props: Record<string, string>) {
  const { variant, outline, size } = props;
  const isOutline = outline === "true";
  const bsVariant = isOutline ? `outline-${variant}` : variant;
  const bsSize = size === "default" ? undefined : (size as "sm" | "lg");

  return (
    <BsButton variant={bsVariant} size={bsSize}>
      Button
    </BsButton>
  );
}

export default function ButtonPage() {
  return (
    <DSPageTemplate
      componentName="Button"
      description="Displays a button or a component that looks like a button. Supports solid and outline variants across multiple color themes and sizes."
      properties={properties}
      renderComponent={renderButton}
    />
  );
}
