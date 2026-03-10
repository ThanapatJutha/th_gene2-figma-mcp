import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    'getting-started',
    'architecture',
    {
      type: 'category',
      label: 'Bridge',
      items: [
        'bridge/overview',
        'bridge/commands',
        'bridge/protocol',
      ],
    },
    {
      type: 'category',
      label: 'Usecases',
      items: [
        'usecases/convert-layer-to-component',
        'usecases/discover-components',
      ],
    },
    {
      type: 'category',
      label: 'Approach',
      items: [
        'approach/mcp-overview',
        'approach/local-mapping',
      ],
    },
  ],
};

export default sidebars;
