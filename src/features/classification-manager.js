/**
 * ClassificationManager
 * Handles data classification and styling for layers
 */

export class ClassificationManager {
  constructor(stateManager, notificationManager, panelManager, popupManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.panelManager = panelManager;
    this.popupManager = popupManager;
  }

  /**
   * Initialize the classification panel with layer and field selection
   */
  initializeClassificationPanel() {
    const layerSelect = document.getElementById("classifyLayerSelect");
    const fieldSelect = document.getElementById("classifyFieldSelect");
    const fieldSection = document.getElementById("classifyFieldSection");
    const actionsSection = document.querySelector(".classification-actions");

    // Populate layers
    layerSelect.innerHTML = '<option value="">Choose a layer...</option>';
    this.stateManager.getUploadedLayers().forEach((layer, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = layer.title;
      layerSelect.appendChild(option);
    });

    // Layer change handler
    layerSelect.addEventListener("change", async (e) => {
      const layerIndex = e.target.value;
      if (layerIndex === "") {
        fieldSection.style.display = "none";
        actionsSection.style.display = "none";
        document.getElementById("fieldStatistics").style.display = "none";
        return;
      }

      const layer = this.stateManager.getUploadedLayers()[parseInt(layerIndex)];
      this.stateManager.setCurrentClassificationLayer(layer);

      // Populate fields
      fieldSelect.innerHTML = '<option value="">Choose a field...</option>';
      if (layer.fields) {
        layer.fields.forEach((field) => {
          if (
            field.type === "double" ||
            field.type === "integer" ||
            field.type === "single" ||
            field.type === "small-integer" ||
            field.type === "string" ||
            field.type === "oid"
          ) {
            const option = document.createElement("option");
            option.value = field.name;
            option.textContent = this.popupManager.formatFieldName(field.name);
            fieldSelect.appendChild(option);
          }
        });
      }

      fieldSection.style.display = "block";
    });

    // Field change handler
    fieldSelect.addEventListener("change", async (e) => {
      const fieldName = e.target.value;
      if (fieldName && this.stateManager.getCurrentClassificationLayer()) {
        const stats = await this.analyzeFieldForClassification(
          this.stateManager.getCurrentClassificationLayer(),
          fieldName
        );
        this.showClassificationStatistics(stats);
        actionsSection.style.display = stats ? "flex" : "none";
      } else {
        document.getElementById("fieldStatistics").style.display = "none";
        actionsSection.style.display = "none";
      }
    });
  }

  /**
   * Analyze field values for classification
   * @param {Object} layer - The layer to analyze
   * @param {string} fieldName - The field name to analyze
   * @returns {Object|null} Statistics about the field values
   */
  async analyzeFieldForClassification(layer, fieldName) {
    try {
      const query = layer.createQuery();
      query.outFields = [fieldName];
      query.where = "1=1";
      query.returnGeometry = false;

      const results = await layer.queryFeatures(query);

      if (results.features.length === 0) {
        return null;
      }

      const values = results.features.map(
        (feature) => feature.attributes[fieldName]
      );
      const validValues = values.filter(
        (value) => value !== null && value !== undefined && value !== ""
      );

      // Count occurrences
      const valueCount = {};
      validValues.forEach((value) => {
        const key = String(value);
        valueCount[key] = (valueCount[key] || 0) + 1;
      });

      // Sort by count
      const sortedValues = Object.entries(valueCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20); // Limit to top 20

      return {
        totalFeatures: results.features.length,
        validCount: validValues.length,
        uniqueCount: Object.keys(valueCount).length,
        sortedValues: sortedValues,
        fieldName: fieldName,
      };
    } catch (error) {
      console.error("Error analyzing field:", error);
      this.notificationManager.showNotification("Error analyzing field values", "error");
      return null;
    }
  }

  /**
   * Show classification statistics in the UI
   * @param {Object|null} stats - Statistics to display
   */
  showClassificationStatistics(stats) {
    const statsDiv = document.getElementById("fieldStatistics");
    const statsContent = statsDiv.querySelector(".stats-content");

    if (!stats) {
      statsDiv.style.display = "none";
      return;
    }

    let html = `
      <div class="stats-summary">
        <div><strong>Total Features:</strong> ${stats.totalFeatures}</div>
        <div><strong>Valid Values:</strong> ${stats.validCount}</div>
        <div><strong>Unique Values:</strong> ${stats.uniqueCount}</div>
      </div>
    `;

    if (stats.uniqueCount <= 20) {
      html += "<div><label class='form-label'>Top Values:</label></div>";
      html += '<div class="stats-values">';

      stats.sortedValues.forEach(([value, count]) => {
        const percentage = ((count / stats.validCount) * 100).toFixed(1);
        html += `
          <div class="stat-value-item">
            <span class="stat-value-name">${value}</span>
            <span class="stat-value-count">${count} (${percentage}%)</span>
          </div>
        `;
      });

      html += "</div>";
    } else {
      html += `
        <div style="color: var(--warning-color); margin-top: var(--spacing-sm);">
          <i class="fas fa-exclamation-triangle"></i> 
          Too many unique values (${stats.uniqueCount}). Showing top 20 values only.
        </div>
      `;
    }

    statsContent.innerHTML = html;
    statsDiv.style.display = "block";
  }

