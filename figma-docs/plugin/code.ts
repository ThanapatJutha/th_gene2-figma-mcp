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
        data = await handleReadNode(payload as { nodeId: string; depth?: number });
        break;

      case 'read-tree':
        data = await handleReadTree(payload as { nodeId?: string; maxDepth?: number });
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

      case 'create-instance':
        data = await handleCreateInstance(
          payload as {
            componentId: string;
            parentId: string;
            name?: string;
            properties?: Record<string, unknown>;
          },
        );
        break;

      case 'create-node':
        data = await handleCreateNode(
          payload as {
            type: 'FRAME' | 'TEXT';
            parentId: string;
            name?: string;
            properties?: Record<string, unknown>;
          },
        );
        break;

      case 'read-variables':
        data = await handleReadVariables(payload as { collectionName?: string });
        break;

      case 'create-collection':
        data = await handleCreateCollection(
          payload as { name: string },
        );
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

      case 'list-layers':
        data = await handleListLayers(payload as { maxDepth?: number });
        break;

      case 'list-components':
        data = await handleListComponents();
        break;

      case 'delete-node':
        data = await handleDeleteNode(payload as { nodeId: string });
        break;

      case 'reorder-children':
        data = await handleReorderChildren(
          payload as { parentId: string; childIds: string[] },
        );
        break;

      case 'create-page':
        data = await handleCreatePage(
          payload as { name: string },
        );
        break;

      case 'set-current-page':
        data = await handleSetCurrentPage(
          payload as { pageId: string },
        );
        break;

      case 'move-node':
        data = await handleMoveNode(
          payload as { nodeId: string; targetParentId: string },
        );
        break;

      case 'combine-as-variants':
        data = await handleCombineAsVariants(
          payload as { componentIds: string[]; name: string; parentId: string },
        );
        break;

      case 'swap-with-instance':
        data = await handleSwapWithInstance(
          payload as { nodeId: string; componentId: string },
        );
        break;

      case 'promote-and-combine':
        data = await handlePromoteAndCombine(
          payload as {
            nodes: Array<{ nodeId: string; variantName: string }>;
            setName: string;
            parentId: string;
          },
        );
        break;

      case 'swap-batch':
        data = await handleSwapBatch(
          payload as { swaps: Array<{ nodeId: string; componentId: string }> },
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

async function handleReadNode(p: { nodeId: string; depth?: number }) {
  const node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error(`Node not found: ${p.nodeId}`);
  return serializeNode(node, p.depth ?? 1);
}

async function handleReadTree(p: { nodeId?: string; maxDepth?: number }) {
  var root: BaseNode;
  if (p.nodeId) {
    var found = await figma.getNodeByIdAsync(p.nodeId);
    if (!found) throw new Error('Node not found: ' + p.nodeId);
    root = found;
  } else {
    root = figma.currentPage;
  }
  return serializeNode(root, p.maxDepth ?? 4);
}

// ── Auto-layout inference helpers ──────────────────────────────────────
// Used by handleCreateComponent to fix HTML-to-Design captured frames
// where CSS padding is stored as metadata but auto-layout is not enabled.

/** Infer HORIZONTAL vs VERTICAL from children positions. */
function inferLayoutDirection(
  children: readonly SceneNode[],
): 'HORIZONTAL' | 'VERTICAL' {
  if (children.length <= 1) return 'HORIZONTAL';
  const sorted = [...children];
  const xRange =
    Math.max(...sorted.map((c) => c.x)) - Math.min(...sorted.map((c) => c.x));
  const yRange =
    Math.max(...sorted.map((c) => c.y)) - Math.min(...sorted.map((c) => c.y));
  return xRange >= yRange ? 'HORIZONTAL' : 'VERTICAL';
}

/** Infer item spacing (gap) from average distance between adjacent children. */
function inferItemSpacing(
  children: readonly SceneNode[],
  direction: 'HORIZONTAL' | 'VERTICAL',
): number {
  if (children.length <= 1) return 0;
  const sorted = [...children].sort((a, b) =>
    direction === 'HORIZONTAL' ? a.x - b.x : a.y - b.y,
  );
  let totalGap = 0;
  let gapCount = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const gap =
      direction === 'HORIZONTAL'
        ? curr.x - (prev.x + prev.width)
        : curr.y - (prev.y + prev.height);
    if (gap > 0) {
      totalGap += gap;
      gapCount++;
    }
  }
  return gapCount > 0 ? Math.round(totalGap / gapCount) : 0;
}

