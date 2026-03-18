import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'Gene2 Figma MCP',
  tagline: 'Bidirectional sync between code and Figma — code is the source of truth',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  markdown: {
    mermaid: true,
  },

  themes: ['@docusaurus/theme-mermaid'],

  url: 'https://ThanapatJutha.github.io',
  baseUrl: '/gene2-figma-mcp/',

  organizationName: 'ThanapatJutha',
  projectName: 'gene2-figma-mcp',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl: 'https://github.com/ThanapatJutha/gene2-figma-mcp/tree/main/docs/',
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'Gene2 Figma MCP',
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'docsSidebar',
          position: 'left',
          label: 'Docs',
        },
        {
          to: '/dashboard',
          label: 'Dashboard',
          position: 'left',
        },
        {
          to: '/settings',
          label: 'Settings',
          position: 'left',
        },
        {
          href: 'https://github.com/ThanapatJutha/gene2-figma-mcp',
          label: 'GitHub',
          position: 'right',
        },
        {
          href: 'https://www.figma.com/design/ghwHnqX2WZXFtfmsrbRLTg',
          label: 'Figma File',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Docs',
          items: [
            { label: 'Getting Started', to: '/docs/getting-started' },
            { label: 'Architecture', to: '/docs/architecture' },
            { label: 'Bridge', to: '/docs/bridge/overview' },
          ],
        },
        {
          title: 'Approach',
          items: [
            { label: 'MCP Overview', to: '/docs/approach/mcp-overview' },
            { label: 'Local Mapping', to: '/docs/approach/local-mapping' },
          ],
        },
        {
          title: 'Links',
          items: [
            { label: 'GitHub', href: 'https://github.com/ThanapatJutha/gene2-figma-mcp' },
            { label: 'Figma File', href: 'https://www.figma.com/design/ghwHnqX2WZXFtfmsrbRLTg' },
          ],
        },
      ],
      copyright: `Gene2 Figma MCP · ${new Date().getFullYear()} · PALO IT Thailand`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
