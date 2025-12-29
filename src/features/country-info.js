/**
 * CountryInfo - Manages country click feature and info display
 * 
 * Handles:
 * - Country click detection and info display
 * - Flash animation for country boundaries
 * - Country info timeout management
 * - Integration with uploaded layers to avoid conflicts
 */

import { loadModule } from "../core/module-loader.js";

export class CountryInfo {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
  }

  /**
   * Handle country click for info display
   * @param {Object} event - Map click event
   * @param {Array} uploadedLayers - Array of uploaded layers to check against
   */
  async handleCountryClick(event, uploadedLayers = []) {
    const countriesLayer = this.stateManager.getCountriesLayer();
    const view = this.stateManager.getView();
    
    if (!countriesLayer || !view) return;

    try {
      // First check if we clicked on any uploaded features
      const response = await view.hitTest(event);
      const uploadedFeatureHit = response.results.find(
        (result) =>
          result.graphic &&
          result.graphic.layer &&
          uploadedLayers.includes(result.graphic.layer)
      );

      // If we clicked on an uploaded feature, don't show country info
      if (uploadedFeatureHit) {
        return;
      }

      // Now proceed with country query
      const query = countriesLayer.createQuery();
      query.geometry = event.mapPoint;
      query.spatialRelationship = "intersects";
      query.outFields = ["COUNTRY", "Shape__Area", "Shape__Length"];
      query.returnGeometry = true;

      const result = await countriesLayer.queryFeatures(query);

      if (result.features.length > 0) {
        const feature = result.features[0];
        this.showCountryInfo(feature);
      }
    } catch (error) {
      console.error("Error querying country:", error);
    }
  }

  /**
   * Show country information display
   * @param {Object} feature - Country feature with attributes and geometry
   */
  async showCountryInfo(feature) {
    const view = this.stateManager.getView();
    const flashGraphicsLayer = this.stateManager.getFlashGraphicsLayer();
    
    if (!view || !flashGraphicsLayer) return;

    const countryName = feature.attributes.COUNTRY;
    const area = Math.floor(feature.attributes.Shape__Area / 1000000);
    const length = Math.floor(feature.attributes.Shape__Length / 1000);

    // Clear previous animations
    flashGraphicsLayer.removeAll();

    // Update info display
    const countryNameEl = document.getElementById("countryName");
    const countryDetailsEl = document.getElementById("countryDetails");
    const infoDisplay = document.getElementById("countryInfo");

    if (countryNameEl) {
      countryNameEl.textContent = countryName;
    }
    
    if (countryDetailsEl) {
      countryDetailsEl.innerHTML = `
        <strong>Area:</strong> ${area.toLocaleString()} km²<br>
        <strong>Perimeter:</strong> ${length.toLocaleString()} km
      `;
    }

    // Show the info display
    if (infoDisplay) {
      infoDisplay.classList.remove("hidden");
    }

    // Zoom to country with animation
    try {
      await view.goTo({
        target: feature.geometry.extent.expand(1.2),
        duration: 1000,
      });
    } catch (error) {
      console.warn("Error zooming to country:", error);
    }

    // Add flash animation
    await this.flashCountryBoundary(feature.geometry);

    // Hide after 5 seconds
    this.clearCountryInfoTimeout();
    const timeout = setTimeout(() => {
      if (infoDisplay) {
        infoDisplay.classList.add("hidden");
      }
      flashGraphicsLayer.removeAll();
    }, 5000);
    
    this.stateManager.setCountryInfoTimeout(timeout);
  }

  /**
   * Hide country information display
   */
  hideCountryInfo() {
    const infoDisplay = document.getElementById("countryInfo");
    if (infoDisplay) {
      infoDisplay.classList.add("hidden");
    }
    
    const flashGraphicsLayer = this.stateManager.getFlashGraphicsLayer();
    if (flashGraphicsLayer) {
      flashGraphicsLayer.removeAll();
    }
    
    this.clearCountryInfoTimeout();
  }

  /**
   * Create modern flash animation for country boundary
   * @param {Object} geometry - Country geometry to flash
   */
  async flashCountryBoundary(geometry) {
    const flashGraphicsLayer = this.stateManager.getFlashGraphicsLayer();
    if (!flashGraphicsLayer) return;

    try {
      const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

      // Clear previous animations
      flashGraphicsLayer.removeAll();

      // Simple yellow flash animation
      let opacity = 1;
      const flashInterval = 50; // milliseconds
      let flashCount = 0;
      const maxFlashes = 3;

      const flash = () => {
        flashGraphicsLayer.removeAll();

        // Create simple flash graphic
        const flashGraphic = new Graphic({
          geometry: geometry,
          symbol: {
            type: "simple-fill",
            color: [255, 255, 0, opacity * 0.4], // Yellow fill
            outline: {
              color: [255, 255, 0, opacity], // Yellow outline
              width: 3,
            },
          },
        });

        flashGraphicsLayer.add(flashGraphic);

        // Toggle opacity for flash effect
        if (flashCount % 2 === 0) {
          opacity = 0.3;
        } else {
          opacity = 1;
        }

        flashCount++;

        if (flashCount < maxFlashes * 2) {
          setTimeout(flash, flashInterval);
        } else {
          // Final highlight
          setTimeout(() => {
            flashGraphicsLayer.removeAll();

            const finalGraphic = new Graphic({
              geometry: geometry,
              symbol: {
                type: "simple-fill",
                color: [255, 255, 0, 0.15], // Light yellow fill
                outline: {
                  color: [255, 215, 0], // Gold outline
                  width: 2,
                },
              },
            });

            flashGraphicsLayer.add(finalGraphic);

            // Fade out after 2 seconds
            setTimeout(() => {
              flashGraphicsLayer.removeAll();
            }, 2000);
          }, 100);
        }
      };

      // Start the flash immediately
      flash();
    } catch (error) {
      console.error("Error creating flash animation:", error);
    }
  }

  /**
   * Clear country info timeout
   */
  clearCountryInfoTimeout() {
    const timeout = this.stateManager.getCountryInfoTimeout();
    if (timeout) {
      clearTimeout(timeout);
      this.stateManager.setCountryInfoTimeout(null);
    }
  }
}
