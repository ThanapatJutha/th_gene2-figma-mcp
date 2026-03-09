import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'getting-started',
    'architecture',
    {
      type: 'category',
      label: 'Approach',
      items: [
        'approach/mcp-overview',
        'approach/local-mapping',
        'approach/plugin-bridge',
      ],
    },
  ],
};

export default sidebars;