async function handleCreateComponent(p: {
  nodeId: string;
  name?: string;
  description?: string;
}) {
  let autoLayoutApplied = false;
  const node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error(`Node not found: ${p.nodeId}`);

  if (node.type !== 'FRAME' && node.type !== 'GROUP' && node.type !== 'RECTANGLE') {
    throw new Error(
      `Cannot convert ${node.type} to component. Only FRAME, GROUP, or RECTANGLE nodes can be converted.`,
    );
  }

  // Save original dimensions before any conversion (node is removed later)
  const origWidth = (node as FrameNode).width || 100;
  const origHeight = (node as FrameNode).height || 100;

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

    // Save original dimensions before enabling auto-layout
    // (setting layoutMode triggers relayout which can shrink the frame)
    const savedWidth = frame.width;
    const savedHeight = frame.height;

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
      // Restore original dimensions after auto-layout props are set
      component.resize(savedWidth, savedHeight);
    } else {
      // ── Auto-layout fixup for HTML-to-Design captured frames ──
      // The capture stores CSS padding as metadata but leaves layoutMode='NONE',
      // so the frame width = content width (padding not visually applied).
      // Fix: enable auto-layout when significant padding exists (>4px total).
      const totalHPad = frame.paddingLeft + frame.paddingRight;
      const totalVPad = frame.paddingTop + frame.paddingBottom;

      if (totalHPad > 4 || totalVPad > 4) {
        autoLayoutApplied = true;
        const direction = inferLayoutDirection(component.children);
        component.layoutMode = direction;
        // Primary axis (flow direction) hugs content + padding
        component.primaryAxisSizingMode = 'AUTO';
        // Counter axis keeps original dimension (e.g., explicit h-10 = 40px)
        component.counterAxisSizingMode = 'FIXED';
        component.paddingTop = frame.paddingTop;
        component.paddingRight = frame.paddingRight;
        component.paddingBottom = frame.paddingBottom;
        component.paddingLeft = frame.paddingLeft;
        component.counterAxisAlignItems = 'CENTER';

        if (component.children.length > 1) {
          component.itemSpacing = inferItemSpacing(component.children, direction);
        }

        // Safety net: restore counter-axis dimension after relayout.
        // Setting layoutMode triggers an immediate Figma relayout that can
        // shrink the frame before padding/sizing props are fully applied.
        // The counter axis is FIXED, so we must explicitly resize it back.
        if (direction === 'HORIZONTAL') {
          // Counter axis = height; primary (width) is HUG so leave it alone
          component.resize(component.width, savedHeight);
        } else {
          // Counter axis = width; primary (height) is HUG so leave it alone
          component.resize(savedWidth, component.height);
        }
      }
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
    // Original frame dimensions before auto-layout conversion.
    // Compare with width/height above to detect dimension drift.
    originalWidth: origWidth,
    originalHeight: origHeight,
    childCount: component.children.length,
    layoutMode: component.layoutMode,
    autoLayoutApplied,
  };
}

// ── Combine components as variants (COMPONENT_SET) ─────────────────────

async function handleCombineAsVariants(p: {
  componentIds: string[];
  name: string;
  parentId: string;
}) {
  // Collect all components
  var components: ComponentNode[] = [];
  for (var i = 0; i < p.componentIds.length; i++) {
    var node = await figma.getNodeByIdAsync(p.componentIds[i]);
    if (!node) throw new Error('Component not found: ' + p.componentIds[i]);
    if (node.type !== 'COMPONENT') {
      throw new Error('Node ' + p.componentIds[i] + ' is ' + node.type + ', expected COMPONENT');
    }
    components.push(node as ComponentNode);
  }

  if (components.length < 2) {
    throw new Error('Need at least 2 components to combine as variants');
  }

  // Resolve parent first
  var parent = await figma.getNodeByIdAsync(p.parentId);
  if (!parent || !('appendChild' in parent)) {
    throw new Error('Parent not found or cannot have children: ' + p.parentId);
  }

  // Use Figma API to combine — place directly into parent
  var componentSet = figma.combineAsVariants(components, parent as FrameNode & BaseNode);

  // Set the name
  componentSet.name = p.name;

  // Let Figma position the COMPONENT_SET based on the original components' locations.
  // Do NOT override x/y — forcing (0,0) misplaces the set.

  return {
    id: componentSet.id,
    name: componentSet.name,
    type: 'COMPONENT_SET',
    width: componentSet.width,
    height: componentSet.height,
    x: componentSet.x,
    y: componentSet.y,
    childCount: componentSet.children.length,
    children: componentSet.children.map(c => ({
      id: c.id,
      name: c.name,
      type: c.type,
      width: c.width,
      height: c.height,
    })),
  };
}

