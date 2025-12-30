/**
 * ToolbarManager - Manages desktop and mobile toolbar functionality
 * 
 * Responsibilities:
 * - Initialize desktop toolbar buttons and event handlers
 * - Initialize mobile toolbar menu and navigation
 * - Handle toolbar button clicks and actions
 * - Manage active button states
 * - Coordinate with PanelManager for panel opening
 * 
 * Dependencies:
 * - StateManager: For accessing map state
 * - PanelManager: For opening side panels
 * - NotificationManager: For user notifications
 */

import { loadModule } from '../core/module-loader.js';

export class ToolbarManager {
  constructor(stateManager, panelManager, notificationManager, drawingManager, measurementManager) {
    this.stateManager = stateManager;
    this.panelManager = panelManager;
    this.notificationManager = notificationManager;
    this.drawingManager = drawingManager;
    this.measurementManager = measurementManager;

    // Store references to toolbar elements
    this.mobileToggle = null;
    this.mobileMenu = null;
    this.mobileClose = null;
  }

  /**
   * Initialize both desktop and mobile toolbars
   */
  initialize() {
    this.initializeDesktopToolbar();
    this.initializeMobileToolbar();
    this.initializeTools();
  }

  /**
   * Initialize desktop toolbar buttons
   */
  initializeDesktopToolbar() {
    // Upload button - with toggle functionality
    const uploadBtn = document.getElementById("uploadBtn");
    if (uploadBtn) {
      uploadBtn.addEventListener("click", () => {
        const panel = document.getElementById("sidePanel");
        const isUploadPanelOpen = panel.classList.contains("active") && panel.classList.contains("upload-panel");
        
        if (isUploadPanelOpen) {
          // If upload panel is already open, close it
          this.panelManager.closeSidePanel();
        } else {
          // Otherwise, open the upload panel
          this.panelManager.openSidePanel("Upload Files", "uploadPanelTemplate");
        }
      });
    }

    // Layers button - with toggle functionality
    const layersBtn = document.getElementById("layersBtn");
    if (layersBtn) {
      layersBtn.addEventListener("click", () => {
        const panel = document.getElementById("sidePanel");
        const isLayersPanelOpen = panel.classList.contains("active") && panel.classList.contains("layers-panel");
        
        if (isLayersPanelOpen) {
          // If layers panel is already open, close it
          this.panelManager.closeSidePanel();
        } else {
          // Otherwise, open the layers panel
          this.panelManager.openSidePanel("الطبقات", "layersPanelTemplate");
        }
      });
    }

    // Basemap button - with toggle functionality
    const basemapBtn = document.getElementById("basemapBtn");
    if (basemapBtn) {
      basemapBtn.addEventListener("click", () => {
        const panel = document.getElementById("sidePanel");
        const isBasemapPanelOpen = panel.classList.contains("active") && panel.classList.contains("basemap-panel");
        
        if (isBasemapPanelOpen) {
          // If basemap panel is already open, close it
          this.panelManager.closeSidePanel();
        } else {
          // Otherwise, open the basemap panel
          this.panelManager.openSidePanel("Basemap", "basemapPanelTemplate");
        }
      });
    }

    // Analysis button - with toggle functionality
    const analysisBtn = document.getElementById("analysisBtn");
    if (analysisBtn) {
      analysisBtn.addEventListener("click", () => {
        const panel = document.getElementById("sidePanel");
        const isAnalysisPanelOpen = panel.classList.contains("active") && panel.classList.contains("analysis-panel");
        
        if (isAnalysisPanelOpen) {
          // If analysis panel is already open, close it
          this.panelManager.closeSidePanel();
        } else {
          // Otherwise, open the analysis panel
          this.panelManager.openSidePanel("Spatial Analysis", "analysisPanelTemplate");
        }
      });
    }

    // Visualization button
    const visualizeBtn = document.getElementById("visualizeBtn");
    if (visualizeBtn) {
      visualizeBtn.addEventListener("click", () => {
        visualizeBtn.classList.toggle("active");
        this.panelManager.openSidePanel("Visualization", "visualizationPanelTemplate");
      });
    }

    // Classification button - with toggle functionality
    const classificationBtn = document.getElementById("classificationBtn");
    if (classificationBtn) {
      classificationBtn.addEventListener("click", () => {
        const panel = document.getElementById("sidePanel");
        const isClassificationPanelOpen = panel.classList.contains("active") && panel.classList.contains("classification-panel");
        
        if (isClassificationPanelOpen) {
          // If classification panel is already open, close it
          this.panelManager.closeSidePanel();
        } else {
          // Otherwise, open the classification panel
          this.panelManager.openSidePanel("Classification", "classificationPanelTemplate");
        }
      });
    }

    // Table button
    const tableBtn = document.getElementById("tableBtn");
    if (tableBtn) {
      tableBtn.addEventListener("click", () => {
        tableBtn.classList.toggle("active");
        // Note: toggleAttributeTable will be handled by AttributeTable module in future
      });
    }

    // Swipe button
    const swipeBtn = document.getElementById("swipeBtn");
    if (swipeBtn) {
      swipeBtn.addEventListener("click", () => {
        swipeBtn.classList.toggle("active");
        this.panelManager.openSidePanel("مقارنة الطبقات", "swipePanelTemplate");
      });
    }

    // Reports button - with toggle functionality
    const reportsBtn = document.getElementById("reportsBtn");
    if (reportsBtn) {
      reportsBtn.addEventListener("click", () => {
        const panel = document.getElementById("sidePanel");
        const isReportsPanelOpen = panel.classList.contains("active") && panel.classList.contains("reports-panel");
        
        if (isReportsPanelOpen) {
          // If reports panel is already open, close it
          this.panelManager.closeSidePanel();
        } else {
          // Otherwise, open the reports panel
          this.panelManager.openSidePanel("التقارير", "reportsPanelTemplate");
        }
      });
    }

    // Advanced Search button
    const advancedSearchBtn = document.getElementById("advancedSearchBtn");
    if (advancedSearchBtn) {
      advancedSearchBtn.addEventListener("click", () => {
        const panel = document.getElementById("sidePanel");
        const isOpen = panel.classList.contains("active") && panel.classList.contains("advanced-search-panel");
        
        if (isOpen) {
          // Close if already open
          this.panelManager.closeSidePanel();
        } else {
          // Open if closed
          advancedSearchBtn.classList.toggle("active");
          this.panelManager.openSidePanel("بحث متقدم", "advancedSearchPanelTemplate");
        }
      });
    }
  }

