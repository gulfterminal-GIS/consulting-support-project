/**
 * AttributeTable Module
 * Manages the attribute table widget for viewing and interacting with layer data
 * Includes table rendering, search, pagination, sorting, and export functionality
 */

import { loadModule } from "../core/module-loader.js";

export class AttributeTable {
  constructor(stateManager, notificationManager, popupManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.popupManager = popupManager;

    // Table state
    this.currentTableLayer = null;
    this.tableData = [];
    this.filteredData = [];
    this.currentPage = 1;
    this.recordsPerPage = 50;
    this.sortColumn = null;
    this.sortDirection = "asc";
  }

  /**
   * Toggle the attribute table widget visibility
   */
  async toggleAttributeTable() {
    const tableWidget = document.getElementById("attributeTableWidget");
    const btn = document.getElementById("tableBtn");

    if (!tableWidget) {
      console.error("Attribute table widget not found");
      return;
    }

    if (tableWidget.classList.contains("hidden")) {
      tableWidget.classList.remove("hidden");
      if (btn) btn.classList.add("active");
      this.initializeTableLayerSelect();
      
      // Start with empty table - don't auto-load first layer
      this.clearTable();
    } else {
      tableWidget.classList.add("hidden");
      if (btn) btn.classList.remove("active");
    }
  }

  /**
   * Initialize the layer select dropdown
   */
  initializeTableLayerSelect() {
    const regionSelect = document.getElementById("tableRegionSelect");
    const layerSelect = document.getElementById("tableLayerSelect");
    
    // Hide layer select initially
    if (layerSelect) {
      layerSelect.disabled = true;
      layerSelect.innerHTML = '<option value="">First select a region...</option>';
    }
    
    // Initialize region select
    if (regionSelect) {
      regionSelect.addEventListener("change", (e) => {
        this.filterLayersByRegion(e.target.value);
      });
    }

    layerSelect.addEventListener("change", async (e) => {
      if (e.target.value !== "") {
        await this.loadTableData(parseInt(e.target.value));
      } else {
        this.clearTable();
      }
    });

    // Initialize search
    const searchInput = document.getElementById("tableSearchInput");
    searchInput.addEventListener(
      "input",
      this.debounce((e) => {
        this.filterTableData(e.target.value);
      }, 300)
    );
  }

  /**
   * Filter layers by region
   */
  filterLayersByRegion(region) {
    const layerSelect = document.getElementById("tableLayerSelect");
    
    if (!region) {
      // No region selected - disable layer select
      layerSelect.disabled = true;
      layerSelect.innerHTML = '<option value="">First select a region...</option>';
      this.clearTable();
    } else {
      // Region selected - enable and populate layer select
      layerSelect.disabled = false;
      this.populateLayerSelect(region);
    }
  }

  /**
   * Populate layer select based on region filter
   */
  populateLayerSelect(region) {
    const select = document.getElementById("tableLayerSelect");
    select.innerHTML = '<option value="">Select a layer...</option>';

    const map = this.stateManager.getMap();
    if (!map) return;
    
    // Find the group layer for the selected region
    let regionGroupLayer = null;
    map.layers.forEach(layer => {
      if (layer.type === 'group' && layer.title === region) {
        regionGroupLayer = layer;
      }
    });
    
    if (!regionGroupLayer) {
      console.warn(`No group layer found for region: ${region}`);
      return;
    }
    
    // Get all child layers from the region group
    const childLayers = regionGroupLayer.layers.toArray();
    const allLayers = this.stateManager.getUploadedLayers();
    
    // Add each child layer to the dropdown
    childLayers.forEach(childLayer => {
      // Find the global index of this layer
      const globalIndex = allLayers.indexOf(childLayer);
      if (globalIndex !== -1) {
        const option = document.createElement("option");
        option.value = globalIndex;
        option.textContent = childLayer.title;
        select.appendChild(option);
      }
    });
    
    console.log(`✅ Populated ${childLayers.length} layers for region: ${region}`);
  }

