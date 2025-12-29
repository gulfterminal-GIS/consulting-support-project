// Legend Widget
// Manages the legend widget display and updates

import { loadModule } from "../core/module-loader.js";

export class LegendWidget {
  constructor(stateManager, notificationManager, popupManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.popupManager = popupManager;
    this.legendInstance = null;
  }

  /**
   * Toggle Legend widget visibility
   */
  async toggle() {
    const legendDiv = document.getElementById("legendWidget");
    
    // Check if legend widget exists in DOM
    if (!legendDiv) {
      console.warn("Legend widget element not found in DOM");
      return;
    }

    if (!this.legendInstance || legendDiv.classList.contains("hidden")) {
      if (!this.legendInstance) {
        const [Legend] = await Promise.all([loadModule("esri/widgets/Legend")]);

        this.legendInstance = new Legend({
          view: this.stateManager.getView(),
          container: "legendContent",
        });
      }

      // Update layer infos every time it's shown
      this.updateLayerInfos();

      legendDiv.classList.remove("hidden");

      // Update button state
      const btn = document.querySelector('[onclick*="legend"]');
      if (btn) btn.classList.add("active");
    } else {
      legendDiv.classList.add("hidden");

      // Update button state
      const btn = document.querySelector('[onclick*="legend"]');
      if (btn) btn.classList.remove("active");
    }
  }

  /**
   * Update legend layer infos
   */
  updateLayerInfos() {
    if (!this.legendInstance) return;

    this.legendInstance.layerInfos = [
      ...this.stateManager.getUploadedLayers().map((layer) => ({
        layer: layer,
        title: layer.title,
      })),
      {
        layer: this.stateManager.getDrawLayer(),
        title: "Drawings",
      },
    ];
  }

  /**
   * Get legend instance
   * @returns {Object} Legend widget instance
   */
  getLegendInstance() {
    return this.legendInstance;
  }
}