  /**
   * Initialize mobile toolbar menu
   */
  initializeMobileToolbar() {
    this.mobileToggle = document.getElementById("mobileToolbarToggle");
    this.mobileMenu = document.getElementById("mobileToolbarMenu");
    this.mobileClose = document.getElementById("mobileMenuClose");

    if (!this.mobileToggle || !this.mobileMenu || !this.mobileClose) {
      console.warn("Mobile toolbar elements not found");
      return;
    }

    // Open mobile menu
    this.mobileToggle.addEventListener("click", () => {
      this.mobileMenu.classList.add("active");
    });

    // Close mobile menu
    this.mobileClose.addEventListener("click", () => {
      this.mobileMenu.classList.remove("active");
    });

    // Close mobile menu on outside click
    this.mobileMenu.addEventListener("click", (e) => {
      if (e.target === this.mobileMenu) {
        this.mobileMenu.classList.remove("active");
      }
    });

    // Mobile menu item clicks
    document.querySelectorAll(".mobile-menu-item").forEach((item) => {
      item.addEventListener("click", () => {
        const action = item.dataset.action;
        if (action) {
          this.mobileMenu.classList.remove("active");
          this.handleToolbarAction(action);
        }
      });
    });
  }

  /**
   * Initialize tool buttons (draw, clear, locate)
   */
  initializeTools() {
    // Draw tool
    const drawBtn = document.getElementById("drawBtn");
    if (drawBtn) {
      drawBtn.addEventListener("click", () => this.toggleDraw());
    }

    // Clear tool
    const clearBtn = document.getElementById("clearBtn");
    if (clearBtn) {
      clearBtn.addEventListener("click", () => {
        this.drawingManager.clearAll();
      });
    }

    // Locate tool
    const locateBtn = document.getElementById("locateBtn");
    if (locateBtn) {
      locateBtn.addEventListener("click", () => this.locateUser());
    }
  }

  /**
   * Handle toolbar actions from mobile menu
   * @param {string} action - The action to perform
   */
  handleToolbarAction(action) {
    switch (action) {
      case "upload":
        this.panelManager.openSidePanel("Upload Files", "uploadPanelTemplate");
        break;
      case "layers":
        this.panelManager.openSidePanel("الطبقات", "layersPanelTemplate");
        break;
      case "basemap":
        this.panelManager.openSidePanel("Basemap", "basemapPanelTemplate");
        break;
      case "measure":
        this.measurementManager.toggleMeasurement();
        break;
      case "draw":
        this.panelManager.openSidePanel("Drawing Tools", "drawingPanelTemplate");
        this.drawingManager.initializeDrawingPanel();
        break;
      case "locate":
        this.locateUser();
        break;
      case "analysis":
        this.panelManager.openSidePanel("Spatial Analysis", "analysisPanelTemplate");
        break;
      case "visualize":
        this.panelManager.openSidePanel("Visualization", "visualizationPanelTemplate");
        break;
      case "classification":
        this.panelManager.openSidePanel("Classification", "classificationPanelTemplate");
        break;
      case "swipe":
        this.panelManager.openSidePanel("مقارنة الطبقات", "swipePanelTemplate");
        break;
      case "reports":
        this.panelManager.openSidePanel("التقارير", "reportsPanelTemplate");
        break;
      case "advancedSearch":
        this.panelManager.openSidePanel("بحث متقدم", "advancedSearchPanelTemplate");
        break;
      default:
        console.warn(`Unknown toolbar action: ${action}`);
    }
  }

