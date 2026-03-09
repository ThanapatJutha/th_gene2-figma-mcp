/**
 * Figma Plugin — main thread (sandbox).
 * Receives commands from the UI iframe (which holds the WebSocket)
 * and executes them using the figma.* Plugin API.
 */

// Show the UI (persistent — keeps WebSocket alive)
figma.showUI(__html__, { width: 360, height: 480, themeColors: true });

// ── Message handler ────────────────────────────────────────────────────

figma.ui.onmessage = async (msg: {
  id: string;
  command: string;
  payload: Record<string, unknown>;
}) => {
  const { id, command, payload } = msg;

  try {
    let data: unknown;

    switch (command) {
      case 'ping':
        data = 'pong';
        break;

      case 'read-node':
        data = await handleReadNode(payload as { nodeId: string });
        break;

      case 'read-tree':
        data = await handleReadTree(payload as { maxDepth?: number });
        break;

      case 'create-component':
        data = await handleCreateComponent(
          payload as { nodeId: string; name?: string; description?: string },
        );
        break;

      case 'update-node':
        data = await handleUpdateNode(
          payload as { nodeId: string; properties: Record<string, unknown> },
        );
        break;

      case 'read-variables':
        data = await handleReadVariables(payload as { collectionName?: string });
        break;

      case 'create-variable':
        data = await handleCreateVariable(
          payload as {
            name: string;
            resolvedType: VariableResolvedDataType;
            collectionId: string;
            value: unknown;
          },
        );
        break;

      case 'update-variable':
        data = await handleUpdateVariable(
          payload as { variableId: string; value: unknown; modeId?: string },
        );
        break;

      default:
        throw new Error(`Unknown command: ${command}`);
    }

    figma.ui.postMessage({ id, type: 'response', success: true, data });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    figma.ui.postMessage({ id, type: 'response', success: false, error: message });
  }
};

// ── Command handlers ───────────────────────────────────────────────────

async function handleReadNode(p: { nodeId: string }) {
  const node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error(`Node not found: ${p.nodeId}`);
  return serializeNode(node, 1);
}

async function handleReadTree(p: { maxDepth?: number }) {
  const page = figma.currentPage;
  return serializeNode(page, p.maxDepth ?? 4);
}

async function handleCreateComponent(p: {
  nodeId: string;
  name?: string;
  description?: string;
}) {
  const node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error(`Node not found: ${p.nodeId}`);

  if (node.type !== 'FRAME' && node.type !== 'GROUP' && node.type !== 'RECTANGLE') {
    throw new Error(
      `Cannot convert ${node.type} to component. Only FRAME, GROUP, or RECTANGLE nodes can be converted.`,
    );
  }

  // Create a component with the same size
  const component = figma.createComponent();
  component.resize(
    (node as FrameNode).width || 100,
    (node as FrameNode).height || 100,
  );
  component.x = (node as SceneNode).x;
  component.y = (node as SceneNode).y;
  component.name = p.name ?? node.name;

  if (p.description) {
    component.description = p.description;
  }

  // Move all children from the original node into the component
  if ('children' in node) {
    const children = [...(node as FrameNode).children];
    for (const child of children) {
      component.appendChild(child);
    }
  }

  // Copy visual properties from the original frame
  if (node.type === 'FRAME') {
    const frame = node as FrameNode;
    component.fills = frame.fills !== figma.mixed ? frame.fills : [];
    component.strokes = frame.strokes;
    component.strokeWeight =
      frame.strokeWeight !== figma.mixed ? frame.strokeWeight : 0;
    component.cornerRadius =
      frame.cornerRadius !== figma.mixed ? frame.cornerRadius : 0;
    component.clipsContent = frame.clipsContent;
    component.layoutMode = frame.layoutMode;
    if (frame.layoutMode !== 'NONE') {
      component.primaryAxisSizingMode = frame.primaryAxisSizingMode;
      component.counterAxisSizingMode = frame.counterAxisSizingMode;
      component.paddingTop = frame.paddingTop;
      component.paddingRight = frame.paddingRight;
      component.paddingBottom = frame.paddingBottom;
      component.paddingLeft = frame.paddingLeft;
      component.itemSpacing = frame.itemSpacing;
      component.primaryAxisAlignItems = frame.primaryAxisAlignItems;
      component.counterAxisAlignItems = frame.counterAxisAlignItems;
    }
  }

  // Insert component at the same position in the parent
  const parent = node.parent;
  if (parent && 'children' in parent) {
    const index = parent.children.indexOf(node as SceneNode);
    (parent as FrameNode).insertChild(index, component);
  }

  // Remove the original node
  node.remove();

  // Select the new component
  figma.currentPage.selection = [component];

  return {
    id: component.id,
    name: component.name,
    type: 'COMPONENT',
    description: component.description,
    width: component.width,
    height: component.height,
    childCount: component.children.length,
  };
}

