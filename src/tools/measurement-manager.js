/**
 * MeasurementManager - Manages measurement tools and widgets
 *
 * This module handles:
 * - Measurement widget initialization and lifecycle
 * - Distance and area measurements
 * - Measurement results display
 * - Measurement tool state management
 *
 * Extracted from script.js as part of the modularization effort.
 */

import { loadModule } from "../core/module-loader.js";

export class MeasurementManager {
  constructor(stateManager, notificationManager, panelManager, drawingManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.panelManager = panelManager;
    this.drawingManager = drawingManager;
    this.activeWidgets = new Map();
    this.watchHandles = [];
  }

  /**
   * Toggle measurement widget on/off
   */
  async toggleMeasurement() {
    const btn = document.getElementById("measureBtn");
    const resultsDiv = document.getElementById("measurementResults");
    let measurementWidget = this.stateManager.getMeasurementWidget();

    if (!measurementWidget) {
      const [Measurement, reactiveUtils] = await Promise.all([
        loadModule("esri/widgets/Measurement"),
        loadModule("esri/core/reactiveUtils"),
      ]);

      const view = this.stateManager.getView();

      measurementWidget = new Measurement({
        view: view,
        activeTool: "distance",
      });

      view.ui.add(measurementWidget, "top-right");
      this.stateManager.setMeasurementWidget(measurementWidget);

      // Show custom results widget
      if (resultsDiv) {
        resultsDiv.classList.remove("hidden");
      }

      // Watch for measurement changes
      this.watchHandles = [];

      // Watch distance measurements
      const distanceHandle = reactiveUtils.watch(
        () => measurementWidget.viewModel.activeViewModel?.measurement,
        (measurement) => {
          if (measurement && measurementWidget.activeTool === "distance") {
            this.updateMeasurementResults({
              distance: measurement.length.value,
              distanceUnit: measurement.length.unit,
            });
          }
        }
      );
      this.watchHandles.push(distanceHandle);

      // Watch area measurements
      const areaHandle = reactiveUtils.watch(
        () => measurementWidget.viewModel.activeViewModel?.measurement,
        (measurement) => {
          if (measurement && measurementWidget.activeTool === "area") {
            this.updateMeasurementResults({
              area: measurement.area.value,
              areaUnit: measurement.area.unit,
              perimeter: measurement.length.value,
              perimeterUnit: measurement.length.unit,
            });
          }
        }
      );
      this.watchHandles.push(areaHandle);

      // Add tool change listener
      measurementWidget.watch("activeTool", (tool) => {
        if (!tool) {
          // Clear results when no tool is active
          const content = document.getElementById("measurementContent");
          if (content) {
            content.innerHTML =
              '<div style="color: var(--text-secondary);">Select a measurement tool</div>';
          }
        }
      });
    }

    if (btn.classList.contains("active")) {
      // Deactivate measurement
      measurementWidget.clear();
      measurementWidget.activeTool = null;
      
      const view = this.stateManager.getView();
      view.ui.remove(measurementWidget);
      btn.classList.remove("active");

      if (resultsDiv) {
        resultsDiv.classList.add("hidden");
      }

      // Remove watch handles
      if (this.watchHandles.length > 0) {
        this.watchHandles.forEach((handle) => handle.remove());
        this.watchHandles = [];
      }

      measurementWidget.destroy();
      this.stateManager.setMeasurementWidget(null);
    } else {
      // Activate measurement
      btn.classList.add("active");
      this.panelManager.closeSidePanel(); // Close any open panels
      
      const sketchViewModel = this.stateManager.getSketchViewModel();
      if (sketchViewModel) {
        sketchViewModel.cancel();
      }
      this.drawingManager.resetDrawingTools();
    }
  }

  /**
   * Update the measurement results display
   * @param {Object} measurement - Measurement data
   */
  updateMeasurementResults(measurement) {
    const content = document.getElementById("measurementContent");
    if (!content) return;

    let html = '<div class="measurement-display">';

    if (measurement.distance !== undefined) {
      // Distance measurement
      html += `
        <div class="measurement-item">
          <i class="fas fa-ruler-horizontal"></i>
          <span class="measurement-label">Distance:</span>
          <span class="measurement-value">${measurement.distance.toFixed(2)} ${
        measurement.distanceUnit
      }</span>
        </div>
      `;
    } else if (measurement.area !== undefined) {
      // Area measurement
      html += `
        <div class="measurement-item">
          <i class="fas fa-vector-square"></i>
          <span class="measurement-label">Area:</span>
          <span class="measurement-value">${measurement.area.toFixed(2)} ${
        measurement.areaUnit
      }</span>
        </div>
        <div class="measurement-item">
          <i class="fas fa-draw-polygon"></i>
          <span class="measurement-label">Perimeter:</span>
          <span class="measurement-value">${measurement.perimeter.toFixed(2)} ${
        measurement.perimeterUnit
      }</span>
        </div>
      `;
    }

    html += "</div>";
    content.innerHTML = html;
  }

  /**
   * Close measurement results panel
   */
  closeMeasurementResults() {
    const resultsDiv = document.getElementById("measurementResults");
    if (resultsDiv) {
      resultsDiv.classList.add("hidden");
    }
  }

  /**
   * Get the measurement widget instance
   */
  getMeasurementWidget() {
    return this.stateManager.getMeasurementWidget();
  }
}
