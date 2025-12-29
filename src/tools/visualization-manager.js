/**
 * VisualizationManager - Manages heatmap and time animation visualization
 *
 * This module handles:
 * - Heatmap visualization for point layers
 * - Heatmap settings and customization
 * - Time-aware layer controls
 * - Time slider and animation
 *
 * Extracted from script.js as part of the modularization effort.
 */

import { loadModule } from "../core/module-loader.js";

export class VisualizationManager {
  constructor(stateManager, notificationManager, layerManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.layerManager = layerManager;
    
    // Heatmap state
    this.heatmapEnabled = false;
    this.heatmapLayer = null;
    this.currentHeatmapSettings = {
      field: null,
      radius: 10,
      maxPixelIntensity: 100,
      blurRadius: 10,
      colorScheme: "default",
      minDensity: 0,
      maxDensity: 0.5,
    };
    
    // Time animation state
    this.timeSlider = null;
    this.timeAnimation = null;
    this.timeEnabledLayer = null;
    
    // Color schemes for heatmap
    this.heatmapColorSchemes = {
      default: [
        { ratio: 0, color: [133, 193, 233, 0] },
        { ratio: 0.2, color: [144, 237, 125, 0.5] },
        { ratio: 0.5, color: [254, 227, 132, 0.8] },
        { ratio: 0.8, color: [252, 146, 114, 1] },
        { ratio: 1, color: [227, 26, 28, 1] },
      ],
      fire: [
        { ratio: 0, color: [255, 255, 204, 0] },
        { ratio: 0.25, color: [255, 237, 160, 0.5] },
        { ratio: 0.5, color: [254, 178, 76, 0.8] },
        { ratio: 0.75, color: [253, 141, 60, 1] },
        { ratio: 1, color: [227, 26, 28, 1] },
      ],
      ocean: [
        { ratio: 0, color: [237, 248, 251, 0] },
        { ratio: 0.25, color: [178, 226, 226, 0.5] },
        { ratio: 0.5, color: [102, 194, 164, 0.8] },
        { ratio: 0.75, color: [44, 162, 95, 1] },
        { ratio: 1, color: [0, 109, 44, 1] },
      ],
    };
  }

  /**
   * Toggle heatmap visualization on/off
   */
  async toggleHeatmap() {
    const toggle = document.getElementById("heatmapToggle");
    const layerSelect = document.getElementById("heatmapLayerSelect");
    const controls = document.getElementById("heatmapControls");

    this.heatmapEnabled = toggle.checked;

    if (this.heatmapEnabled) {
      // Show controls container
      if (controls) {
        controls.style.display = "flex";
      }

      this.updateHeatmapLayerSelect();

      if (layerSelect.value) {
        await this.applyHeatmap(parseInt(layerSelect.value));
      }
    } else {
      // Hide controls container
      if (controls) {
        controls.style.display = "none";
      }

      this.restoreOriginalRenderers();
    }
  }

  /**
   * Update heatmap layer select dropdown
   */
  updateHeatmapLayerSelect() {
    const select = document.getElementById("heatmapLayerSelect");
    select.innerHTML = '<option value="">Select point layer...</option>';

    // Only show point layers
    this.stateManager.getUploadedLayers().forEach((layer, index) => {
      // Check if layer has point geometry
      if (
        layer.geometryType === "point" ||
        (layer.source &&
          layer.source.length > 0 &&
          layer.source.items[0]?.geometry?.type === "point")
      ) {
        const option = document.createElement("option");
        option.value = index;
        option.textContent = layer.title;
        select.appendChild(option);
      }
    });

    select.addEventListener("change", async (e) => {
      if (e.target.value && this.heatmapEnabled) {
        await this.applyHeatmap(parseInt(e.target.value));
      }
    });
  }

  /**
   * Apply heatmap to a layer
   */
  async applyHeatmap(layerIndex) {
    try {
      const layer = this.stateManager.getUploadedLayers()[layerIndex];
      if (!layer) return;

      const [HeatmapRenderer] = await Promise.all([
        loadModule("esri/renderers/HeatmapRenderer"),
      ]);

      if (!this.stateManager.getOriginalRenderer(layer.id)) {
        this.stateManager.setOriginalRenderer(layer.id, layer.renderer);
      }

      // Create heatmap renderer with density settings
      const heatmapRenderer = new HeatmapRenderer({
        field: this.currentHeatmapSettings.field,
        colorStops: this.heatmapColorSchemes[this.currentHeatmapSettings.colorScheme],
        radius: this.currentHeatmapSettings.radius,
        maxPixelIntensity: this.currentHeatmapSettings.maxPixelIntensity,
        minPixelIntensity: 0,
        blurRadius: this.currentHeatmapSettings.blurRadius,
        maxDensity: this.currentHeatmapSettings.maxDensity,
        minDensity: this.currentHeatmapSettings.minDensity,
      });

      layer.renderer = heatmapRenderer;
      this.heatmapLayer = layer;

      this.updateHeatmapFieldSelect(layer);
      this.notificationManager.showNotification("Heatmap applied", "success");
    } catch (error) {
      console.error("Error applying heatmap:", error);
      this.notificationManager.showNotification("Error applying heatmap", "error");
    }
  }

