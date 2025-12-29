/**
 * CoordinateDisplay - Manages coordinate tracking and display
 * 
 * Handles:
 * - Real-time coordinate display on pointer move
 * - Coordinate formatting
 * - Copy coordinates to clipboard functionality
 */

export class CoordinateDisplay {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.currentCoords = { lat: 0, lon: 0 };
  }

  /**
   * Initialize coordinate display functionality
   */
  initialize() {
    const view = this.stateManager.getView();
    
    if (!view) {
      console.warn("CoordinateDisplay: view not available");
      return;
    }

    // Setup pointer move handler for coordinate tracking
    view.on("pointer-move", (event) => {
      this.updateCoordinates(event);
    });

    // Setup copy button
    this.initializeCopyButton();

    console.log("Coordinate display initialized");
  }

  /**
   * Update coordinates on pointer move
   * @param {Object} event - Pointer move event
   */
  updateCoordinates(event) {
    const view = this.stateManager.getView();
    if (!view) return;

    const point = view.toMap({ x: event.x, y: event.y });
    if (point) {
      this.currentCoords.lat = point.latitude.toFixed(6);
      this.currentCoords.lon = point.longitude.toFixed(6);
      
      const coordDisplay = document.getElementById("coordDisplay");
      if (coordDisplay) {
        coordDisplay.textContent = this.formatCoordinates(
          this.currentCoords.lat,
          this.currentCoords.lon
        );
      }
    }
  }

  /**
   * Format coordinates for display
   * @param {number} lat - Latitude
   * @param {number} lon - Longitude
   * @returns {string} Formatted coordinate string
   */
  formatCoordinates(lat, lon) {
    return `Lat: ${lat}, Lon: ${lon}`;
  }

  /**
   * Initialize copy coordinates button
   */
  initializeCopyButton() {
    const copyBtn = document.getElementById("copyCoords");
    if (!copyBtn) return;

    copyBtn.addEventListener("click", () => {
      this.copyCoordinates();
    });
  }

  /**
   * Copy current coordinates to clipboard
   */
  async copyCoordinates() {
    const coordText = `${this.currentCoords.lat}, ${this.currentCoords.lon}`;
    const copyBtn = document.getElementById("copyCoords");

    try {
      await navigator.clipboard.writeText(coordText);

      // Visual feedback
      if (copyBtn) {
        copyBtn.classList.add("copied");
        const icon = copyBtn.querySelector("i");
        if (icon) {
          icon.classList.remove("fa-copy");
          icon.classList.add("fa-check");
        }
      }

      this.notificationManager.showNotification(
        "Coordinates copied!",
        "success"
      );

      // Reset after 2 seconds
      setTimeout(() => {
        if (copyBtn) {
          copyBtn.classList.remove("copied");
          const icon = copyBtn.querySelector("i");
          if (icon) {
            icon.classList.remove("fa-check");
            icon.classList.add("fa-copy");
          }
        }
      }, 2000);
    } catch (error) {
      this.notificationManager.showNotification(
        "Failed to copy coordinates",
        "error"
      );
    }
  }

  /**
   * Get current coordinates
   * @returns {Object} Current coordinates {lat, lon}
   */
  getCurrentCoordinates() {
    return { ...this.currentCoords };
  }
}
