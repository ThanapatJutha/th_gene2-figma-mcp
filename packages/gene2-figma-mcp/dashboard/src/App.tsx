import React, { useState, useEffect, useCallback } from 'react';
import DashboardPage from './pages/Dashboard';
import SettingsPage from './pages/Settings';
import styles from './App.module.css';

type Page = 'dashboard' | 'settings';

function getPageFromHash(): Page {
  const hash = window.location.hash.replace('#', '').replace(/^\//, '');
  if (hash === 'settings') return 'settings';
  return 'dashboard';
}

export default function App() {
  const [page, setPage] = useState<Page>(getPageFromHash);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem('gene2-theme');
    if (stored === 'light' || stored === 'dark') return stored;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  });

  // Sync theme to <html> attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('gene2-theme', theme);
  }, [theme]);

  // Listen to hash changes
  useEffect(() => {
    const handler = () => setPage(getPageFromHash());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const navigate = useCallback((p: Page) => {
    window.location.hash = p === 'dashboard' ? '' : p;
    setPage(p);
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  return (
    <div className={styles.shell}>
      <nav className={styles.navbar}>
        <a href="#" className={styles.brand} onClick={(e) => { e.preventDefault(); navigate('dashboard'); }}>
          ⚡ Gene2 Figma MCP
        </a>
        <div className={styles.navLinks}>
          <a
            href="#"
            className={`${styles.navLink} ${page === 'dashboard' ? styles.navLinkActive : ''}`}
            onClick={(e) => { e.preventDefault(); navigate('dashboard'); }}
          >
            Dashboard
          </a>
          <a
            href="#settings"
            className={`${styles.navLink} ${page === 'settings' ? styles.navLinkActive : ''}`}
            onClick={(e) => { e.preventDefault(); navigate('settings'); }}
          >
            Settings
          </a>
        </div>
        <div className={styles.spacer} />
        <button className={styles.themeToggle} onClick={toggleTheme} title="Toggle dark mode">
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </nav>
      <div className={styles.content}>
        {page === 'dashboard' && <DashboardPage />}
        {page === 'settings' && <SettingsPage />}
      </div>
    </div>
  );
}