async function handleUpdateNode(p: {
  nodeId: string;
  properties: Record<string, unknown>;
}) {
  const node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error(`Node not found: ${p.nodeId}`);

  const updated = await applyNodeProperties(node, p.properties);

  return { nodeId: p.nodeId, updated };
}

/**
 * Shared helper: apply a bag of properties to any SceneNode.
 * Used by handleUpdateNode, handleCreateNode, and handleCreateInstance.
 */
async function applyNodeProperties(
  node: BaseNode,
  props: Record<string, unknown>,
): Promise<string[]> {
  const updated: string[] = [];

  // name
  if (props.name !== undefined) {
    node.name = props.name as string;
    updated.push('name');
  }

  // characters (TEXT only)
  if (props.characters !== undefined && node.type === 'TEXT') {
    await figma.loadFontAsync((node as TextNode).fontName as FontName);
    (node as TextNode).characters = props.characters as string;
    updated.push('characters');
  }

  // dimensions
  if (props.width !== undefined && props.height !== undefined && 'resize' in node) {
    (node as FrameNode).resize(props.width as number, props.height as number);
    updated.push('width', 'height');
  } else if (props.width !== undefined && 'resize' in node) {
    (node as FrameNode).resize(props.width as number, (node as FrameNode).height);
    updated.push('width');
  } else if (props.height !== undefined && 'resize' in node) {
    (node as FrameNode).resize((node as FrameNode).width, props.height as number);
    updated.push('height');
  }

  // opacity
  if (props.opacity !== undefined && 'opacity' in node) {
    (node as SceneNode & { opacity: number }).opacity = props.opacity as number;
    updated.push('opacity');
  }

  // fills
  if (props.fills !== undefined && 'fills' in node) {
    (node as GeometryMixin).fills = props.fills as Paint[];
    updated.push('fills');
  }

  // fontSize (TEXT)
  if (props.fontSize !== undefined && node.type === 'TEXT') {
    var textNode = node as TextNode;
    await figma.loadFontAsync(textNode.fontName as FontName);
    textNode.fontSize = props.fontSize as number;
    updated.push('fontSize');
  }

  // fontName (TEXT)
  if (props.fontName !== undefined && node.type === 'TEXT') {
    var fontData = props.fontName as { family: string; style: string };
    var newFont: FontName = { family: fontData.family, style: fontData.style };
    await figma.loadFontAsync(newFont);
    (node as TextNode).fontName = newFont;
    updated.push('fontName');
  }

  // cornerRadius
  if (props.cornerRadius !== undefined && 'cornerRadius' in node) {
    (node as FrameNode).cornerRadius = props.cornerRadius as number;
    updated.push('cornerRadius');
  }

  // layoutMode
  if (props.layoutMode !== undefined && 'layoutMode' in node) {
    (node as FrameNode).layoutMode = props.layoutMode as 'NONE' | 'HORIZONTAL' | 'VERTICAL';
    updated.push('layoutMode');
  }

  // primaryAxisSizingMode
  if (props.primaryAxisSizingMode !== undefined && 'primaryAxisSizingMode' in node) {
    (node as FrameNode).primaryAxisSizingMode = props.primaryAxisSizingMode as 'FIXED' | 'AUTO';
    updated.push('primaryAxisSizingMode');
  }

  // counterAxisSizingMode
  if (props.counterAxisSizingMode !== undefined && 'counterAxisSizingMode' in node) {
    (node as FrameNode).counterAxisSizingMode = props.counterAxisSizingMode as 'FIXED' | 'AUTO';
    updated.push('counterAxisSizingMode');
  }

  // itemSpacing
  if (props.itemSpacing !== undefined && 'itemSpacing' in node) {
    (node as FrameNode).itemSpacing = props.itemSpacing as number;
    updated.push('itemSpacing');
  }

  // primaryAxisAlignItems
  if (props.primaryAxisAlignItems !== undefined && 'primaryAxisAlignItems' in node) {
    (node as FrameNode).primaryAxisAlignItems = props.primaryAxisAlignItems as 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN';
    updated.push('primaryAxisAlignItems');
  }

  // counterAxisAlignItems
  if (props.counterAxisAlignItems !== undefined && 'counterAxisAlignItems' in node) {
    (node as FrameNode).counterAxisAlignItems = props.counterAxisAlignItems as 'MIN' | 'CENTER' | 'MAX';
    updated.push('counterAxisAlignItems');
  }

  // padding
  if (props.paddingLeft !== undefined && 'paddingLeft' in node) {
    (node as FrameNode).paddingLeft = props.paddingLeft as number;
    updated.push('paddingLeft');
  }
  if (props.paddingRight !== undefined && 'paddingRight' in node) {
    (node as FrameNode).paddingRight = props.paddingRight as number;
    updated.push('paddingRight');
  }
  if (props.paddingTop !== undefined && 'paddingTop' in node) {
    (node as FrameNode).paddingTop = props.paddingTop as number;
    updated.push('paddingTop');
  }
  if (props.paddingBottom !== undefined && 'paddingBottom' in node) {
    (node as FrameNode).paddingBottom = props.paddingBottom as number;
    updated.push('paddingBottom');
  }

  // strokeWeight
  if (props.strokeWeight !== undefined && 'strokeWeight' in node) {
    (node as GeometryMixin).strokeWeight = props.strokeWeight as number;
    updated.push('strokeWeight');
  }

  // strokes
  if (props.strokes !== undefined && 'strokes' in node) {
    (node as GeometryMixin).strokes = props.strokes as Paint[];
    updated.push('strokes');
  }

  // x position
  if (props.x !== undefined && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
    (node as SceneNode).x = props.x as number;
    updated.push('x');
  }

  // y position
  if (props.y !== undefined && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
    (node as SceneNode).y = props.y as number;
    updated.push('y');
  }

  // clipsContent
  if (props.clipsContent !== undefined && 'clipsContent' in node) {
    (node as FrameNode).clipsContent = props.clipsContent as boolean;
    updated.push('clipsContent');
  }

  // visible
  if (props.visible !== undefined && 'visible' in node) {
    (node as SceneNode).visible = props.visible as boolean;
    updated.push('visible');
  }

  // layoutAlign (child alignment in auto-layout parent)
  if (props.layoutAlign !== undefined && 'layoutAlign' in node) {
    (node as FrameNode).layoutAlign = props.layoutAlign as 'MIN' | 'CENTER' | 'MAX' | 'STRETCH' | 'INHERIT';
    updated.push('layoutAlign');
  }

  // layoutGrow (flex grow)
  if (props.layoutGrow !== undefined && 'layoutGrow' in node) {
    (node as FrameNode).layoutGrow = props.layoutGrow as number;
    updated.push('layoutGrow');
  }

  return updated;
}

