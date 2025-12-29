// Widget Manager
// Manages widget lifecycle, visibility, and positioning for all map widgets

import { loadModule } from "../core/module-loader.js";
import { LegendWidget } from "./legend-widget.js";
import { BookmarksWidget } from "./bookmarks-widget.js";
import { PrintWidget } from "./print-widget.js";

export class WidgetManager {
  constructor(stateManager, notificationManager, panelManager, drawingManager, popupManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.panelManager = panelManager;
    this.drawingManager = drawingManager;
    this.activeWidgets = new Map();
    
    // Initialize widget modules
    this.legendWidget = new LegendWidget(stateManager, notificationManager, popupManager);
    this.bookmarksWidget = new BookmarksWidget(stateManager, notificationManager);
    this.printWidget = new PrintWidget(stateManager, notificationManager);
  }

  /**
   * Toggle a widget on/off
   * @param {string} widgetName - Name of the widget to toggle
   */
  async toggleWidget(widgetName) {
    try {
      switch (widgetName) {
        case "legend":
          await this.toggleLegend();
          break;
        case "bookmarks":
          await this.toggleBookmarks();
          break;
        case "print":
          await this.togglePrint();
          break;
        case "home":
          await this.toggleHome();
          break;
        case "fullscreen":
          await this.toggleFullscreen();
          break;
        case "swipe":
          // Open swipe configuration panel instead of simple toggle
          if (this.stateManager.getUploadedLayers().length === 0) {
            this.notificationManager.showNotification(
              "يجب رفع طبقة واحدة على الأقل لاستخدام المقارنة",
              "error"
            );
            return;
          }
          this.panelManager.openSidePanel("مقارنة الطبقات", "swipePanelTemplate");
          break;
        default:
          console.warn(`Unknown widget: ${widgetName}`);
      }
    } catch (error) {
      console.error(`Error toggling ${widgetName} widget:`, error);
      this.notificationManager.showNotification(
        `Error loading ${widgetName} widget`,
        "error"
      );
    }
  }

  /**
   * Toggle Legend widget
   */
  async toggleLegend() {
    await this.legendWidget.toggle();
  }

  /**
   * Toggle Bookmarks widget
   */
  async toggleBookmarks() {
    await this.bookmarksWidget.toggle();
  }

  /**
   * Delete a bookmark (delegated to BookmarksWidget)
   * @param {number} index - Index of bookmark to delete
   */
  deleteBookmark(index) {
    this.bookmarksWidget.deleteBookmark(index);
  }

  /**
   * Toggle Print widget
   */
  async togglePrint() {
    await this.printWidget.toggle();
  }

  /**
   * Toggle Home widget - returns to home extent
   */
  async toggleHome() {
    const btn = document.querySelector('[onclick*="home"]');
    const homeExtent = this.stateManager.getHomeExtent();

    if (!homeExtent) {
      this.notificationManager.showNotification(
        "Home extent not available",
        "error"
      );
      return;
    }

    // Animate button
    btn.classList.add("active");

    // Go to home extent using view's goTo method
    this.stateManager
      .getView()
      .goTo(homeExtent, {
        duration: 1000,
        easing: "ease-in-out",
      })
      .then(() => {
        this.notificationManager.showNotification(
          "Returned to home extent",
          "success"
        );

        // Remove active state after animation
        setTimeout(() => {
          btn.classList.remove("active");
        }, 500);
      })
      .catch((error) => {
        console.error("Error going to home extent:", error);
        this.notificationManager.showNotification(
          "Unable to return to home extent",
          "error"
        );
        btn.classList.remove("active");
      });
  }

