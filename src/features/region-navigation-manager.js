/**
 * RegionNavigationManager - Handles quick navigation to regions
 * 
 * Features:
 * - Quick zoom to specific regions
 * - Show all planners for selected region
 * - Highlight active region
 * - Return to home view
 */

import { loadModule } from "../core/module-loader.js";

export class RegionNavigationManager {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
  }

  /**
   * Navigate to a specific region
   * @param {string} regionName - Arabic name of the region
   */
  async navigateToRegion(regionName) {
    const view = this.stateManager.getView();
    const map = this.stateManager.getMap();
    
    if (!view || !map) {
      console.error("Map or view not available");
      return;
    }

    try {
      // Handle home button
      if (regionName === 'home') {
        await this.goToHome();
        this.updateActiveButton('home');
        return;
      }

      // Find the region group layer
      let regionLayer = null;
      map.layers.forEach(layer => {
        if (layer.type === 'group' && layer.title === regionName) {
          regionLayer = layer;
        }
      });

      if (!regionLayer) {
        this.notificationManager.showNotification(
          `لم يتم العثور على منطقة ${regionName}`,
          "warning"
        );
        return;
      }

      // Get all layers in the region
      const layers = regionLayer.layers.items;
      
      if (layers.length === 0) {
        this.notificationManager.showNotification(
          `لا توجد طبقات في منطقة ${regionName}`,
          "warning"
        );
        return;
      }

      // Calculate combined extent of all layers
      const geometryEngine = await loadModule("esri/geometry/geometryEngine");
      let combinedExtent = null;

      for (const layer of layers) {
        if (layer.fullExtent) {
          if (!combinedExtent) {
            combinedExtent = layer.fullExtent.clone();
          } else {
            combinedExtent = combinedExtent.union(layer.fullExtent);
          }
        }
      }

      if (combinedExtent) {
        // Zoom to the region
        await view.goTo(combinedExtent.expand(1.3), {
          duration: 1500,
          easing: "ease-in-out"
        });

        // Update active button
        this.updateActiveButton(regionName);

        // Show notification
        this.notificationManager.showNotification(
          `تم الانتقال إلى منطقة ${regionName}`,
          "success"
        );
      } else {
        this.notificationManager.showNotification(
          `لا يمكن تحديد موقع منطقة ${regionName}`,
          "error"
        );
      }

    } catch (error) {
      console.error("Error navigating to region:", error);
      this.notificationManager.showNotification(
        "حدث خطأ أثناء الانتقال إلى المنطقة",
        "error"
      );
    }
  }

  /**
   * Go to home view (Saudi Arabia overview)
   */
  async goToHome() {
    const view = this.stateManager.getView();
    const homeExtent = this.stateManager.getHomeExtent();

    if (!view) return;

    try {
      if (homeExtent) {
        await view.goTo(homeExtent, {
          duration: 1500,
          easing: "ease-in-out"
        });
      } else {
        // Default Saudi Arabia view
        await view.goTo({
          center: [45.0792, 23.8859],
          zoom: 6
        }, {
          duration: 1500,
          easing: "ease-in-out"
        });
      }

      this.notificationManager.showNotification(
        "تم العودة إلى الصفحة الرئيسية",
        "success"
      );
    } catch (error) {
      console.error("Error going to home:", error);
    }
  }

  /**
   * Update active button styling
   * @param {string} regionName - Name of the active region
   */
  updateActiveButton(regionName) {
    // Remove active class from all buttons
    document.querySelectorAll('.region-btn').forEach(btn => {
      btn.classList.remove('active');
    });

    // Add active class to selected button
    const activeBtn = document.querySelector(`.region-btn[data-region="${regionName}"]`);
    if (activeBtn) {
      activeBtn.classList.add('active');
    }
  }
}