  /**
   * Generate colors for classification
   * @param {number} count - Number of colors to generate
   * @returns {Array} Array of RGB color arrays
   */
  generateClassificationColors(count) {
    const colorSchemes = [
      // Blue to Red
      [
        [56, 149, 211],
        [65, 171, 93],
        [255, 204, 0],
        [255, 127, 0],
        [215, 25, 28],
      ],
      // Purple to Orange
      [
        [94, 79, 162],
        [158, 154, 200],
        [247, 247, 247],
        [253, 174, 97],
        [244, 109, 67],
      ],
      // Green gradient
      [
        [247, 252, 245],
        [199, 233, 192],
        [120, 198, 121],
        [49, 163, 84],
        [0, 109, 44],
      ],
      // Spectral
      [
        [215, 48, 39],
        [252, 141, 89],
        [254, 224, 139],
        [145, 191, 219],
        [69, 117, 180],
      ],
    ];

    // Use a color scheme based on count
    const schemeIndex = count % colorSchemes.length;
    const scheme = colorSchemes[schemeIndex];

    const colors = [];
    for (let i = 0; i < count; i++) {
      if (count <= scheme.length) {
        colors.push(scheme[i]);
      } else {
        // Interpolate colors if we need more than available
        const index = (i / (count - 1)) * (scheme.length - 1);
        const lowerIndex = Math.floor(index);
        const upperIndex = Math.ceil(index);
        const ratio = index - lowerIndex;

        const lowerColor = scheme[lowerIndex];
        const upperColor = scheme[upperIndex];

        const interpolated = [
          Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * ratio),
          Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * ratio),
          Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * ratio),
        ];