// ── Create instance ────────────────────────────────────────────────────

async function handleCreateInstance(p: {
  componentId: string;
  parentId: string;
  name?: string;
  properties?: Record<string, unknown>;
}) {
  var masterNode = await figma.getNodeByIdAsync(p.componentId);
  if (!masterNode) throw new Error('Master component not found: ' + p.componentId);
  if (masterNode.type !== 'COMPONENT') {
    throw new Error('Node ' + p.componentId + ' is ' + masterNode.type + ', expected COMPONENT');
  }

  var parent = await figma.getNodeByIdAsync(p.parentId);
  if (!parent) throw new Error('Parent node not found: ' + p.parentId);
  if (!('appendChild' in parent)) {
    throw new Error('Parent node ' + p.parentId + ' (' + parent.type + ') cannot have children');
  }

  var component = masterNode as ComponentNode;
  var instance = component.createInstance();

  // Insert into parent
  (parent as FrameNode).appendChild(instance);

  // Apply name override
  if (p.name) {
    instance.name = p.name;
  }

  // Apply initial properties via shared helper
  if (p.properties) {
    // Special handling for characters: find first TEXT child and set it
    if (p.properties.characters !== undefined) {
      var textChild = findFirstTextNode(instance);
      if (textChild) {
        await figma.loadFontAsync(textChild.fontName as FontName);
        textChild.characters = p.properties.characters as string;
      }
    }

    await applyNodeProperties(instance, p.properties);
  }

  return serializeNode(instance, 1);
}

function findFirstTextNode(node: BaseNode): TextNode | null {
  if (node.type === 'TEXT') return node as TextNode;
  if ('children' in node) {
    var children = (node as ChildrenMixin).children;
    for (var i = 0; i < children.length; i++) {
      var found = findFirstTextNode(children[i]);
      if (found) return found;
    }
  }
  return null;
}