async function handleUpdateNode(p: {
  nodeId: string;
  properties: Record<string, unknown>;
}) {
  const node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error(`Node not found: ${p.nodeId}`);

  const props = p.properties;
  const updated: string[] = [];

  if (props.characters !== undefined && node.type === 'TEXT') {
    await figma.loadFontAsync((node as TextNode).fontName as FontName);
    (node as TextNode).characters = props.characters as string;
    updated.push('characters');
  }

  if (props.width !== undefined && 'resize' in node) {
    (node as FrameNode).resize(
      props.width as number,
      (node as FrameNode).height,
    );
    updated.push('width');
  }

  if (props.height !== undefined && 'resize' in node) {
    (node as FrameNode).resize(
      (node as FrameNode).width,
      props.height as number,
    );
    updated.push('height');
  }

  if (props.opacity !== undefined && 'opacity' in node) {
    (node as SceneNode & { opacity: number }).opacity = props.opacity as number;
    updated.push('opacity');
  }

  return { nodeId: p.nodeId, updated };
}

async function handleReadVariables(_p: { collectionName?: string }) {
  const variables = await figma.variables.getLocalVariablesAsync();
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const collectionMap = new Map(collections.map((c) => [c.id, c]));
  const result = [];

  for (const v of variables) {
    const col = collectionMap.get(v.variableCollectionId);
    if (_p.collectionName && col?.name !== _p.collectionName) continue;

    result.push({
      id: v.id,
      name: v.name,
      resolvedType: v.resolvedType,
      valuesByMode: v.valuesByMode,
      collectionName: col?.name ?? 'unknown',
      collectionId: v.variableCollectionId,
    });
  }

  return result;
}

async function handleCreateVariable(p: {
  name: string;
  resolvedType: VariableResolvedDataType;
  collectionId: string;
  value: unknown;
}) {
  const variable = figma.variables.createVariable(
    p.name,
    p.collectionId,
    p.resolvedType,
  );

  // Set value for the default mode
  const collections = await figma.variables.getLocalVariableCollectionsAsync();
  const col = collections.find((c) => c.id === p.collectionId);
  if (col && col.modes.length > 0) {
    variable.setValueForMode(col.modes[0].modeId, p.value as VariableValue);
  }

  return {
    id: variable.id,
    name: variable.name,
    resolvedType: variable.resolvedType,
  };
}

async function handleUpdateVariable(p: {
  variableId: string;
  value: unknown;
  modeId?: string;
}) {
  const variable = await figma.variables.getVariableByIdAsync(p.variableId);
  if (!variable) throw new Error(`Variable not found: ${p.variableId}`);

  let modeId = p.modeId;
  if (!modeId) {
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const col = collections.find((c) => c.id === variable.variableCollectionId);
    modeId = col?.modes[0]?.modeId;
  }

  if (!modeId) throw new Error('Could not determine mode ID');

  variable.setValueForMode(modeId, p.value as VariableValue);

  return { variableId: p.variableId, updated: true };
}

// ── Serialization ──────────────────────────────────────────────────────

function serializeNode(node: BaseNode, maxDepth: number, depth = 0): Record<string, unknown> {
  const result: Record<string, unknown> = {
    id: node.id,
    name: node.name,
    type: node.type,
  };

  if ('visible' in node) result.visible = (node as SceneNode).visible;
  if ('width' in node) result.width = (node as SceneNode & { width: number }).width;
  if ('height' in node) result.height = (node as SceneNode & { height: number }).height;
  if ('x' in node) result.x = (node as SceneNode & { x: number }).x;
  if ('y' in node) result.y = (node as SceneNode & { y: number }).y;
  if ('characters' in node) result.characters = (node as TextNode).characters;
  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    result.fills = fills !== figma.mixed ? fills : [];
  }

  if ('children' in node && depth < maxDepth) {
    result.children = (node as ChildrenMixin).children.map((child) =>
      serializeNode(child, maxDepth, depth + 1),
    );
  }

  return result;
}