        colors.push(interpolated);
      }
    }

    return colors;
  }

  /**
   * Apply classification to the selected layer
   */
  async applyClassification() {
    const fieldSelect = document.getElementById("classifyFieldSelect");
    const fieldName = fieldSelect.value;

    if (!fieldName || !this.stateManager.getCurrentClassificationLayer()) {
      this.notificationManager.showNotification("Please select a field for classification", "error");
      return;
    }

    try {
      this.notificationManager.showNotification("Applying classification...", "info");

      const stats = await this.analyzeFieldForClassification(
        this.stateManager.getCurrentClassificationLayer(),
        fieldName
      );

      if (!stats || stats.uniqueCount === 0) {
        this.notificationManager.showNotification("No valid values found", "error");
        return;
      }

      // Store original renderer
      const currentLayer = this.stateManager.getCurrentClassificationLayer();
      if (!this.stateManager.getOriginalRenderer(currentLayer.id)) {
        this.stateManager.setOriginalRenderer(
          currentLayer.id,
          currentLayer.renderer
        );
      }

      const colors = this.generateClassificationColors(stats.sortedValues.length);
      const geometryType = currentLayer.geometryType;

      // Create unique value infos
      const uniqueValueInfos = stats.sortedValues.map(([value, count], index) => {
        const color = colors[index];
        let symbol;

        switch (geometryType) {
          case "point":
            symbol = {
              type: "simple-marker",
              color: color,
              size: 10,
              outline: {
                color: [255, 255, 255, 1],
                width: 1,
              },
            };
            break;
          case "polyline":
            symbol = {
              type: "simple-line",
              color: color,
              width: 3,
              style: "solid",
            };
            break;
          case "polygon":
            symbol = {
              type: "simple-fill",
              color: [...color, 0.7],
              outline: {
                color: color,
                width: 2,
              },
            };
            break;
        }

        return {
          value: value,
          symbol: symbol,
          label: `${value} (${count})`,
        };
      });

      // Create default symbol
      const defaultSymbol = this.createDefaultClassificationSymbol(geometryType);

      // Apply renderer
      currentLayer.renderer = {
        type: "unique-value",
        field: fieldName,
        uniqueValueInfos: uniqueValueInfos,
        defaultSymbol: defaultSymbol,
        defaultLabel: "Other",
      };

      // Create legend
      // this.createClassificationLegend(stats, colors, fieldName);

      // Close panel
      this.panelManager.closeSidePanel();
      this.notificationManager.showNotification("Classification applied successfully", "success");
    } catch (error) {
      console.error("Error applying classification:", error);
      this.notificationManager.showNotification("Error applying classification", "error");
    }
  }

  /**
   * Create default symbol for classification
   * @param {string} geometryType - Type of geometry (point, polyline, polygon)
   * @returns {Object} Default symbol configuration
   */
  createDefaultClassificationSymbol(geometryType) {
    const grayColor = [128, 128, 128];

    switch (geometryType) {
      case "point":
        return {
          type: "simple-marker",
          color: [...grayColor, 0.6],
          size: 8,
          outline: {
            color: [255, 255, 255, 0.8],
            width: 1,
          },
        };
      case "polyline":
        return {
          type: "simple-line",
          color: [...grayColor, 0.6],
          width: 2,
        };
      case "polygon":
        return {
          type: "simple-fill",
          color: [...grayColor, 0.3],
          outline: {
            color: grayColor,
            width: 1,
          },
        };
    }
  }

  /**
   * Create classification legend
   * @param {Object} stats - Classification statistics
   * @param {Array} colors - Array of colors
   * @param {string} fieldName - Field name being classified
   */
  createClassificationLegend(stats, colors, fieldName) {
    // Remove existing legend
    const existingLegend = document.getElementById("classificationLegend");
    if (existingLegend) {
      existingLegend.remove();
    }

    const legendDiv = document.createElement("div");
    legendDiv.id = "classificationLegend";
    legendDiv.className = "classification-legend";

    let legendHTML = `
      <div class="widget-header" style="margin: -12px -12px 12px; padding: 12px;">
        <h3 style="font-size: 16px; display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-list" style="color: var(--primary-color);"></i>
          ${
            fieldName === "GARDENSTATUS"
              ? "حالة الحديقة"
              : this.popupManager.formatFieldName(fieldName)
          }
        </h3>
        <button class="widget-close" onclick="removeClassificationLegend()">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;

    stats.sortedValues.forEach(([value, count], index) => {
      const color = colors[index];
      const percentage = ((count / stats.validCount) * 100).toFixed(1);

      legendHTML += `
        <div class="legend-item">
          <div class="legend-color" style="background-color: rgb(${color[0]}, ${color[1]}, ${color[2]})"></div>
          <div class="legend-label">${value}</div>
          <div class="legend-count">${count}</div>
        </div>
      `;
    });

    legendDiv.innerHTML = legendHTML;
    document.body.appendChild(legendDiv);
  }

  /**
   * Reset classification to original renderer
   */
  resetClassification() {
    const currentLayer = this.stateManager.getCurrentClassificationLayer();
    if (!currentLayer) return;

    const originalRenderer = this.stateManager.getOriginalRenderer(currentLayer.id);
    if (originalRenderer) {
      currentLayer.renderer = originalRenderer;
      this.stateManager.setOriginalRenderer(currentLayer.id, null);
    }

    this.removeClassificationLegend();
    this.notificationManager.showNotification("Classification reset", "success");
  }

  /**
   * Remove classification legend from the UI
   */
  removeClassificationLegend() {
    const legend = document.getElementById("classificationLegend");
    if (legend) {
      legend.remove();
    }
  }

  /**
   * Auto-apply default classification to a layer
   * @param {Object} layer - The layer to classify
   * @param {string} fieldName - The field name to classify by
   */
  async autoApplyDefaultClassification(layer, fieldName) {
    try {
      const stats = await this.analyzeFieldForClassification(layer, fieldName);
      if (!stats || stats.uniqueCount === 0) {
        console.warn(`No valid values found in ${fieldName}`);
        return;
      }

      // Store current layer in state
      this.stateManager.setCurrentClassificationLayer(layer);

      const colors = this.generateClassificationColors(stats.sortedValues.length);
      const geometryType = layer.geometryType;

      const uniqueValueInfos = stats.sortedValues.map(([value, count], index) => {
        const color = colors[index];
        let symbol;
        switch (geometryType) {
          case "point":
            symbol = {
              type: "simple-marker",
              color,
              size: 10,
              outline: { color: [255, 255, 255], width: 1 },
            };
            break;
          case "polyline":
            symbol = { type: "simple-line", color, width: 2 };
            break;
          case "polygon":
            symbol = {
              type: "simple-fill",
              color: [...color, 0.7],
              outline: { color, width: 1 },
            };
            break;
        }
        return { value, symbol, label: `${value} (${count})` };
      });

      // Default symbol
      const defaultSymbol = this.createDefaultClassificationSymbol(geometryType);

      // Apply renderer
      layer.renderer = {
        type: "unique-value",
        field: fieldName,
        uniqueValueInfos,
        defaultSymbol,
        defaultLabel: "Other",
      };

      // Show legend
      // this.createClassificationLegend(stats, colors, fieldName);

      console.log(`Classification applied on ${fieldName}`);
    } catch (err) {
      console.error("Error auto-applying classification:", err);
    }
  }
}