  /**
   * Toggle Fullscreen mode
   */
  async toggleFullscreen() {
    const btn = document.querySelector('[onclick*="fullscreen"]');

    if (!btn) return;

    const icon = btn.querySelector("i");

    const isFullscreen =
      document.fullscreenElement ||
      document.webkitFullscreenElement ||
      document.mozFullScreenElement ||
      document.msFullscreenElement;

    if (!isFullscreen) {
      const elem = document.documentElement;
      const requestFullscreen =
        elem.requestFullscreen ||
        elem.webkitRequestFullscreen ||
        elem.mozRequestFullScreen ||
        elem.msRequestFullscreen;

      if (requestFullscreen) {
        requestFullscreen
          .call(elem)
          .then(() => {
            btn.classList.add("active");
            if (icon) {
              icon.classList.remove("fa-expand");
              icon.classList.add("fa-compress");
            }

            this.activeWidgets.set("fullscreen", true);
            this.notificationManager.showNotification(
              "Entered fullscreen mode",
              "success"
            );
          })
          .catch((error) => {
            console.error("Error entering fullscreen:", error);
            this.notificationManager.showNotification(
              "Unable to enter fullscreen mode",
              "error"
            );
          });
      }
    } else {
      const exitFullscreen =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.mozCancelFullScreen ||
        document.msExitFullscreen;

      if (exitFullscreen) {
        exitFullscreen
          .call(document)
          .then(() => {
            btn.classList.remove("active");
            if (icon) {
              icon.classList.remove("fa-compress");
              icon.classList.add("fa-expand");
            }

            this.activeWidgets.delete("fullscreen");
            this.notificationManager.showNotification(
              "Exited fullscreen mode",
              "success"
            );
          })
          .catch((error) => {
            console.error("Error exiting fullscreen:", error);
          });
      }
    }
  }

  /**
   * Initialize fullscreen change listener
   */
  initializeFullscreenListener() {
    const fullscreenEvents = [
      "fullscreenchange",
      "webkitfullscreenchange",
      "mozfullscreenchange",
      "MSFullscreenChange",
    ];

    fullscreenEvents.forEach((eventName) => {
      document.addEventListener(eventName, () => {
        const btn = document.querySelector('[onclick*="fullscreen"]');
        if (!btn) return;

        const icon = btn.querySelector("i");
        if (!icon) return;

        const isFullscreen =
          document.fullscreenElement ||
          document.webkitFullscreenElement ||
          document.mozFullScreenElement ||
          document.msFullscreenElement;

        if (!isFullscreen) {
          // User exited fullscreen
          btn.classList.remove("active");
          icon.classList.remove("fa-compress");
          icon.classList.add("fa-expand");
          this.activeWidgets.delete("fullscreen");
        }
      });
    });
  }

  /**
   * Toggle Swipe widget for layer comparison
   * @deprecated This method is no longer used. Use SwipeManager via the swipe panel instead.
   * Kept for reference only - the swipe functionality now uses SwipeManager with full configuration panel.
   */
  async toggleSwipe() {
    if (!this.activeWidgets.has("swipe")) {
      if (this.stateManager.getUploadedLayers().length < 2) {
        this.notificationManager.showNotification(
          "Need at least 2 layers for swipe comparison",
          "error"
        );
        return;
      }

      // Temporarily suppress console warnings for deprecated widget
      const originalWarn = console.warn;
      console.warn = () => {};

      try {
        const [Swipe] = await Promise.all([loadModule("esri/widgets/Swipe")]);

        const swipe = new Swipe({
          view: this.stateManager.getView(),
          leadingLayers: [this.stateManager.getUploadedLayers()[0]],
          trailingLayers: [this.stateManager.getUploadedLayers()[1]],
          direction: "horizontal",
          position: 50,
        });

        this.stateManager.getView().ui.add(swipe);
        this.activeWidgets.set("swipe", swipe);
        this.notificationManager.showNotification(
          "Swipe between first two layers",
          "info"
        );

        // Update widget button state
        document.querySelector('[onclick*="swipe"]').classList.add("active");
      } finally {
        // Restore console.warn
        console.warn = originalWarn;
      }
    } else {
      const swipe = this.activeWidgets.get("swipe");
      this.stateManager.getView().ui.remove(swipe);
      swipe.destroy();
      this.activeWidgets.delete("swipe");

      // Remove active state
      document.querySelector('[onclick*="swipe"]').classList.remove("active");
    }
  }

  /**
   * Zoom in
   */
  async zoomIn() {
    const currentZoom = this.stateManager.getView().zoom;
    this.stateManager.getView().goTo({
      zoom: currentZoom + 1,
      duration: 300,
    });
  }

  /**
   * Zoom out
   */
  async zoomOut() {
    const currentZoom = this.stateManager.getView().zoom;
    this.stateManager.getView().goTo({
      zoom: currentZoom - 1,
      duration: 300,
    });
  }

  /**
   * Get active widgets map
   * @returns {Map} Active widgets map
   */
  getActiveWidgets() {
    return this.activeWidgets;
  }
}
