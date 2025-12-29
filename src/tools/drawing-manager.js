/**
 * DrawingManager - Manages all drawing and sketch functionality
 *
 * This module handles:
 * - SketchViewModel initialization and configuration
 * - Drawing panel UI and event handlers
 * - Drawing tool buttons and symbology controls
 * - Custom symbology application
 * - Drawing state management
 *
 * Extracted from script.js as part of the modularization effort.
 */

import { loadModule } from "../core/module-loader.js";

export class DrawingManager {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.swipeManager = null; // Set via setSwipeManager() after initialization
  }

  /**
   * Set the swipe manager instance (called after SwipeManager is created)
   * This is needed because SwipeManager is created after DrawingManager,
   * but DrawingManager needs to call SwipeManager.removeSwipe() in clearAll()
   * 
   * @param {SwipeManager} swipeManager - The swipe manager instance
   */
  setSwipeManager(swipeManager) {
    this.swipeManager = swipeManager;
  }

  /**
   * Initialize SketchViewModel for drawing functionality
   * Creates the SketchViewModel and drawing layer if they don't exist
   */
  async initializeSketchViewModel() {
    let sketchViewModel = this.stateManager.getSketchViewModel();

    if (!sketchViewModel) {
      const [SketchViewModel, GraphicsLayer] = await Promise.all([
        loadModule("esri/widgets/Sketch/SketchViewModel"),
        loadModule("esri/layers/GraphicsLayer"),
      ]);

      const view = this.stateManager.getView();
      const displayMap = this.stateManager.getMap();
      let drawLayer = this.stateManager.getDrawLayer();

      // Create graphics layer if it doesn't exist
      if (!drawLayer) {
        drawLayer = new GraphicsLayer({
          title: "Drawings",
          listMode: "show",
        });
        displayMap.add(drawLayer);
        this.stateManager.setDrawLayer(drawLayer);
      }

      // Create SketchViewModel with proper configuration
      sketchViewModel = new SketchViewModel({
        view: view,
        layer: drawLayer,
        updateOnGraphicClick: false,
        defaultUpdateOptions: {
          toggleToolOnClick: false,
          enableRotation: false,
          enableScaling: false,
          enableZ: false,
        },
        defaultCreateOptions: {
          hasZ: false,
          mode: "click", // Important for proper drawing
        },
      });

      // Store in StateManager
      this.stateManager.setSketchViewModel(sketchViewModel);

      console.log("SketchViewModel initialized");

      // Set up permanent event listeners
      sketchViewModel.on("create", (event) => {
        if (event.state === "start") {
          view.container.style.cursor = "crosshair";
        } else if (event.state === "complete" || event.state === "cancel") {
          view.container.style.cursor = "default";
        }
      });

      // Setup additional event handlers
      this.setupSketchViewModelEvents();
    }

    return sketchViewModel;
  }

  /**
   * Setup SketchViewModel event handlers for create and update events
   */
  setupSketchViewModelEvents() {
    const sketchViewModel = this.stateManager.getSketchViewModel();

    if (!sketchViewModel) {
      console.warn("SketchViewModel not initialized");
      return;
    }

    // Handle create events
    sketchViewModel.on("create", (event) => {
      if (event.state === "complete") {
        // Apply custom symbology when creation is complete
        this.applyCustomSymbology(event.graphic);

        // Continue drawing if tool is still active
        if (this.stateManager.getActiveDrawingTool()) {
          setTimeout(() => {
            if (this.stateManager.getActiveDrawingTool()) {
              this.startDrawingWithTool(
                this.stateManager.getActiveDrawingTool()
              );
            }
          }, 100);
        }
      }
    });

    // Handle update events
    sketchViewModel.on("update", (event) => {
      if (event.state === "complete") {
        event.graphics.forEach((graphic) => {
          this.applyCustomSymbology(graphic);
        });
      }
    });
  }

  /**
   * Initialize drawing panel UI and event handlers
   * Called when the drawing panel is opened
   */
  initializeDrawingPanel() {
    // Re-initialize drawing tool buttons in the new panel
    const drawToolBtns = document.querySelectorAll(
      "#sidePanelContent .draw-tool-btn"
    );

    drawToolBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.tool;

        // Update active state
        drawToolBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Start drawing
        this.stateManager.setActiveDrawingTool(tool);
        this.startDrawingWithTool(tool);
      });
    });

    // Re-initialize clear button
    const clearBtn = document.querySelector("#sidePanelContent #clearDrawings");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        if (confirm("Clear all drawings?")) {
          const drawLayer = this.stateManager.getDrawLayer();
          const sketchViewModel = this.stateManager.getSketchViewModel();
          if (drawLayer) drawLayer.removeAll();
          if (sketchViewModel) sketchViewModel.cancel();
          this.resetDrawingTools();
        }
      });
    }

    // Re-initialize color and opacity controls
    const colorInput = document.querySelector("#sidePanelContent #drawColor");
    const opacityInput = document.querySelector(
      "#sidePanelContent #drawOpacity"
    );
    const opacityValue = document.querySelector(
      "#sidePanelContent .slider-value"
    );

    if (colorInput) {
      colorInput.addEventListener("change", () =>
        this.updateActiveGraphicsSymbology()
      );
    }

    if (opacityInput) {
      opacityInput.addEventListener("input", (e) => {
        if (opacityValue) {
          opacityValue.textContent = e.target.value + "%";
        }
        this.updateActiveGraphicsSymbology();
      });
    }
  }

  /**
   * Initialize drawing tool buttons (for main toolbar)
   * Sets up event handlers for drawing tool buttons outside the panel
   */
  initializeDrawingToolButtons() {
    const drawToolBtns = document.querySelectorAll(".draw-tool-btn");
    const clearDrawingsBtn = document.getElementById("clearDrawings");

    // Remove existing listeners first
    drawToolBtns.forEach((btn) => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);
    });

    // Add new listeners
    document.querySelectorAll(".draw-tool-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tool = btn.dataset.tool;

        // Update active state
        document
          .querySelectorAll(".draw-tool-btn")
          .forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");

        // Start drawing
        this.stateManager.setActiveDrawingTool(tool);
        this.startDrawingWithTool(tool);
      });
    });

    // Clear drawings button
    if (clearDrawingsBtn) {
      const newClearBtn = clearDrawingsBtn.cloneNode(true);
      clearDrawingsBtn.parentNode.replaceChild(newClearBtn, clearDrawingsBtn);

      document.getElementById("clearDrawings").addEventListener("click", () => {
        if (confirm("Clear all drawings?")) {
          const drawLayer = this.stateManager.getDrawLayer();
          const sketchViewModel = this.stateManager.getSketchViewModel();
          if (drawLayer) drawLayer.removeAll();
          if (sketchViewModel) sketchViewModel.cancel();
          this.resetDrawingTools();
        }
      });
    }

    // Color and opacity change handlers
    const colorEl = document.getElementById("drawColor");
    const opacityEl = document.getElementById("drawOpacity");

    if (colorEl) {
      colorEl.addEventListener("change", () =>
        this.updateActiveGraphicsSymbology()
      );
    }

    if (opacityEl) {
      opacityEl.addEventListener("input", () =>
        this.updateActiveGraphicsSymbology()
      );
    }
  }

  /**
   * Start drawing with a specific tool
   * @param {string} tool - The drawing tool to use (point, polyline, polygon, rectangle, circle)
   */
  startDrawingWithTool(tool) {
    const sketchViewModel = this.stateManager.getSketchViewModel();
    const view = this.stateManager.getView();

    if (!sketchViewModel) {
      console.error(
        "SketchViewModel not initialized. Call initializeSketchViewModel first."
      );
      this.notificationManager.showNotification(
        "Drawing tools not initialized",
        "error"
      );
      return;
    }

    // Cancel any active operation
    sketchViewModel.cancel();

    // Set cursor for drawing
    if (view) {
      view.container.style.cursor = "crosshair";
    }

    // Get current symbology settings
    const color = this.hexToRgb(
      document.getElementById("drawColor")?.value || "#2196F3"
    );
    const opacity = (document.getElementById("drawOpacity")?.value || 70) / 100;

    // Set symbology based on tool
    switch (tool) {
      case "point":
        sketchViewModel.pointSymbol = {
          type: "simple-marker",
          style: "circle",
          color: [...color, opacity],
          size: 12,
          outline: {
            color: [255, 255, 255, 1],
            width: 2,
          },
        };
        break;
      case "polyline":
        sketchViewModel.polylineSymbol = {
          type: "simple-line",
          color: [...color, opacity],
          width: 3,
          cap: "round",
          join: "round",
        };
        break;
      case "polygon":
      case "rectangle":
      case "circle":
        sketchViewModel.polygonSymbol = {
          type: "simple-fill",
          color: [...color, opacity * 0.5],
          outline: {
            color: [...color, 1],
            width: 2,
          },
        };
        break;
    }

    // Create the geometry
    try {
      console.log("Starting to draw:", tool);
      sketchViewModel.create(tool);
    } catch (error) {
      console.error("Error creating geometry:", error);
      this.notificationManager.showNotification(
        "Error starting drawing tool",
        "error"
      );
      if (view) {
        view.container.style.cursor = "default";
      }
    }
  }

  /**
   * Apply custom symbology to a graphic based on current color/opacity settings
   * @param {esri/Graphic} graphic - The graphic to apply symbology to
   */
  applyCustomSymbology(graphic) {
    if (!graphic) return;

    const colorEl = document.getElementById("drawColor");
    const opacityEl = document.getElementById("drawOpacity");

    const color = this.hexToRgb(colorEl?.value || "#2196F3");
    const opacity = (opacityEl?.value || 70) / 100;

    switch (graphic.geometry.type) {
      case "point":
        graphic.symbol = {
          type: "simple-marker",
          style: "circle",
          color: [...color, opacity],
          size: 12,
          outline: {
            color: [255, 255, 255, 1],
            width: 2,
          },
        };
        break;
      case "polyline":
        graphic.symbol = {
          type: "simple-line",
          color: [...color, opacity],
          width: 3,
          cap: "round",
          join: "round",
        };
        break;
      case "polygon":
        graphic.symbol = {
          type: "simple-fill",
          color: [...color, opacity * 0.5],
          outline: {
            color: [...color, 1],
            width: 2,
          },
        };
        break;
    }
  }

  /**
   * Update symbology of all active graphics in the draw layer
   */
  updateActiveGraphicsSymbology() {
    const drawLayer = this.stateManager.getDrawLayer();
    if (!drawLayer) return;

    drawLayer.graphics.forEach((graphic) => {
      this.applyCustomSymbology(graphic);
    });
  }

  /**
   * Reset drawing tools to inactive state
   */
  resetDrawingTools() {
    this.stateManager.setActiveDrawingTool(null);
    document.querySelectorAll(".draw-tool-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
    const sketchViewModel = this.stateManager.getSketchViewModel();
    if (sketchViewModel) {
      sketchViewModel.cancel();
    }
  }

  /**
   * Stop any active drawing operation
   */
  stopDrawing() {
    const sketchViewModel = this.stateManager.getSketchViewModel();
    const view = this.stateManager.getView();

    if (sketchViewModel) {
    try {
      sketchViewModel.complete(); // Complete any active drawing
      sketchViewModel.cancel();   // Then cancel/cleanup
    } catch (e) {
      console.warn("Error during drawing cleanup:", e);
    }
    }

    if (view) {
      view.container.style.cursor = "default";
    }

    this.resetDrawingTools();

    // Force graphics layer refresh
    const drawLayer = this.stateManager.getDrawLayer();
    if (drawLayer) {
      drawLayer.refresh();
    }
  }

  /**
   * Clear all drawings and measurements
   */
  clearAll() {
    if (confirm("Clear all drawings and measurements?")) {
      const drawLayer = this.stateManager.getDrawLayer();
      const view = this.stateManager.getView();
      const measurementWidget = this.stateManager.getMeasurementWidget();
      const sketchViewModel = this.stateManager.getSketchViewModel();

      if (drawLayer) {
        drawLayer.removeAll();
      }
      if (view) {
        view.graphics.removeAll();
      }
      if (measurementWidget) {
        measurementWidget.clear();
      }
      if (sketchViewModel) {
        sketchViewModel.cancel();
      }
      this.resetDrawingTools();

      // Remove swipe widget if active
      if (this.swipeManager) {
        this.swipeManager.removeSwipe();
      }
    }
  }

  /**
   * Convert hex color to RGB array
   * @param {string} hex - Hex color string (e.g., "#2196F3")
   * @returns {number[]} RGB array [r, g, b]
   */
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [33, 150, 243]; // Default blue color
  }
}