  /**
   * Restore original renderers for all layers
   */
  restoreOriginalRenderers() {
    this.stateManager.getUploadedLayers().forEach((layer) => {
      const originalRenderer = this.stateManager.getOriginalRenderer(layer.id);
      if (originalRenderer) {
        layer.renderer = originalRenderer;
        this.stateManager.setOriginalRenderer(layer.id, null);
      }
    });
    this.heatmapLayer = null;
  }

  /**
   * Show heatmap settings modal
   */
  showHeatmapSettings() {
    if (!this.heatmapLayer) {
      this.notificationManager.showNotification("Please select a layer first", "error");
      return;
    }

    const modal = document.getElementById("heatmapModal");
    modal.classList.remove("hidden");

    // Initialize sliders
    this.initializeHeatmapSliders();
  }

  /**
   * Close heatmap settings modal
   */
  closeHeatmapSettings() {
    document.getElementById("heatmapModal").classList.add("hidden");
  }

  /**
   * Initialize heatmap slider controls
   */
  initializeHeatmapSliders() {
    // Radius slider
    const radiusSlider = document.getElementById("heatmapRadius");
    const radiusValue = document.getElementById("radiusValue");
    radiusSlider.value = this.currentHeatmapSettings.radius;
    radiusValue.textContent = this.currentHeatmapSettings.radius;

    radiusSlider.addEventListener("input", (e) => {
      radiusValue.textContent = e.target.value;
      this.currentHeatmapSettings.radius = parseInt(e.target.value);
    });

    // Intensity slider
    const intensitySlider = document.getElementById("heatmapIntensity");
    const intensityValue = document.getElementById("intensityValue");
    intensitySlider.value = this.currentHeatmapSettings.maxIntensity;
    intensityValue.textContent = this.currentHeatmapSettings.maxIntensity;

    intensitySlider.addEventListener("input", (e) => {
      intensityValue.textContent = e.target.value;
      this.currentHeatmapSettings.maxIntensity = parseInt(e.target.value);
    });

    // Blur slider
    const blurSlider = document.getElementById("heatmapBlur");
    const blurValue = document.getElementById("blurValue");
    blurSlider.value = this.currentHeatmapSettings.blurRadius;
    blurValue.textContent = this.currentHeatmapSettings.blurRadius;

    blurSlider.addEventListener("input", (e) => {
      blurValue.textContent = e.target.value;
      this.currentHeatmapSettings.blurRadius = parseInt(e.target.value);
    });

    // Min Density slider
    const minDensitySlider = document.getElementById("heatmapMinDensity");
    const minDensityValue = document.getElementById("minDensityValue");
    minDensitySlider.value = this.currentHeatmapSettings.minDensity;
    minDensityValue.textContent = this.currentHeatmapSettings.minDensity;

    minDensitySlider.addEventListener("input", (e) => {
      minDensityValue.textContent = e.target.value;
      this.currentHeatmapSettings.minDensity = parseFloat(e.target.value);
    });

    // Max Density slider
    const maxDensitySlider = document.getElementById("heatmapMaxDensity");
    const maxDensityValue = document.getElementById("maxDensityValue");
    maxDensitySlider.value = this.currentHeatmapSettings.maxDensity;
    maxDensityValue.textContent = this.currentHeatmapSettings.maxDensity;

    maxDensitySlider.addEventListener("input", (e) => {
      maxDensityValue.textContent = e.target.value;
      this.currentHeatmapSettings.maxDensity = parseFloat(e.target.value);
    });
  }

  /**
   * Update heatmap field select dropdown
   */
  updateHeatmapFieldSelect(layer) {
    const select = document.getElementById("heatmapField");
    select.innerHTML = '<option value="">None (Equal weight)</option>';

    if (layer.fields) {
      layer.fields.forEach((field) => {
        if (
          field.type === "double" ||
          field.type === "integer" ||
          field.type === "single" ||
          field.type === "small-integer"
        ) {
          const option = document.createElement("option");
          option.value = field.name;
          option.textContent = this.formatFieldName(field.name);
          select.appendChild(option);
        }
      });
    }

    select.value = this.currentHeatmapSettings.field || "";
  }

