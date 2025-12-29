/**
 * BasemapManager - Manages basemap selection and switching
 * Handles basemap gallery widget and panel-based basemap selection
 */

export class BasemapManager {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.activeBasemapWidget = null;
  }

  /**
   * Initialize basemap panel functionality when opened
   * Sets up basemap selection and switching from the basemap panel
   */
  initializeBasemapPanel() {
    const basemapItems = document.querySelectorAll(
      "#sidePanelContent .basemap-item"
    );

    basemapItems.forEach((item) => {
      item.addEventListener("click", () => {
        const basemap = item.dataset.basemap;
        this.switchBasemap(basemap);

        // Update active state in UI
        basemapItems.forEach((b) => b.classList.remove("active"));
        item.classList.add("active");
      });
    });
  }

  /**
   * Switch to a different basemap
   * @param {string} basemapId - The basemap identifier (e.g., "hybrid", "streets", "topo")
   */
  switchBasemap(basemapId) {
    const map = this.stateManager.getMap();
    
    if (map) {
      try {
        map.basemap = basemapId;
        this.notificationManager.showNotification(
          `Basemap changed to ${basemapId}`,
          "success"
        );
      } catch (error) {
        console.error("Error switching basemap:", error);
        this.notificationManager.showNotification(
          "Failed to switch basemap",
          "error"
        );
      }
    } else {
      console.error("Map not initialized");
      this.notificationManager.showNotification(
        "Map not ready",
        "error"
      );
    }
  }

  /**
   * Get the current basemap
   * @returns {string} The current basemap identifier
   */
  getCurrentBasemap() {
    const map = this.stateManager.getMap();
    return map ? map.basemap : null;
  }

  /**
   * Toggle the basemap gallery widget
   * Creates and displays an expandable basemap gallery widget
   */
  async toggleBasemapGallery() {
    const view = this.stateManager.getView();
    
    if (!view) {
      this.notificationManager.showNotification(
        "Map view not ready",
        "error"
      );
      return;
    }

    try {
      if (!this.activeBasemapWidget) {
        // Load required ArcGIS modules
        const [BasemapGallery, Expand] = await Promise.all([
          loadModule("esri/widgets/BasemapGallery"),
          loadModule("esri/widgets/Expand"),
        ]);

        // Create basemap gallery widget
        const basemapGallery = new BasemapGallery({
          view: view,
        });

        // Wrap in expand widget
        const expand = new Expand({
          view: view,
          content: basemapGallery,
          expandIconClass: "esri-icon-basemap",
          expandTooltip: "Basemap Gallery",
        });

        view.ui.add(expand, "top-left");
        this.activeBasemapWidget = expand;
        
        this.notificationManager.showNotification(
          "Basemap gallery opened",
          "success"
        );
      } else {
        // Remove and destroy the widget
        view.ui.remove(this.activeBasemapWidget);
        this.activeBasemapWidget.destroy();
        this.activeBasemapWidget = null;
        
        this.notificationManager.showNotification(
          "Basemap gallery closed",
          "success"
        );
      }
    } catch (error) {
      console.error("Error toggling basemap gallery:", error);
      this.notificationManager.showNotification(
        "Failed to toggle basemap gallery",
        "error"
      );
    }
  }

  /**
   * Cleanup method to destroy active widgets
   */
  destroy() {
    if (this.activeBasemapWidget) {
      const view = this.stateManager.getView();
      if (view) {
        view.ui.remove(this.activeBasemapWidget);
      }
      this.activeBasemapWidget.destroy();
      this.activeBasemapWidget = null;
    }
  }
}

/**
 * Helper function to load ArcGIS modules
 * @param {string} moduleName - The module path to load
 * @returns {Promise} Promise that resolves to the loaded module
 */
async function loadModule(moduleName) {
  return new Promise((resolve, reject) => {
    require([moduleName], (module) => {
      resolve(module);
    }, reject);
  });
}
