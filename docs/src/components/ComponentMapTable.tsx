import React from 'react';
import styles from './ComponentMapTable.module.css';

// Import directly from the source-of-truth map file
// Webpack resolves JSON imports at build time — no need to hardcode
import mapData from '../../../figma-sync.map.json';

function figmaNodeUrl(fileKey: string, nodeId: string): string {
  return `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(':', '-')}`;
}

function githubFileUrl(filePath: string): string {
  return `https://github.com/patja60/figma-sync/blob/main/${filePath}`;
}

export default function ComponentMapTable(): React.JSX.Element {
  const [filter, setFilter] = React.useState('');

  const filtered = mapData.components.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.file.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.meta}>
          <span className={styles.badge}>{mapData.components.length} components</span>
          <span className={styles.fileKey}>
            File: <code>{mapData.figmaFileKey}</code>
          </span>
        </div>
        <input
          className={styles.search}
          type="text"
          placeholder="Filter components…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className={styles.grid}>
        {filtered.map((c) => (
          <div key={c.name} className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.componentName}>{c.name}</span>
              <code className={styles.nodeId}>{c.figmaNodeId}</code>
            </div>

            <div className={styles.cardBody}>
              <div className={styles.field}>
                <span className={styles.label}>Source</span>
                <a href={githubFileUrl(c.file)} target="_blank" rel="noopener noreferrer">
                  {c.file.split('/').pop()}
                </a>
              </div>
              <div className={styles.field}>
                <span className={styles.label}>Path</span>
                <code className={styles.path}>{c.file}</code>
              </div>
              {c.selector && (
                <div className={styles.field}>
                  <span className={styles.label}>Selector</span>
                  <code>{c.selector}</code>
                </div>
              )}
            </div>

            <div className={styles.cardFooter}>
              <a
                href={figmaNodeUrl(c.figmaFileKey, c.figmaNodeId)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.figmaLink}
              >
                Open in Figma ↗
              </a>
              <a
                href={githubFileUrl(c.file)}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.githubLink}
              >
                View Source ↗
              </a>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <p className={styles.empty}>No components match "{filter}"</p>
      )}
    </div>
  );
}
