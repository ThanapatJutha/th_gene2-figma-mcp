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

  // fills
  if (props.fills !== undefined && 'fills' in node) {
    (node as GeometryMixin).fills = props.fills as Paint[];
    updated.push('fills');
  }

  // fontSize (TEXT nodes)
  if (props.fontSize !== undefined && node.type === 'TEXT') {
    var textNode = node as TextNode;
    await figma.loadFontAsync(textNode.fontName as FontName);
    textNode.fontSize = props.fontSize as number;
    updated.push('fontSize');
  }

  // fontName (TEXT nodes)
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

  // padding (auto-layout frames)
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
  if (props.x !== undefined && 'x' in node) {
    (node as SceneNode).x = props.x as number;
    updated.push('x');
  }

  // y position
  if (props.y !== undefined && 'y' in node) {
    (node as SceneNode).y = props.y as number;
    updated.push('y');
  }

  return { nodeId: p.nodeId, updated };
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

  // Apply initial properties
  if (p.properties) {
    var props = p.properties;

    if (props.characters !== undefined) {
      // Find the first TEXT child and set its characters
      var textChild = findFirstTextNode(instance);
      if (textChild) {
        await figma.loadFontAsync(textChild.fontName as FontName);
        textChild.characters = props.characters as string;
      }
    }

    if (props.width !== undefined && props.height !== undefined) {
      instance.resize(props.width as number, props.height as number);
    } else if (props.width !== undefined) {
      instance.resize(props.width as number, instance.height);
    } else if (props.height !== undefined) {
      instance.resize(instance.width, props.height as number);
    }
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

    if (p.properties) {
      if (p.properties.characters !== undefined) {
        textNode.characters = p.properties.characters as string;
      }
      if (p.properties.fontSize !== undefined) {
        textNode.fontSize = p.properties.fontSize as number;
      }
    }

    newNode = textNode;
  } else {
    // FRAME
    var frame = figma.createFrame();
    if (p.properties) {
      if (p.properties.width !== undefined && p.properties.height !== undefined) {
        frame.resize(p.properties.width as number, p.properties.height as number);
      }
      if (p.properties.fills !== undefined) {
        frame.fills = p.properties.fills as Paint[];
      }
    }
    newNode = frame;
  }

  if (p.name) {
    newNode.name = p.name;
  }

  (parent as FrameNode).appendChild(newNode);

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
  for (var k = 0; k < components.length; k++) {
    var compId = components[k].id as string;
    components[k].instances = instanceMap[compId] || [];
  }

  return {
    pageName: page.name,
    pageId: page.id,
    totalComponents: components.length,
    components: components,
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

  if ('children' in node && depth < maxDepth) {
    result.children = (node as ChildrenMixin).children.map((child) =>
      serializeNode(child, maxDepth, depth + 1),
    );
  }

  return result;
}