  /**
   * Toggle drawing tools panel
   */
  async toggleDraw() {
    const btn = document.getElementById("drawBtn");

    if (!btn) {
      console.error("Draw button not found");
      return;
    }

    // Check if drawing panel is already open
    const panel = document.getElementById("sidePanel");
    const isDrawingPanelOpen = panel.classList.contains("active") && panel.classList.contains("drawing-panel");
    
    if (isDrawingPanelOpen) {
      // If drawing panel is already open, close it
      btn.classList.remove("active");
      this.panelManager.closeSidePanel();
      this.drawingManager.stopDrawing();
      
      const sketchViewModel = this.stateManager.getSketchViewModel();
      if (sketchViewModel) {
        sketchViewModel.cancel();
      }
      
      this.drawingManager.resetDrawingTools();
    } else {
      // Deactivate other tools
      const measureBtn = document.getElementById("measureBtn");
      if (measureBtn) {
        measureBtn.classList.remove("active");
      }
      
      const measurementWidget = this.stateManager.getMeasurementWidget();
      const view = this.stateManager.getView();
      
      if (measurementWidget && view) {
        measurementWidget.clear();
        view.ui.remove(measurementWidget);
      }

      btn.classList.add("active");
      this.panelManager.openSidePanel("Drawing Tools", "drawingPanelTemplate");
      
      await this.drawingManager.initializeSketchViewModel();
      this.drawingManager.initializeDrawingPanel();
    }
  }

  /**
   * Locate user using geolocation
   */
  async locateUser() {
    const btn = document.getElementById("locateBtn");

    if (!navigator.geolocation) {
      this.notificationManager.showNotification(
        "Geolocation is not supported by your browser",
        "error"
      );
      return;
    }

    btn.classList.add("locating");
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const [Point, Graphic] = await Promise.all([
            loadModule("esri/geometry/Point"),
            loadModule("esri/Graphic"),
          ]);

          const userLocation = new Point({
            longitude: position.coords.longitude,
            latitude: position.coords.latitude,
          });

          const view = this.stateManager.getView();
          if (!view) {
            throw new Error("Map view not available");
          }

          // Add location graphic
          const locationGraphic = new Graphic({
            geometry: userLocation,
            symbol: {
              type: "simple-marker",
              style: "circle",
              color: [0, 122, 255, 0.8],
              size: 12,
              outline: {
                color: [255, 255, 255, 1],
                width: 2,
              },
            },
          });

          view.graphics.add(locationGraphic);

          // Go to location
          await view.goTo({
            target: userLocation,
            zoom: 15,
          });

          btn.classList.remove("locating");
          btn.innerHTML = '<i class="fas fa-crosshairs"></i>';

          // Remove graphic after 5 seconds
          setTimeout(() => {
            view.graphics.remove(locationGraphic);
          }, 5000);
        } catch (error) {
          console.error("Error showing user location:", error);
          btn.classList.remove("locating");
          btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
          this.notificationManager.showNotification(
            "Unable to display your location",
            "error"
          );
        }
      },
      (error) => {
        btn.classList.remove("locating");
        btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
        this.notificationManager.showNotification(
          "Unable to retrieve your location",
          "error"
        );
        console.error("Geolocation error:", error);
      }
    );
  }

  /**
   * Set active state for a toolbar button
   * @param {string} buttonId - The ID of the button to activate
   */
  setActiveButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.add("active");
    }
  }

  /**
   * Remove active state from a toolbar button
   * @param {string} buttonId - The ID of the button to deactivate
   */
  removeActiveButton(buttonId) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.classList.remove("active");
    }
  }

  /**
   * Clear all active toolbar button states
   */
  clearAllActiveButtons() {
    const toolbarButtons = document.querySelectorAll('.toolbar-btn, .mobile-menu-item');
    toolbarButtons.forEach(btn => btn.classList.remove('active'));
  }
}
