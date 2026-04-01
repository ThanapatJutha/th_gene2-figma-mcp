import { useEffect, useState } from "react";

// Eagerly import all preview modules from the pages directory
const previewModules = import.meta.glob<{ default: React.ComponentType }>(
  "./pages/*.tsx",
  { eager: true }
);

// Build a map: component name → React component
const previews: Record<string, React.ComponentType> = {};
for (const [path, mod] of Object.entries(previewModules)) {
  const name = path.replace("./pages/", "").replace(".tsx", "");
  previews[name] = mod.default;
}

function App() {
  const [componentName, setComponentName] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("component") || window.location.hash.slice(1) || "";
  });

  useEffect(() => {
    const onHashChange = () => setComponentName(window.location.hash.slice(1));
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const PreviewComponent = previews[componentName];

  if (!componentName) {
    return (
      <div style={{ padding: 40 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>
          Figma Showcase
        </h1>
        <p style={{ marginBottom: 16, color: "#666" }}>
          Available components:
        </p>
        <ul>
          {Object.keys(previews).map((name) => (
            <li key={name} style={{ marginBottom: 8 }}>
              <a href={`?component=${name}`} style={{ color: "#0066cc" }}>
                {name}
              </a>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (!PreviewComponent) {
    return (
      <div style={{ padding: 40, color: "red" }}>
        Component "{componentName}" not found. Available:{" "}
        {Object.keys(previews).join(", ")}
      </div>
    );
  }

  return <PreviewComponent />;
}

export default App;