  /**
   * Load table data from a layer
   */
  async loadTableData(layerIndex) {
    try {
      const layer = this.stateManager.getUploadedLayers()[layerIndex];
      if (!layer) return;

      this.currentTableLayer = layer;
      this.showTableLoading();

      // Query all features
      const query = layer.createQuery();
      query.where = "1=1";
      query.outFields = ["*"];
      query.returnGeometry = true;

      const result = await layer.queryFeatures(query);

      // Convert features to table data
      this.tableData = result.features.map((feature, index) => ({
        _id: index,
        _feature: feature,
        ...feature.attributes,
      }));

      this.filteredData = [...this.tableData];
      this.currentPage = 1;

      this.renderTable();
      this.updatePagination();
    } catch (error) {
      console.error("Error loading table data:", error);
      this.showTableError("Error loading data");
    }
  }

  /**
   * Show loading state
   */
  showTableLoading() {
    const container = document.getElementById("tableContainer");
    container.innerHTML = `
      <div class="table-empty-state">
        <i class="fas fa-spinner fa-spin"></i>
        <p>Loading data...</p>
      </div>
    `;
  }

  /**
   * Show error state
   */
  showTableError(message) {
    const container = document.getElementById("tableContainer");
    container.innerHTML = `
      <div class="table-empty-state">
        <i class="fas fa-exclamation-triangle"></i>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Clear table
   */
  clearTable() {
    const container = document.getElementById("tableContainer");
    container.innerHTML = `
      <div class="table-empty-state">
        <i class="fas fa-table"></i>
        <p>Select a layer to view its attributes</p>
      </div>
    `;
    document.getElementById("tablePaginationInfo").textContent = "0 records";
    document.getElementById("tablePageInfo").textContent = "Page 0 of 0";
  }

  /**
   * Render the table
   */
  renderTable() {
    if (this.filteredData.length === 0) {
      this.showTableError("No data to display");
      return;
    }

    // Get columns (excluding internal fields)
    const columns = Object.keys(this.filteredData[0]).filter(
      (key) => !key.startsWith("_") && key !== "ObjectID" && key !== "FID"
    );

    // Calculate pagination
    const startIndex = (this.currentPage - 1) * this.recordsPerPage;
    const endIndex = Math.min(startIndex + this.recordsPerPage, this.filteredData.length);
    const pageData = this.filteredData.slice(startIndex, endIndex);

    // Build table HTML
    let html = '<table class="attribute-data-table">';

    // Header
    html += "<thead><tr>";
    html += '<th style="width: 50px;">#</th>';
    columns.forEach((col) => {
      const sortClass = this.sortColumn === col ? `sort-${this.sortDirection}` : "";
      html += `<th class="${sortClass}" onclick="sortTable('${col}')">
        ${this.popupManager.formatFieldName(col)}</th>`;
    });
    html += "</tr></thead>";

    // Body
    html += "<tbody>";
    pageData.forEach((row, index) => {
      html += `<tr onclick="selectTableRow(${row._id})" data-id="${row._id}">`;
      html += `<td>${startIndex + index + 1}</td>`;
      columns.forEach((col) => {
        const value = this.formatTableValue(row[col]);
        html += `<td>${value}</td>`;
      });
      html += "</tr>";
    });
    html += "</tbody>";
    html += "</table>";

    document.getElementById("tableContainer").innerHTML = html;
  }

  /**
   * Format table value for display
   */
  formatTableValue(value) {
    if (value === null || value === undefined) {
      return '<span style="color: #999; font-style: italic;">null</span>';
    }
    if (typeof value === "boolean") {
      return value
        ? '<span style="color: #4CAF50;">✓</span>'
        : '<span style="color: #f44336;">✗</span>';
    }
    if (typeof value === "number") {
      return value.toLocaleString();
    }
    if (typeof value === "string" && value.length > 50) {
      return value.substring(0, 50) + "...";
    }
    return value.toString();
  }

  /**
   * Sort table by column
   */
  sortTable(column) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
    } else {
      this.sortColumn = column;
      this.sortDirection = "asc";
    }

    this.filteredData.sort((a, b) => {
      const aVal = a[column];
      const bVal = b[column];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      let comparison = 0;
      if (typeof aVal === "number" && typeof bVal === "number") {
        comparison = aVal - bVal;
      } else {
        comparison = aVal.toString().localeCompare(bVal.toString());
      }

      return this.sortDirection === "asc" ? comparison : -comparison;
    });

    this.currentPage = 1;
    this.renderTable();
    this.updatePagination();
  }

  /**
   * Filter table data based on search term
   */
  filterTableData(searchTerm) {
    if (!searchTerm) {
      this.filteredData = [...this.tableData];
    } else {
      const term = searchTerm.toLowerCase();
      this.filteredData = this.tableData.filter((row) => {
        return Object.values(row).some((value) => {
          if (value === null || value === undefined) return false;
          return value.toString().toLowerCase().includes(term);
        });
      });
    }

    this.currentPage = 1;
    this.renderTable();
    this.updatePagination();
  }

  /**
   * Select a table row and zoom to feature
   */
  async selectTableRow(id) {
    const row = this.tableData.find((r) => r._id === id);
    if (!row || !row._feature) return;

    const view = this.stateManager.getView();
    if (!view) return;

    // Highlight row
    document.querySelectorAll(".attribute-data-table tr").forEach((tr) => {
      tr.classList.remove("selected");
    });
    const selectedRow = document.querySelector(`tr[data-id="${id}"]`);
    if (selectedRow) {
      selectedRow.classList.add("selected");
    }

    // Zoom to feature
    if (row._feature.geometry) {
      await view.goTo({
        target: row._feature.geometry,
        zoom: view.zoom + 2,
      });

      // Flash the feature
      this.flashFeature(row._feature);
    }
  }

  /**
   * Flash feature on map
   */
  async flashFeature(feature) {
    const view = this.stateManager.getView();
    if (!view) return;

    const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

    const flashGraphic = new Graphic({
      geometry: feature.geometry,
      symbol: {
        type: feature.geometry.type === "point" ? "simple-marker" : "simple-fill",
        color: [255, 255, 0, 0.6],
        outline: {
          color: [255, 255, 0, 1],
          width: 3,
        },
      },
    });

    view.graphics.add(flashGraphic);

    // Remove after animation
    setTimeout(() => {
      view.graphics.remove(flashGraphic);
    }, 1000);
  }

  /**
   * Update pagination controls
   */
  updatePagination() {
    const totalPages = Math.ceil(this.filteredData.length / this.recordsPerPage);

    document.getElementById("tablePaginationInfo").textContent = `${
      this.filteredData.length
    } record${this.filteredData.length !== 1 ? "s" : ""}`;
    document.getElementById(
      "tablePageInfo"
    ).textContent = `Page ${this.currentPage} of ${totalPages}`;

    document.getElementById("tablePrevBtn").disabled = this.currentPage === 1;
    document.getElementById("tableNextBtn").disabled = this.currentPage === totalPages;
  }

  /**
   * Go to previous page
   */
  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.renderTable();
      this.updatePagination();
    }
  }

  /**
   * Go to next page
   */
  nextPage() {
    const totalPages = Math.ceil(this.filteredData.length / this.recordsPerPage);
    if (this.currentPage < totalPages) {
      this.currentPage++;
      this.renderTable();
      this.updatePagination();
    }
  }

  /**
   * Refresh the current table
   */
  refreshTable() {
    if (this.currentTableLayer) {
      const layerIndex = this.stateManager
        .getUploadedLayers()
        .indexOf(this.currentTableLayer);
      if (layerIndex !== -1) {
        this.loadTableData(layerIndex);
      }
    }
  }

  /**
   * Show export options modal
   */
  showExportOptions() {
    const modal = document.getElementById("exportModal");
    const select = document.getElementById("exportLayerSelect");

    // Populate layer select
    select.innerHTML = '<option value="">Select a layer...</option>';
    this.stateManager.getUploadedLayers().forEach((layer, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = layer.title;
      select.appendChild(option);
    });

    modal.classList.remove("hidden");
  }

  /**
   * Close export modal
   */
  closeExportModal() {
    document.getElementById("exportModal").classList.add("hidden");
  }

  /**
   * Export data in different formats
   */
  async exportData(format) {
    const layerIndex = document.getElementById("exportLayerSelect").value;
    if (layerIndex === "") {
      this.notificationManager.showNotification("Please select a layer to export", "error");
      return;
    }

    const layer = this.stateManager.getUploadedLayers()[parseInt(layerIndex)];

    try {
      this.notificationManager.showNotification("Preparing export...", "info");

      // Query all features
      const query = layer.createQuery();
      query.where = "1=1";
      query.outFields = ["*"];
      query.returnGeometry = true;

      const result = await layer.queryFeatures(query);

      switch (format) {
        case "csv":
          this.exportToCSV(result.features, layer.title);
          break;
        case "geojson":
          this.exportToGeoJSON(result.features, layer.title);
          break;
        case "excel":
          this.exportToExcel(result.features, layer.title);
          break;
      }

      this.closeExportModal();
    } catch (error) {
      console.error("Export error:", error);
      this.notificationManager.showNotification("Error exporting data", "error");
    }
  }

  /**
   * Export to CSV
   */
  exportToCSV(features, filename) {
    if (features.length === 0) {
      this.notificationManager.showNotification("No data to export", "error");
      return;
    }

    // Get all unique field names
    const fields = new Set();
    features.forEach((feature) => {
      Object.keys(feature.attributes).forEach((key) => {
        if (!key.startsWith("_")) {
          fields.add(key);
        }
      });
    });

    const fieldArray = Array.from(fields);

    // Build CSV content
    let csv = fieldArray.map((field) => `"${field}"`).join(",") + "\n";

    features.forEach((feature) => {
      const row = fieldArray.map((field) => {
        const value = feature.attributes[field];
        if (value === null || value === undefined) return '""';
        if (
          typeof value === "string" &&
          (value.includes(",") || value.includes('"') || value.includes("\n"))
        ) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return `"${value}"`;
      });
      csv += row.join(",") + "\n";
    });

    // Download file
    this.downloadFile(csv, `${filename}.csv`, "text/csv");
    this.notificationManager.showNotification("CSV exported successfully", "success");
  }

  /**
   * Export to GeoJSON
   */
  exportToGeoJSON(features, filename) {
    const geojson = {
      type: "FeatureCollection",
      features: features.map((feature) => {
        const geometry = feature.geometry.toJSON();

        // Clean attributes
        const properties = {};
        Object.entries(feature.attributes).forEach(([key, value]) => {
          if (!key.startsWith("_") && value !== null && value !== undefined) {
            properties[key] = value;
          }
        });

        return {
          type: "Feature",
          geometry: geometry,
          properties: properties,
        };
      }),
    };

    const json = JSON.stringify(geojson, null, 2);
    this.downloadFile(json, `${filename}.geojson`, "application/json");
    this.notificationManager.showNotification("GeoJSON exported successfully", "success");
  }

  /**
   * Export to Excel (using CSV format that Excel can open)
   */
  exportToExcel(features, filename) {
    // For simplicity, we'll create a CSV that Excel can open
    // For true Excel format, you'd need a library like SheetJS
    this.exportToCSV(features, filename + "_excel");
    this.notificationManager.showNotification("Data exported for Excel (CSV format)", "success");
  }

  /**
   * Download file utility
   */
  downloadFile(content, filename, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Debounce utility function
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}
