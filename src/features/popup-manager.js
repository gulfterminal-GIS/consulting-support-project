/**
 * PopupManager - Manages custom popup functionality for feature information display
 * Handles popup display, geometry calculations, and popup actions
 */

import { loadModule } from "../core/module-loader.js";

export class PopupManager {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
  }

  /**
   * Show custom popup for a feature with comprehensive attribute and geometry information
   * @param {esri.Graphic} graphic - The feature graphic to display
   * @param {esri.Point} mapPoint - The map point where popup should be positioned
   */
  showCustomPopup(graphic, mapPoint) {
    this.stateManager.setCurrentPopupFeature(graphic);
    const popup = document.getElementById("customPopup");
    const content = document.getElementById("popupContent");
    const title = document.getElementById("popupTitle");

    // Set title - use layer title or feature name if available
    const layerTitle = graphic.layer?.title || "Feature Information";
    const featureName =
      graphic.attributes?.name ||
      graphic.attributes?.Name ||
      graphic.attributes?.title ||
      graphic.attributes?.Title ||
      "";

    title.textContent = featureName || layerTitle;

    // Build comprehensive attribute table
    const attributes = graphic.attributes;
    let html = '<div class="attribute-list">';

    if (attributes && Object.keys(attributes).length > 0) {
      const sortedKeys = Object.keys(attributes).sort((a, b) => {
        // Fields to show at the end
        const endFields = [
          "shape_area",
          "shape__area",
          "shape_length",
          "shape__length",
          "shape_leng",
          "fid",
        ];
        const aIsEnd = endFields.some((f) => a.toLowerCase() === f.toLowerCase());
        const bIsEnd = endFields.some((f) => b.toLowerCase() === f.toLowerCase());

        if (aIsEnd && !bIsEnd) return 1;
        if (!aIsEnd && bIsEnd) return -1;

        // Put important fields first
        const priorityFields = [
          "name",
          "title",
          "id",
          "type",
          "category",
          "objectid",
        ];
        const aPriority = priorityFields.findIndex((f) =>
          a.toLowerCase().includes(f)
        );
        const bPriority = priorityFields.findIndex((f) =>
          b.toLowerCase().includes(f)
        );

        if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
        if (aPriority !== -1) return -1;
        if (bPriority !== -1) return 1;

        return a.localeCompare(b);
      });

      // Display each attribute
      sortedKeys.forEach((key) => {
        const value = attributes[key];

        // Skip internal fields
        if (key.startsWith("_") || key === "ObjectID" || key === "FID") {
          return;
        }

        // Format the value based on type
        let displayValue = this.formatAttributeValue(value, key);

        if (displayValue !== null && displayValue !== "") {
          html += `
            <div class="attribute-row">
              <span class="attribute-label">${this.formatFieldName(key)}:</span>
              <span class="attribute-value">${displayValue}</span>
            </div>
          `;
        }
      });
    } else {
      html += '<div class="no-attributes">No attributes available</div>';
    }

    html += "</div>";

    // Add geometry information
    if (graphic.geometry) {
      html += '<div class="geometry-info">';
      html += "<p class='geometry-title'>Geometry Information</p>";

      // Create a container for async geometry calculations
      html += '<div id="geometryDetails">Loading...</div>';
      html += "</div>";
    }

    // Add action buttons
    html += `
      <div class="popup-actions">
        <button class="popup-action-btn" onclick="zoomToFeature()">
          <i class="fas fa-search-plus"></i> Zoom to Feature
        </button>
        <button class="popup-action-btn" onclick="copyFeatureInfo()">
          <i class="fas fa-copy"></i> Copy Info
        </button>
      </div>
    `;

    content.innerHTML = html;

    // Position popup
    this.positionPopup(popup, mapPoint);

    // Show popup
    popup.classList.remove("hidden");

    // Now calculate geometry details asynchronously
    if (graphic.geometry) {
      this.updateGeometryDetails(graphic.geometry);
    }
  }

  /**
   * Show custom popup for tour feature in the tour controls panel
   * @param {esri.Graphic} graphic - The feature graphic to display
   */
  showCustomPopupTour(graphic) {
    const featureDetails = document.querySelector(
      ".feature-tour-controls .feature-details"
    );
    if (!featureDetails) {
      console.warn("Feature details element not found for tour popup");
      return;
    }

    this.stateManager.setCurrentPopupFeature(graphic);

    // Attributes
    const attributes = graphic.attributes;
    let html = '<div class="attributes-list">';

    if (attributes && Object.keys(attributes).length > 0) {
      const sortedKeys = Object.keys(attributes).sort((a, b) => {
        const endFields = ["shape_area", "shape_length", "fid"];

        // 1) Put end fields last
        const aIsEnd = endFields.includes(a.toLowerCase());
        const bIsEnd = endFields.includes(b.toLowerCase());
        if (aIsEnd && !bIsEnd) return 1;
        if (!aIsEnd && bIsEnd) return -1;

        // 2) Arabic fields detection
        const arabicRegex = /[\u0600-\u06FF]/;
        const aIsArabic = arabicRegex.test(a);
        const bIsArabic = arabicRegex.test(b);

        if (aIsArabic && !bIsArabic) return -1; // Arabic first
        if (!aIsArabic && bIsArabic) return 1;

        // 3) Otherwise, alphabetical
        return a.localeCompare(b);
      });

      sortedKeys.forEach((key) => {
        const value = attributes[key];
        if (key.startsWith("_") || key === "ObjectID" || key === "FID") return;

        let displayValue = this.formatAttributeValue(value, key);
        if (displayValue) {
          html += `
              <div class="item">
                <p class="label">${this.formatFieldName(key)}:</p>
                <span class="value">${displayValue}</span>
              </div>
            `;
        }
      });
    } else {
      html += '<div class="item">No attributes available</div>';
    }

    html += "</div>";

    // Geometry info (async update)
    // if (graphic.geometry) {
    //   html += `
    //     <div class="geometry-info">
    //       <h4>Geometry Information</h4>
    //       <div id="geometryDetails">Loading...</div>
    //     </div>
    //   `;
    // }

    // Action buttons
    // html += `
    //   <div class="popup-actions">
    //     <button class="popup-action-btn" onclick="zoomToFeature()">
    //       <i class="fas fa-search-plus"></i> Zoom to Feature
    //     </button>
    //     <button class="popup-action-btn" onclick="copyFeatureInfo()">
    //       <i class="fas fa-copy"></i> Copy Info
    //     </button>
    //   </div>
    // `;

    featureDetails.innerHTML = html;

    if (graphic.geometry) {
      this.updateGeometryDetails(graphic.geometry);
    }
  }

  /**
   * Close the custom popup and clear current feature
   */
  closeCustomPopup() {
    const popup = document.getElementById("customPopup");
    popup.classList.add("hidden");
    this.stateManager.setCurrentPopupFeature(null);
  }

  /**
   * Update geometry details asynchronously with calculations
   * @param {esri.Geometry} geometry - The geometry to calculate details for
   */
  async updateGeometryDetails(geometry) {
    const detailsDiv = document.getElementById("geometryDetails");
    if (!detailsDiv) return;

    let html = "";

    try {
      switch (geometry.type) {
        case "point":
          html = `
            <div class="attribute-row">
              <span class="attribute-label">Type:</span>
              <span class="attribute-value">Point</span>
            </div>
            <div class="attribute-row">
              <span class="attribute-label">Longitude:</span>
              <span class="attribute-value">${geometry.longitude.toFixed(
                6
              )}</span>
            </div>
            <div class="attribute-row">
              <span class="attribute-label">Latitude:</span>
              <span class="attribute-value">${geometry.latitude.toFixed(6)}</span>
            </div>
          `;
          break;

        case "polyline":
          const length = await this.calculateLength(geometry);
          html = `
            <div class="attribute-row">
              <span class="attribute-label">Type:</span>
              <span class="attribute-value">Line</span>
            </div>
            <div class="attribute-row">
              <span class="attribute-label">Length:</span>
              <span class="attribute-value">${length}</span>
            </div>
            <div class="attribute-row">
              <span class="attribute-label">Vertices:</span>
              <span class="attribute-value">${this.countVertices(geometry)}</span>
            </div>
          `;
          break;

        case "polygon":
          const area = await this.calculateArea(geometry);
          const perimeter = await this.calculatePerimeter(geometry);
          html = `
            <div class="attribute-row">
              <span class="attribute-label">Type:</span>
              <span class="attribute-value">Polygon</span>
            </div>
            <div class="attribute-row">
              <span class="attribute-label">Area:</span>
              <span class="attribute-value">${area}</span>
            </div>
            <div class="attribute-row">
              <span class="attribute-label">Perimeter:</span>
              <span class="attribute-value">${perimeter}</span>
            </div>
            <div class="attribute-row">
              <span class="attribute-label">Vertices:</span>
              <span class="attribute-value">${this.countVertices(geometry)}</span>
            </div>
          `;
          break;
      }

      detailsDiv.innerHTML = html;
    } catch (error) {
      console.error("Error calculating geometry details:", error);
      detailsDiv.innerHTML =
        '<div class="error-message">Unable to calculate geometry details</div>';
    }
  }

  /**
   * Zoom to the current popup feature
   */
  zoomToFeature() {
    if (
      this.stateManager.getCurrentPopupFeature() &&
      this.stateManager.getCurrentPopupFeature().geometry
    ) {
      this.stateManager.getView().goTo({
        target: this.stateManager.getCurrentPopupFeature().geometry,
        zoom: this.stateManager.getView().zoom + 2,
      });
    }
  }

  /**
   * Copy feature information to clipboard
   */
  copyFeatureInfo() {
    if (!this.stateManager.getCurrentPopupFeature()) return;

    let text = "Feature Information\n";
    text += "==================\n\n";

    // Add attributes
    if (this.stateManager.getCurrentPopupFeature().attributes) {
      text += "Attributes:\n";
      Object.entries(
        this.stateManager.getCurrentPopupFeature().attributes
      ).forEach(([key, value]) => {
        if (!key.startsWith("_") && key !== "ObjectID" && key !== "FID") {
          text += `${this.formatFieldName(key)}: ${value || "N/A"}\n`;
        }
      });
    }

    // Copy to clipboard
    navigator.clipboard
      .writeText(text)
      .then(() => {
        this.notificationManager.showNotification("Feature information copied to clipboard", "success");
      })
      .catch(() => {
        this.notificationManager.showNotification("Failed to copy to clipboard", "error");
      });
  }

  /**
   * Format attribute value based on type and content
   * @param {*} value - The value to format
   * @param {string} key - The attribute key name
   * @returns {string} Formatted value
   */
  formatAttributeValue(value, key) {
    if (value === null || value === undefined) {
      return "N/A";
    }

    // Check if it's a date field by name or value
    const dateKeywords = ["date", "time", "تاريخ", "وقت"];
    const keyLower = key.toLowerCase();
    const isDateField = dateKeywords.some((keyword) =>
      keyLower.includes(keyword)
    );

    // Check if value looks like a timestamp (large number)
    const isTimestamp =
      typeof value === "number" && value > 1000000000 && value < 10000000000000;

    if (isDateField || isTimestamp) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          // Format date in Gregorian (Miladi) format
          const day = date.getDate().toString().padStart(2, "0");
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const year = date.getFullYear();

          // If the time is 00:00, show only the date
          if (date.getHours() === 0 && date.getMinutes() === 0) {
            return `${day}/${month}/${year}`;
          }

          // Include time if it's not 00:00
          const hours = date.getHours().toString().padStart(2, "0");
          const minutes = date.getMinutes().toString().padStart(2, "0");
          return `${day}/${month}/${year} ${hours}:${minutes}`;
        }
      } catch (e) {
        // If date parsing fails, continue to default handling
      }
    }

    // Check if it's a number
    if (typeof value === "number") {
      // Format large numbers with commas, but not timestamps
      if (!isTimestamp && Math.abs(value) >= 1000) {
        return value.toLocaleString();
      }
      // Round decimals to 4 places
      if (value % 1 !== 0) {
        return value.toFixed(4).replace(/\.?0+$/, "");
      }
      return value.toString();
    }

    // Check if it's a boolean
    if (typeof value === "boolean") {
      return value
        ? '<span class="bool-true">Yes</span>'
        : '<span class="bool-false">No</span>';
    }

    // Check if it's a URL
    if (
      typeof value === "string" &&
      (value.startsWith("http://") || value.startsWith("https://"))
    ) {
      return `<a href="${value}" target="_blank" class="attribute-link">${value}</a>`;
    }

    // Check if it's an email
    if (typeof value === "string" && value.includes("@")) {
      return `<a href="mailto:${value}" class="attribute-link">${value}</a>`;
    }

    // Default string value
    return value.toString();
  }

  /**
   * Format field name for display
   * @param {string} fieldName - The field name to format
   * @returns {string} Formatted field name
   */
  formatFieldName(fieldName) {
    return fieldName
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  /**
   * Calculate length of a polyline geometry
   * @param {esri.Geometry} geometry - The geometry to calculate
   * @returns {Promise<string>} Formatted length string
   */
  async calculateLength(geometry) {
    try {
      const geometryEngine = await loadModule("esri/geometry/geometryEngine");

      const length = geometryEngine.geodesicLength(geometry, "meters");
      if (length > 1000) {
        return (length / 1000).toFixed(2) + " km";
      }
      return length.toFixed(2) + " m";
    } catch (error) {
      return "N/A";
    }
  }

  /**
   * Calculate area of a polygon geometry
   * @param {esri.Geometry} geometry - The geometry to calculate
   * @returns {Promise<string>} Formatted area string
   */
  async calculateArea(geometry) {
    try {
      const geometryEngine = await loadModule("esri/geometry/geometryEngine");

      const area = geometryEngine.geodesicArea(geometry, "square-meters");
      if (area > 1000000) {
        return (area / 1000000).toFixed(2) + " km²";
      } else if (area > 10000) {
        return (area / 10000).toFixed(2) + " ha";
      }
      return area.toFixed(2) + " m²";
    } catch (error) {
      return "N/A";
    }
  }

  /**
   * Calculate perimeter of a polygon geometry
   * @param {esri.Geometry} geometry - The geometry to calculate
   * @returns {Promise<string>} Formatted perimeter string
   */
  async calculatePerimeter(geometry) {
    try {
      const geometryEngine = await loadModule("esri/geometry/geometryEngine");

      const perimeter = geometryEngine.geodesicLength(geometry, "meters");
      if (perimeter > 1000) {
        return (perimeter / 1000).toFixed(2) + " km";
      }
      return perimeter.toFixed(2) + " m";
    } catch (error) {
      return "N/A";
    }
  }

  /**
   * Count vertices in a geometry
   * @param {esri.Geometry} geometry - The geometry to count vertices for
   * @returns {number} Number of vertices
   */
  countVertices(geometry) {
    if (geometry.type === "polygon") {
      return geometry.rings[0]?.length - 1 || 0; // -1 because first and last are same
    } else if (geometry.type === "polyline") {
      return geometry.paths[0]?.length || 0;
    }
    return 0;
  }

  /**
   * Position popup intelligently on screen
   * @param {HTMLElement} popup - The popup element
   * @param {esri.Point} mapPoint - The map point to position near
   */
  positionPopup(popup, mapPoint) {
    const view = this.stateManager.getView();
    const screenPoint = view.toScreen(mapPoint);
    const popupWidth = 400; // Max width from CSS
    const popupHeight = 500; // Estimated max height
    const padding = 20;

    let left = screenPoint.x + 10;
    let top = screenPoint.y + 10;

    // Check if popup would go off right edge
    if (left + popupWidth > window.innerWidth - padding) {
      left = screenPoint.x - popupWidth - 10;
    }

    // Check if popup would go off bottom edge
    if (top + popupHeight > window.innerHeight - padding) {
      top = screenPoint.y - popupHeight - 10;
    }

    // Ensure popup doesn't go off left or top edges
    left = Math.max(padding, left);
    top = Math.max(padding, top);

    popup.style.left = left + "px";
    popup.style.top = top + "px";
  }
}
