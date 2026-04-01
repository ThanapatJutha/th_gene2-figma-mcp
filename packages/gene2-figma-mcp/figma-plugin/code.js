"use strict";
(() => {
  // code.ts
  figma.showUI(__html__, { width: 360, height: 480, themeColors: true });
  figma.ui.onmessage = async (msg) => {
    const { id, command, payload } = msg;
    try {
      let data;
      switch (command) {
        case "ping":
          data = "pong";
          break;
        case "read-node":
          data = await handleReadNode(payload);
          break;
        case "read-tree":
          data = await handleReadTree(payload);
          break;
        case "create-component":
          data = await handleCreateComponent(
            payload
          );
          break;
        case "update-node":
          data = await handleUpdateNode(
            payload
          );
          break;
        case "create-instance":
          data = await handleCreateInstance(
            payload
          );
          break;
        case "create-node":
          data = await handleCreateNode(
            payload
          );
          break;
        case "read-variables":
          data = await handleReadVariables(payload);
          break;
        case "create-collection":
          data = await handleCreateCollection(
            payload
          );
          break;
        case "create-variable":
          data = await handleCreateVariable(
            payload
          );
          break;
        case "update-variable":
          data = await handleUpdateVariable(
            payload
          );
          break;
        case "list-layers":
          data = await handleListLayers(payload);
          break;
        case "list-components":
          data = await handleListComponents();
          break;
        case "delete-node":
          data = await handleDeleteNode(payload);
          break;
        case "reorder-children":
          data = await handleReorderChildren(
            payload
          );
          break;
        case "create-page":
          data = await handleCreatePage(
            payload
          );
          break;
        case "set-current-page":
          data = await handleSetCurrentPage(
            payload
          );
          break;
        case "move-node":
          data = await handleMoveNode(
            payload
          );
          break;
        case "combine-as-variants":
          data = await handleCombineAsVariants(
            payload
          );
          break;
        case "swap-with-instance":
          data = await handleSwapWithInstance(
            payload
          );
          break;
        case "promote-and-combine":
          data = await handlePromoteAndCombine(
            payload
          );
          break;
        case "swap-batch":
          data = await handleSwapBatch(
            payload
          );
          break;
        default:
          throw new Error(`Unknown command: ${command}`);
      }
      figma.ui.postMessage({ id, type: "response", success: true, data });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      figma.ui.postMessage({ id, type: "response", success: false, error: message });
    }
  };
  async function handleReadNode(p) {
    var _a;
    const node = await figma.getNodeByIdAsync(p.nodeId);
    if (!node) throw new Error(`Node not found: ${p.nodeId}`);
    return serializeNode(node, (_a = p.depth) != null ? _a : 1);
  }
  async function handleReadTree(p) {
    var _a;
    var root;
    if (p.nodeId) {
      var found = await figma.getNodeByIdAsync(p.nodeId);
      if (!found) throw new Error("Node not found: " + p.nodeId);
      root = found;
    } else {
      root = figma.currentPage;
    }
    return serializeNode(root, (_a = p.maxDepth) != null ? _a : 4);
  }
  function inferLayoutDirection(children) {
    if (children.length <= 1) return "HORIZONTAL";
    const sorted = [...children];
    const xRange = Math.max(...sorted.map((c) => c.x)) - Math.min(...sorted.map((c) => c.x));
    const yRange = Math.max(...sorted.map((c) => c.y)) - Math.min(...sorted.map((c) => c.y));
    return xRange >= yRange ? "HORIZONTAL" : "VERTICAL";
  }
  function inferItemSpacing(children, direction) {
    if (children.length <= 1) return 0;
    const sorted = [...children].sort(
      (a, b) => direction === "HORIZONTAL" ? a.x - b.x : a.y - b.y
    );
    let totalGap = 0;
    let gapCount = 0;
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const gap = direction === "HORIZONTAL" ? curr.x - (prev.x + prev.width) : curr.y - (prev.y + prev.height);
      if (gap > 0) {
        totalGap += gap;
        gapCount++;
      }
    }
    return gapCount > 0 ? Math.round(totalGap / gapCount) : 0;
  }
  async function handleCreateComponent(p) {
    var _a;
    let autoLayoutApplied = false;
    const node = await figma.getNodeByIdAsync(p.nodeId);
    if (!node) throw new Error(`Node not found: ${p.nodeId}`);
    if (node.type !== "FRAME" && node.type !== "GROUP" && node.type !== "RECTANGLE") {
      throw new Error(
        `Cannot convert ${node.type} to component. Only FRAME, GROUP, or RECTANGLE nodes can be converted.`
      );
    }
    const origWidth = node.width || 100;
    const origHeight = node.height || 100;
    const component = figma.createComponent();
    component.resize(
      node.width || 100,
      node.height || 100
    );
    component.x = node.x;
    component.y = node.y;
    component.name = (_a = p.name) != null ? _a : node.name;
    if (p.description) {
      component.description = p.description;
    }
    if ("children" in node) {
      const children = [...node.children];
      for (const child of children) {
        component.appendChild(child);
      }
    }
    if (node.type === "FRAME") {
      const frame = node;
      component.fills = frame.fills !== figma.mixed ? frame.fills : [];
      component.strokes = frame.strokes;
      component.strokeWeight = frame.strokeWeight !== figma.mixed ? frame.strokeWeight : 0;
      component.cornerRadius = frame.cornerRadius !== figma.mixed ? frame.cornerRadius : 0;
      component.clipsContent = frame.clipsContent;
      const savedWidth = frame.width;
      const savedHeight = frame.height;
      component.layoutMode = frame.layoutMode;
      if (frame.layoutMode !== "NONE") {
        component.primaryAxisSizingMode = frame.primaryAxisSizingMode;
        component.counterAxisSizingMode = frame.counterAxisSizingMode;
        component.paddingTop = frame.paddingTop;
        component.paddingRight = frame.paddingRight;
        component.paddingBottom = frame.paddingBottom;
        component.paddingLeft = frame.paddingLeft;
        component.itemSpacing = frame.itemSpacing;
        component.primaryAxisAlignItems = frame.primaryAxisAlignItems;
        component.counterAxisAlignItems = frame.counterAxisAlignItems;
        component.resize(savedWidth, savedHeight);
      } else {
        const totalHPad = frame.paddingLeft + frame.paddingRight;
        const totalVPad = frame.paddingTop + frame.paddingBottom;
        if (totalHPad > 4 || totalVPad > 4) {
          autoLayoutApplied = true;
          const direction = inferLayoutDirection(component.children);
          component.layoutMode = direction;
          component.primaryAxisSizingMode = "AUTO";
          component.counterAxisSizingMode = "FIXED";
          component.paddingTop = frame.paddingTop;
          component.paddingRight = frame.paddingRight;
          component.paddingBottom = frame.paddingBottom;
          component.paddingLeft = frame.paddingLeft;
          component.counterAxisAlignItems = "CENTER";
          if (component.children.length > 1) {
            component.itemSpacing = inferItemSpacing(component.children, direction);
          }
          if (direction === "HORIZONTAL") {
            component.resize(component.width, savedHeight);
          } else {
            component.resize(savedWidth, component.height);
          }
        }
      }
    }
    const parent = node.parent;
    if (parent && "children" in parent) {
      const index = parent.children.indexOf(node);
      parent.insertChild(index, component);
    }
    node.remove();
    figma.currentPage.selection = [component];
    return {
      id: component.id,
      name: component.name,
      type: "COMPONENT",
      description: component.description,
      width: component.width,
      height: component.height,
      // Original frame dimensions before auto-layout conversion.
      // Compare with width/height above to detect dimension drift.
      originalWidth: origWidth,
      originalHeight: origHeight,
      childCount: component.children.length,
      layoutMode: component.layoutMode,
      autoLayoutApplied
    };
  }
  async function handleCombineAsVariants(p) {
    var components = [];
    for (var i = 0; i < p.componentIds.length; i++) {
      var node = await figma.getNodeByIdAsync(p.componentIds[i]);
      if (!node) throw new Error("Component not found: " + p.componentIds[i]);
      if (node.type !== "COMPONENT") {
        throw new Error("Node " + p.componentIds[i] + " is " + node.type + ", expected COMPONENT");
      }
      components.push(node);
    }
    if (components.length < 2) {
      throw new Error("Need at least 2 components to combine as variants");
    }
    var parent = await figma.getNodeByIdAsync(p.parentId);
    if (!parent || !("appendChild" in parent)) {
      throw new Error("Parent not found or cannot have children: " + p.parentId);
    }
    var componentSet = figma.combineAsVariants(components, parent);
    componentSet.name = p.name;
    return {
      id: componentSet.id,
      name: componentSet.name,
      type: "COMPONENT_SET",
      width: componentSet.width,
      height: componentSet.height,
      x: componentSet.x,
      y: componentSet.y,
      childCount: componentSet.children.length,
      children: componentSet.children.map((c) => ({
        id: c.id,
        name: c.name,
        type: c.type,
        width: c.width,
        height: c.height
      }))
    };
  }
  async function handleUpdateNode(p) {
    const node = await figma.getNodeByIdAsync(p.nodeId);
    if (!node) throw new Error(`Node not found: ${p.nodeId}`);
    const updated = await applyNodeProperties(node, p.properties);
    return { nodeId: p.nodeId, updated };
  }
  async function applyNodeProperties(node, props) {
    const updated = [];
    if (props.name !== void 0) {
      node.name = props.name;
      updated.push("name");
    }
    if (props.characters !== void 0 && node.type === "TEXT") {
      await figma.loadFontAsync(node.fontName);
      node.characters = props.characters;
      updated.push("characters");
    }
    if (props.width !== void 0 && props.height !== void 0 && "resize" in node) {
      node.resize(props.width, props.height);
      updated.push("width", "height");
    } else if (props.width !== void 0 && "resize" in node) {
      node.resize(props.width, node.height);
      updated.push("width");
    } else if (props.height !== void 0 && "resize" in node) {
      node.resize(node.width, props.height);
      updated.push("height");
    }
    if (props.opacity !== void 0 && "opacity" in node) {
      node.opacity = props.opacity;
      updated.push("opacity");
    }
    if (props.fills !== void 0 && "fills" in node) {
      node.fills = props.fills;
      updated.push("fills");
    }
    if (props.fontSize !== void 0 && node.type === "TEXT") {
      var textNode = node;
      await figma.loadFontAsync(textNode.fontName);
      textNode.fontSize = props.fontSize;
      updated.push("fontSize");
    }
    if (props.fontName !== void 0 && node.type === "TEXT") {
      var fontData = props.fontName;
      var newFont = { family: fontData.family, style: fontData.style };
      await figma.loadFontAsync(newFont);
      node.fontName = newFont;
      updated.push("fontName");
    }
    if (props.cornerRadius !== void 0 && "cornerRadius" in node) {
      node.cornerRadius = props.cornerRadius;
      updated.push("cornerRadius");
    }
    if (props.layoutMode !== void 0 && "layoutMode" in node) {
      node.layoutMode = props.layoutMode;
      updated.push("layoutMode");
    }
    if (props.primaryAxisSizingMode !== void 0 && "primaryAxisSizingMode" in node) {
      node.primaryAxisSizingMode = props.primaryAxisSizingMode;
      updated.push("primaryAxisSizingMode");
    }
    if (props.counterAxisSizingMode !== void 0 && "counterAxisSizingMode" in node) {
      node.counterAxisSizingMode = props.counterAxisSizingMode;
      updated.push("counterAxisSizingMode");
    }
    if (props.itemSpacing !== void 0 && "itemSpacing" in node) {
      node.itemSpacing = props.itemSpacing;
      updated.push("itemSpacing");
    }
    if (props.primaryAxisAlignItems !== void 0 && "primaryAxisAlignItems" in node) {
      node.primaryAxisAlignItems = props.primaryAxisAlignItems;
      updated.push("primaryAxisAlignItems");
    }
    if (props.counterAxisAlignItems !== void 0 && "counterAxisAlignItems" in node) {
      node.counterAxisAlignItems = props.counterAxisAlignItems;
      updated.push("counterAxisAlignItems");
    }
    if (props.paddingLeft !== void 0 && "paddingLeft" in node) {
      node.paddingLeft = props.paddingLeft;
      updated.push("paddingLeft");
    }
    if (props.paddingRight !== void 0 && "paddingRight" in node) {
      node.paddingRight = props.paddingRight;
      updated.push("paddingRight");
    }
    if (props.paddingTop !== void 0 && "paddingTop" in node) {
      node.paddingTop = props.paddingTop;
      updated.push("paddingTop");
    }
    if (props.paddingBottom !== void 0 && "paddingBottom" in node) {
      node.paddingBottom = props.paddingBottom;
      updated.push("paddingBottom");
    }
    if (props.strokeWeight !== void 0 && "strokeWeight" in node) {
      node.strokeWeight = props.strokeWeight;
      updated.push("strokeWeight");
    }
    if (props.strokes !== void 0 && "strokes" in node) {
      node.strokes = props.strokes;
      updated.push("strokes");
    }
    if (props.x !== void 0 && node.type !== "DOCUMENT" && node.type !== "PAGE") {
      node.x = props.x;
      updated.push("x");
    }
    if (props.y !== void 0 && node.type !== "DOCUMENT" && node.type !== "PAGE") {
      node.y = props.y;
      updated.push("y");
    }
    if (props.clipsContent !== void 0 && "clipsContent" in node) {
      node.clipsContent = props.clipsContent;
      updated.push("clipsContent");
    }
    if (props.visible !== void 0 && "visible" in node) {
      node.visible = props.visible;
      updated.push("visible");
    }
    if (props.layoutAlign !== void 0 && "layoutAlign" in node) {
      node.layoutAlign = props.layoutAlign;
      updated.push("layoutAlign");
    }
    if (props.layoutGrow !== void 0 && "layoutGrow" in node) {
      node.layoutGrow = props.layoutGrow;
      updated.push("layoutGrow");
    }
    return updated;
  }
  async function handleCreateInstance(p) {
    var masterNode = await figma.getNodeByIdAsync(p.componentId);
    if (!masterNode) throw new Error("Master component not found: " + p.componentId);
    if (masterNode.type !== "COMPONENT") {
      throw new Error("Node " + p.componentId + " is " + masterNode.type + ", expected COMPONENT");
    }
    var parent = await figma.getNodeByIdAsync(p.parentId);
    if (!parent) throw new Error("Parent node not found: " + p.parentId);
    if (!("appendChild" in parent)) {
      throw new Error("Parent node " + p.parentId + " (" + parent.type + ") cannot have children");
    }
    var component = masterNode;
    var instance = component.createInstance();
    parent.appendChild(instance);
    if (p.name) {
      instance.name = p.name;
    }
    if (p.properties) {
      if (p.properties.characters !== void 0) {
        var textChild = findFirstTextNode(instance);
        if (textChild) {
          await figma.loadFontAsync(textChild.fontName);
          textChild.characters = p.properties.characters;
        }
      }
      await applyNodeProperties(instance, p.properties);
    }
    return serializeNode(instance, 1);
  }
  function findFirstTextNode(node) {
    if (node.type === "TEXT") return node;
    if ("children" in node) {
      var children = node.children;
      for (var i = 0; i < children.length; i++) {
        var found = findFirstTextNode(children[i]);
        if (found) return found;
      }
    }
    return null;
  }
  async function handleCreateNode(p) {
    var parent = await figma.getNodeByIdAsync(p.parentId);
    if (!parent) throw new Error("Parent node not found: " + p.parentId);
    if (!("appendChild" in parent)) {
      throw new Error("Parent node " + p.parentId + " (" + parent.type + ") cannot have children");
    }
    var newNode;
    if (p.type === "TEXT") {
      var textNode = figma.createText();
      var fontToLoad = { family: "Inter", style: "Regular" };
      if (p.properties && p.properties.fontName) {
        var fontData = p.properties.fontName;
        fontToLoad = { family: fontData.family, style: fontData.style };
      }
      await figma.loadFontAsync(fontToLoad);
      textNode.fontName = fontToLoad;
      newNode = textNode;
    } else {
      newNode = figma.createFrame();
    }
    if (p.name) {
      newNode.name = p.name;
    }
    parent.appendChild(newNode);
    if (p.properties) {
      await applyNodeProperties(newNode, p.properties);
    }
    return serializeNode(newNode, 1);
  }
  async function handleReadVariables(_p) {
    var _a;
    const variables = await figma.variables.getLocalVariablesAsync();
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const collectionMap = new Map(collections.map((c) => [c.id, c]));
    const result = [];
    for (const v of variables) {
      const col = collectionMap.get(v.variableCollectionId);
      if (_p.collectionName && (col == null ? void 0 : col.name) !== _p.collectionName) continue;
      result.push({
        id: v.id,
        name: v.name,
        resolvedType: v.resolvedType,
        valuesByMode: v.valuesByMode,
        collectionName: (_a = col == null ? void 0 : col.name) != null ? _a : "unknown",
        collectionId: v.variableCollectionId
      });
    }
    return result;
  }
  async function handleCreateCollection(p) {
    const collection = figma.variables.createVariableCollection(p.name);
    return {
      id: collection.id,
      name: collection.name,
      modes: collection.modes.map((m) => ({ modeId: m.modeId, name: m.name }))
    };
  }
  async function handleCreateVariable(p) {
    const variable = figma.variables.createVariable(
      p.name,
      p.collectionId,
      p.resolvedType
    );
    const collections = await figma.variables.getLocalVariableCollectionsAsync();
    const col = collections.find((c) => c.id === p.collectionId);
    if (col && col.modes.length > 0) {
      variable.setValueForMode(col.modes[0].modeId, p.value);
    }
    return {
      id: variable.id,
      name: variable.name,
      resolvedType: variable.resolvedType
    };
  }
  async function handleUpdateVariable(p) {
    var _a;
    const variable = await figma.variables.getVariableByIdAsync(p.variableId);
    if (!variable) throw new Error(`Variable not found: ${p.variableId}`);
    let modeId = p.modeId;
    if (!modeId) {
      const collections = await figma.variables.getLocalVariableCollectionsAsync();
      const col = collections.find((c) => c.id === variable.variableCollectionId);
      modeId = (_a = col == null ? void 0 : col.modes[0]) == null ? void 0 : _a.modeId;
    }
    if (!modeId) throw new Error("Could not determine mode ID");
    variable.setValueForMode(modeId, p.value);
    return { variableId: p.variableId, updated: true };
  }
  async function handleListLayers(_p) {
    var maxDepth = _p.maxDepth !== void 0 && _p.maxDepth !== null ? _p.maxDepth : 100;
    var page = figma.currentPage;
    var result = [];
    function walk(node, depth) {
      var childCount = 0;
      if ("children" in node) {
        childCount = node.children.length;
      }
      result.push({
        id: node.id,
        name: node.name,
        type: node.type,
        depth,
        isComponent: node.type === "COMPONENT" || node.type === "COMPONENT_SET",
        childCount,
        width: "width" in node ? node.width : 0,
        height: "height" in node ? node.height : 0,
        visible: "visible" in node ? node.visible : true,
        canConvert: node.type === "FRAME" || node.type === "GROUP" || node.type === "RECTANGLE"
      });
      if ("children" in node && depth < maxDepth) {
        var children = node.children;
        for (var i2 = 0; i2 < children.length; i2++) {
          walk(children[i2], depth + 1);
        }
      }
    }
    var pageChildren = page.children;
    for (var i = 0; i < pageChildren.length; i++) {
      walk(pageChildren[i], 0);
    }
    return {
      pageName: page.name,
      pageId: page.id,
      totalLayers: result.length,
      layers: result
    };
  }
  async function handleListComponents() {
    var page = figma.currentPage;
    var components = [];
    var allInstances = [];
    function walk(node) {
      if (node.type === "COMPONENT" || node.type === "COMPONENT_SET") {
        var comp = node;
        var childCount = 0;
        if ("children" in comp) {
          childCount = comp.children.length;
        }
        components.push({
          id: comp.id,
          name: comp.name,
          type: node.type,
          description: "description" in comp ? comp.description : "",
          width: comp.width,
          height: comp.height,
          childCount,
          x: comp.x,
          y: comp.y
        });
      }
      if (node.type === "INSTANCE") {
        var inst = node;
        var mainId2 = "";
        if (inst.mainComponent) {
          mainId2 = inst.mainComponent.id;
        }
        allInstances.push({
          id: inst.id,
          name: inst.name,
          width: inst.width,
          height: inst.height,
          x: inst.x,
          y: inst.y,
          visible: inst.visible,
          mainComponentId: mainId2
        });
      }
      if ("children" in node) {
        var children = node.children;
        for (var i2 = 0; i2 < children.length; i2++) {
          walk(children[i2]);
        }
      }
    }
    var pageChildren = page.children;
    for (var i = 0; i < pageChildren.length; i++) {
      walk(pageChildren[i]);
    }
    var instanceMap = {};
    for (var j = 0; j < allInstances.length; j++) {
      var mainId = allInstances[j].mainComponentId;
      if (mainId) {
        if (!instanceMap[mainId]) {
          instanceMap[mainId] = [];
        }
        instanceMap[mainId].push(allInstances[j]);
      }
    }
    var mappedMainIds = {};
    for (var k = 0; k < components.length; k++) {
      var compId = components[k].id;
      components[k].instances = instanceMap[compId] || [];
      mappedMainIds[compId] = true;
    }
    var libraryInstances = [];
    for (var m = 0; m < allInstances.length; m++) {
      var mId = allInstances[m].mainComponentId;
      if (mId && !mappedMainIds[mId]) {
        libraryInstances.push(allInstances[m]);
      }
    }
    return {
      pageName: page.name,
      pageId: page.id,
      totalComponents: components.length,
      components,
      libraryInstances
    };
  }
  async function handleDeleteNode(p) {
    var node = await figma.getNodeByIdAsync(p.nodeId);
    if (!node) throw new Error("Node not found: " + p.nodeId);
    if (node.type === "PAGE") {
      throw new Error("Cannot delete a PAGE node");
    }
    var info = {
      id: node.id,
      name: node.name,
      type: node.type,
      parentId: node.parent ? node.parent.id : null
    };
    node.remove();
    return { deleted: true, node: info };
  }
  async function handleReorderChildren(p) {
    var parent = await figma.getNodeByIdAsync(p.parentId);
    if (!parent) throw new Error("Parent node not found: " + p.parentId);
    if (!("children" in parent)) {
      throw new Error("Node " + p.parentId + " (" + parent.type + ") has no children");
    }
    var container = parent;
    var existingIds = new Set(container.children.map(function(c) {
      return c.id;
    }));
    for (var i = 0; i < p.childIds.length; i++) {
      if (!existingIds.has(p.childIds[i])) {
        throw new Error(
          "Node " + p.childIds[i] + " is not a child of " + p.parentId
        );
      }
    }
    for (var j = 0; j < p.childIds.length; j++) {
      var child = await figma.getNodeByIdAsync(p.childIds[j]);
      if (child && "parent" in child) {
        container.insertChild(j, child);
      }
    }
    var newOrder = container.children.map(function(c) {
      return { id: c.id, name: c.name, type: c.type };
    });
    return {
      parentId: p.parentId,
      childCount: container.children.length,
      children: newOrder
    };
  }
  async function handleCreatePage(p) {
    var page = figma.createPage();
    page.name = p.name;
    return { pageId: page.id, name: page.name };
  }
  async function handleSetCurrentPage(p) {
    var node = await figma.getNodeByIdAsync(p.pageId);
    if (!node) throw new Error("Page not found: " + p.pageId);
    if (node.type !== "PAGE") throw new Error("Node " + p.pageId + " is " + node.type + ", expected PAGE");
    await figma.setCurrentPageAsync(node);
    return { pageId: node.id, name: node.name };
  }
  async function handleSwapWithInstance(p) {
    var node = await figma.getNodeByIdAsync(p.nodeId);
    if (!node) throw new Error("Node not found: " + p.nodeId);
    if (!("parent" in node) || !node.parent) throw new Error("Node has no parent: " + p.nodeId);
    var sceneNode = node;
    var parentNode = node.parent;
    if (!("children" in parentNode)) {
      throw new Error("Parent cannot have children");
    }
    var parentChildren = parentNode.children;
    var originalIndex = -1;
    for (var si = 0; si < parentChildren.length; si++) {
      if (parentChildren[si].id === p.nodeId) {
        originalIndex = si;
        break;
      }
    }
    var origX = sceneNode.x;
    var origY = sceneNode.y;
    var origW = sceneNode.width;
    var origH = sceneNode.height;
    var masterNode = await figma.getNodeByIdAsync(p.componentId);
    if (!masterNode) throw new Error("Component not found: " + p.componentId);
    if (masterNode.type !== "COMPONENT") {
      throw new Error("Node " + p.componentId + " is " + masterNode.type + ", expected COMPONENT");
    }
    var component = masterNode;
    var instance = component.createInstance();
    parentNode.appendChild(instance);
    instance.x = origX + (origW - instance.width) / 2;
    instance.y = origY + (origH - instance.height) / 2;
    if (originalIndex >= 0 && "insertChild" in parentNode) {
      parentNode.insertChild(originalIndex, instance);
    }
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
      parentId: parentNode.id
    };
  }
  async function handleMoveNode(p) {
    var node = await figma.getNodeByIdAsync(p.nodeId);
    if (!node) throw new Error("Node not found: " + p.nodeId);
    var target = await figma.getNodeByIdAsync(p.targetParentId);
    if (!target) throw new Error("Target parent not found: " + p.targetParentId);
    if (!("appendChild" in target)) {
      throw new Error("Target " + p.targetParentId + " (" + target.type + ") cannot have children");
    }
    target.appendChild(node);
    return {
      nodeId: node.id,
      name: node.name,
      newParentId: target.id,
      newParentName: target.name
    };
  }
  async function handlePromoteAndCombine(p) {
    if (p.nodes.length < 2) {
      throw new Error("Need at least 2 nodes to promote and combine");
    }
    var parent = await figma.getNodeByIdAsync(p.parentId);
    if (!parent || !("appendChild" in parent)) {
      throw new Error("Parent not found or cannot have children: " + p.parentId);
    }
    var components = [];
    for (var i = 0; i < p.nodes.length; i++) {
      var entry = p.nodes[i];
      var node = await figma.getNodeByIdAsync(entry.nodeId);
      if (!node) throw new Error("Node not found: " + entry.nodeId);
      if (node.type !== "FRAME" && node.type !== "GROUP" && node.type !== "RECTANGLE") {
        throw new Error(
          "Cannot convert " + node.type + " (" + entry.nodeId + ") to component. Only FRAME, GROUP, or RECTANGLE."
        );
      }
      var component = figma.createComponent();
      var frameNode = node;
      component.resize(frameNode.width || 100, frameNode.height || 100);
      component.x = node.x;
      component.y = node.y;
      component.name = entry.variantName;
      if ("children" in node) {
        var children = [...node.children];
        for (var ci = 0; ci < children.length; ci++) {
          component.appendChild(children[ci]);
        }
      }
      if (node.type === "FRAME") {
        var frame = node;
        component.fills = frame.fills !== figma.mixed ? frame.fills : [];
        component.strokes = frame.strokes;
        component.strokeWeight = frame.strokeWeight !== figma.mixed ? frame.strokeWeight : 0;
        component.cornerRadius = frame.cornerRadius !== figma.mixed ? frame.cornerRadius : 0;
        component.clipsContent = frame.clipsContent;
        var savedW = frame.width;
        var savedH = frame.height;
        component.layoutMode = frame.layoutMode;
        if (frame.layoutMode !== "NONE") {
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
          var totalHP = frame.paddingLeft + frame.paddingRight;
          var totalVP = frame.paddingTop + frame.paddingBottom;
          if (totalHP > 4 || totalVP > 4) {
            var dir = inferLayoutDirection(component.children);
            component.layoutMode = dir;
            component.primaryAxisSizingMode = "AUTO";
            component.counterAxisSizingMode = "FIXED";
            component.paddingTop = frame.paddingTop;
            component.paddingRight = frame.paddingRight;
            component.paddingBottom = frame.paddingBottom;
            component.paddingLeft = frame.paddingLeft;
            component.counterAxisAlignItems = "CENTER";
            if (component.children.length > 1) {
              component.itemSpacing = inferItemSpacing(component.children, dir);
            }
            if (dir === "HORIZONTAL") {
              component.resize(component.width, savedH);
            } else {
              component.resize(savedW, component.height);
            }
          }
        }
      }
      var origParent = node.parent;
      if (origParent && "children" in origParent) {
        var idx = origParent.children.indexOf(node);
        origParent.insertChild(idx, component);
      }
      node.remove();
      components.push(component);
    }
    var componentSet = figma.combineAsVariants(components, parent);
    componentSet.name = p.setName;
    return {
      componentSetId: componentSet.id,
      componentSetName: componentSet.name,
      width: componentSet.width,
      height: componentSet.height,
      components: componentSet.children.map(function(c) {
        return { id: c.id, name: c.name, type: c.type, width: c.width, height: c.height };
      })
    };
  }
  async function handleSwapBatch(p) {
    var results = [];
    for (var i = 0; i < p.swaps.length; i++) {
      var swap = p.swaps[i];
      var result = await handleSwapWithInstance({
        nodeId: swap.nodeId,
        componentId: swap.componentId
      });
      results.push(result);
    }
    return { total: results.length, results };
  }
  function serializeNode(node, maxDepth, depth = 0) {
    const result = {
      id: node.id,
      name: node.name,
      type: node.type
    };
    if ("visible" in node) result.visible = node.visible;
    if ("width" in node) result.width = node.width;
    if ("height" in node) result.height = node.height;
    if ("x" in node) result.x = node.x;
    if ("y" in node) result.y = node.y;
    if ("characters" in node) result.characters = node.characters;
    if (node.type === "TEXT") {
      var textNode = node;
      var fs = textNode.fontSize;
      if (fs !== figma.mixed) result.fontSize = fs;
      var fn = textNode.fontName;
      if (fn !== figma.mixed) result.fontName = { family: fn.family, style: fn.style };
    }
    if ("fills" in node) {
      const fills = node.fills;
      result.fills = fills !== figma.mixed ? fills : [];
    }
    if ("cornerRadius" in node) {
      var cr = node.cornerRadius;
      if (cr !== figma.mixed) result.cornerRadius = cr;
    }
    if ("layoutMode" in node) {
      result.layoutMode = node.layoutMode;
    }
    if ("paddingLeft" in node) {
      var frame = node;
      result.paddingLeft = frame.paddingLeft;
      result.paddingRight = frame.paddingRight;
      result.paddingTop = frame.paddingTop;
      result.paddingBottom = frame.paddingBottom;
    }
    if ("strokes" in node) {
      result.strokes = node.strokes;
      var sw = node.strokeWeight;
      if (sw !== figma.mixed) result.strokeWeight = sw;
    }
    if (node.type === "INSTANCE") {
      var inst = node;
      if (inst.mainComponent) {
        result.mainComponentId = inst.mainComponent.id;
        result.mainComponentName = inst.mainComponent.name;
      }
    }
    if ("children" in node && depth < maxDepth) {
      result.children = node.children.map(
        (child) => serializeNode(child, maxDepth, depth + 1)
      );
    }
    return result;
  }
})();
