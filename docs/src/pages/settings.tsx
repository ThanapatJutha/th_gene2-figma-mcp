import React, { useState, useCallback, useEffect } from 'react';
import Layout from '@theme/Layout';
import { useBridge } from '../hooks/useBridge';
import type { ConnectionStatus } from '../hooks/useBridge';
import styles from './settings.module.css';

// ── Types (aligned with figma.config.json / Code Connect) ───────────

interface CodeConnectConfig {
  parser: string;
  include: string[];
  exclude: string[];
  label: string;
  language: string;
}

interface FigmaSyncConfig {
  codeConnect: CodeConnectConfig;
  figmaFileKey: string;
  rootDir: string;
}

// ── Helpers ─────────────────────────────────────────────────────────

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

const PARSER_OPTIONS = ['react', 'html', 'vue', 'svelte', 'swift', 'compose', 'custom'];
const LANGUAGE_OPTIONS = ['tsx', 'jsx', 'ts', 'js', 'vue', 'svelte', 'swift', 'kt'];

// ── Main Settings Page ──────────────────────────────────────────────

export default function SettingsPage(): React.JSX.Element {
  const { status, connect, disconnect, send } = useBridge();

  // ── Config state ──
  const [config, setConfig] = useState<FigmaSyncConfig | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  // ── Form fields ──
  const [figmaFileKey, setFigmaFileKey] = useState('');
  const [rootDir, setRootDir] = useState('.');
  const [parser, setParser] = useState('react');
  const [language, setLanguage] = useState('tsx');
  const [label, setLabel] = useState('React');
  const [includePatterns, setIncludePatterns] = useState('');
  const [excludePatterns, setExcludePatterns] = useState('');

  // ── Scan preview state ──
  const [scanResult, setScanResult] = useState<Array<{ name: string; file: string; exportType: string }> | null>(null);
  const [scanning, setScanning] = useState(false);

  // ── Directory list for dropdown ──
  const [directories, setDirectories] = useState<string[]>(['.']);

  // ── Default patterns for new configs ──
  const DEFAULT_INCLUDE = 'demo/src/components/**/*.tsx';
  const DEFAULT_EXCLUDE = '**/*.test.*\n**/*.stories.*\n**/*.figma.*';

  // ── Load config on connect ──

  const loadConfig = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch directories for dropdown
      const dirData = (await send('list-directories')) as { directories: string[] } | null;
      if (dirData?.directories) {
        setDirectories(dirData.directories);
      }

      const data = (await send('read-config')) as FigmaSyncConfig | null;
      if (data) {
        setConfig(data);
        setFigmaFileKey(data.figmaFileKey);
        setRootDir(data.rootDir || '.');
        setParser(data.codeConnect.parser);
        setLanguage(data.codeConnect.language);
        setLabel(data.codeConnect.label);
        setIncludePatterns(data.codeConnect.include.join('\n'));
        setExcludePatterns(data.codeConnect.exclude.join('\n'));
      } else {
        // No config yet — prefill with sensible defaults
        setIncludePatterns(DEFAULT_INCLUDE);
        setExcludePatterns(DEFAULT_EXCLUDE);
        setDirty(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load config');
    } finally {
      setLoading(false);
    }
  }, [send]);

  useEffect(() => {
    if (status === 'connected') {
      loadConfig();
    }
  }, [status, loadConfig]);

  // ── Save config ──

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const newConfig: FigmaSyncConfig = {
        codeConnect: {
          parser,
          include: includePatterns.split('\n').map((s) => s.trim()).filter(Boolean),
          exclude: excludePatterns.split('\n').map((s) => s.trim()).filter(Boolean),
          label,
          language,
        },
        figmaFileKey,
        rootDir,
      };
      await send('save-config', { config: newConfig });
      setConfig(newConfig);
      setDirty(false);
      setSuccess('Configuration saved to figma.config.json');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save config');
    } finally {
      setSaving(false);
    }
  }, [send, parser, includePatterns, excludePatterns, label, language, figmaFileKey, rootDir]);

  // ── Mark form dirty ──

  const markDirty = () => { setDirty(true); setSuccess(null); };

  // ── Scan preview ──

  const handleScan = useCallback(async () => {
    setScanning(true);
    setScanResult(null);
    setError(null);
    try {
      // Save first if dirty, so the scan uses latest config
      if (dirty) {
        await handleSave();
      }
      const data = (await send('list-project-components')) as { components: Array<{ name: string; file: string; exportType: string }> };
      setScanResult(data.components);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Scan failed');
    } finally {
      setScanning(false);
    }
  }, [send, dirty, handleSave]);

  // ── Figma URL helper ──
  const figmaUrl = figmaFileKey ? `https://www.figma.com/design/${figmaFileKey}` : '';

  // ── Render ──

  return (
    <Layout title="Settings" description="Configure Figma Sync project settings">
      <main className={styles.container}>
        <div className={styles.hero}>
          <h1>⚙️ Settings</h1>
          <p>
            Configure your project for Figma ↔ Code sync.
            Aligned with{' '}
            <a href="https://github.com/figma/code-connect" target="_blank" rel="noopener noreferrer">
              Figma Code Connect
            </a>{' '}
            conventions.
          </p>
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
            <p>Start the bridge server to manage settings.</p>
            <p className={styles.hint}>Run <code>npm run bridge</code> in your terminal, then click <strong>Connect</strong>.</p>
          </div>
        )}

        {status === 'connected' && loading && (
          <div className={styles.emptyState}>
            <p>Loading configuration…</p>
          </div>
        )}

        {status === 'connected' && !loading && (
          <>
            {error && <div className={styles.errorBanner}>{error}</div>}
            {success && <div className={styles.successBanner}>{success}</div>}

            {/* ── Section: Figma File ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🎨</span>
                <span className={styles.sectionTitle}>Figma File</span>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Figma File Key</label>
                  <input
                    className={styles.formInput}
                    type="text"
                    value={figmaFileKey}
                    onChange={(e) => { setFigmaFileKey(e.target.value); markDirty(); }}
                    placeholder="e.g. ghwHnqX2WZXFtfmsrbRLTg"
                  />
                  <p className={styles.formHint}>
                    The file key from your Figma URL: figma.com/design/<strong>{figmaFileKey || '...'}</strong>/FileName
                  </p>
                  {figmaUrl && (
                    <a href={figmaUrl} target="_blank" rel="noopener noreferrer" className={styles.previewLink}>
                      Open in Figma ↗
                    </a>
                  )}
                </div>
              </div>
            </div>

            {/* ── Section: Project Structure ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>📁</span>
                <span className={styles.sectionTitle}>Project Structure</span>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Root Directory</label>
                  <select
                    className={styles.formSelect}
                    value={rootDir}
                    onChange={(e) => { setRootDir(e.target.value); markDirty(); }}
                  >
                    {directories.map((d) => (
                      <option key={d} value={d}>{d === '.' ? '. (project root)' : d}</option>
                    ))}
                  </select>
                  <p className={styles.formHint}>Project root relative to the config file</p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Include Patterns</label>
                  <textarea
                    className={styles.formTextarea}
                    value={includePatterns}
                    onChange={(e) => { setIncludePatterns(e.target.value); markDirty(); }}
                    placeholder={"demo/src/components/**/*.tsx"}
                    rows={3}
                  />
                  <p className={styles.formHint}>Glob patterns to find component files (one per line)</p>
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.formLabel}>Exclude Patterns</label>
                  <textarea
                    className={styles.formTextarea}
                    value={excludePatterns}
                    onChange={(e) => { setExcludePatterns(e.target.value); markDirty(); }}
                    placeholder={"**/*.test.*\n**/*.stories.*\n**/*.figma.*"}
                    rows={3}
                  />
                  <p className={styles.formHint}>Glob patterns to skip (one per line)</p>
                </div>
              </div>
            </div>

            {/* ── Section: Code Connect ── */}
            <div className={styles.section}>
              <div className={styles.sectionHeader}>
                <span className={styles.sectionIcon}>🔗</span>
                <span className={styles.sectionTitle}>Code Connect</span>
              </div>
              <div className={styles.sectionBody}>
                <div className={styles.formRow}>
                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Parser</label>
                    <select
                      className={styles.formSelect}
                      value={parser}
                      onChange={(e) => { setParser(e.target.value); markDirty(); }}
                    >
                      {PARSER_OPTIONS.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <p className={styles.formHint}>Framework parser for Code Connect</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Language</label>
                    <select
                      className={styles.formSelect}
                      value={language}
                      onChange={(e) => { setLanguage(e.target.value); markDirty(); }}
                    >
                      {LANGUAGE_OPTIONS.map((l) => (
                        <option key={l} value={l}>{l}</option>
                      ))}
                    </select>
                    <p className={styles.formHint}>Syntax highlighting in Figma Dev Mode</p>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.formLabel}>Label</label>
                    <input
                      className={styles.formInput}
                      type="text"
                      value={label}
                      onChange={(e) => { setLabel(e.target.value); markDirty(); }}
                      placeholder="React"
                    />
                    <p className={styles.formHint}>Label shown in Figma Dev Mode</p>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className={styles.actionBar}>
              <button
                className={styles.btnPrimary}
                onClick={handleSave}
                disabled={saving || !dirty}
              >
                {saving ? 'Saving…' : dirty ? '💾 Save Configuration' : '✓ Saved'}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={handleScan}
                disabled={scanning}
              >
                {scanning ? 'Scanning…' : '🔍 Preview Component Scan'}
              </button>
              <button
                className={styles.btnSecondary}
                onClick={loadConfig}
              >
                ↻ Reload
              </button>
            </div>

            {/* ── Scan Results ── */}
            {scanResult && (
              <div className={styles.section}>
                <div className={styles.sectionHeader}>
                  <span className={styles.sectionIcon}>📋</span>
                  <span className={styles.sectionTitle}>Discovered Components</span>
                  <span className={styles.sectionBadge}>{scanResult.length} found</span>
                </div>
                <div className={styles.sectionBody}>
                  {scanResult.length === 0 ? (
                    <p className={styles.emptyInline}>No components found. Check your include/exclude patterns.</p>
                  ) : (
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Component</th>
                            <th>File</th>
                            <th>Export</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scanResult.map((c, i) => (
                            <tr key={i}>
                              <td><strong>{c.name}</strong></td>
                              <td><code>{c.file}</code></td>
                              <td><span className={styles.exportBadge}>{c.exportType}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  <p className={styles.hint}>
                    These are the components that will appear in the Dashboard linking dropdown.
                  </p>
                </div>
              </div>
            )}

            {/* ── Config file info ── */}
            <div className={styles.infoBar}>
              <span>📄 Config file: <code>figma.config.json</code></span>
              <span>🗃️ Connections DB: <code>.figma-sync/connections.json</code></span>
            </div>
          </>
        )}
      </main>
    </Layout>
  );
}
