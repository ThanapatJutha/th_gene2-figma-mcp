import React from 'react';
import Layout from '@theme/Layout';
import ComponentMapTable from '../components/ComponentMapTable';

export default function ComponentMapPage(): React.JSX.Element {
  return (
    <Layout
      title="Component Map"
      description="View the mapping between React components and Figma design nodes"
    >
      <main style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>🗺️ Component Map</h1>
        <p>
          This page shows the current mapping between React components in the codebase
          and their corresponding Figma design nodes. Each component is linked to a
          specific node in the{' '}
          <a
            href="https://www.figma.com/design/ghwHnqX2WZXFtfmsrbRLTg"
            target="_blank"
            rel="noopener noreferrer"
          >
            Figma file
          </a>
          .
        </p>
        <p style={{ color: 'var(--ifm-color-emphasis-600)', fontSize: '0.9rem' }}>
          Mappings are stored in <code>figma-sync.map.json</code> at the repo root.
          To add a new mapping, edit the file directly or ask Copilot:{' '}
          <em>"Add a mapping for MyComponent at poc-react/src/components/MyComponent.tsx with Figma node 1:99"</em>
        </p>
        <ComponentMapTable />
      </main>
    </Layout>
  );
}
