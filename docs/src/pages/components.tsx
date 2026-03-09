import React, { useState, useCallback } from 'react';
import Layout from '@theme/Layout';
import { useBridge } from '../hooks/useBridge';
import type { ConnectionStatus } from '../hooks/useBridge';
import styles from './components.module.css';

interface ComponentInfo {
  id: string;
  name: string;
  type: string;
  description: string;
  width: number;
  height: number;
  childCount: number;
  x: number;
  y: number;
}

interface ListComponentsResult {
  pageName: string;
  pageId: string;
  totalComponents: number;
  components: ComponentInfo[];
}

function statusDot(status: ConnectionStatus) {
  const colors: Record<ConnectionStatus, string> = {
    connected: '#28a745',
    connecting: '#ffc107',
    disconnected: '#dc3545',
  };
  return (
    <span
      style={{
        display: 'inline-block',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: colors[status],
        marginRight: 8,
      }}
    />
  );
}

const FIGMA_FILE_KEY = 'ghwHnqX2WZXFtfmsrbRLTg';

function figmaNodeUrl(nodeId: string): string {
  return `https://www.figma.com/design/${FIGMA_FILE_KEY}?node-id=${nodeId.replace(':', '-')}`;
}

export default function ComponentsPage(): React.JSX.Element {
  const { status, connect, disconnect, send } = useBridge();
  const [components, setComponents] = useState<ComponentInfo[]>([]);
  const [pageName, setPageName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const fetchComponents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await send('list-components')) as ListComponentsResult;
      setComponents(data.components);
      setPageName(data.pageName);
      setLastUpdated(new Date().toLocaleTimeString('en-GB', { hour12: false }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch components');
    } finally {
      setLoading(false);
    }
  }, [send]);

  const filtered = components.filter(
    (c) =>
      c.name.toLowerCase().includes(filter.toLowerCase()) ||
      c.id.includes(filter),
  );

  return (
    <Layout title="Figma Components" description="Live view of all Figma components from the current page">
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1>◆ Figma Components</h1>
          <p>Live view of all components on the current Figma page, fetched directly through the bridge.</p>
        </div>

        {/* Connection Bar */}
        <div className={styles.connectionBar}>
          <div className={styles.connectionStatus}>
            {statusDot(status)}
            <span>{status === 'connected' ? 'Connected to bridge' : status === 'connecting' ? 'Connecting…' : 'Not connected'}</span>
            {lastUpdated && <span className={styles.timestamp}>Last updated: {lastUpdated}</span>}
          </div>
          <div className={styles.connectionActions}>
            {status !== 'connected' ? (
              <button className={styles.btnPrimary} onClick={connect}>
                Connect
              </button>
            ) : (
              <>
                <button className={styles.btnPrimary} onClick={fetchComponents} disabled={loading}>
                  {loading ? 'Loading…' : '🔄 Refresh Components'}
                </button>
                <button className={styles.btnSecondary} onClick={disconnect}>
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Components grid */}
        {components.length > 0 && (
          <>
            <div className={styles.toolbar}>
              <div className={styles.info}>
                <span className={styles.pageLabel}>📄 {pageName}</span>
                <span className={styles.badge}>{components.length} components</span>
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
                <div key={c.id} className={styles.card}>
                  <div className={styles.cardHeader}>
                    <span className={styles.componentIcon}>◆</span>
                    <span className={styles.componentName}>{c.name}</span>
                  </div>
                  <div className={styles.cardBody}>
                    <div className={styles.field}>
                      <span className={styles.label}>Node ID</span>
                      <code>{c.id}</code>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.label}>Size</span>
                      <span>{Math.round(c.width)} × {Math.round(c.height)}</span>
                    </div>
                    <div className={styles.field}>
                      <span className={styles.label}>Children</span>
                      <span>{c.childCount}</span>
                    </div>
                    {c.description && (
                      <div className={styles.field}>
                        <span className={styles.label}>Description</span>
                        <span className={styles.description}>{c.description}</span>
                      </div>
                    )}
                  </div>
                  <div className={styles.cardFooter}>
                    <a
                      href={figmaNodeUrl(c.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.figmaLink}
                    >
                      Open in Figma ↗
                    </a>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <p className={styles.empty}>No components match "{filter}"</p>
            )}
          </>
        )}

        {/* Empty state when connected but no data */}
        {components.length === 0 && status === 'connected' && !loading && (
          <div className={styles.emptyState}>
            <h2>No components loaded</h2>
            <p>Click <strong>🔄 Refresh Components</strong> to fetch components from the current Figma page.</p>
            <p className={styles.hint}>Make sure the Figma Sync Bridge plugin is open and connected in Figma.</p>
          </div>
        )}

        {/* Disconnected state */}
        {status === 'disconnected' && (
          <div className={styles.emptyState}>
            <h2>Bridge not connected</h2>
            <p>Start the bridge server and connect to view components.</p>
            <ol className={styles.steps}>
              <li>Run <code>npm run bridge</code> in your terminal</li>
              <li>Open the <strong>Figma Sync Bridge</strong> plugin in Figma</li>
              <li>Click <strong>Connect</strong> above</li>
            </ol>
          </div>
        )}
      </main>
    </Layout>
  );
}
