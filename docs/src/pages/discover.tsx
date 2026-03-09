import React, { useState, useCallback } from 'react';
import Layout from '@theme/Layout';
import { useBridge } from '../hooks/useBridge';
import type { ConnectionStatus } from '../hooks/useBridge';
import styles from './discover.module.css';

interface LayerInfo {
  id: string;
  name: string;
  type: string;
  depth: number;
  isComponent: boolean;
  childCount: number;
  width: number;
  height: number;
  visible: boolean;
  canConvert: boolean;
}

interface ListLayersResult {
  pageName: string;
  pageId: string;
  totalLayers: number;
  layers: LayerInfo[];
}

/** Heuristic: suggest frames/groups with children as component candidates */
function suggestAsComponent(layer: LayerInfo): boolean {
  if (layer.isComponent) return false; // already a component
  if (!layer.canConvert) return false;
  if (!layer.visible) return false;
  // Frames/groups with children at depth 0-2 are good candidates
  if (layer.childCount > 0 && layer.depth <= 2) return true;
  // Named with common component-like patterns
  const nameLower = layer.name.toLowerCase();
  if (/card|button|header|toggle|switch|input|modal|nav|sidebar|footer|tab|badge|chip|avatar/.test(nameLower)) {
    return true;
  }
  return false;
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

export default function DiscoverPage(): React.JSX.Element {
  const { status, connect, disconnect, send } = useBridge();
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [pageName, setPageName] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [results, setResults] = useState<Array<{ id: string; success: boolean; message: string }>>([]);
  const [filter, setFilter] = useState<'all' | 'suggested' | 'frames' | 'components'>('all');
  const [error, setError] = useState<string | null>(null);

  const fetchLayers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = (await send('list-layers', { maxDepth: 100 })) as ListLayersResult;
      setLayers(data.layers);
      setPageName(data.pageName);
      // Pre-select suggested layers
      const suggested = new Set<string>();
      const nameMap: Record<string, string> = {};
      data.layers.forEach((l) => {
        if (suggestAsComponent(l)) {
          suggested.add(l.id);
        }
        nameMap[l.id] = l.name;
      });
      setSelected(suggested);
      setNames(nameMap);
      setResults([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch layers');
    } finally {
      setLoading(false);
    }
  }, [send]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    const visible = filteredLayers.filter((l) => l.canConvert && !l.isComponent);
    setSelected(new Set(visible.map((l) => l.id)));
  };

  const selectNone = () => setSelected(new Set());

  const updateName = (id: string, name: string) => {
    setNames((prev) => ({ ...prev, [id]: name }));
  };

  const convertSelected = useCallback(async () => {
    if (selected.size === 0) return;
    setConverting(true);
    setResults([]);
    const newResults: Array<{ id: string; success: boolean; message: string }> = [];

    for (const id of Array.from(selected)) {
      try {
        const data = (await send('create-component', {
          nodeId: id,
          name: names[id] || undefined,
        })) as { id: string; name: string };
        newResults.push({ id, success: true, message: `✅ ${data.name} (${data.id})` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        newResults.push({ id, success: false, message: `❌ ${names[id] || id}: ${msg}` });
      }
    }

    setResults(newResults);
    setConverting(false);
    // Refresh layers after conversion
    try {
      const data = (await send('list-layers', { maxDepth: 100 })) as ListLayersResult;
      setLayers(data.layers);
      setSelected(new Set());
    } catch {
      // ignore refresh error
    }
  }, [selected, names, send]);

  const filteredLayers = layers.filter((l) => {
    switch (filter) {
      case 'suggested':
        return suggestAsComponent(l);
      case 'frames':
        return l.canConvert && !l.isComponent;
      case 'components':
        return l.isComponent;
      default:
        return true;
    }
  });

  return (
    <Layout title="Discover Components" description="Discover and convert Figma layers to components">
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1>🔍 Discover Components</h1>
          <p>
            Scan your Figma file, review suggested components, and convert them — all from this page.
          </p>
        </div>

        {/* Connection Bar */}
        <div className={styles.connectionBar}>
          <div className={styles.connectionStatus}>
            {statusDot(status)}
            <span>{status === 'connected' ? 'Connected to bridge' : status === 'connecting' ? 'Connecting…' : 'Not connected'}</span>
          </div>
          <div className={styles.connectionActions}>
            {status !== 'connected' ? (
              <button className={styles.btnPrimary} onClick={connect}>
                Connect
              </button>
            ) : (
              <>
                <button className={styles.btnPrimary} onClick={fetchLayers} disabled={loading}>
                  {loading ? 'Scanning…' : '🔍 Scan Layers'}
                </button>
                <button className={styles.btnSecondary} onClick={disconnect}>
                  Disconnect
                </button>
              </>
            )}
          </div>
        </div>

        {error && <div className={styles.errorBanner}>{error}</div>}

        {/* Results */}
        {layers.length > 0 && (
          <>
            <div className={styles.toolbar}>
              <div className={styles.filterGroup}>
                <span className={styles.pageLabel}>📄 {pageName}</span>
                <span className={styles.count}>{layers.length} layers found</span>
                <div className={styles.filters}>
                  {(['suggested', 'frames', 'components', 'all'] as const).map((f) => (
                    <button
                      key={f}
                      className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}
                      onClick={() => setFilter(f)}
                    >
                      {f === 'suggested' ? `⭐ Suggested (${layers.filter(suggestAsComponent).length})` : f === 'frames' ? `📁 Convertible` : f === 'components' ? `◆ Components` : `All`}
                    </button>
                  ))}
                </div>
              </div>
              {filter !== 'components' && (
                <div className={styles.selectActions}>
                  <button className={styles.btnSmall} onClick={selectAll}>Select all</button>
                  <button className={styles.btnSmall} onClick={selectNone}>Select none</button>
                  <button
                    className={styles.btnConvert}
                    onClick={convertSelected}
                    disabled={selected.size === 0 || converting}
                  >
                    {converting ? 'Converting…' : `Convert ${selected.size} to Components`}
                  </button>
                </div>
              )}
            </div>

            {/* Conversion results */}
            {results.length > 0 && (
              <div className={styles.resultsPanel}>
                <h3>Conversion Results</h3>
                {results.map((r, i) => (
                  <div key={i} className={r.success ? styles.resultOk : styles.resultErr}>
                    {r.message}
                  </div>
                ))}
              </div>
            )}

            {/* Layer table */}
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    {filter !== 'components' && <th style={{ width: 40 }}></th>}
                    <th>Layer</th>
                    <th>Type</th>
                    <th>Size</th>
                    <th>Children</th>
                    <th>Node ID</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLayers.map((l) => (
                    <tr
                      key={l.id}
                      className={`${l.isComponent ? styles.rowComponent : ''} ${selected.has(l.id) ? styles.rowSelected : ''}`}
                    >
                      {filter !== 'components' && (
                        <td>
                          {l.canConvert && !l.isComponent && (
                            <input
                              type="checkbox"
                              checked={selected.has(l.id)}
                              onChange={() => toggleSelect(l.id)}
                            />
                          )}
                          {l.isComponent && <span title="Already a component">◆</span>}
                        </td>
                      )}
                      <td>
                        <span style={{ paddingLeft: l.depth * 16 }}>
                          {l.isComponent ? '◆ ' : ''}
                          {l.name}
                        </span>
                      </td>
                      <td><code>{l.type}</code></td>
                      <td>{Math.round(l.width)}×{Math.round(l.height)}</td>
                      <td>{l.childCount}</td>
                      <td><code>{l.id}</code></td>
                      {filter !== 'components' && (
                        <td>
                          {l.canConvert && !l.isComponent && (
                            <input
                              type="text"
                              className={styles.nameInput}
                              value={names[l.id] || ''}
                              onChange={(e) => updateName(l.id, e.target.value)}
                              placeholder={l.name}
                            />
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredLayers.length === 0 && (
              <div className={styles.empty}>
                No layers match the current filter.
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {layers.length === 0 && status === 'connected' && !loading && (
          <div className={styles.emptyState}>
            <h2>Ready to scan</h2>
            <p>Click <strong>🔍 Scan Layers</strong> to fetch all layers from the current Figma page.</p>
            <p className={styles.hint}>
              Make sure the Figma Sync Bridge plugin is open and connected in Figma.
            </p>
          </div>
        )}

        {status === 'disconnected' && (
          <div className={styles.emptyState}>
            <h2>Bridge not connected</h2>
            <p>Start the bridge server and connect to scan layers.</p>
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