// ── Create basic node ──────────────────────────────────────────────────

async function handleCreateNode(p: {
  type: 'FRAME' | 'TEXT';
  parentId: string;
  name?: string;
  properties?: Record<string, unknown>;
}) {
  var parent = await figma.getNodeByIdAsync(p.parentId);
  if (!parent) throw new Error('Parent node not found: ' + p.parentId);
  if (!('appendChild' in parent)) {
    throw new Error('Parent node ' + p.parentId + ' (' + parent.type + ') cannot have children');
  }

  var newNode: SceneNode;

  if (p.type === 'TEXT') {
    var textNode = figma.createText();
    var fontToLoad: FontName = { family: 'Inter', style: 'Regular' };

    if (p.properties && p.properties.fontName) {
      var fontData = p.properties.fontName as { family: string; style: string };
      fontToLoad = { family: fontData.family, style: fontData.style };
    }
    await figma.loadFontAsync(fontToLoad);
    textNode.fontName = fontToLoad;

    newNode = textNode;
  } else {
    // FRAME
    newNode = figma.createFrame();
  }

  if (p.name) {
    newNode.name = p.name;
  }

  (parent as FrameNode).appendChild(newNode);

  // Apply all properties via the shared helper
  if (p.properties) {
    await applyNodeProperties(newNode, p.properties);
  }

  return serializeNode(newNode, 1);
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

async function handleCreateCollection(p: { name: string }) {
  const collection = figma.variables.createVariableCollection(p.name);
  return {
    id: collection.id,
    name: collection.name,
    modes: collection.modes.map((m) => ({ modeId: m.modeId, name: m.name })),
  };
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

// ── Layer & Component discovery ─────────────────────────────────────────

async function handleListLayers(_p: { maxDepth?: number }) {
  var maxDepth = (_p.maxDepth !== undefined && _p.maxDepth !== null) ? _p.maxDepth : 100;
  var page = figma.currentPage;
  var result: Array<Record<string, unknown>> = [];

  function walk(node: BaseNode, depth: number) {
    var childCount = 0;
    if ('children' in node) {
      childCount = (node as ChildrenMixin).children.length;
    }

    result.push({
      id: node.id,
      name: node.name,
      type: node.type,
      depth: depth,
      isComponent: node.type === 'COMPONENT' || node.type === 'COMPONENT_SET',
      childCount: childCount,
      width: 'width' in node ? (node as any).width : 0,
      height: 'height' in node ? (node as any).height : 0,
      visible: 'visible' in node ? (node as SceneNode).visible : true,
      canConvert: node.type === 'FRAME' || node.type === 'GROUP' || node.type === 'RECTANGLE',
    });

    if ('children' in node && depth < maxDepth) {
      var children = (node as ChildrenMixin).children;
      for (var i = 0; i < children.length; i++) {
        walk(children[i], depth + 1);
      }
    }
  }

  // Walk all children of the page (skip the page node itself)
  var pageChildren = page.children;
  for (var i = 0; i < pageChildren.length; i++) {
    walk(pageChildren[i], 0);
  }

  return {
    pageName: page.name,
    pageId: page.id,
    totalLayers: result.length,
    layers: result,
  };
}

async function handleListComponents() {
  var page = figma.currentPage;
  var components: Array<Record<string, unknown>> = [];
  var allInstances: Array<Record<string, unknown>> = [];

  function walk(node: BaseNode) {
    if (node.type === 'COMPONENT' || node.type === 'COMPONENT_SET') {
      var comp = node as SceneNode;
      var childCount = 0;
      if ('children' in comp) {
        childCount = (comp as ChildrenMixin).children.length;
      }
      components.push({
        id: comp.id,
        name: comp.name,
        type: node.type,
        description: ('description' in comp) ? (comp as ComponentNode).description : '',
        width: (comp as any).width,
        height: (comp as any).height,
        childCount: childCount,
        x: comp.x,
        y: comp.y,
      });
    }
    if (node.type === 'INSTANCE') {
      var inst = node as InstanceNode;
      var mainId = '';
      if (inst.mainComponent) {
        mainId = inst.mainComponent.id;
      }
      allInstances.push({
        id: inst.id,
        name: inst.name,
        width: inst.width,
        height: inst.height,
        x: inst.x,
        y: inst.y,
        visible: inst.visible,
        mainComponentId: mainId,
      });
    }
    if ('children' in node) {
      var children = (node as ChildrenMixin).children;
      for (var i = 0; i < children.length; i++) {
        walk(children[i]);
      }
    }
  }

  var pageChildren = page.children;
  for (var i = 0; i < pageChildren.length; i++) {
    walk(pageChildren[i]);
  }

  // Group instances by their main component ID
  var instanceMap: Record<string, Array<Record<string, unknown>>> = {};
  for (var j = 0; j < allInstances.length; j++) {
    var mainId = allInstances[j].mainComponentId as string;
    if (mainId) {
      if (!instanceMap[mainId]) {
        instanceMap[mainId] = [];
      }
      instanceMap[mainId].push(allInstances[j]);
    }
  }

  // Attach instances to their components
  var mappedMainIds: Record<string, boolean> = {};
  for (var k = 0; k < components.length; k++) {
    var compId = components[k].id as string;
    components[k].instances = instanceMap[compId] || [];
    mappedMainIds[compId] = true;
  }

  // Collect library (unmapped) instances — those whose mainComponentId
  // doesn't match any local component on this page
  var libraryInstances: Array<Record<string, unknown>> = [];
  for (var m = 0; m < allInstances.length; m++) {
    var mId = allInstances[m].mainComponentId as string;
    if (mId && !mappedMainIds[mId]) {
      libraryInstances.push(allInstances[m]);
    }
  }

  return {
    pageName: page.name,
    pageId: page.id,
    totalComponents: components.length,
    components: components,
    libraryInstances: libraryInstances,
  };
}

// ── Delete node ────────────────────────────────────────────────────────

async function handleDeleteNode(p: { nodeId: string }) {
  var node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error('Node not found: ' + p.nodeId);

  // Prevent deleting the page itself
  if (node.type === 'PAGE') {
    throw new Error('Cannot delete a PAGE node');
  }

  var info = {
    id: node.id,
    name: node.name,
    type: node.type,
    parentId: node.parent ? node.parent.id : null,
  };

  node.remove();

  return { deleted: true, node: info };
}

// ── Reorder children ───────────────────────────────────────────────────

async function handleReorderChildren(p: {
  parentId: string;
  childIds: string[];
}) {
  var parent = await figma.getNodeByIdAsync(p.parentId);
  if (!parent) throw new Error('Parent node not found: ' + p.parentId);
  if (!('children' in parent)) {
    throw new Error('Node ' + p.parentId + ' (' + parent.type + ') has no children');
  }

  var container = parent as FrameNode;
  var existingIds = new Set(container.children.map(function(c) { return c.id; }));

  // Validate all childIds exist as children of parent
  for (var i = 0; i < p.childIds.length; i++) {
    if (!existingIds.has(p.childIds[i])) {
      throw new Error(
        'Node ' + p.childIds[i] + ' is not a child of ' + p.parentId
      );
    }
  }

  // Reorder by re-inserting children in the desired order.
  // insertChild(index, child) moves an existing child to the given index.
  for (var j = 0; j < p.childIds.length; j++) {
    var child = await figma.getNodeByIdAsync(p.childIds[j]);
    if (child && 'parent' in child) {
      container.insertChild(j, child as SceneNode);
    }
  }

  // Return the new order
  var newOrder = container.children.map(function(c) {
    return { id: c.id, name: c.name, type: c.type };
  });

  return {
    parentId: p.parentId,
    childCount: container.children.length,
    children: newOrder,
  };
}
// ── Page management ────────────────────────────────────────────────────────

async function handleCreatePage(p: { name: string }) {
  var page = figma.createPage();
  page.name = p.name;
  return { pageId: page.id, name: page.name };
}

async function handleSetCurrentPage(p: { pageId: string }) {
  var node = await figma.getNodeByIdAsync(p.pageId);
  if (!node) throw new Error('Page not found: ' + p.pageId);
  if (node.type !== 'PAGE') throw new Error('Node ' + p.pageId + ' is ' + node.type + ', expected PAGE');
  await figma.setCurrentPageAsync(node as PageNode);
  return { pageId: node.id, name: node.name };
}

// ── Swap node with component instance ──────────────────────────────────

async function handleSwapWithInstance(p: {
  nodeId: string;
  componentId: string;
}) {
  var node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error('Node not found: ' + p.nodeId);
  if (!('parent' in node) || !node.parent) throw new Error('Node has no parent: ' + p.nodeId);

  var sceneNode = node as SceneNode;
  var parentNode = node.parent;

  if (!('children' in parentNode)) {
    throw new Error('Parent cannot have children');
  }

  // Find the index of the original node in parent's children
  var parentChildren = (parentNode as ChildrenMixin).children;
  var originalIndex = -1;
  for (var si = 0; si < parentChildren.length; si++) {
    if (parentChildren[si].id === p.nodeId) {
      originalIndex = si;
      break;
    }
  }

  // Record original position and size
  var origX = sceneNode.x;
  var origY = sceneNode.y;
  var origW = sceneNode.width;
  var origH = sceneNode.height;

  // Get the master component
  var masterNode = await figma.getNodeByIdAsync(p.componentId);
  if (!masterNode) throw new Error('Component not found: ' + p.componentId);
  if (masterNode.type !== 'COMPONENT') {
    throw new Error('Node ' + p.componentId + ' is ' + masterNode.type + ', expected COMPONENT');
  }

  // Create instance
  var component = masterNode as ComponentNode;
  var instance = component.createInstance();

  // Insert into parent
  (parentNode as FrameNode).appendChild(instance);

  // Position at same location as original, centered
  instance.x = origX + (origW - instance.width) / 2;
  instance.y = origY + (origH - instance.height) / 2;

  // Move to same index position if possible
  if (originalIndex >= 0 && 'insertChild' in parentNode) {
    (parentNode as FrameNode).insertChild(originalIndex, instance);
  }

  // Remove the original node
  sceneNode.remove();

  return {
    instanceId: instance.id,
    instanceName: instance.name,
    componentId: p.componentId,
    componentName: component.name,
    replacedNodeId: p.nodeId,
    x: instance.x,
    y: instance.y,
    width: instance.width,
    height: instance.height,
    parentId: parentNode.id,
  };
}

async function handleMoveNode(p: { nodeId: string; targetParentId: string }) {
  var node = await figma.getNodeByIdAsync(p.nodeId);
  if (!node) throw new Error('Node not found: ' + p.nodeId);

  var target = await figma.getNodeByIdAsync(p.targetParentId);
  if (!target) throw new Error('Target parent not found: ' + p.targetParentId);
  if (!('appendChild' in target)) {
    throw new Error('Target ' + p.targetParentId + ' (' + target.type + ') cannot have children');
  }

  (target as ChildrenMixin).appendChild(node as SceneNode);

  return {
    nodeId: node.id,
    name: node.name,
    newParentId: target.id,
    newParentName: target.name,
  };
}

// ── Promote and combine (batch) ────────────────────────────────────────

async function handlePromoteAndCombine(p: {
  nodes: Array<{ nodeId: string; variantName: string }>;
  setName: string;
  parentId: string;
}) {
  if (p.nodes.length < 2) {
    throw new Error('Need at least 2 nodes to promote and combine');
  }

  // Resolve parent
  var parent = await figma.getNodeByIdAsync(p.parentId);
  if (!parent || !('appendChild' in parent)) {
    throw new Error('Parent not found or cannot have children: ' + p.parentId);
  }

  // Promote each node to a COMPONENT
  var components: ComponentNode[] = [];
  for (var i = 0; i < p.nodes.length; i++) {
    var entry = p.nodes[i];
    var node = await figma.getNodeByIdAsync(entry.nodeId);
    if (!node) throw new Error('Node not found: ' + entry.nodeId);

    if (node.type !== 'FRAME' && node.type !== 'GROUP' && node.type !== 'RECTANGLE') {
      throw new Error(
        'Cannot convert ' + node.type + ' (' + entry.nodeId + ') to component. Only FRAME, GROUP, or RECTANGLE.',
      );
    }

    // Create component from the frame (inline promote logic)
    var component = figma.createComponent();
    var frameNode = node as FrameNode;
    component.resize(frameNode.width || 100, frameNode.height || 100);
    component.x = (node as SceneNode).x;
    component.y = (node as SceneNode).y;
    component.name = entry.variantName;

    // Move children
    if ('children' in node) {
      var children = [...(node as FrameNode).children];
      for (var ci = 0; ci < children.length; ci++) {
        component.appendChild(children[ci]);
      }
    }

    // Copy visual properties from FRAME
    if (node.type === 'FRAME') {
      var frame = node as FrameNode;
      component.fills = frame.fills !== figma.mixed ? frame.fills : [];
      component.strokes = frame.strokes;
      component.strokeWeight = frame.strokeWeight !== figma.mixed ? frame.strokeWeight : 0;
      component.cornerRadius = frame.cornerRadius !== figma.mixed ? frame.cornerRadius : 0;
      component.clipsContent = frame.clipsContent;

      var savedW = frame.width;
      var savedH = frame.height;
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
        component.resize(savedW, savedH);
      } else {
        // Auto-layout fixup for captured frames with CSS padding
        var totalHP = frame.paddingLeft + frame.paddingRight;
        var totalVP = frame.paddingTop + frame.paddingBottom;
        if (totalHP > 4 || totalVP > 4) {
          var dir = inferLayoutDirection(component.children);
          component.layoutMode = dir;
          component.primaryAxisSizingMode = 'AUTO';
          component.counterAxisSizingMode = 'FIXED';
          component.paddingTop = frame.paddingTop;
          component.paddingRight = frame.paddingRight;
          component.paddingBottom = frame.paddingBottom;
          component.paddingLeft = frame.paddingLeft;
          component.counterAxisAlignItems = 'CENTER';
          if (component.children.length > 1) {
            component.itemSpacing = inferItemSpacing(component.children, dir);
          }
          if (dir === 'HORIZONTAL') {
            component.resize(component.width, savedH);
          } else {
            component.resize(savedW, component.height);
          }
        }
      }
    }

    // Insert at same position in parent, then remove original
    var origParent = node.parent;
    if (origParent && 'children' in origParent) {
      var idx = origParent.children.indexOf(node as SceneNode);
      (origParent as FrameNode).insertChild(idx, component);
    }
    node.remove();

    components.push(component);
  }

  // Combine into COMPONENT_SET
  var componentSet = figma.combineAsVariants(components, parent as FrameNode & BaseNode);
  componentSet.name = p.setName;
  // Let Figma position the COMPONENT_SET based on the original components' locations.
  // Do NOT override x/y — forcing (0,0) misplaces the set.

  return {
    componentSetId: componentSet.id,
    componentSetName: componentSet.name,
    width: componentSet.width,
    height: componentSet.height,
    components: componentSet.children.map(function(c) {
      return { id: c.id, name: c.name, type: c.type, width: c.width, height: c.height };
    }),
  };
}

// ── Swap batch ─────────────────────────────────────────────────────────

async function handleSwapBatch(p: {
  swaps: Array<{ nodeId: string; componentId: string }>;
}) {
  var results: Array<Record<string, unknown>> = [];

  for (var i = 0; i < p.swaps.length; i++) {
    var swap = p.swaps[i];
    var result = await handleSwapWithInstance({
      nodeId: swap.nodeId,
      componentId: swap.componentId,
    });
    results.push(result);
  }

  return { total: results.length, results: results };
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

  // Text properties
  if ('characters' in node) result.characters = (node as TextNode).characters;
  if (node.type === 'TEXT') {
    var textNode = node as TextNode;
    var fs = textNode.fontSize;
    if (fs !== figma.mixed) result.fontSize = fs;
    var fn = textNode.fontName;
    if (fn !== figma.mixed) result.fontName = { family: fn.family, style: fn.style };
  }

  // Fills
  if ('fills' in node) {
    const fills = (node as GeometryMixin).fills;
    result.fills = fills !== figma.mixed ? fills : [];
  }

  // Corner radius
  if ('cornerRadius' in node) {
    var cr = (node as FrameNode).cornerRadius;
    if (cr !== figma.mixed) result.cornerRadius = cr;
  }

  // Layout mode
  if ('layoutMode' in node) {
    result.layoutMode = (node as FrameNode).layoutMode;
  }

  // Padding (auto-layout frames)
  if ('paddingLeft' in node) {
    var frame = node as FrameNode;
    result.paddingLeft = frame.paddingLeft;
    result.paddingRight = frame.paddingRight;
    result.paddingTop = frame.paddingTop;
    result.paddingBottom = frame.paddingBottom;
  }

  // Strokes
  if ('strokes' in node) {
    result.strokes = (node as GeometryMixin).strokes;
    var sw = (node as GeometryMixin).strokeWeight;
    if (sw !== figma.mixed) result.strokeWeight = sw;
  }

  // Instance mainComponent
  if (node.type === 'INSTANCE') {
    var inst = node as InstanceNode;
    if (inst.mainComponent) {
      result.mainComponentId = inst.mainComponent.id;
      result.mainComponentName = inst.mainComponent.name;
    }
  }

  if ('children' in node && depth < maxDepth) {
    result.children = (node as ChildrenMixin).children.map((child) =>
      serializeNode(child, maxDepth, depth + 1),
    );
  }

  return result;
}
