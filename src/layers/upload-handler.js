/**
 * UploadHandler - Manages file upload and processing for CSV and GeoJSON files
 * 
 * This module handles:
 * - File upload initialization (drop zone and file input)
 * - CSV parsing and conversion to feature layers
 * - GeoJSON loading and layer creation
 * - File validation and error handling
 */

import { loadModule } from '../core/module-loader.js';

export class UploadHandler {
  constructor(stateManager, layerManager, notificationManager) {
    this.stateManager = stateManager;
    this.layerManager = layerManager;
    this.notificationManager = notificationManager;
  }

  /**
   * Initialize file upload functionality
   * Sets up drop zone and file input event handlers
   */
  initializeFileUpload() {
    const dropZone = document.getElementById("dropZone");
    const fileInput = document.getElementById("fileInput");

    if (!dropZone || !fileInput) {
      console.warn('Drop zone or file input not found');
      return;
    }

    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, this._preventDefaults, false);
      document.body.addEventListener(eventName, this._preventDefaults, false);
    });

    // Highlight drop zone when item is dragged over it
    ["dragenter", "dragover"].forEach((eventName) => {
      dropZone.addEventListener(
        eventName,
        () => {
          dropZone.classList.add("drag-over");
        },
        false
      );
    });

    ["dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(
        eventName,
        () => {
          dropZone.classList.remove("drag-over");
        },
        false
      );
    });

    // Handle dropped files
    dropZone.addEventListener("drop", (e) => this._handleDrop(e), false);

    // Handle file input change
    fileInput.addEventListener("change", (e) => {
      this.handleFiles(e.target.files);
    });
  }

  /**
   * Prevent default drag and drop behaviors
   * @private
   */
  _preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  /**
   * Handle drop event
   * @private
   */
  _handleDrop(e) {
    const dt = e.dataTransfer;
    const files = dt.files;
    this.handleFiles(files);
  }

  /**
   * Handle uploaded files
   * @param {FileList} files - Files to process
   */
  async handleFiles(files) {
    for (let file of files) {
      const extension = file.name.split(".").pop().toLowerCase();

      if (!["csv", "geojson", "json"].includes(extension)) {
        this.notificationManager.showNotification(
          "Error: Only CSV and GeoJSON files are supported",
          "error"
        );
        continue;
      }

      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const content = e.target.result;

          if (extension === "csv") {
            await this.loadCSV(content, file.name);
          } else if (extension === "geojson" || extension === "json") {
            await this.loadGeoJSON(content, file.name);
          }

          this.notificationManager.showNotification(
            `Successfully loaded: ${file.name}`,
            "success"
          );
        } catch (error) {
          console.error("Error loading file:", error);
          this.notificationManager.showNotification(
            `Error loading ${file.name}: ${error.message}`,
            "error"
          );
        }
      };

      reader.readAsText(file);
    }
  }

  /**
   * Load CSV file and create feature layer
   * @param {string} content - CSV file content
   * @param {string} filename - Name of the file
   */
  async loadCSV(content, filename) {
    const [FeatureLayer, Graphic, Point] = await Promise.all([
      loadModule("esri/layers/FeatureLayer"),
      loadModule("esri/Graphic"),
      loadModule("esri/geometry/Point"),
    ]);

    // Parse CSV more robustly
    const lines = content.trim().split(/\r?\n/); // Handle different line endings
    if (lines.length < 2) {
      throw new Error("CSV file is empty or has no data");
    }

    // Parse headers - handle quoted values and trim spaces
    const headers = this.parseCSVLine(lines[0]).map((h) => h.trim());
    console.log("CSV Headers:", headers);

    // Find coordinate columns with more flexible matching
    let latIndex = -1;
    let lonIndex = -1;

    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      // Check for latitude
      if (
        latIndex === -1 &&
        (lowerHeader === "latitude" ||
          lowerHeader === "lat" ||
          lowerHeader === "y" ||
          lowerHeader.includes("latitud"))
      ) {
        latIndex = index;
      }
      // Check for longitude
      if (
        lonIndex === -1 &&
        (lowerHeader === "longitude" ||
          lowerHeader === "lon" ||
          lowerHeader === "lng" ||
          lowerHeader === "long" ||
          lowerHeader === "x" ||
          lowerHeader.includes("longitud"))
      ) {
        lonIndex = index;
      }
    });

    if (latIndex === -1 || lonIndex === -1) {
      console.error("Could not find coordinate columns. Headers:", headers);
      throw new Error(
        `CSV must contain latitude and longitude columns. Found headers: ${headers.join(
          ", "
        )}`
      );
    }

    // Create fields definition for all columns
    const fields = headers.map((header, idx) => {
      // Determine field type based on first data row
      let fieldType = "string";
      if (lines.length > 1) {
        const firstDataRow = this.parseCSVLine(lines[1]);
        const sampleValue = firstDataRow[idx];
        if (sampleValue && !isNaN(sampleValue)) {
          fieldType = sampleValue.includes(".") ? "double" : "integer";
        }
      }

      return {
        name: header,
        alias: header,
        type: fieldType,
      };
    });

    // Add ObjectID field
    fields.unshift({
      name: "ObjectID",
      alias: "ObjectID",
      type: "oid",
    });

    // Create features
    const features = [];
    let objectId = 1;

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue; // Skip empty lines

      const values = this.parseCSVLine(lines[i]);
      const lat = parseFloat(values[latIndex]);
      const lon = parseFloat(values[lonIndex]);

      if (!isNaN(lat) && !isNaN(lon)) {
        const attributes = {
          ObjectID: objectId++,
        };

        // Add all attributes
        headers.forEach((header, idx) => {
          let value = values[idx]?.trim() || "";

          // Convert numeric values
          if (value && !isNaN(value)) {
            value = value.includes(".") ? parseFloat(value) : parseInt(value);
          }

          attributes[header] = value;
        });

        const graphic = new Graphic({
          geometry: new Point({
            longitude: lon,
            latitude: lat,
          }),
          attributes: attributes,
        });

        features.push(graphic);
      }
    }

    console.log(`Created ${features.length} features from CSV`);

    // Create feature layer
    const layer = new FeatureLayer({
      source: features,
      objectIdField: "ObjectID",
      fields: fields,
      title: filename,
      outFields: ["*"],
      renderer: {
        type: "simple",
        symbol: {
          type: "simple-marker",
          size: 8,
          color: [51, 122, 183, 0.8],
          outline: {
            color: [255, 255, 255, 1],
            width: 1,
          },
        },
      },
    });

    const map = this.stateManager.getMap();
    map.add(layer);
    this.stateManager.addUploadedLayer(layer);
    this.layerManager.updateLayerList();

    // Zoom to features
    if (features.length > 0) {
      await this.stateManager.getView().goTo(features);
    }
  }

  /**
   * Parse CSV line handling quoted values
   * @param {string} line - CSV line to parse
   * @returns {Array<string>} Parsed values
   */
  parseCSVLine(line) {
    const result = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current);
        current = "";
      } else {
        current += char;
      }
    }

    result.push(current); // Don't forget the last value
    return result;
  }

  /**
   * Load GeoJSON file and create layer
   * @param {string} content - GeoJSON file content
   * @param {string} filename - Name of the file
   */
  async loadGeoJSON(content, filename) {
    const [GeoJSONLayer] = await Promise.all([
      loadModule("esri/layers/GeoJSONLayer"),
    ]);

    // Parse GeoJSON to check structure
    let geojsonData;
    let nullFields = [];

    try {
      geojsonData = JSON.parse(content);
      console.log("GeoJSON loaded with features:", geojsonData.features?.length);

      // Analyze fields for null values
      if (geojsonData.features && geojsonData.features.length > 0) {
        const fieldNullCounts = {};

        // Check all features for null fields
        geojsonData.features.forEach((feature) => {
          if (feature.properties) {
            Object.entries(feature.properties).forEach(([key, value]) => {
              if (value === null || value === undefined) {
                fieldNullCounts[key] = (fieldNullCounts[key] || 0) + 1;
              }
            });
          }
        });

        // Find fields that are null in ALL features
        const totalFeatures = geojsonData.features.length;
        Object.entries(fieldNullCounts).forEach(([field, count]) => {
          if (count === totalFeatures) {
            nullFields.push(field);
          }
        });
      }

      // Fix geometry types if needed
      let hasGeometryFixes = false;
      if (geojsonData.features) {
        geojsonData.features.forEach((feature) => {
          if (feature.geometry) {
            // Fix common geometry type issues
            if (
              feature.geometry.type === "Polyline" ||
              feature.geometry.type === "Line"
            ) {
              feature.geometry.type = "LineString";
              hasGeometryFixes = true;
            } else if (feature.geometry.type === "Polylines") {
              feature.geometry.type = "MultiLineString";
              hasGeometryFixes = true;
            }
          }
        });
      }

      // If we made geometry fixes, update the content
      if (hasGeometryFixes) {
        content = JSON.stringify(geojsonData);
        console.log("Fixed geometry types in GeoJSON");
      }
    } catch (error) {
      throw new Error("Invalid GeoJSON format");
    }

    // Create blob URL from content
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    // Temporarily suppress console warnings
    const originalWarn = console.warn;
    const warnings = [];
    console.warn = (msg) => {
      if (
        msg &&
        msg.includes &&
        msg.includes("fields types couldn't be inferred")
      ) {
        warnings.push(msg);
      } else {
        originalWarn(msg);
      }
    };

    try {
      // Detect geometry type for proper rendering
      let geometryType = null;
      let renderer = null;

      if (geojsonData.features && geojsonData.features.length > 0) {
        const firstFeature = geojsonData.features[0];
        if (firstFeature.geometry) {
          switch (firstFeature.geometry.type) {
            case "Point":
              geometryType = "point";
              renderer = {
                type: "simple",
                symbol: {
                  type: "simple-marker",
                  size: 8,
                  color: [51, 122, 183, 0.8],
                  outline: {
                    color: [255, 255, 255, 1],
                    width: 1,
                  },
                },
              };
              break;
            case "LineString":
            case "MultiLineString":
              geometryType = "polyline";
              renderer = {
                type: "simple",
                symbol: {
                  type: "simple-line",
                  color: [51, 122, 183, 1],
                  width: 3,
                  style: "solid",
                },
              };
              break;
            case "Polygon":
            case "MultiPolygon":
              geometryType = "polygon";
              renderer = {
                type: "simple",
                symbol: {
                  type: "simple-fill",
                  color: [51, 122, 183, 0.4],
                  outline: {
                    color: [51, 122, 183, 1],
                    width: 2,
                  },
                },
              };
              break;
          }
        }
      }

      const layer = new GeoJSONLayer({
        url: url,
        title: filename,
        outFields: ["*"],
        renderer: renderer || {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [51, 122, 183, 0.4],
            outline: {
              color: [51, 122, 183, 1],
              width: 2,
            },
          },
        },
      });

      // Wait for layer to load
      await layer.load();

      // Restore console.warn
      console.warn = originalWarn;

      // Log fields to debug
      console.log("Layer loaded successfully");
      console.log("Geometry type:", layer.geometryType);
      console.log(
        "Number of fields loaded:",
        layer.fields ? layer.fields.length : 0
      );

      const map = this.stateManager.getMap();
      map.add(layer);
      this.stateManager.addUploadedLayer(layer);
      this.layerManager.updateLayerList();

      // Zoom to layer extent
      if (layer.fullExtent) {
        await this.stateManager.getView().goTo(layer.fullExtent.expand(1.1));
      }

      // Clean up blob URL
      URL.revokeObjectURL(url);

      // Show appropriate notifications
      const validFields = layer.fields
        ? layer.fields.filter((f) => f.name !== "OBJECTID").length
        : 0;
      const featureCount = geojsonData.features?.length || 0;

    } catch (error) {
      console.error("Error loading GeoJSON:", error);
      console.warn = originalWarn; // Restore console.warn
      URL.revokeObjectURL(url);
      throw error;
    }
  }
}
