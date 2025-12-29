/**
 * SwipeManager - Manages layer comparison using swipe widget
 *
 * This module handles:
 * - Swipe panel initialization and configuration
 * - Layer selection for comparison (layer vs layer, basemap vs layer)
 * - Swipe widget creation and management
 * - Swipe direction and position controls
 *
 * Extracted from script.js as part of the modularization effort.
 */

import { loadModule } from "../core/module-loader.js";

export class SwipeManager {
  constructor(stateManager, notificationManager, panelManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.panelManager = panelManager;
    this.analysisManager = null; // Set via setAnalysisManager() after initialization
    
    // Swipe state
    this.swipeWidget = null;
    this.swipeMode = "layers"; // "layers" or "basemap-layer"
    this.swipeDirection = "horizontal"; // "horizontal" or "vertical"
  }

  /**
   * Set the analysis manager instance (called after AnalysisManager is created)
   * This is needed because AnalysisManager is created after SwipeManager,
   * but SwipeManager needs to access the analysis layer for swipe comparisons
   * 
   * @param {AnalysisManager} analysisManager - The analysis manager instance
   */
  setAnalysisManager(analysisManager) {
    this.analysisManager = analysisManager;
  }

  /**
   * Initialize swipe panel with layer selects and controls
   */
  initializeSwipePanel() {
    // Add tooltips
    const layer1Select = document.getElementById("swipeLayer1Select");
    const layer2Select = document.getElementById("swipeLayer2Select");

    if (layer1Select) {
      layer1Select.title = "اختر الطبقة التي ستظهر على الجانب الأيسر";
      layer1Select.setAttribute('aria-label', 'الطبقة الأولى للمقارنة');
    }

    if (layer2Select) {
      layer2Select.title = "اختر الطبقة التي ستظهر على الجانب الأيمن";
      layer2Select.setAttribute('aria-label', 'الطبقة الثانية للمقارنة');
    }

    this.updateSwipeLayerSelects();
    
    // Initialize position slider
    const positionSlider = document.getElementById("swipePosition");
    const positionValue = document.getElementById("swipePositionValue");
    
    if (positionSlider && positionValue) {
      positionSlider.addEventListener("input", (e) => {
        positionValue.textContent = e.target.value + "%";
        if (this.swipeWidget) {
          this.swipeWidget.position = parseInt(e.target.value);
        }
      });
    }
  }

  /**
   * Update layer selects for swipe with available layers
   */
  updateSwipeLayerSelects() {
    const layer1Select = document.getElementById("swipeLayer1Select");
    const layer2Select = document.getElementById("swipeLayer2Select");
    
    if (!layer1Select || !layer2Select) return;
    
    // Clear existing options
    layer1Select.innerHTML = '<option value="">اختر طبقة...</option><option value="_basemap">خريطة الأساس</option>';
    layer2Select.innerHTML = '<option value="">اختر طبقة...</option><option value="_basemap">خريطة الأساس</option>';
    
    // Add uploaded layers
    const uploadedLayers = this.stateManager.getUploadedLayers();
    uploadedLayers.forEach((layer, index) => {
      const option1 = document.createElement("option");
      option1.value = index;
      option1.textContent = layer.title;
      layer1Select.appendChild(option1);
      
      const option2 = document.createElement("option");
      option2.value = index;
      option2.textContent = layer.title;
      layer2Select.appendChild(option2);
    });
    
    // Add analysis layer if it has graphics
    const analysisLayer = this.analysisManager ? this.analysisManager.getAnalysisLayer() : null;
    if (analysisLayer && analysisLayer.graphics && analysisLayer.graphics.length > 0) {
      const option1 = document.createElement("option");
      option1.value = "_analysis";
      option1.textContent = "نتائج التحليل";
      layer1Select.appendChild(option1);
      
      const option2 = document.createElement("option");
      option2.value = "_analysis";
      option2.textContent = "نتائج التحليل";
      layer2Select.appendChild(option2);
    }
    
    // Add draw layer if it has graphics
    const drawLayer = this.stateManager.getDrawLayer();
    if (drawLayer && drawLayer.graphics.length > 0) {
      const option1 = document.createElement("option");
      option1.value = "_draw";
      option1.textContent = "الرسومات";
      layer1Select.appendChild(option1);
      
      const option2 = document.createElement("option");
      option2.value = "_draw";
      option2.textContent = "الرسومات";
      layer2Select.appendChild(option2);
    }
  }