  /**
   * Select color scheme for heatmap
   */
  selectColorScheme(scheme) {
    this.currentHeatmapSettings.colorScheme = scheme;

    // Update UI
    document.querySelectorAll(".color-scheme").forEach((btn) => {
      btn.classList.remove("active");
    });
    document.querySelector(`[data-scheme="${scheme}"]`).classList.add("active");
  }

  /**
   * Apply heatmap settings
   */
  async applyHeatmapSettings() {
    if (!this.heatmapLayer) return;

    try {
      const [HeatmapRenderer] = await Promise.all([
        loadModule("esri/renderers/HeatmapRenderer"),
      ]);

      const fieldSelect = document.getElementById("heatmapField");
      this.currentHeatmapSettings.field = fieldSelect.value || null;

      const heatmapRenderer = new HeatmapRenderer({
        field: this.currentHeatmapSettings.field,
        colorStops: this.heatmapColorSchemes[this.currentHeatmapSettings.colorScheme],
        radius: this.currentHeatmapSettings.radius,
        maxPixelIntensity: this.currentHeatmapSettings.maxPixelIntensity,
        minPixelIntensity: 0,
        blurRadius: this.currentHeatmapSettings.blurRadius,
        maxDensity: this.currentHeatmapSettings.maxDensity,
        minDensity: this.currentHeatmapSettings.minDensity,
      });

      this.heatmapLayer.renderer = heatmapRenderer;

      this.closeHeatmapSettings();
      this.notificationManager.showNotification("Heatmap settings applied", "success");
    } catch (error) {
      console.error("Error applying heatmap settings:", error);
      this.notificationManager.showNotification("Error applying settings", "error");
    }
  }

  /**
   * Toggle time controls panel
   */
  async toggleTimeControls() {
    const toggle = document.getElementById("timeToggle");
    const panel = document.getElementById("timeControlsPanel");

    if (toggle.checked) {
      panel.style.display = "flex";
      this.initializeTimeLayerSelect();
    } else {
      panel.style.display = "none";
      if (this.timeSlider) {
        this.destroyTimeSlider();
      }
    }
  }

  /**
   * Initialize time layer select dropdown
   */
  initializeTimeLayerSelect() {
    const select = document.getElementById("timeLayerSelect");
    select.innerHTML = '<option value="">Select time-enabled layer...</option>';

    this.stateManager.getUploadedLayers().forEach((layer, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = layer.title;
      select.appendChild(option);
    });

    select.addEventListener("change", async (e) => {
      if (e.target.value !== "") {
        await this.setupTimeFields(parseInt(e.target.value));
      }
    });
  }

  /**
   * Setup time fields for selected layer
   */
  async setupTimeFields(layerIndex) {
    const layer = this.stateManager.getUploadedLayers()[layerIndex];
    this.timeEnabledLayer = layer;

    const fieldSelect = document.getElementById("timeFieldSelect");
    const fieldContainer = document.querySelector(".time-field-select");

    fieldSelect.innerHTML = '<option value="">Select date field...</option>';

    // Get date fields
    if (layer.fields) {
      const dateFields = layer.fields.filter(
        (field) =>
          field.type === "date" ||
          field.name.toLowerCase().includes("date") ||
          field.name.toLowerCase().includes("time")
      );

      if (dateFields.length === 0) {
        // If no date fields, check all fields for date-like values
        layer.fields.forEach((field) => {
          const option = document.createElement("option");
          option.value = field.name;
          option.textContent = this.formatFieldName(field.name);
          fieldSelect.appendChild(option);
        });
      } else {
        dateFields.forEach((field) => {
          const option = document.createElement("option");
          option.value = field.name;
          option.textContent = this.formatFieldName(field.name);
          fieldSelect.appendChild(option);
        });
      }
    }

    fieldContainer.style.display = "block";

    fieldSelect.addEventListener("change", async (e) => {
      if (e.target.value !== "") {
        await this.createTimeSlider(layer, e.target.value);
      }
    });
  }

