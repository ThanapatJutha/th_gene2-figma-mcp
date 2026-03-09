import React, { useState, useCallback, useEffect } from 'react';
import Layout from '@theme/Layout';
import { useBridge } from '../hooks/useBridge';
import type { ConnectionStatus } from '../hooks/useBridge';
import styles from './dashboard.module.css';

// ── Shared types ────────────────────────────────────────────────────

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

interface InstanceInfo {
  id: string;
  name: string;
  width: number;
  height: number;
  x: number;
  y: number;
  visible: boolean;
  mainComponentId: string;
}

interface ComponentInfo {
  id: string;
  name: string;
  type: 'COMPONENT' | 'COMPONENT_SET';
  description: string;
  width: number;
  height: number;
  childCount: number;
  x: number;
  y: number;
  instances: InstanceInfo[];
}

interface ListComponentsResult {
  pageName: string;
  pageId: string;
  totalComponents: number;
  components: ComponentInfo[];
}

/** A discovered project component from the file scan */
interface ProjectComponent {
  name: string;
  file: string;
  exportType: 'default' | 'named';
}

/** A persisted connection between Figma and code */
interface CodeConnection {
  figmaNodeId: string;
  figmaComponentName: string;
  codeComponent: string;
  file: string;
  linkedAt: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

function figmaNodeUrl(nodeId: string, fileKey: string): string {
  return `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(':', '-')}`;
}

function githubFileUrl(filePath: string): string {
  return `https://github.com/patja60/figma-sync/blob/main/${filePath}`;
}

function suggestAsComponent(layer: LayerInfo): boolean {
  if (layer.isComponent) return false;
  if (!layer.canConvert) return false;
  if (!layer.visible) return false;
  if (layer.childCount > 0 && layer.depth <= 2) return true;
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

// ── Collapsible Section ─────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  badge,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  badge?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className={styles.section}>
      <button className={styles.sectionHeader} onClick={() => setOpen(!open)}>
        <span className={styles.sectionToggle}>{open ? '▾' : '▸'}</span>
        <span className={styles.sectionIcon}>{icon}</span>
        <span className={styles.sectionTitle}>{title}</span>
        {badge && <span className={styles.sectionBadge}>{badge}</span>}
      </button>
      {open && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────────

export default function DashboardPage(): React.JSX.Element {
  const { status, connect, disconnect, send } = useBridge();

  // ── Discovery state ──
  const [layers, setLayers] = useState<LayerInfo[]>([]);
  const [discoverPage, setDiscoverPage] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [names, setNames] = useState<Record<string, string>>({});
  const [scanLoading, setScanLoading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [convResults, setConvResults] = useState<Array<{ id: string; success: boolean; message: string }>>([]);
  const [layerFilter, setLayerFilter] = useState<'all' | 'suggested' | 'frames' | 'components'>('all');
  const [discoverError, setDiscoverError] = useState<string | null>(null);

  // ── Components state ──
  const [liveComponents, setLiveComponents] = useState<ComponentInfo[]>([]);
  const [compPage, setCompPage] = useState('');
  const [compLoading, setCompLoading] = useState(false);
  const [compError, setCompError] = useState<string | null>(null);
  const [compFilter, setCompFilter] = useState('');
  const [compLastUpdated, setCompLastUpdated] = useState<string | null>(null);
  const [compStatusFilter, setCompStatusFilter] = useState<'all' | 'linked' | 'unlinked'>('all');
  const [expandedInstances, setExpandedInstances] = useState<Set<string>>(new Set());

  // ── Linking state (loaded from bridge) ──
  const [projectComponents, setProjectComponents] = useState<ProjectComponent[]>([]);
  const [connections, setConnections] = useState<CodeConnection[]>([]);
  const [linkSelections, setLinkSelections] = useState<Record<string, string>>({});
  const [figmaFileKey, setFigmaFileKey] = useState('');
  const [configLoaded, setConfigLoaded] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [savingLink, setSavingLink] = useState(false);

  // ── Load config, project components, and connections on connect ──

  const loadProjectData = useCallback(async () => {
    try {
      // Load config
      const config = (await send('read-config')) as { figmaFileKey?: string } | null;
      if (config && config.figmaFileKey) {
        setFigmaFileKey(config.figmaFileKey);
        setHasConfig(true);

        // Only load project components & connections if config exists
        try {
          const scanData = (await send('list-project-components')) as { components: ProjectComponent[] };
          setProjectComponents(scanData.components);
        } catch {
          // Globs may not match — that's fine
        }

        const connData = (await send('read-connections')) as { connections: CodeConnection[] };
        setConnections(connData.connections || []);
      } else {
        setHasConfig(false);
      }

      setConfigLoaded(true);
    } catch {
      // Non-critical — dashboard still works for discovery
      setConfigLoaded(true);
      setHasConfig(false);
    }
  }, [send]);

  useEffect(() => {
    if (status === 'connected') {
      loadProjectData();
    }
  }, [status, loadProjectData]);

  // ── Discovery actions ──

  const fetchLayers = useCallback(async () => {
    setScanLoading(true);
    setDiscoverError(null);
    try {
      const data = (await send('list-layers', { maxDepth: 100 })) as ListLayersResult;
      setLayers(data.layers);
      setDiscoverPage(data.pageName);
      const suggested = new Set<string>();
      const nameMap: Record<string, string> = {};
      data.layers.forEach((l) => {
        if (suggestAsComponent(l)) suggested.add(l.id);
        nameMap[l.id] = l.name;
      });
      setSelected(suggested);
      setNames(nameMap);
      setConvResults([]);
    } catch (err) {
      setDiscoverError(err instanceof Error ? err.message : 'Failed to fetch layers');
    } finally {
      setScanLoading(false);
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

  const filteredLayers = layers.filter((l) => {
    switch (layerFilter) {
      case 'suggested': return suggestAsComponent(l);
      case 'frames': return l.canConvert && !l.isComponent;
      case 'components': return l.isComponent;
      default: return true;
    }
  });

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
    setConvResults([]);
    const results: Array<{ id: string; success: boolean; message: string }> = [];
    for (const id of Array.from(selected)) {
      try {
        const data = (await send('create-component', { nodeId: id, name: names[id] || undefined })) as { id: string; name: string };
        results.push({ id, success: true, message: `✅ ${data.name} (${data.id})` });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        results.push({ id, success: false, message: `❌ ${names[id] || id}: ${msg}` });
      }
    }
    setConvResults(results);
    setConverting(false);
    try {
      const data = (await send('list-layers', { maxDepth: 100 })) as ListLayersResult;
      setLayers(data.layers);
      setSelected(new Set());
    } catch { /* ignore refresh error */ }
  }, [selected, names, send]);

  // ── Components actions ──

  const fetchComponents = useCallback(async () => {
    setCompLoading(true);
    setCompError(null);
    try {
      const data = (await send('list-components')) as ListComponentsResult;
      setLiveComponents(data.components);
      setCompPage(data.pageName);
      setCompLastUpdated(new Date().toLocaleTimeString('en-GB', { hour12: false }));
      setExpandedInstances(new Set());
    } catch (err) {
      setCompError(err instanceof Error ? err.message : 'Failed to fetch components');
    } finally {
      setCompLoading(false);
    }
  }, [send]);

  const toggleInstancePanel = (id: string) => {
    setExpandedInstances((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Linking actions (persisted to .figma-sync/connections.json) ──

  const connectionsByNode = new Map(connections.map((c) => [c.figmaNodeId, c]));

  const linkComponent = useCallback(async (figmaId: string, figmaName: string) => {
    const selectedFile = linkSelections[figmaId];
    if (!selectedFile) return;
    const proj = projectComponents.find((p) => p.file === selectedFile);
    if (!proj) return;

    setSavingLink(true);
    try {
      const newConn: CodeConnection = {
        figmaNodeId: figmaId,
        figmaComponentName: figmaName,
        codeComponent: proj.name,
        file: proj.file,
        linkedAt: new Date().toISOString(),
      };
      const updated = [...connections.filter((c) => c.figmaNodeId !== figmaId), newConn];
      await send('save-connections', { connections: updated });
      setConnections(updated);
      setLinkSelections((prev) => {
        const next = { ...prev };
        delete next[figmaId];
        return next;
      });
    } catch (err) {
      setCompError(err instanceof Error ? err.message : 'Failed to save connection');
    } finally {
      setSavingLink(false);
    }
  }, [send, linkSelections, projectComponents, connections]);

  const unlinkComponent = useCallback(async (figmaId: string) => {
    setSavingLink(true);
    try {
      const updated = connections.filter((c) => c.figmaNodeId !== figmaId);
      await send('save-connections', { connections: updated });
      setConnections(updated);
    } catch (err) {
      setCompError(err instanceof Error ? err.message : 'Failed to remove connection');
    } finally {
      setSavingLink(false);
    }
  }, [send, connections]);

  // ── Filtered component list ──

  const linkedCount = liveComponents.filter((c) => connectionsByNode.has(c.id)).length;
  const unlinkedCount = liveComponents.length - linkedCount;

  const filteredComponents = liveComponents.filter((c) => {
    if (compStatusFilter === 'linked' && !connectionsByNode.has(c.id)) return false;
    if (compStatusFilter === 'unlinked' && connectionsByNode.has(c.id)) return false;
    if (compFilter) {
      const q = compFilter.toLowerCase();
      const name = c.name.toLowerCase();
      const conn = connectionsByNode.get(c.id);
      const file = conn?.file?.toLowerCase() || '';
      if (!name.includes(q) && !c.id.includes(q) && !file.includes(q)) return false;
    }
    return true;
  });

  // ── Render ──

  return (
    <Layout title="Dashboard" description="Discover, manage and map Figma components">
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1>⚡ Figma Sync Dashboard</h1>
          <p>Discover layers, convert them to components, view live components, and manage code mappings — all in one place.</p>
        </div>

        {/* Connection Bar */}
        <div className={styles.connectionBar}>
          <div className={styles.connectionStatus}>
            {statusDot(status)}
            <span>
              {status === 'connected' ? 'Connected to bridge' : status === 'connecting' ? 'Connecting…' : 'Not connected'}
            </span>
          </div>
          <div className={styles.connectionActions}>
            {status !== 'connected' ? (
              <button className={styles.btnPrimary} onClick={connect}>Connect</button>
            ) : (
              <button className={styles.btnSecondary} onClick={disconnect}>Disconnect</button>
            )}
          </div>
        </div>

        {status === 'disconnected' && (
          <div className={styles.emptyState}>
            <h2>Bridge not connected</h2>
            <p>Start the bridge server and connect to get started.</p>
            <ol className={styles.steps}>
              <li>Run <code>npm run bridge</code> in your terminal</li>
              <li>Open the <strong>Figma Sync Bridge</strong> plugin in Figma</li>
              <li>Click <strong>Connect</strong> above</li>
            </ol>
          </div>
        )}

        {/* ════════════════════════ SECTION 1: Discovery ════════════════════════ */}
        {status === 'connected' && (
          <CollapsibleSection title="Discover Components" icon="🔍" defaultOpen={true}>
            <p className={styles.sectionDesc}>
              Scan your Figma file, review suggested components, and convert them.
            </p>

            <div className={styles.actionBar}>
              <button className={styles.btnPrimary} onClick={fetchLayers} disabled={scanLoading}>
                {scanLoading ? 'Scanning…' : '🔍 Scan Layers'}
              </button>
            </div>

            {discoverError && <div className={styles.errorBanner}>{discoverError}</div>}

            {layers.length > 0 && (
              <>
                <div className={styles.toolbar}>
                  <div className={styles.filterGroup}>
                    <span className={styles.pageLabel}>📄 {discoverPage}</span>
                    <span className={styles.count}>{layers.length} layers found</span>
                    <div className={styles.filters}>
                      {(['suggested', 'frames', 'components', 'all'] as const).map((f) => (
                        <button
                          key={f}
                          className={`${styles.filterBtn} ${layerFilter === f ? styles.filterActive : ''}`}
                          onClick={() => setLayerFilter(f)}
                        >
                          {f === 'suggested' ? `⭐ Suggested (${layers.filter(suggestAsComponent).length})` : f === 'frames' ? '📁 Convertible' : f === 'components' ? '◆ Components' : 'All'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {layerFilter !== 'components' && (
                    <div className={styles.selectActions}>
                      <button className={styles.btnSmall} onClick={selectAll}>Select all</button>
                      <button className={styles.btnSmall} onClick={selectNone}>Select none</button>
                      <button className={styles.btnConvert} onClick={convertSelected} disabled={selected.size === 0 || converting}>
                        {converting ? 'Converting…' : `Convert ${selected.size} to Components`}
                      </button>
                    </div>
                  )}
                </div>

                {convResults.length > 0 && (
                  <div className={styles.resultsPanel}>
                    <h3>Conversion Results</h3>
                    {convResults.map((r, i) => (
                      <div key={i} className={r.success ? styles.resultOk : styles.resultErr}>{r.message}</div>
                    ))}
                  </div>
                )}

                <div className={styles.tableWrap}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        {layerFilter !== 'components' && <th style={{ width: 40 }}></th>}
                        <th>Layer</th>
                        <th>Type</th>
                        <th>Size</th>
                        <th>Children</th>
                        <th>Node ID</th>
                        {layerFilter !== 'components' && <th>Name</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredLayers.map((l) => (
                        <tr key={l.id} className={`${l.isComponent ? styles.rowComponent : ''} ${selected.has(l.id) ? styles.rowSelected : ''}`}>
                          {layerFilter !== 'components' && (
                            <td>
                              {l.canConvert && !l.isComponent && (
                                <input type="checkbox" checked={selected.has(l.id)} onChange={() => toggleSelect(l.id)} />
                              )}
                              {l.isComponent && <span title="Already a component">◆</span>}
                            </td>
                          )}
                          <td>
                            <span style={{ paddingLeft: l.depth * 16 }}>
                              {l.isComponent ? '◆ ' : ''}{l.name}
                            </span>
                          </td>
                          <td><code>{l.type}</code></td>
                          <td>{Math.round(l.width)}×{Math.round(l.height)}</td>
                          <td>{l.childCount}</td>
                          <td><code>{l.id}</code></td>
                          {layerFilter !== 'components' && (
                            <td>
                              {l.canConvert && !l.isComponent && (
                                <input type="text" className={styles.nameInput} value={names[l.id] || ''} onChange={(e) => updateName(l.id, e.target.value)} placeholder={l.name} />
                              )}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {filteredLayers.length === 0 && (
                  <div className={styles.empty}>No layers match the current filter.</div>
                )}
              </>
            )}

            {layers.length === 0 && !scanLoading && (
              <div className={styles.inlineEmpty}>
                Click <strong>🔍 Scan Layers</strong> to fetch all layers from the current Figma page.
              </div>
            )}
          </CollapsibleSection>
        )}

        {/* ════════════════════════ SECTION 2: Components ════════════════════════ */}
        {status === 'connected' && (
          <CollapsibleSection
            title="Components"
            icon="◆"
            badge={hasConfig && liveComponents.length > 0 ? `${liveComponents.length} components · ${linkedCount} linked` : undefined}
            defaultOpen={true}
          >
            {/* Gate: require config to be set up first */}
            {!configLoaded && (
              <div className={styles.inlineEmpty}>
                <p>Loading project configuration…</p>
              </div>
            )}

            {configLoaded && !hasConfig && (
              <div className={styles.emptyState}>
                <h2>⚙️ Configuration Required</h2>
                <p>Set up your project before using the Components section.</p>
                <ol className={styles.steps}>
                  <li>Go to <a href="/figma-sync/settings"><strong>⚙️ Settings</strong></a></li>
                  <li>Set your <strong>Figma File Key</strong></li>
                  <li>Configure <strong>component include patterns</strong> (e.g. <code>poc-react/src/components/**/*.tsx</code>)</li>
                  <li>Click <strong>Save Configuration</strong></li>
                </ol>
                <a href="/figma-sync/settings" className={styles.btnPrimary} style={{ display: 'inline-block', marginTop: 12, textDecoration: 'none' }}>
                  Go to Settings →
                </a>
              </div>
            )}

            {configLoaded && hasConfig && (
              <>
                <p className={styles.sectionDesc}>
                  All Figma components on the current page. Link each to a code component from your project.
                </p>

                <div className={styles.actionBar}>
                  <button className={styles.btnPrimary} onClick={fetchComponents} disabled={compLoading}>
                    {compLoading ? 'Loading…' : '🔄 Refresh Components'}
                  </button>
                  {projectComponents.length === 0 && (
                    <span className={styles.hint}>
                      ⚠️ No project components discovered. Check your <a href="/figma-sync/settings">include patterns</a>.
                    </span>
                  )}
                </div>

                {compError && <div className={styles.errorBanner}>{compError}</div>}

                {liveComponents.length > 0 && (
              <>
                <div className={styles.toolbar}>
                  <div className={styles.filterGroup}>
                    {compPage && <span className={styles.pageLabel}>📄 {compPage}</span>}
                    <span className={styles.badge}>{liveComponents.length} total</span>
                    {compLastUpdated && <span className={styles.timestamp}>Updated {compLastUpdated}</span>}
                    <div className={styles.filters}>
                      {(['all', 'linked', 'unlinked'] as const).map((f) => (
                        <button
                          key={f}
                          className={`${styles.filterBtn} ${compStatusFilter === f ? styles.filterActive : ''}`}
                          onClick={() => setCompStatusFilter(f)}
                        >
                          {f === 'all' ? `All (${liveComponents.length})` : f === 'linked' ? `🔗 Linked (${linkedCount})` : `Unlinked (${unlinkedCount})`}
                        </button>
                      ))}
                    </div>
                  </div>
                  <input
                    className={styles.search}
                    type="text"
                    placeholder="Filter components…"
                    value={compFilter}
                    onChange={(e) => setCompFilter(e.target.value)}
                  />
                </div>

                <div className={styles.grid}>
                  {filteredComponents.map((c) => {
                    const conn = connectionsByNode.get(c.id);
                    const isLinked = !!conn;
                    const instances = c.instances || [];
                    const isExpanded = expandedInstances.has(c.id);
                    const alreadyLinkedFiles = new Set(connections.map((cn) => cn.file));

                    return (
                      <div key={c.id} className={`${styles.card} ${isLinked ? styles.cardLinked : ''}`}>
                        {/* Card Header */}
                        <div className={styles.cardHeader}>
                          <span className={styles.componentIcon}>◆</span>
                          <span className={styles.componentName}>{c.name}</span>
                          <span className={styles.typeBadge}>{c.type === 'COMPONENT_SET' ? 'SET' : 'COMP'}</span>
                          <span className={isLinked ? styles.linkedBadge : styles.unlinkedBadge}>
                            {isLinked ? '🔗 Linked' : 'Unlinked'}
                          </span>
                        </div>

                        {/* Card Body */}
                        <div className={styles.cardBody}>
                          <div className={styles.field}><span className={styles.label}>Node ID</span><code>{c.id}</code></div>
                          <div className={styles.field}><span className={styles.label}>Size</span><span>{Math.round(c.width)} × {Math.round(c.height)}</span></div>
                          <div className={styles.field}><span className={styles.label}>Children</span><span>{c.childCount}</span></div>
                          {c.description && (
                            <div className={styles.field}><span className={styles.label}>Desc</span><span className={styles.description}>{c.description}</span></div>
                          )}

                          {/* Link Section */}
                          {isLinked ? (
                            <div className={styles.linkBlock}>
                              <div className={styles.linkTitle}>🔗 Code Connection</div>
                              <div className={styles.field}>
                                <span className={styles.label}>Component</span>
                                <strong>{conn.codeComponent}</strong>
                              </div>
                              <div className={styles.field}>
                                <span className={styles.label}>File</span>
                                <a href={githubFileUrl(conn.file)} target="_blank" rel="noopener noreferrer">{conn.file}</a>
                              </div>
                              <div className={styles.field}>
                                <span className={styles.label}>Linked</span>
                                <span>{new Date(conn.linkedAt).toLocaleDateString()}</span>
                              </div>
                              <button className={styles.btnUnlink} onClick={() => unlinkComponent(c.id)} disabled={savingLink}>
                                ✕ Unlink
                              </button>
                            </div>
                          ) : (
                            <div className={styles.linkBlock}>
                              <div className={styles.linkTitle}>Link to Code Component</div>
                              {projectComponents.length > 0 ? (
                                <div className={styles.linkRow}>
                                  <select
                                    className={styles.linkSelect}
                                    value={linkSelections[c.id] || ''}
                                    onChange={(e) => setLinkSelections((prev) => ({ ...prev, [c.id]: e.target.value }))}
                                  >
                                    <option value="">Select a component…</option>
                                    {projectComponents.map((p) => (
                                      <option key={p.file} value={p.file} disabled={alreadyLinkedFiles.has(p.file)}>
                                        {p.name} — {p.file.split('/').pop()}
                                        {alreadyLinkedFiles.has(p.file) ? ' (linked)' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    className={styles.btnLink}
                                    onClick={() => linkComponent(c.id, c.name)}
                                    disabled={!linkSelections[c.id] || savingLink}
                                  >
                                    {savingLink ? '…' : 'Link'}
                                  </button>
                                </div>
                              ) : (
                                <p className={styles.hint}>
                                  <a href="/figma-sync/settings">Configure Settings</a> to discover project components.
                                </p>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Instances toggle */}
                        <div className={styles.instanceSection}>
                          <button className={styles.instanceToggle} onClick={() => toggleInstancePanel(c.id)}>
                            <span>{isExpanded ? '▾' : '▸'}</span>
                            <span>
                              {instances.length > 0
                                ? `${instances.length} instance${instances.length > 1 ? 's' : ''} on canvas`
                                : 'No instances on this page'}
                            </span>
                          </button>
                          {isExpanded && instances.length > 0 && (
                            <div className={styles.instanceList}>
                              <table className={styles.instanceTable}>
                                <thead>
                                  <tr>
                                    <th>Name</th>
                                    <th>Node ID</th>
                                    <th>Position</th>
                                    <th>Size</th>
                                    <th>Visible</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {instances.map((inst) => (
                                    <tr key={inst.id}>
                                      <td>{inst.name}</td>
                                      <td><code>{inst.id}</code></td>
                                      <td>{Math.round(inst.x)}, {Math.round(inst.y)}</td>
                                      <td>{Math.round(inst.width)}×{Math.round(inst.height)}</td>
                                      <td>{inst.visible ? '✓' : '✗'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>

                        {/* Card Footer — links */}
                        <div className={styles.cardFooter}>
                          {figmaFileKey && (
                            <a href={figmaNodeUrl(c.id, figmaFileKey)} target="_blank" rel="noopener noreferrer" className={styles.figmaLink}>Open in Figma ↗</a>
                          )}
                          {isLinked && (
                            <a href={githubFileUrl(conn.file)} target="_blank" rel="noopener noreferrer" className={styles.githubLink}>View Source ↗</a>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {filteredComponents.length === 0 && (
                  <p className={styles.empty}>No components match the current filter.</p>
                )}
              </>
            )}

            {liveComponents.length === 0 && !compLoading && (
              <div className={styles.inlineEmpty}>
                Click <strong>🔄 Refresh Components</strong> to fetch components from the current Figma page.
              </div>
            )}
              </>
            )}
          </CollapsibleSection>
        )}
      </main>
    </Layout>
  );
}
