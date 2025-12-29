/**
 * MapEventHandler - Manages map event handlers
 * 
 * Handles:
 * - Map click events for features and countries
 * - Pointer move events
 * - Feature selection and popup display
 * - Integration with CountryInfo for country clicks
 */

export class MapEventHandler {
  constructor(stateManager, popupManager, countryInfo) {
    this.stateManager = stateManager;
    this.popupManager = popupManager;
    this.countryInfo = countryInfo;
  }

  /**
   * Initialize all map event handlers
   */
  initializeEventHandlers() {
    const view = this.stateManager.getView();
    
    if (!view) {
      console.warn("MapEventHandler: view not available");
      return;
    }

    // Setup click handler
    view.on("click", async (event) => {
      await this.handleMapClick(event);
    });

    // Setup pointer move handler if needed
    // view.on("pointer-move", (event) => {
    //   this.handlePointerMove(event);
    // });

    console.log("Map event handlers initialized");
  }

  /**
   * Handle map click events
   * @param {Object} event - Map click event
   */
  async handleMapClick(event) {
    const view = this.stateManager.getView();
    const uploadedLayers = this.stateManager.getUploadedLayers();
    
    if (!view) return;

    // Check for country first
    if (this.countryInfo) {
      await this.countryInfo.handleCountryClick(event, uploadedLayers);
    }

    try {
      const response = await view.hitTest(event);

      // Filter for actual features with graphics
      const results = response.results.filter(
        (result) =>
          result.graphic && result.graphic.layer && result.graphic.attributes
      );

      if (results.length > 0) {
        const result = results[0];
        const graphic = result.graphic;

        // For feature layers, query the feature to ensure we have all attributes
        if (graphic.layer && graphic.layer.queryFeatures) {
          try {
            const query = graphic.layer.createQuery();
            query.where = `${graphic.layer.objectIdField} = ${
              graphic.attributes[graphic.layer.objectIdField]
            }`;
            query.outFields = ["*"];
            query.returnGeometry = true;

            const featureSet = await graphic.layer.queryFeatures(query);
            if (featureSet.features.length > 0) {
              // Use the queried feature which should have all attributes
              this.popupManager.showCustomPopup(
                featureSet.features[0],
                event.mapPoint
              );
            } else {
              this.popupManager.showCustomPopup(graphic, event.mapPoint);
            }
          } catch (queryError) {
            console.warn(
              "Could not query feature, using hitTest result:",
              queryError
            );
            this.popupManager.showCustomPopup(graphic, event.mapPoint);
          }
        } else {
          this.popupManager.showCustomPopup(graphic, event.mapPoint);
        }
      } else {
        this.popupManager.closeCustomPopup();
      }
    } catch (error) {
      console.error("Error in click handler:", error);
    }
  }

  /**
   * Handle pointer move events
   * @param {Object} event - Pointer move event
   */
  handlePointerMove(event) {
    // Implement pointer move logic if needed
    // For example: cursor changes, hover effects, etc.
  }

  /**
   * Handle feature click
   * @param {Object} graphic - Feature graphic
   * @param {Object} mapPoint - Click map point
   */
  handleFeatureClick(graphic, mapPoint) {
    if (this.popupManager) {
      this.popupManager.showCustomPopup(graphic, mapPoint);
    }
  }
}
