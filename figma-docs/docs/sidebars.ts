import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {
      type: 'category',
      label: 'Setup',
      items: [
        'getting-started',
        'setup/instruction-guide',
      ],
    },
    'approach/why-this-approach',
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
        'usecases/bootstrap-from-url',
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