  /**
   * Create time slider widget
   */
  async createTimeSlider(layer, dateField) {
    try {
      const [TimeSlider] = await Promise.all([
        loadModule("esri/widgets/TimeSlider"),
      ]);

      // Query to get date range
      const query = layer.createQuery();
      query.where = "1=1";
      query.outFields = [dateField];

      const result = await layer.queryFeatures(query);

      // Get min and max dates
      let minDate = null;
      let maxDate = null;

      result.features.forEach((feature) => {
        const dateValue = feature.attributes[dateField];
        if (dateValue) {
          const date = new Date(dateValue);
          if (!isNaN(date.getTime())) {
            if (!minDate || date < minDate) minDate = date;
            if (!maxDate || date > maxDate) maxDate = date;
          }
        }
      });

      if (!minDate || !maxDate) {
        this.notificationManager.showNotification("No valid dates found in selected field", "error");
        return;
      }

      // Destroy existing time slider
      if (this.timeSlider) {
        this.destroyTimeSlider();
      }

      // Create time slider
      this.timeSlider = new TimeSlider({
        container: "timeSliderDiv",
        mode: "time-window",
        fullTimeExtent: {
          start: minDate,
          end: maxDate,
        },
        timeExtent: {
          start: minDate,
          end: maxDate,
        },
        stops: {
          interval: {
            value: 1,
            unit: "days",
          },
        },
      });

      // Apply time filter to layer
      this.timeSlider.watch("timeExtent", (timeExtent) => {
        if (this.timeEnabledLayer && timeExtent) {
          const startTime = timeExtent.start.getTime();
          const endTime = timeExtent.end.getTime();

          // Create definition expression
          const definitionExpression = `${dateField} >= ${startTime} AND ${dateField} <= ${endTime}`;
          this.timeEnabledLayer.definitionExpression = definitionExpression;
        }
      });

      document.querySelector(".time-slider-container").style.display = "block";
      this.notificationManager.showNotification("Time slider created successfully", "success");
    } catch (error) {
      console.error("Time slider error:", error);
      this.notificationManager.showNotification("Error creating time slider", "error");
    }
  }

  /**
   * Destroy time slider and clean up
   */
  destroyTimeSlider() {
    if (this.timeSlider) {
      this.timeSlider.destroy();
      this.timeSlider = null;
    }

    if (this.timeEnabledLayer) {
      this.timeEnabledLayer.definitionExpression = null;
      this.timeEnabledLayer = null;
    }

    if (this.timeAnimation) {
      clearInterval(this.timeAnimation);
      this.timeAnimation = null;
    }

    document.querySelector(".time-slider-container").style.display = "none";
  }

  /**
   * Play/pause time animation
   */
  playTimeAnimation() {
    if (!this.timeSlider) return;

    const playIcon = document.getElementById("playIcon");
    const speed = parseFloat(document.getElementById("animationSpeed").value);

    if (this.timeAnimation) {
      // Pause
      clearInterval(this.timeAnimation);
      this.timeAnimation = null;
      playIcon.className = "fas fa-play";
    } else {
      // Play
      playIcon.className = "fas fa-pause";

      const fullExtent = this.timeSlider.fullTimeExtent;
      const interval = this.timeSlider.stops.interval;
      const animationDelay = 1000 / speed; // milliseconds

      this.timeAnimation = setInterval(() => {
        const currentEnd = this.timeSlider.timeExtent.end;
        const nextEnd = new Date(
          currentEnd.getTime() + interval.value * 86400000
        ); // Convert days to ms

        if (nextEnd <= fullExtent.end) {
          this.timeSlider.timeExtent = {
            start: this.timeSlider.timeExtent.start,
            end: nextEnd,
          };
        } else {
          // Loop back to start
          this.timeSlider.timeExtent = {
            start: fullExtent.start,
            end: new Date(
              fullExtent.start.getTime() +
                (currentEnd - this.timeSlider.timeExtent.start)
            ),
          };
        }
      }, animationDelay);
    }
  }

  /**
   * Stop time animation and reset
   */
  stopTimeAnimation() {
    if (this.timeAnimation) {
      clearInterval(this.timeAnimation);
      this.timeAnimation = null;
      document.getElementById("playIcon").className = "fas fa-play";
    }

    // Reset to full extent
    if (this.timeSlider) {
      this.timeSlider.timeExtent = this.timeSlider.fullTimeExtent;
    }
  }

  /**
   * Format field name for display
   */
  formatFieldName(fieldName) {
    return fieldName
      .replace(/_/g, " ")
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Check if heatmap is enabled
   */
  isHeatmapEnabled() {
    return this.heatmapEnabled;
  }

  /**
   * Get current heatmap layer
   */
  getHeatmapLayer() {
    return this.heatmapLayer;
  }

  /**
   * Get current heatmap settings
   */
  getCurrentHeatmapSettings() {
    return this.currentHeatmapSettings;
  }
}
