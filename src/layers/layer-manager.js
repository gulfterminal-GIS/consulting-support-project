/**
 * LayerManager - Manages layer operations including visibility, removal, zoom, and list updates
 * 
 * This module handles all layer CRUD operations and maintains the layer list UI.
 * It uses StateManager for accessing global state (uploadedLayers, map, view).
 */

export class LayerManager {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    
    // Store callbacks that should be triggered when layer list updates
    this.updateCallbacks = [];
  }

  /**
   * Register a callback to be called when layer list updates
   * @param {Function} callback - Function to call after layer list updates
   */
  onLayerListUpdate(callback) {
    if (typeof callback === 'function') {
      this.updateCallbacks.push(callback);
    }
  }

  /**
   * Remove a callback from the update list
   * @param {Function} callback - Function to remove
   */
  offLayerListUpdate(callback) {
    const index = this.updateCallbacks.indexOf(callback);
    if (index > -1) {
      this.updateCallbacks.splice(index, 1);
    }
  }

  /**
   * Trigger all registered callbacks
   * @private
   */
  _triggerUpdateCallbacks() {
    this.updateCallbacks.forEach(callback => {
      try {
        callback();
      } catch (error) {
        console.error('Error in layer list update callback:', error);
      }
    });
  }

  /**
   * Setup callbacks for layer list updates
   * This replaces the old registerLayerManagerCallbacks pattern from script.js
   * @param {AttributeTable} attributeTable - AttributeTable instance
   * @param {VisualizationManager} visualizationManager - VisualizationManager instance
   * @param {AnalysisManager} analysisManager - AnalysisManager instance
   * @param {SwipeManager} swipeManager - SwipeManager instance
   */
  setupCallbacks(attributeTable, visualizationManager, analysisManager, swipeManager) {
    // Store visualizationManager reference for lazy initialization
    this.visualizationManager = visualizationManager;
    // Callback 1: Update attribute table layer select when layers change
    this.onLayerListUpdate(() => {
      const tableWidget = document.getElementById("attributeTableWidget");
      if (tableWidget && !tableWidget.classList.contains("hidden")) {
        if (attributeTable && typeof attributeTable.initializeTableLayerSelect === 'function') {
          attributeTable.initializeTableLayerSelect();
        }
      }
    });

    // Callback 2: Update heatmap layer select when layers change
    this.onLayerListUpdate(() => {
      if (
        this.visualizationManager &&
        this.visualizationManager.isHeatmapEnabled() &&
        typeof this.visualizationManager.updateHeatmapLayerSelect === 'function'
      ) {
        this.visualizationManager.updateHeatmapLayerSelect();
      }
    });

    // Callback 3: Add analysis layer to layer list if it has graphics
    this.onLayerListUpdate(() => {
      if (analysisManager) {
        const analysisLayer = analysisManager.getAnalysisLayer();
        if (
          analysisLayer &&
          analysisLayer.graphics &&
          analysisLayer.graphics.length > 0
        ) {
          const layerList = document.getElementById("layerList");
          if (layerList) {
            const analysisItem = document.createElement("div");
            analysisItem.className = "layer-item";
            analysisItem.innerHTML = `
              <input type="checkbox" class="layer-checkbox" 
                     ${analysisLayer.visible ? "checked" : ""} 
                     onchange="analysisLayer.visible = this.checked">
              <label class="layer-name">Analysis Results (${
                analysisLayer.graphics.length
              })</label>
              <div class="layer-actions">
                <button onclick="clearAnalysisResults()" title="Clear results">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            `;
            layerList.appendChild(analysisItem);
          }
        }
      }
    });

    // Callback 4: Update swipe panel layer selects when layers change
    this.onLayerListUpdate(() => {
      const swipePanel = document.querySelector("#sidePanelContent #swipeLayer1Select");
      if (swipePanel && swipeManager && typeof swipeManager.updateSwipeLayerSelects === 'function') {
        swipeManager.updateSwipeLayerSelects();
      }
    });

    console.log(
      "✅ LayerManager callbacks registered (attribute table, heatmap, analysis, swipe)"
    );
  }

  /**
   * Toggle layer visibility
   * @param {number} index - Index of the layer in uploadedLayers array
   */
  toggleLayer(index) {
    const layers = this.stateManager.getUploadedLayers() || [];
    if (layers[index]) {
      layers[index].visible = !layers[index].visible;
    }
  }

  /**
   * Zoom to layer extent
   * @param {number} index - Index of the layer in uploadedLayers array
   */
  async zoomToLayer(index) {
    console.log(`🔍 zoomToLayer called with index: ${index}`);
    
    const layers = this.stateManager.getUploadedLayers() || [];
    console.log(`📚 Total uploaded layers: ${layers.length}`);
    
    const layer = layers[index];
    
    if (!layer) {
      console.error(`❌ No layer found at index ${index}`);
      this.notificationManager?.showNotification(
        "لم يتم العثور على الطبقة",
        "error"
      );
      return;
    }
    
    console.log(`📍 Found layer: ${layer.title}`);
    
    if (!layer.fullExtent) {
      console.error(`❌ Layer ${layer.title} has no fullExtent`);
      this.notificationManager?.showNotification(
        "لا يمكن التكبير لهذه الطبقة",
        "error"
      );
      return;
    }
    
    const view = this.stateManager.getView();
    if (!view) {
      console.error('❌ No view available');
      return;
    }
    
    try {
      console.log(`🎯 Zooming to layer: ${layer.title}`);
      
      const extent = layer.fullExtent;
      const extentWidth = extent.width;
      const extentHeight = extent.height;
      
      console.log(`📐 Extent dimensions - Width: ${extentWidth}, Height: ${extentHeight}`);
      
      // Check if extent is abnormally large (likely corrupted data)
      // Normal planners have extents in the range of hundreds to thousands
      // If extent is larger than 100,000 units, it's likely corrupted
      const isAbnormalExtent = extentWidth > 100000 || extentHeight > 100000;
      
      if (isAbnormalExtent) {
        console.warn(`⚠️ Abnormal extent detected for ${layer.title}, using feature-based zoom`);
        
        // For layers with corrupted extents, query the actual features
        // and calculate extent from them
        if (layer.type === 'feature') {
          try {
            const query = layer.createQuery();
            query.returnGeometry = true;
            query.outFields = ['*'];
            
            const featureSet = await layer.queryFeatures(query);
            
            if (featureSet.features && featureSet.features.length > 0) {
              console.log(`📊 Found ${featureSet.features.length} features, calculating extent...`);
              
              // Get extent from all features
              let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
              
              featureSet.features.forEach(feature => {
                if (feature.geometry) {
                  const geom = feature.geometry;
                  if (geom.extent) {
                    minX = Math.min(minX, geom.extent.xmin);
                    minY = Math.min(minY, geom.extent.ymin);
                    maxX = Math.max(maxX, geom.extent.xmax);
                    maxY = Math.max(maxY, geom.extent.ymax);
                  }
                }
              });
              
              // Create a new extent from calculated bounds
              const { Extent } = await this.stateManager.loadModule('esri/geometry/Extent');
              const calculatedExtent = new Extent({
                xmin: minX,
                ymin: minY,
                xmax: maxX,
                ymax: maxY,
                spatialReference: extent.spatialReference
              });
              
              console.log(`✨ Calculated extent - Width: ${calculatedExtent.width}, Height: ${calculatedExtent.height}`);
              
              await view.goTo(calculatedExtent.expand(1.5), {
                duration: 1000,
                easing: "ease-in-out"
              });
              
              console.log(`✅ Successfully zoomed to ${layer.title} using calculated extent`);
              return;
            }
          } catch (queryError) {
            console.error(`❌ Error querying features for ${layer.title}:`, queryError);
            // Fall through to default behavior
          }
        }
      }
      
      // Normal zoom for layers with valid extents
      const expandedExtent = extent.expand(1.5);
      
      await view.goTo(expandedExtent, {
        duration: 1000,
        easing: "ease-in-out"
      });
      
      console.log(`✅ Successfully zoomed to layer: ${layer.title}`);
    } catch (error) {
      console.error(`❌ Error zooming to layer ${layer.title}:`, error);
      this.notificationManager?.showNotification(
        "حدث خطأ أثناء التكبير",
        "error"
      );
    }
  }

  /**
   * Remove layer from map and state
   * @param {number} index - Index of the layer in uploadedLayers array
   */
  removeLayer(index) {
    const layer = (this.stateManager.getUploadedLayers() || [])[index];
    if (layer) {
      const map = this.stateManager.getMap();
      if (map) {
        map.remove(layer);
      }
    }
    this.stateManager.removeUploadedLayer(index);
    this.updateLayerList();
  }

  /**
   * Update the layer list UI with support for grouped layers
   * Updates both the main layer list and the side panel layer list if present
   */
  updateLayerList() {
    console.log('🔄 updateLayerList() called');
    
    const layerList = document.getElementById("layerList");
    console.log('📋 layerList element:', layerList);

    // Check if we're in the side panel or original location
    const panelLayerList = document.querySelector("#sidePanelContent #layerList");
    console.log('📋 panelLayerList element:', panelLayerList);
    
    const targetList = panelLayerList || layerList;
    console.log('🎯 targetList (final):', targetList);

    if (!targetList) {
      console.error('❌ No target list found!');
      return;
    }

    const map = this.stateManager.getMap();
    if (!map) {
      console.error('❌ No map found!');
      return;
    }

    // Get all layers including group layers
    const allLayers = map.layers.toArray();
    console.log('📚 Total layers:', allLayers.length);
    
    if (allLayers.length === 0) {
      targetList.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-layer-group"></i>
          <p>No layers loaded</p>
        </div>
      `;
    } else {
      let html = '';
      
      // Process each layer (including group layers)
      allLayers.forEach((layer, layerIndex) => {
        console.log(`  Layer ${layerIndex}: ${layer.title} (type: ${layer.type})`);
        if (layer.type === 'group') {
          // Render group layer with collapsible children
          html += this.renderGroupLayer(layer, layerIndex);
        } else if (layer.title !== 'Drawings' && layer.title !== 'Flash Animation' && layer.title !== 'Analysis Results') {
          // Render regular layer (skip internal layers)
          html += this.renderRegularLayer(layer, layerIndex);
        }
      });
      
      console.log('📝 Setting innerHTML...');
      targetList.innerHTML = html;
      console.log('✅ innerHTML set');
      
      // Use event delegation on the parent container for better reliability
      // Remove old listener if exists
      if (this._toggleClickHandler) {
        console.log('🗑️ Removing old click handler');
        targetList.removeEventListener('click', this._toggleClickHandler);
      }
      
      // Create new handler
      this._toggleClickHandler = (e) => {
        console.log('🖱️ CLICK EVENT:', {
          target: e.target,
          tagName: e.target.tagName,
          className: e.target.className,
          id: e.target.id
        });
        
        // ONLY allow clicks on the toggle button itself (not the header)
        const toggleBtn = e.target.closest('.group-toggle');
        
        console.log('🔍 Closest elements:', {
          toggleBtn
        });
        
        if (!toggleBtn) {
          console.log('⚠️ Not a toggle button click, ignoring');
          return;
        }
        
        // Don't toggle if clicking on checkbox or label
        if (e.target.closest('.layer-checkbox') || e.target.closest('label')) {
          console.log('⚠️ Clicked on checkbox or label, ignoring');
          return;
        }
        
        e.stopPropagation();
        e.preventDefault();
        
        // Get group ID from button
        const groupId = toggleBtn.dataset.groupId;
        console.log('🆔 Group ID:', groupId);
        
        if (!groupId) {
          console.error('❌ No group ID found!');
          return;
        }
        
        const childrenContainer = document.querySelector(`#group-children-${groupId}`);
        const groupContainer = document.querySelector(`.layer-group[data-group-id="${groupId}"]`);
        const icon = document.querySelector(`.group-toggle[data-group-id="${groupId}"] i`);
        
        console.log('🔍 Found elements:', {
          groupId,
          childrenContainer,
          groupContainer,
          icon,
          clickedElement: e.target
        });
        
        if (childrenContainer && groupContainer && icon) {
          const isCollapsed = childrenContainer.classList.contains('collapsed');
          console.log('📊 Current state - isCollapsed:', isCollapsed);
          
          if (isCollapsed) {
            // Expand
            console.log('➡️ EXPANDING group:', groupId);
            childrenContainer.classList.remove('collapsed');
            groupContainer.classList.remove('collapsed');
            icon.classList.remove('fa-chevron-left');
            icon.classList.add('fa-chevron-down');
            console.log('✅ Expanded group:', groupId);
          } else {
            // Collapse
            console.log('⬅️ COLLAPSING group:', groupId);
            childrenContainer.classList.add('collapsed');
            groupContainer.classList.add('collapsed');
            icon.classList.remove('fa-chevron-down');
            icon.classList.add('fa-chevron-left');
            console.log('✅ Collapsed group:', groupId);
          }
        } else {
          console.error('❌ Missing elements:', {
            childrenContainer: !!childrenContainer,
            groupContainer: !!groupContainer,
            icon: !!icon
          });
        }
      };
      
      // Attach event listener to parent
      console.log('🔗 Attaching click handler to targetList');
      targetList.addEventListener('click', this._toggleClickHandler);
      
      const toggleButtons = targetList.querySelectorAll('.group-toggle');
      console.log('✅ Layer list updated with', toggleButtons.length, 'toggle buttons');
      console.log('🔘 Toggle buttons:', toggleButtons);
    }

    // Trigger all registered callbacks (for attribute table, heatmap, analysis, legend, etc.)
    this._triggerUpdateCallbacks();
  }

  /**
   * Render a group layer with its children
   * @param {Object} groupLayer - The group layer to render
   * @param {number} layerIndex - Index of the layer
   * @returns {string} HTML string for the group layer
   */
  renderGroupLayer(groupLayer, layerIndex) {
    const groupId = `group-${layerIndex}`;
    const childLayers = groupLayer.layers.toArray();
    
    console.log(`🎨 Rendering group layer: ${groupLayer.title} (ID: ${groupId})`);
    
    let html = `
      <div class="layer-group collapsed" data-group-id="${groupId}">
        <div class="layer-group-header" data-group-id="${groupId}">
          <button class="group-toggle" data-group-id="${groupId}" type="button" title="توسيع/طي">
            <i class="fas fa-chevron-left"></i>
          </button>
          <label for="group-${layerIndex}" class="layer-name group-name" onclick="event.stopPropagation();">
            <i class="fas fa-folder"></i>
            ${groupLayer.title}
            <span class="layer-count">(${childLayers.length})</span>
          </label>
          <input type="checkbox" class="layer-checkbox" id="group-${layerIndex}" 
                ${groupLayer.visible ? "checked" : ""} 
                onchange="event.stopPropagation(); toggleGroupLayer(${layerIndex})">
        </div>
        <div class="layer-group-children collapsed" id="group-children-${groupId}">
    `;
    
    // Render child layers
    childLayers.forEach((childLayer, childIndex) => {
      const globalIndex = this.stateManager.getUploadedLayers().indexOf(childLayer);
      console.log(`  🔹 Child layer: ${childLayer.title}, globalIndex: ${globalIndex}`);
      
      if (globalIndex !== -1) {
        html += `
          <div class="layer-item child-layer">
            <div class="layer-actions">
              <button onclick="zoomToLayer(${globalIndex})" title="تكبير إلى ${childLayer.title}">
                <i class="fas fa-search-plus"></i>
              </button>
              <button onclick="removeLayer(${globalIndex})" title="حذف ${childLayer.title}">
                <i class="fas fa-trash"></i>
              </button>
            </div>
            <label for="layer-${globalIndex}" class="layer-name">${childLayer.title}</label>
            <input type="checkbox" class="layer-checkbox" id="layer-${globalIndex}" 
                  ${childLayer.visible ? "checked" : ""} 
                  onchange="toggleLayer(${globalIndex})">
          </div>
        `;
      } else {
        console.warn(`  ⚠️ Child layer ${childLayer.title} not found in uploadedLayers!`);
      }
    });
    
    html += `
        </div>
      </div>
    `;
    
    console.log(`✅ Rendered group layer: ${groupId}`);
    return html;
  }  /**
   * Render a regular (non-group) layer
   * @param {Object} layer - The layer to render
   * @param {number} layerIndex - Index of the layer
   * @returns {string} HTML string for the layer
   */
  renderRegularLayer(layer, layerIndex) {
    const globalIndex = this.stateManager.getUploadedLayers().indexOf(layer);
    if (globalIndex === -1) return '';
    
    return `
      <div class="layer-item">
        <div class="layer-actions">
          <button onclick="zoomToLayer(${globalIndex})" title="تكبير للطبقة">
            <i class="fas fa-search-plus"></i>
          </button>
          <button onclick="removeLayer(${globalIndex})" title="حذف الطبقة">
            <i class="fas fa-trash"></i>
          </button>
        </div>
        <label for="layer-${globalIndex}" class="layer-name">${layer.title}</label>
        <input type="checkbox" class="layer-checkbox" id="layer-${globalIndex}" 
              ${layer.visible ? "checked" : ""} onchange="toggleLayer(${globalIndex})">
      </div>
    `;
  }

  /**
   * Toggle group layer visibility
   * @param {number} layerIndex - Index of the group layer in the map
   */
  toggleGroupLayer(layerIndex) {
    const map = this.stateManager.getMap();
    if (!map) return;
    
    const groupLayer = map.layers.getItemAt(layerIndex);
    if (groupLayer && groupLayer.type === 'group') {
      // Toggle the group visibility
      groupLayer.visible = !groupLayer.visible;
      
      // Also toggle all child layers to match the group visibility
      const childLayers = groupLayer.layers.toArray();
      childLayers.forEach(childLayer => {
        childLayer.visible = groupLayer.visible;
      });
      
      // Update the layer list to reflect the changes
      this.updateLayerList();
      
      console.log(`✅ Toggled group ${groupLayer.title} to ${groupLayer.visible ? 'visible' : 'hidden'}, updated ${childLayers.length} child layers`);
    }
  }

  /**
   * Get all uploaded layers
   * @returns {Array} Array of uploaded layers
   */
  getUploadedLayers() {
    return this.stateManager.getUploadedLayers() || [];
  }

  /**
   * Get a specific layer by index
   * @param {number} index - Index of the layer
   * @returns {Object|null} The layer object or null if not found
   */
  getLayerByIndex(index) {
    const layers = this.stateManager.getUploadedLayers() || [];
    return layers[index] || null;
  }

  /**
   * Get a layer by its ID
   * @param {string} id - The layer ID
   * @returns {Object|null} The layer object or null if not found
   */
  getLayerById(id) {
    const layers = this.stateManager.getUploadedLayers() || [];
    return layers.find(layer => layer.id === id) || null;
  }

  /**
   * Add a layer to the map and state
   * @param {Object} layer - The layer to add
   */
  addLayer(layer) {
    const map = this.stateManager.getMap();
    if (map) {
      map.add(layer);
    }
    this.stateManager.addUploadedLayer(layer);
    this.updateLayerList();
  }
}
