/**
 * MapInitializer - Handles map setup, loading screen, and initial layer loading
 * Dependencies: StateManager, NotificationManager, module-loader
 */

import { loadModule } from "./module-loader.js";
import { CONFIG } from "./config.js";

export class MapInitializer {
  constructor(stateManager, notificationManager, tourManager = null, layerManager = null, classificationManager = null, visualizationManager = null, widgetManager = null) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.tourManager = tourManager;
    this.layerManager = layerManager;
    this.classificationManager = classificationManager;
    this.visualizationManager = visualizationManager;
    this.widgetManager = widgetManager;
  }

  /**
   * Initialize the ArcGIS map and view
   * @returns {Promise<Array>} [view, map]
   */
  async initializeMap() {
    try {
      const [esriConfig, Map, MapView, GraphicsLayer, reactiveUtils] =
        await Promise.all([
          loadModule("esri/config"),
          loadModule("esri/Map"),
          loadModule("esri/views/MapView"),
          loadModule("esri/layers/GraphicsLayer"),
          loadModule("esri/core/reactiveUtils"),
        ]);

      esriConfig.apiKey = CONFIG.ARCGIS_API_KEY;

      const displayMap = new Map({
        basemap: CONFIG.DEFAULT_BASEMAP || "hybrid",
      });

      const view = new MapView({
        center: CONFIG.DEFAULT_CENTER || [-95.7129, 37.0902],
        container: "displayMap",
        map: displayMap,
        zoom: CONFIG.DEFAULT_ZOOM || 4,
        highlightOptions: {
          color: "#39ff14",
          haloOpacity: 0.9,
          fillOpacity: 0.2,
        },
      });

      const drawLayer = new GraphicsLayer({
        title: "Drawings",
        listMode: "show",
      });
      displayMap.add(drawLayer);

      await view.when();

      view.ui.remove(["compass", "zoom"]);

      // Store home extent
      const homeExtent = view.extent.clone();

      // Store in StateManager (single source of truth)
      this.stateManager.setMap(displayMap);
      this.stateManager.setView(view);
      this.stateManager.setDrawLayer(drawLayer);
      this.stateManager.setHomeExtent(homeExtent);
      
      // StateManager automatically syncs to window globals for backward compatibility
      // This allows old code to still work during the transition

      // Load regional planners layers
      await this.loadRegionalPlanners();

      // Initialize countries layer for click feature
      await this.initializeCountriesLayer(displayMap);

      // Initialize zoom watcher for heatmap using reactiveUtils
      reactiveUtils.watch(
        () => view.zoom,
        (zoom) => {
          if (this.visualizationManager && this.visualizationManager.isHeatmapEnabled()) {
            const heatmapLayer = this.visualizationManager.getHeatmapLayer();
            if (heatmapLayer) {
              // Adjust radius based on zoom level for better visualization
              const currentSettings = this.visualizationManager.getCurrentHeatmapSettings();
              const baseRadius = currentSettings.radius;
              const zoomFactor = Math.max(1, Math.min(3, zoom / 10));

              if (
                heatmapLayer.renderer &&
                heatmapLayer.renderer.type === "heatmap"
              ) {
                heatmapLayer.renderer.radius = baseRadius * zoomFactor;
              }
            }
          }
        }
      );

      // Note: UI initialization and event handlers are now handled by individual managers in main.js

      // Handle loading screen
      this.handleLoadingScreen();

      // Check if it's the first visit and start tour
      const hasSeenTour = localStorage.getItem("gisStudioTourCompleted");
      if (!hasSeenTour && this.tourManager) {
        // Start tour after a short delay
        setTimeout(() => {
          this.tourManager.startAppTour();
          // Mark tour as seen
          localStorage.setItem("gisStudioTourCompleted", "true");
        }, 1500);
      }

      console.log("Map initialized successfully", displayMap, view);
      return [view, displayMap];
    } catch (error) {
      console.error("Error initializing map:", error);
      throw error;
    }
  }

  /**
   * Load regional planners layers from configuration
   */
  async loadRegionalPlanners() {
    try {
      const [GeoJSONLayer, GroupLayer] = await Promise.all([
        loadModule("esri/layers/GeoJSONLayer"),
        loadModule("esri/layers/GroupLayer"),
      ]);

      const displayMap = this.stateManager.getMap();
      const view = this.stateManager.getView();
      
      let allExtents = [];
      let firstLayer = null;

      // Load each region's planners
      for (const region of CONFIG.REGIONAL_PLANNERS) {
        const regionLayers = [];

        // Load all files for this region
        for (const fileName of region.files) {
          try {
            const url = new URL(
              `assets/data/${region.folder}/${fileName}`,
              document.baseURI
            ).href;

            const layer = new GeoJSONLayer({
              url: url,
              title: this.formatPlannerName(fileName),
              outFields: ["*"],
              visible: true,
            });

            // Wait for layer to load
            await layer.load();

            // Detect geometry type and apply appropriate renderer
            const geometryType = layer.geometryType;
            const renderer = this.handleLayerRenderType(geometryType);
            layer.renderer = renderer;

            regionLayers.push(layer);

            // Store first layer for tour
            if (!firstLayer) {
              firstLayer = layer;
            }

            // Collect extent
            if (layer.fullExtent) {
              allExtents.push(layer.fullExtent);
            }

            console.log(`✓ Loaded: ${region.nameAr} - ${fileName}`);
          } catch (error) {
            console.warn(`Failed to load ${fileName} from ${region.name}:`, error);
          }
        }

        // Create group layer for this region
        if (regionLayers.length > 0) {
          const groupLayer = new GroupLayer({
            title: region.nameAr,
            layers: regionLayers,
            visible: true,
            visibilityMode: "independent", // Each layer can be toggled independently
          });

          displayMap.add(groupLayer);

          // Add individual layers to uploaded layers for compatibility
          regionLayers.forEach(layer => {
            this.stateManager.addUploadedLayer(layer);
          });
        }
      }

      // Update layer list UI
      if (this.layerManager) {
        this.layerManager.updateLayerList();
      }

      // Zoom to combined extent of all layers
      if (allExtents.length > 0) {
        const [geometryEngine] = await Promise.all([
          loadModule("esri/geometry/geometryEngine"),
        ]);

        // Union all extents
        let combinedExtent = allExtents[0];
        for (let i = 1; i < allExtents.length; i++) {
          combinedExtent = combinedExtent.union(allExtents[i]);
        }

        await view.goTo(combinedExtent.expand(1.2), {
          duration: 2000,
        });
      }

      // Setup feature tour with first layer
      if (this.tourManager && firstLayer) {
        await this.tourManager.setupFeatureTour(firstLayer);
      }

      console.log(`✅ Loaded ${CONFIG.REGIONAL_PLANNERS.length} regional planner groups`);
    } catch (error) {
      console.error("Error loading regional planners:", error);
      this.notificationManager.showNotification(
        "Error loading regional data",
        "error"
      );
    }
  }

  /**
   * Format planner file name for display
   * @param {string} fileName - The file name to format
   * @returns {string} Formatted name
   */
  formatPlannerName(fileName) {
    // Remove .geojson extension
    let name = fileName.replace('.geojson', '');
    
    // Replace underscores with spaces
    name = name.replace(/_/g, ' ');
    
    // Capitalize first letter of each word
    name = name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
    
    return name;
  }

  handleLayerRenderType(geometryType) {
    let renderer;
    switch (geometryType) {
      case "point":
        renderer = {
          type: "simple",
          symbol: {
            type: "simple-marker",
            style: "circle",
            color: [0, 112, 255, 0.8], // Blue color
            size: 8,
            outline: {
              color: [255, 255, 255, 1],
              width: 1
            }
          }
        };
        break;

      case "polyline":
        renderer = {
          type: "simple",
          symbol: {
            type: "simple-line",
            color: [0, 112, 255, 1], // Blue color
            width: 3,
            style: "solid",
            cap: "round",
            join: "round"
          }
        };
        break;

      case "polygon":
        renderer = {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [34, 139, 34, 0.4], // Forest green with transparency
            outline: {
              color: [0, 100, 0, 1], // Dark green outline
              width: 2
            }
          }
        };
        break;

      default:
        console.warn("Unknown geometry type:", geometryType, "Using default renderer");
        renderer = {
          type: "simple",
          symbol: {
            type: "simple-fill",
            color: [128, 128, 128, 0.5],
            outline: {
              color: [64, 64, 64, 1],
              width: 1
            }
          }
        };
    }
    return renderer;
  }

  /**
   * Initialize countries layer for click info display
   */
  async initializeCountriesLayer(displayMap) {
    try {
      const [FeatureLayer, GraphicsLayer] = await Promise.all([
        loadModule("esri/layers/FeatureLayer"),
        loadModule("esri/layers/GraphicsLayer"),
      ]);

      // Create graphics layer for flash animation
      const flashGraphicsLayer = new GraphicsLayer({
        title: "Flash Animation",
        listMode: "hide",
      });
      displayMap.add(flashGraphicsLayer);

      // Create countries layer but don't display it (only for queries)
      const countriesLayer = new FeatureLayer({
        url: "https://services.arcgis.com/P3ePLMYs2RVChkJx/arcgis/rest/services/World_Countries_(Generalized)/FeatureServer/0",
        visible: false, // Hidden layer, only for queries
      });

      displayMap.add(countriesLayer);

      // Store in StateManager (single source of truth)
      this.stateManager.setFlashGraphicsLayer(flashGraphicsLayer);
      this.stateManager.setCountriesLayer(countriesLayer);
    } catch (error) {
      console.error("Error loading countries layer:", error);
    }
  }

  /**
   * Handle the loading screen animation
   */
  handleLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    const loadingContent = document.querySelector(".loading-content");

    if (!loadingScreen || !loadingContent) {
      console.warn("Loading screen elements not found");
      return;
    }

    function wait(ms) {
      return new Promise((resolve) => setTimeout(resolve, ms));
    }

    console.log("Starting loading sequence...");
    wait(0)
      .then(() => {
        loadingContent.innerHTML = `
          <img class="loaded-gif" src="assets/images/map-loading.gif" alt="">
          <div class="loading-text">جاري مسح الخريطة...</div>
        `;
        return wait(3000);
      })
      .finally(() => {
        loadingScreen.classList.add("fade-out");
        // Legend widget auto-toggle - COMMENTED OUT
        // if (this.widgetManager) {
        //   this.widgetManager.toggleWidget("legend");
        // }
      });
  }

  /**
   * Show the loading screen
   */
  showLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
      loadingScreen.classList.remove("fade-out");
      loadingScreen.style.display = "flex";
    }
  }

  /**
   * Hide the loading screen
   */
  hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen");
    if (loadingScreen) {
      loadingScreen.classList.add("fade-out");
    }
  }
}