  /**
   * Set swipe mode (layers vs basemap-layer)
   * @param {string} mode - "layers" or "basemap-layer"
   */
  setSwipeMode(mode) {
    this.swipeMode = mode;
    
    // Find the mode buttons more reliably
    const modeGroups = document.querySelectorAll("#sidePanelContent .button-group");
    let modeButtons = null;
    
    modeGroups.forEach(group => {
      const buttons = group.querySelectorAll(".button-group-item");
      if (buttons.length === 2 && buttons[0].innerHTML.includes("fa-layer-group")) {
        modeButtons = buttons;
      }
    });
    
    if (modeButtons) {
      modeButtons[0].classList.toggle("active", mode === "layers");
      modeButtons[1].classList.toggle("active", mode === "basemap-layer");
    }
    
    const layer1Select = document.getElementById("swipeLayer1Select");
    const layer2Section = document.getElementById("swipeLayer2Section");
    
    if (mode === "basemap-layer") {
      if (layer2Section) {
        layer2Section.style.display = "none";
      }
      // Reset selection and update label
      if (layer1Select) {
        layer1Select.value = "";
        const label = layer1Select.closest('.form-group')?.querySelector('.form-label');
        if (label) {
          label.textContent = "اختر الطبقة للمقارنة مع خريطة الأساس";
        }
      }
    } else {
      if (layer2Section) {
        layer2Section.style.display = "block";
      }
      if (layer1Select) {
        const label = layer1Select.closest('.form-group')?.querySelector('.form-label');
        if (label) {
          label.textContent = "الطبقة الأولى (يسار)";
        }
      }
    }
  }

  /**
   * Set swipe direction (horizontal or vertical)
   * @param {string} direction - "horizontal" or "vertical"
   */
  setSwipeDirection(direction) {
    this.swipeDirection = direction;
    
    // Find the direction button group more reliably
    const directionGroups = document.querySelectorAll("#sidePanelContent .button-group");
    let directionButtons = null;
    
    // Find the button group that contains the direction buttons
    directionGroups.forEach(group => {
      const buttons = group.querySelectorAll(".button-group-item");
      if (buttons.length === 2 && buttons[0].innerHTML.includes("fa-arrows-alt-h")) {
        directionButtons = buttons;
      }
    });
    
    if (directionButtons) {
      directionButtons[0].classList.toggle("active", direction === "horizontal");
      directionButtons[1].classList.toggle("active", direction === "vertical");
    }
  }

  /**
   * Apply swipe configuration and create swipe widget
   */
  async applySwipe() {
    try {
      // Temporarily suppress console warnings for deprecated widget
      const originalWarn = console.warn;
      console.warn = (msg) => {
        if (!msg.includes('deprecated')) {
          originalWarn(msg);
        }
      };

      const [Swipe] = await Promise.all([
        loadModule("esri/widgets/Swipe")
      ]);
      
      // Remove existing swipe widget
      if (this.swipeWidget) {
        const view = this.stateManager.getView();
        view.ui.remove(this.swipeWidget);
        this.swipeWidget.destroy();
        this.swipeWidget = null;
      }
      
      let leadingLayers = [];
      let trailingLayers = [];
      
      const view = this.stateManager.getView();
      const uploadedLayers = this.stateManager.getUploadedLayers();
      const analysisLayer = this.analysisManager ? this.analysisManager.getAnalysisLayer() : null;
      const drawLayer = this.stateManager.getDrawLayer();
      
      if (this.swipeMode === "layers") {
        const layer1Value = document.getElementById("swipeLayer1Select")?.value;
        const layer2Value = document.getElementById("swipeLayer2Select")?.value;
        
        if (!layer1Value || !layer2Value) {
          this.notificationManager.showNotification("الرجاء اختيار طبقتين للمقارنة", "error");
          console.warn = originalWarn;
          return;
        }
        
        // Get leading layers
        if (layer1Value === "_basemap") {
          // Don't include basemap layers directly, leave empty for basemap
          leadingLayers = [];
        } else if (layer1Value === "_analysis") {
          leadingLayers = [analysisLayer];
        } else if (layer1Value === "_draw") {
          leadingLayers = [drawLayer];
        } else {
          leadingLayers = [uploadedLayers[parseInt(layer1Value)]];
        }
        
        // Get trailing layers
        if (layer2Value === "_basemap") {
          // For basemap, include all non-basemap layers
          trailingLayers = [...uploadedLayers];
          if (drawLayer && drawLayer.graphics.length > 0) {
            trailingLayers.push(drawLayer);
          }
          if (analysisLayer && analysisLayer.graphics.length > 0) {
            trailingLayers.push(analysisLayer);
          }
        } else if (layer2Value === "_analysis") {
          trailingLayers = [analysisLayer];
        } else if (layer2Value === "_draw") {
          trailingLayers = [drawLayer];
        } else {
          trailingLayers = [uploadedLayers[parseInt(layer2Value)]];
        }
      } else {
        // Basemap vs Layer mode
        const layerValue = document.getElementById("swipeLayer1Select")?.value;
        
        if (!layerValue) {
          this.notificationManager.showNotification("الرجاء اختيار طبقة للمقارنة مع خريطة الأساس", "error");
          console.warn = originalWarn;
          return;
        }
        
        // For basemap comparison, put selected layer on one side, everything else on the other
        if (layerValue === "_analysis") {
          leadingLayers = [analysisLayer];
        } else if (layerValue === "_draw") {
          leadingLayers = [drawLayer];
        } else {
          leadingLayers = [uploadedLayers[parseInt(layerValue)]];
        }
        
        // Trailing will show basemap (empty array means basemap shows through)
        trailingLayers = [];
      }
      
      // Create swipe widget
      this.swipeWidget = new Swipe({
        view: view,
        leadingLayers: leadingLayers.filter(layer => layer != null), // Remove null layers
        trailingLayers: trailingLayers.filter(layer => layer != null), // Remove null layers
        direction: this.swipeDirection,
        position: parseInt(document.getElementById("swipePosition")?.value || 50),
        mode: "simple" // Use simple mode for better basemap handling
      });
      
      // Add to view
      view.ui.add(this.swipeWidget);
      
      // Close panel and show remove button
      this.panelManager.closeSidePanel();
      const removeBtn = document.getElementById("removeSwipeBtn");
      if (removeBtn) {
        removeBtn.style.display = "block";
      }
      
      this.notificationManager.showNotification("تم تطبيق المقارنة بنجاح", "success");
      
      // Restore console.warn
      setTimeout(() => {
        console.warn = originalWarn;
      }, 1000);
      
    } catch (error) {
      console.error("Error creating swipe:", error);
      this.notificationManager.showNotification("حدث خطأ في إنشاء المقارنة", "error");
    }
  }

  /**
   * Remove swipe widget from the view
   */
  removeSwipe() {
    if (this.swipeWidget) {
      const view = this.stateManager.getView();
      view.ui.remove(this.swipeWidget);
      this.swipeWidget.destroy();
      this.swipeWidget = null;
      
      const removeBtn = document.getElementById("removeSwipeBtn");
      if (removeBtn) {
        removeBtn.style.display = "none";
      }
      
      this.notificationManager.showNotification("تم إزالة المقارنة", "success");
    }
  }

  /**
   * Debug function to inspect swipe button groups
   */
  debugSwipeButtons() {
    console.log("=== Swipe Button Debug ===");
    const groups = document.querySelectorAll("#sidePanelContent .button-group");
    groups.forEach((group, index) => {
      console.log(`Group ${index}:`, group);
      console.log("Buttons:", group.querySelectorAll(".button-group-item"));
    });
  }
}
