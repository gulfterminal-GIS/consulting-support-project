import { StateManager } from "./js/core/state-manager.js";
import { MapInitializer } from "./js/core/map-initializer.js";
import { NotificationManager } from "./js/ui/notification-manager.js";
import { PanelManager } from "./js/ui/panel-manager.js";
import { loadModule } from "./js/core/module-loader.js";

// ============================================================================
// GLOBAL VARIABLES - NOW MANAGED BY StateManager (js/core/state-manager.js)
// ============================================================================
// These global variables are kept for backward compatibility during the transition.
// They are automatically synchronized with StateManager through its setters.
// Once all modules are refactored, these can be removed entirely.
// ============================================================================

// Module-level state container
let moduleState = null;

// Initialize module state with injected dependencies
function initModuleState(state) {
  moduleState = state;
}

// Helper to access state safely
function getState() {
  if (!moduleState) {
    throw new Error("Module state not initialized. Call initializeMap first.");
  }
  return moduleState;
}

// Notification state - MIGRATED to js/ui/notification-manager.js (see script-migrated.js)

// These states are managed by StateManager, keeping references for transition
// Classification state
// const classificationState = {
//   currentLayer: null,
//   renderers: new Map(),
// };

// Analysis state
// const analysisState = {
//   isDrawing: false,
//   drawType: null,
//   features: {
//     buffer: [],
//     intersect1: null,
//     intersect2: null,
//   },
// };

// Feature Tour System state managed by StateManager
// const tourState = {
//   isActive: false,
//   interval: null,
//   currentIndex: 0,
//   features: [],
//   highlightHandle: null,
//   // UI references managed locally
//   controls: {
//     auto: null,
//     chevronIcon: null,
//     chevronBtn: null,
//     details: null,
//   },
// };

// Other state
// let countryInfoTimeout = null;

// ============================================================================
// StateManager is now injected through initializeMap
// All state access should go through getState()
// ============================================================================

// Initialize map with injected dependencies
async function initializeMap(
  stateManager = new StateManager(),
  mapInitializer = new MapInitializer(stateManager),
  notificationManager = new NotificationManager(),
  panelManager = new PanelManager(stateManager, notificationManager),
  toolbarManager = null,
  layerManager = null,
  uploadHandler = null,
  basemapManager = null,
  drawingManager = null,
  analysisManager = null,
  measurementManager = null,
  visualizationManager = null,
  popupManager = null,
  attributeTable = null,
  tourManager = null,
  countryInfo = null
) {
  try {
    // Store instances at module level for use by other functions
    const moduleState = {
      stateManager,
      mapInitializer,
      notificationManager,
      panelManager,
      toolbarManager,
      layerManager,
      uploadHandler,
      basemapManager,
      drawingManager,
      analysisManager,
      measurementManager,
      visualizationManager,
      popupManager,
      attributeTable,
      tourManager,
      countryInfo,
    };

    // Initialize state
    moduleState.map = null;
    moduleState.view = null;
    moduleState.homeExtent = null;
    moduleState.drawLayer = null;
    moduleState.tourLayer = null;
    moduleState.measurementWidget = null;
    moduleState.searchWidget = null;

    // Expose module state to internal functions
    initModuleState(moduleState);

    // Initialize map
    await mapInitializer.initializeMap();

    // Initialize toolbar after map is ready
    if (toolbarManager) {
      console.log("Initializing ToolbarManager...");
      toolbarManager.initialize();
    }

    // Register LayerManager callbacks for attribute table, heatmap, and analysis
    if (layerManager) {
      registerLayerManagerCallbacks(layerManager);
    }

    return moduleState;
  } catch (error) {
    notificationManager.showError("Failed to initialize map");
    throw error;
  }
}
// if (mapInitializer && typeof mapInitializer.initializeMap === "function") {
//     await mapInitializer.initializeMap();
//   } else {
//     console.error("MapInitializer not initialized yet");
//     throw new Error("MapInitializer not available");
//   }
// }

// ============================================================================
// COMMENTED OUT - autoApplyDefaultClassification moved to js/features/classification-manager.js
// ============================================================================
// async function autoApplyDefaultClassification(layer, fieldName) {
//   try {
//     const { stateManager } = getState();
//
//     const stats = await analyzeFieldForClassification(layer, fieldName);
//     if (!stats || stats.uniqueCount === 0) {
//       console.warn(`No valid values found in ${fieldName}`);
//       return;
//     }
//
//     // Store current layer in state
//     stateManager.setCurrentClassificationLayer(layer);
//
//     const colors = generateClassificationColors(stats.sortedValues.length);
//     const geometryType = layer.geometryType;
//
//     const uniqueValueInfos = stats.sortedValues.map(([value, count], index) => {
//       const color = colors[index];
//       let symbol;
//       switch (geometryType) {
//         case "point":
//           symbol = {
//             type: "simple-marker",
//             color,
//             size: 10,
//             outline: { color: [255, 255, 255], width: 1 },
//           };
//           break;
//         case "polyline":
//           symbol = { type: "simple-line", color, width: 2 };
//           break;
//         case "polygon":
//           symbol = {
//             type: "simple-fill",
//             color: [...color, 0.7],
//             outline: { color, width: 1 },
//           };
//           break;
//       }
//       return { value, symbol, label: `${value} (${count})` };
//     });
//
//     // Default symbol
//     const defaultSymbol = createDefaultClassificationSymbol(geometryType);
//
//     // Apply renderer
//     layer.renderer = {
//       type: "unique-value",
//       field: fieldName,
//       uniqueValueInfos,
//       defaultSymbol,
//       defaultLabel: "Other",
//     };
//
//     // Show legend
//     createClassificationLegend(stats, colors, fieldName);
//
//     console.log(`Classification applied on ${fieldName}`);
//   } catch (err) {
//     console.error("Error auto-applying classification:", err);
//   }
// }

// EXTRACTED TO: js/features/tour-manager.js
// Setup feature tour
// async function setupFeatureTour(layer) {
//   try {
//     // Validate layer
//     if (!layer) {
//       console.warn("setupFeatureTour: no layer provided");
//       return;
//     }

//     const { stateManager } = getState();

//     // Query all features
//     const query = layer.createQuery();
//     query.where = "1=1";
//     query.returnGeometry = true;
//     query.outFields = ["*"];

//     const featureSet = await layer.queryFeatures(query);
//     stateManager.setTourFeatures(featureSet.features);

//     console.log(
//       `Feature tour setup with ${
//         stateManager.getTourFeatures().length
//       } features`
//     );

//     // Create tour controls
//     createTourControls();

//     // Auto-start tour after 2 seconds
//     setTimeout(() => {
//       startFeatureTour();
//     }, 2000);
//   } catch (error) {
//     console.error("Error setting up feature tour:", error);
//   }
// }

// EXTRACTED TO: js/features/tour-manager.js
// Create tour control panel
// function createTourControls() {
//   const { stateManager } = getState();

//   const controlsDiv = document.createElement("div");
//   controlsDiv.className = "feature-tour-controls";

//   // Create tour controls DOM
//   controlsDiv.innerHTML = `
//     <header class="tour-header">
//         <div class="chevron">
//             <i class="bi bi-chevron-down"></i>
//             </div>
//         <div class="map-actions">
//             <img class="backward-control" src="images/fluent_next-24-regular-back.svg" alt="" onclick="previousFeature()">
//             <div class="auto-control pause" onclick="toggleFeatureTour()"></div>
//             <img class="forward-control" src="images/fluent_next-24-regular.svg" alt="" onclick="nextFeature()">
//         </div>
//         <small class="feature-count" id="tourProgress">0 / 0</small>
//     </header>

//     <section class="overview" id="tourOverview"></section>

//     <section class="feature-details"></section>
//   `;

//   // Append to body
//   document.body.appendChild(controlsDiv);

//   // Set references
//   const chevronBtn = controlsDiv.querySelector(
//     ".feature-tour-controls .chevron"
//   );
//   const chevronIcon = controlsDiv.querySelector(
//     ".feature-tour-controls .chevron i"
//   );
//   const autoControl = controlsDiv.querySelector(
//     ".feature-tour-controls .auto-control"
//   );
//   const featureDetails = controlsDiv.querySelector(
//     ".feature-tour-controls .feature-details"
//   );

//   // Setup chevron handler
//   if (chevronBtn) {
//     chevronBtn.addEventListener("click", () => {
//       const currentlyVisible =
//         getComputedStyle(featureDetails).display !== "none";
//       const newVisible = !currentlyVisible;

//       featureDetails.style.display = newVisible ? "flex" : "none";

//       if (chevronIcon) {
//         chevronIcon.classList.toggle("bi-chevron-up", newVisible);
//         chevronIcon.classList.toggle("bi-chevron-down", !newVisible);
//       }
//     });
//   }

//   // if (autoControl) {
//   //   // Set initial states
//   //   // autoControl.classList.remove("play");
//   //   // autoControl.classList.add("pause");

//   //   autoControl.addEventListener("click", () => {
//   //     // treat "pause" class as playing, "play" as paused
//   //     const isPlaying = autoControl.classList.contains("pause");
//   //     // setDetailsVisible(!isPlaying);
//   //     // toggle classes just in case
//   //     autoControl.classList.toggle("pause", !isPlaying);
//   //     autoControl.classList.toggle("play", isPlaying);
//   //   });
//   // }
// }

// function setDetailsVisible(visible) {
//     // Get references safely
//     const featureDetailsEl = document.querySelector('.feature-tour-controls .feature-details');
//     const chevronIcon = document.querySelector('.feature-tour-controls .chevron i');
//     const autoControl = document.querySelector('.feature-tour-controls .auto-control');

//     // Guard against null elements
//     if (!featureDetailsEl) {
//         console.warn('Feature details element not found');
//         return;
//     }

//     // Update feature details visibility
//     featureDetailsEl.style.display = visible ? 'flex' : 'none';

//     // Update chevron icon if it exists
//     if (chevronIcon) {
//         chevronIcon.classList.remove('bi-chevron-up', 'bi-chevron-down');
//         chevronIcon.classList.add(visible ? 'bi-chevron-up' : 'bi-chevron-down');
//     }

//     // Update auto-control if it exists
//     if (autoControl) {
//         autoControl.classList.remove('pause', 'play');
//         autoControl.classList.add(visible ? 'pause' : 'play');
//     }
// }

// Start feature tour
// function startFeatureTour() {
//   const { stateManager, notificationManager } = getState();
//   const tourFeatures = stateManager.getTourFeatures();

//   if (!tourFeatures || tourFeatures.length === 0) {
//     notificationManager.showWarning("No features to tour");
//     return;
//   }

//   stateManager.setFeatureTourActive(true);
//   stateManager.setCurrentFeatureIndex(0);

//   // Show controls
//   document.querySelector(".feature-tour-controls").classList.add("active");

//   // Update play button
//   const autoControl = document.querySelector(
//     ".feature-tour-controls .auto-control"
//   );
//   if (autoControl) {
//     autoControl.classList.remove("pause");
//     autoControl.classList.add("play");
//   }

//   // Start touring
//   goToFeature(stateManager.getCurrentFeatureIndex());

//   // Auto advance every 3 seconds
//   stateManager.setFeatureTourInterval(
//     setInterval(() => {
//       nextFeature(false); // auto-play
//     }, 7000)
//   );
// }

// Stop feature tour
// function stopFeatureTour() {
//   const { stateManager } = getState();

//   stateManager.setFeatureTourActive(false);

//   const interval = stateManager.getFeatureTourInterval();
//   if (interval) {
//     clearInterval(interval);
//     stateManager.setFeatureTourInterval(null);
//   }

//   // Update play button
//   const autoControl = document.querySelector(
//     ".feature-tour-controls .auto-control"
//   );
//   if (autoControl) {
//     autoControl.classList.add("pause");
//     autoControl.classList.remove("play");
//   }
// }

// Toggle tour play/pause
// function toggleFeatureTour() {
//   const { stateManager } = getState();
//   if (stateManager.isFeatureTourActive()) {
//     stopFeatureTour();
//   } else {
//     startFeatureTour();
//   }
// }

// Navigate to specific feature
// async function goToFeature(index) {
//   try {
//     const { stateManager, popupManager } = getState();
//     const view = stateManager.getView();

//     if (!view) {
//       console.error("View not available for goToFeature");
//       return;
//     }

//     const tourFeatures = stateManager.getTourFeatures();
//     if (!tourFeatures || index < 0 || index >= tourFeatures.length) return;

//     const feature = tourFeatures[index];
//     stateManager.setCurrentFeatureIndex(index);

//     // For polygons, calculate center and use appropriate zoom
//     if (feature.geometry.type === "polygon") {
//       const extent = feature.geometry.extent;

//       await view.goTo(
//         {
//           target: feature.geometry,
//           // zoom: view.zoom // Keep current zoom level or adjust as needed
//           zoom: 17, // Keep current zoom level or adjust as needed
//         },
//         {
//           duration: 3000,
//           easing: "ease-in-out",
//         }
//       );
//     } else {
//       // For other geometry types
//       await view.goTo(
//         {
//           target: feature.geometry,
//           zoom: 16,
//           tilt: 45,
//         },
//         {
//           duration: 3000,
//           easing: "ease-in-out",
//         }
//       );
//     }

//     // Highlight the feature
//     const highlightHandle = stateManager.getHighlightHandle();
//     if (highlightHandle) {
//       highlightHandle.remove();
//       stateManager.setHighlightHandle(null);
//     }

//     // Add highlight with proper error handling
//     const tourLayer = stateManager.getTourLayer();
//     if (tourLayer) {
//       try {
//         const layerView = await view.whenLayerView(stateManager.getTourLayer());
//         stateManager.setHighlightHandle(layerView.highlight(feature));
//       } catch (error) {
//         console.warn("Error creating highlight:", error);
//       }
//     }

//     // Update info panel
//     updateTourInfo(feature);

//     // Update progress
//     document.getElementById("tourProgress").textContent = `${index + 1} / ${
//       (stateManager.getTourFeatures() || []).length
//     }`;

//     // Show popup in left-center position
//     popupManager.showCustomPopupTour(feature);
//   } catch (error) {
//     console.error("Error navigating to feature:", error);
//   }
// }

// function showCustomPopupTour(graphic) {
//   const { stateManager } = getState();

//   const featureDetails = document.querySelector(
//     ".feature-tour-controls .feature-details"
//   );
//   if (!featureDetails) {
//     console.warn("Feature details element not found for tour popup");
//     return;
//   }

//   stateManager.setCurrentPopupFeature(graphic);

//   // Attributes
//   const attributes = graphic.attributes;
//   let html = '<div class="attributes-list">';

//   if (attributes && Object.keys(attributes).length > 0) {
//     const sortedKeys = Object.keys(attributes).sort((a, b) => {
//       const endFields = ["shape_area", "shape_length", "fid"];

//       // 1) Put end fields last
//       const aIsEnd = endFields.includes(a.toLowerCase());
//       const bIsEnd = endFields.includes(b.toLowerCase());
//       if (aIsEnd && !bIsEnd) return 1;
//       if (!aIsEnd && bIsEnd) return -1;

//       // 2) Arabic fields detection
//       const arabicRegex = /[\u0600-\u06FF]/;
//       const aIsArabic = arabicRegex.test(a);
//       const bIsArabic = arabicRegex.test(b);

//       if (aIsArabic && !bIsArabic) return -1; // Arabic first
//       if (!aIsArabic && bIsArabic) return 1;

//       // 3) Otherwise, alphabetical
//       return a.localeCompare(b);
//     });

//     sortedKeys.forEach((key) => {
//       const value = attributes[key];
//       if (key.startsWith("_") || key === "ObjectID" || key === "FID") return;

//       let displayValue = formatAttributeValue(value, key);
//       if (displayValue) {
//         html += `
//             <div class="item">
//               <p class="label">${formatFieldName(key)}:</p>
//               <span class="value">${displayValue}</span>
//             </div>
//           `;
//       }
//     });
//   } else {
//     html += '<div class="item">No attributes available</div>';
//   }

//   html += "</div>";

//   // Geometry info (async update)
//   if (graphic.geometry) {
//     html += `
//       <div class="geometry-info">
//         <h4>Geometry Information</h4>
//         <div id="geometryDetails">Loading...</div>
//       </div>
//     `;
//   }

//   // Action buttons
//   html += `
//     <div class="popup-actions">
//       <button class="popup-action-btn" onclick="zoomToFeature()">
//         <i class="fas fa-search-plus"></i> Zoom to Feature
//       </button>
//       <button class="popup-action-btn" onclick="copyFeatureInfo()">
//         <i class="fas fa-copy"></i> Copy Info
//       </button>
//     </div>
//   `;

//   featureDetails.innerHTML = html;

//   if (graphic.geometry) {
//     updateGeometryDetails(graphic.geometry);
//   }
// }

// Show popup for tour feature
// function showTourPopup(feature) {
//   showCustomPopupTour(feature);
// }

// Close tour popup
// function closeTourPopup() {
//   const tourPopup = document.getElementById("tourPopup");
//   if (tourPopup) {
//     tourPopup.classList.remove("active");
//   }
// }

// Update tour info panel
// function updateTourInfo(feature) {
//   const { stateManager } = getState();
//   const tourOverview = document.getElementById("tourOverview");
//   const attrs = feature.attributes;

//   // Try to find name field
//   const nameFields = ["اسم الحديقة", "name", "Name", "NAME", "الاسم"];
//   let featureName = null;

//   for (const field of nameFields) {
//     if (attrs[field] && attrs[field] !== "NULL") {
//       featureName = attrs[field];
//       break;
//     }
//   }

//   // If no name found, use a default
//   if (!featureName) {
//     featureName = `حديقه ${(stateManager.getCurrentFeatureIndex() || 0) + 1}`;
//   }

//   // Only show if is a truthy value
//   const areaValue = attrs.GARDENAREA || attrs.gardenarea || "";
//   const areaHtml = areaValue ? `<p class="area">${areaValue} متر مربع</p>` : "";

//   const statusValue = attrs.GARDENSTATUS || attrs.gardenstatus || "";
//   const statusHtml = statusValue
//     ? `<div class="status">${statusValue}</div>`
//     : "";

//   tourOverview.innerHTML = `
//       <div>
//           <p class="name">${featureName}</p>
//           ${areaHtml}
//       </div>
//       ${statusHtml}
//   `;
// }

// Navigation functions
// function nextFeature(manual = true) {
//   const { stateManager } = getState();

//   if (manual) {
//     stopFeatureTour(); // only stop when user explicitly clicks
//   }

//   const currentIndex = stateManager.getCurrentFeatureIndex();
//   const tourFeatures = stateManager.getTourFeatures();
//   const nextIndex = (currentIndex + 1) % tourFeatures.length;
//   goToFeature(nextIndex);
// }

// function previousFeature(manual = true) {
//   const { stateManager } = getState();

//   if (manual) {
//     stopFeatureTour();
//   }

//   const currentIndex = stateManager.getCurrentFeatureIndex();
//   const tourFeatures = stateManager.getTourFeatures();
//   const prevIndex =
//     currentIndex === 0 ? tourFeatures.length - 1 : currentIndex - 1;
//   goToFeature(prevIndex);
// }

// Close tour controls
// Close tour controls
// function closeTourControls() {
//   stopFeatureTour();
//   document.querySelector(".feature-tour-controls").classList.remove("active");
//   closeTourPopup(); // Add this line
// }

// function manuallyStartTour() {
//   const { stateManager, notificationManager } = getState();
//   const tourFeatures = stateManager.getTourFeatures();

//   if (!tourFeatures || tourFeatures.length === 0) {
//     notificationManager.showWarning("No features available for tour");
//     return;
//   }

//   document.querySelector(".feature-tour-controls").classList.add("active");

//   if (!stateManager.isFeatureTourActive()) {
//     startFeatureTour();
//   }
// }

// Initialize UI components
function initializeUI(injectedStateManager) {
  // Initialize module state with injected StateManager
  initModuleState({
    stateManager: injectedStateManager,
    map: injectedStateManager.getMap(),
    view: injectedStateManager.getView(),
  });

  const { stateManager } = getState();
  const displayMap = stateManager.getMap();
  const view = stateManager.getView();

  // ============================================================================
  // COMMENTED OUT - Moved to js/ui/toolbar-manager.js
  // ============================================================================
  // Mobile and desktop toolbar initialization has been extracted to ToolbarManager
  // The ToolbarManager is initialized in main.js and called from initializeMap
  // ============================================================================

  // // Add this code right after the function starts:
  // // Initialize mobile toolbar
  // const mobileToggle = document.getElementById("mobileToolbarToggle");
  // const mobileMenu = document.getElementById("mobileToolbarMenu");
  // const mobileClose = document.getElementById("mobileMenuClose");

  // mobileToggle.addEventListener("click", () => {
  //   mobileMenu.classList.add("active");
  // });

  // mobileClose.addEventListener("click", () => {
  //   mobileMenu.classList.remove("active");
  // });

  // // Close mobile menu on outside click
  // mobileMenu.addEventListener("click", (e) => {
  //   if (e.target === mobileMenu) {
  //     mobileMenu.classList.remove("active");
  //   }
  // });

  // // Mobile menu item clicks
  // document.querySelectorAll(".mobile-menu-item").forEach((item) => {
  //   item.addEventListener("click", function () {
  //     const { stateManager } = getState();
  //     const action = this.dataset.action;
  //     mobileMenu.classList.remove("active");

  //     // Trigger the appropriate action
  //     switch (action) {
  //       case "upload":
  //         getState().panelManager.openSidePanel("Upload Files", "uploadPanelTemplate");
  //         break;
  //       case "layers":
  //         getState().panelManager.openSidePanel("Layers", "layersPanelTemplate");
  //         break;
  //       case "basemap":
  //         getState().panelManager.openSidePanel("Basemap", "basemapPanelTemplate");
  //         break;
  //       case "measure":
  //         toggleMeasurement();
  //         break;
  //       case "draw":
  //         getState().panelManager.openSidePanel("Drawing Tools", "drawingPanelTemplate");
  //         initializeDrawingPanel();
  //         break;
  //       case "locate":
  //         locateUser();
  //         break;
  //       case "analysis":
  //         getState().panelManager.openSidePanel("Spatial Analysis", "analysisPanelTemplate");
  //         break;
  //       case "visualize":
  //         getState().panelManager.openSidePanel("Visualization", "visualizationPanelTemplate");
  //         break;
  //       case "classification":
  //         getState().panelManager.openSidePanel("Classification", "classificationPanelTemplate");
  //         initializeClassificationPanel();
  //         break;
  //     }
  //   });
  // });

  // // Desktop toolbar buttons
  // document.getElementById("uploadBtn").addEventListener("click", function () {
  //   this.classList.toggle("active");
  //   getState().panelManager.openSidePanel("Upload Files", "uploadPanelTemplate");
  // });

  // document.getElementById("layersBtn").addEventListener("click", function () {
  //   this.classList.toggle("active");
  //   getState().panelManager.openSidePanel("Layers", "layersPanelTemplate");
  // });

  // document.getElementById("basemapBtn").addEventListener("click", function () {
  //   this.classList.toggle("active");
  //   getState().panelManager.openSidePanel("Basemap", "basemapPanelTemplate");
  // });

  // document.getElementById("analysisBtn").addEventListener("click", function () {
  //   this.classList.toggle("active");
  //   getState().panelManager.openSidePanel("Spatial Analysis", "analysisPanelTemplate");
  // });

  // document
  //   .getElementById("visualizeBtn")
  //   .addEventListener("click", function () {
  //     this.classList.toggle("active");
  //     getState().panelManager.openSidePanel("Visualization", "visualizationPanelTemplate");
  //   });

  // document
  //   .getElementById("classificationBtn")
  //   .addEventListener("click", function () {
  //     this.classList.toggle("active");
  //     getState().panelManager.openSidePanel("Classification", "classificationPanelTemplate");
  //     initializeClassificationPanel();
  //   });

  // document.getElementById("tableBtn").addEventListener("click", function () {
  //   this.classList.toggle("active");
  // });

  // COMMENTED OUT - Moved to js/layers/basemap-manager.js
  // Initialize basemap switcher
  // const basemapItems = document.querySelectorAll(".basemap-item");
  // basemapItems.forEach((item) => {
  //   item.addEventListener("click", () => {
  //     const { stateManager } = getState();
  //     const map = stateManager.getMap();
  //     const basemap = item.dataset.basemap;

  //     if (map) {
  //       map.basemap = basemap;
  //       // Update active state
  //       basemapItems.forEach((b) => b.classList.remove("active"));
  //       item.classList.add("active");
  //     }
  //   });
  // });

  // Initialize file upload
  initializeFileUpload();

  // ============================================================================
  // COMMENTED OUT - Moved to js/ui/toolbar-manager.js
  // ============================================================================
  // Tool initialization (draw, clear, locate) has been extracted to ToolbarManager
  // ============================================================================
  // // Initialize tools
  // initializeTools();

  // Initialize coordinate display (pass view for proper scope)
  // EXTRACTED TO: js/events/coordinate-display.js
  // initializeCoordinateDisplay(view);

  // Initialize fullscreen listener
  initializeFullscreenListener();

  // Initialize map tabs (MOVED TO TabSystem in main.js)
  // initializeMapTabs();
}

// initializeUI is already exported in the module exports section

// Add these new functions after initializeUI():

// Side panel management has been moved to PanelManager class
// Panel management functions have been moved to PanelManager class

// Panel management functions have been moved to PanelManager class

// Panel management is now handled by PanelManager
// Initialization of panel close button moved to PanelManager class

// ============================================================================
// FILE UPLOAD - Moved to js/layers/upload-handler.js
// ============================================================================
// COMMENTED OUT - Functionality moved to UploadHandler class
// Initialize file upload functionality
// function initializeFileUpload() {
//   const { stateManager } = getState();

//   const dropZone = document.getElementById("dropZone");
//   const fileInput = document.getElementById("fileInput");

//   // Prevent default drag behaviors
//   ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
//     dropZone.addEventListener(eventName, preventDefaults, false);
//     document.body.addEventListener(eventName, preventDefaults, false);
//   });

//   // Highlight drop zone when item is dragged over it
//   ["dragenter", "dragover"].forEach((eventName) => {
//     dropZone.addEventListener(
//       eventName,
//       () => {
//         dropZone.classList.add("drag-over");
//       },
//       false
//     );
//   });

//   ["dragleave", "drop"].forEach((eventName) => {
//     dropZone.addEventListener(
//       eventName,
//       () => {
//         dropZone.classList.remove("drag-over");
//       },
//       false
//     );
//   });

//   // Handle dropped files
//   dropZone.addEventListener("drop", handleDrop, false);

//   // Handle file input change
//   fileInput.addEventListener("change", (e) => {
//     handleFiles(e.target.files);
//   });

//   function preventDefaults(e) {
//     e.preventDefault();
//     e.stopPropagation();
//   }

//   function handleDrop(e) {
//     const dt = e.dataTransfer;
//     const files = dt.files;
//     handleFiles(files);
//   }
// }

// Stub function for backward compatibility - delegates to UploadHandler
function initializeFileUpload() {
  const { uploadHandler } = getState();
  if (uploadHandler) {
    uploadHandler.initializeFileUpload();
  }
}

// COMMENTED OUT - Functionality moved to UploadHandler class
// Handle uploaded files
// async function handleFiles(files) {
//   for (let file of files) {
//     const extension = file.name.split(".").pop().toLowerCase();

//     if (!["csv", "geojson", "json"].includes(extension)) {
//       /* Continuing script.js */

//       showNotification(
//         "Error: Only CSV and GeoJSON files are supported",
//         "error"
//       );
//       continue;
//     }

//     const reader = new FileReader();
//     reader.onload = async (e) => {
//       try {
//         const content = e.target.result;

//         if (extension === "csv") {
//           await loadCSV(content, file.name);
//         } else if (extension === "geojson" || extension === "json") {
//           await loadGeoJSON(content, file.name);
//         }

//         showNotification(`Successfully loaded: ${file.name}`, "success");
//       } catch (error) {
//         console.error("Error loading file:", error);
//         showNotification(
//           `Error loading ${file.name}:
//         );
//       }
//     };

//     reader.readAsText(file);
//   }
// }

// ============================================================================
// COMMENTED OUT - Moved to js/layers/upload-handler.js
// ============================================================================
// Replace loadCSV function with this improved version
// async function loadCSV(content, filename) {
//   const [FeatureLayer, Graphic, Point] = await Promise.all([
//     loadModule("esri/layers/FeatureLayer"),
//     loadModule("esri/Graphic"),
//     loadModule("esri/geometry/Point"),
//   ]);

//   // Parse CSV more robustly
//   const lines = content.trim().split(/\r?\n/); // Handle different line endings
//   if (lines.length < 2) {
//     throw new Error("CSV file is empty or has no data");
//   }

//   // Parse headers - handle quoted values and trim spaces
//   const headers = parseCSVLine(lines[0]).map((h) => h.trim());
//   console.log("CSV Headers:", headers);

//   // Find coordinate columns with more flexible matching
//   let latIndex = -1;
//   let lonIndex = -1;

//   headers.forEach((header, index) => {
//     const lowerHeader = header.toLowerCase();
//     // Check for latitude
//     if (
//       latIndex === -1 &&
//       (lowerHeader === "latitude" ||
//         lowerHeader === "lat" ||
//         lowerHeader === "y" ||
//         lowerHeader.includes("latitud"))
//     ) {
//       latIndex = index;
//     }
//     // Check for longitude
//     if (
//       lonIndex === -1 &&
//       (lowerHeader === "longitude" ||
//         lowerHeader === "lon" ||
//         lowerHeader === "lng" ||
//         lowerHeader === "long" ||
//         lowerHeader === "x" ||
//         lowerHeader.includes("longitud"))
//     ) {
//       lonIndex = index;
//     }
//   });

//   if (latIndex === -1 || lonIndex === -1) {
//     console.error("Could not find coordinate columns. Headers:", headers);
//     throw new Error(
//       `CSV must contain latitude and longitude columns. Found headers: ${headers.join(
//         ", "
//       )}`
//     );
//   }

//   // Create fields definition for all columns
//   const fields = headers.map((header, idx) => {
//     // Determine field type based on first data row
//     let fieldType = "string";
//     if (lines.length > 1) {
//       const firstDataRow = parseCSVLine(lines[1]);
//       const sampleValue = firstDataRow[idx];
//       if (sampleValue && !isNaN(sampleValue)) {
//         fieldType = sampleValue.includes(".") ? "double" : "integer";
//       }
//     }

//     return {
//       name: header,
//       alias: header,
//       type: fieldType,
//     };
//   });

//   // Add ObjectID field
//   fields.unshift({
//     name: "ObjectID",
//     alias: "ObjectID",
//     type: "oid",
//   });

//   // Create features
//   const features = [];
//   let objectId = 1;

//   for (let i = 1; i < lines.length; i++) {
//     if (!lines[i].trim()) continue; // Skip empty lines

//     const values = parseCSVLine(lines[i]);
//     const lat = parseFloat(values[latIndex]);
//     const lon = parseFloat(values[lonIndex]);

//     if (!isNaN(lat) && !isNaN(lon)) {
//       const attributes = {
//         ObjectID: objectId++,
//       };

//       // Add all attributes
//       headers.forEach((header, idx) => {
//         let value = values[idx]?.trim() || "";

//         // Convert numeric values
//         if (value && !isNaN(value)) {
//           value = value.includes(".") ? parseFloat(value) : parseInt(value);
//         }

//         attributes[header] = value;
//       });

//       const graphic = new Graphic({
//         geometry: new Point({
//           longitude: lon,
//           latitude: lat,
//         }),
//         attributes: attributes,
//       });

//       features.push(graphic);
//     }
//   }

//   console.log(`Created ${features.length} features from CSV`);

//   // Create feature layer
//   const layer = new FeatureLayer({
//     source: features,
//     objectIdField: "ObjectID",
//     fields: fields,
//     title: filename,
//     outFields: ["*"],
//     renderer: {
//       type: "simple",
//       symbol: {
//         type: "simple-marker",
//         size: 8,
//         color: [51, 122, 183, 0.8],
//         outline: {
//           color: [255, 255, 255, 1],
//           width: 1,
//         },
//       },
//     },
//   });

//   const { stateManager } = getState();
//   displayMap.add(layer);
//   stateManager.addUploadedLayer(layer);
//   updateLayerList();

//   // Zoom to features
//   if (features.length > 0) {
//     await stateManager.getView().goTo(features);
//   }
// }

// Helper function to parse CSV line handling quoted values
// function parseCSVLine(line) {
//   const result = [];
//   let current = "";
//   let inQuotes = false;

//   for (let i = 0; i < line.length; i++) {
//     const char = line[i];

//     if (char === '"') {
//       inQuotes = !inQuotes;
//     } else if (char === "," && !inQuotes) {
//       result.push(current);
//       current = "";
//     } else {
//       current += char;
//     }
//   }

//   result.push(current); // Don't forget the last value
//   return result;
// }

// // Replace loadGeoJSON function with this fixed version
// async function loadGeoJSON(content, filename) {
//   const [GeoJSONLayer] = await Promise.all([
//     loadModule("esri/layers/GeoJSONLayer")
//   ]);

//   // Parse GeoJSON to check structure but don't modify it
//   let geojsonData;
//   try {
//     geojsonData = JSON.parse(content);
//     console.log('GeoJSON loaded with features:', geojsonData.features?.length);
//   } catch (error) {
//     throw new Error('Invalid GeoJSON format');
//   }

//   // Create blob URL from original content (don't modify the data)
//   const blob = new Blob([content], { type: 'application/json' });
//   const url = URL.createObjectURL(blob);

//   const layer = new GeoJSONLayer({
//     url: url,
//     title: filename,
//     outFields: ["*"], // Request all fields
//     renderer: {
//       type: "simple",
//       symbol: {
//         type: "simple-fill",
//         color: [51, 122, 183, 0.4],
//         outline: {
//           color: [51, 122, 183, 1],
//           width: 2
//         }
//       }
//     }
//   });

//   await layer.load();

//   // Log fields to debug
//   console.log('Layer fields:', layer.fields);

//   displayMap.add(layer);
//   uploadedLayers.push(layer);
//   updateLayerList();

//   // Zoom to layer extent
//   if (layer.fullExtent) {
//     await view.goTo(layer.fullExtent);
//   }

//   // Clean up blob URL
//   URL.revokeObjectURL(url);
// }

// ============================================================================
// COMMENTED OUT - Moved to js/layers/upload-handler.js
// ============================================================================
// async function loadGeoJSON(content, filename) {
//   const [GeoJSONLayer] = await Promise.all([
//     loadModule("esri/layers/GeoJSONLayer"),
//   ]);

//   // Parse GeoJSON to check structure
//   let geojsonData;
//   let nullFields = [];

//   try {
//     geojsonData = JSON.parse(content);
//     console.log("GeoJSON loaded with features:", geojsonData.features?.length);

//     // Analyze fields for null values
//     if (geojsonData.features && geojsonData.features.length > 0) {
//       const fieldNullCounts = {};

//       // Check all features for null fields
//       geojsonData.features.forEach((feature) => {
//         if (feature.properties) {
//           Object.entries(feature.properties).forEach(([key, value]) => {
//             if (value === null || value === undefined) {
//               fieldNullCounts[key] = (fieldNullCounts[key] || 0) + 1;
//             }
//           });
//         }
//       });

//       // Find fields that are null in ALL features
//       const totalFeatures = geojsonData.features.length;
//       Object.entries(fieldNullCounts).forEach(([field, count]) => {
//         if (count === totalFeatures) {
//           nullFields.push(field);
//         }
//       });
//     }

//     // Fix geometry types if needed
//     let hasGeometryFixes = false;
//     if (geojsonData.features) {
//       geojsonData.features.forEach((feature) => {
//         if (feature.geometry) {
//           // Fix common geometry type issues
//           if (
//             feature.geometry.type === "Polyline" ||
//             feature.geometry.type === "Line"
//           ) {
//             feature.geometry.type = "LineString";
//             hasGeometryFixes = true;
//           } else if (feature.geometry.type === "Polylines") {
//             feature.geometry.type = "MultiLineString";
//             hasGeometryFixes = true;
//           }
//         }
//       });
//     }

//     // If we made geometry fixes, update the content
//     if (hasGeometryFixes) {
//       content = JSON.stringify(geojsonData);
//       console.log("Fixed geometry types in GeoJSON");
//     }
//   } catch (error) {
//     throw new Error("Invalid GeoJSON format");
//   }

//   // Create blob URL from content
//   const blob = new Blob([content], { type: "application/json" });
//   const url = URL.createObjectURL(blob);

//   // Temporarily suppress console warnings
//   const originalWarn = console.warn;
//   const warnings = [];
//   console.warn = (msg) => {
//     if (
//       msg &&
//       msg.includes &&
//       msg.includes("fields types couldn't be inferred")
//     ) {
//       warnings.push(msg);
//     } else {
//       originalWarn(msg);
//     }
//   };

//   try {
//     // Detect geometry type for proper rendering
//     let geometryType = null;
//     let renderer = null;

//     if (geojsonData.features && geojsonData.features.length > 0) {
//       const firstFeature = geojsonData.features[0];
//       if (firstFeature.geometry) {
//         switch (firstFeature.geometry.type) {
//           case "Point":
//             geometryType = "point";
//             renderer = {
//               type: "simple",
//               symbol: {
//                 type: "simple-marker",
//                 size: 8,
//                 color: [51, 122, 183, 0.8],
//                 outline: {
//                   color: [255, 255, 255, 1],
//                   width: 1,
//                 },
//               },
//             };
//             break;
//           case "LineString":
//           case "MultiLineString":
//             geometryType = "polyline";
//             renderer = {
//               type: "simple",
//               symbol: {
//                 type: "simple-line",
//                 color: [51, 122, 183, 1],
//                 width: 3,
//                 style: "solid",
//               },
//             };
//             break;
//           case "Polygon":
//           case "MultiPolygon":
//             geometryType = "polygon";
//             renderer = {
//               type: "simple",
//               symbol: {
//                 type: "simple-fill",
//                 color: [51, 122, 183, 0.4],
//                 outline: {
//                   color: [51, 122, 183, 1],
//                   width: 2,
//                 },
//               },
//             };
//             break;
//         }
//       }
//     }

//     const layer = new GeoJSONLayer({
//       url: url,
//       title: filename,
//       outFields: ["*"],
//       renderer: renderer || {
//         type: "simple",
//         symbol: {
//           type: "simple-fill",
//           color: [51, 122, 183, 0.4],
//           outline: {
//             color: [51, 122, 183, 1],
//             width: 2,
//           },
//         },
//       },
//     });

//     // Wait for layer to load
//     await layer.load();

//     // Restore console.warn
//     console.warn = originalWarn;

//     // Log fields to debug
//     console.log("Layer loaded successfully");
//     console.log("Geometry type:", layer.geometryType);
//     console.log(
//       "Number of fields loaded:",
//       layer.fields ? layer.fields.length : 0
//     );

//     displayMap.add(layer);
//     const { stateManager } = getState();
//     stateManager.addUploadedLayer(layer);
//     updateLayerList();

//     // Zoom to layer extent
//     if (layer.fullExtent) {
//       await stateManager.getView().goTo(layer.fullExtent.expand(1.1));
//     }

//     // Clean up blob URL
//     URL.revokeObjectURL(url);

//     // Show appropriate notifications
//     const validFields = layer.fields
//       ? layer.fields.filter((f) => f.name !== "OBJECTID").length
//       : 0;
//     const featureCount = geojsonData.features?.length || 0;

//     // // Main success notification
//     // showNotification(`Successfully loaded: ${filename} (${featureCount} features, ${validFields} fields)`, 'success');

//     // // Warning about null fields if any
//     // if (nullFields.length > 0) {
//     //   setTimeout(() => {
//     //     showNotification(
//     //       `Note: ${nullFields.length} field(s) were excluded because they contain only null values: ${nullFields.join(', ')}`,
//     //       'warning'
//     //     );
//     //   }, 500);
//     // }
//   } catch (error) {
//     console.error("Error loading GeoJSON:", error);
//     console.warn = originalWarn; // Restore console.warn
//     URL.revokeObjectURL(url);

//     // showNotification(`Error loading ${filename}: ${error.message}`, 'error');
//     throw error;
//   }
// }

// ============================================================================
// LAYER MANAGEMENT - Delegated to js/layers/layer-manager.js
// ============================================================================
// These stub functions delegate to LayerManager for backward compatibility
// with code in script.js that still calls these functions directly

function updateLayerList() {
  const { layerManager } = getState();
  if (layerManager) {
    layerManager.updateLayerList();
  }
}

function toggleLayer(index) {
  const { layerManager } = getState();
  if (layerManager) {
    layerManager.toggleLayer(index);
  }
}

async function zoomToLayer(index) {
  const { layerManager } = getState();
  if (layerManager) {
    await layerManager.zoomToLayer(index);
  }
}

function removeLayer(index) {
  const { layerManager } = getState();
  if (layerManager) {
    layerManager.removeLayer(index);
  }
}

/**
 * Register callbacks with LayerManager for modules that need to react to layer list updates
 * This replaces the old monkey-patching pattern (originalUpdateLayerList, originalUpdateLayerList2, etc.)
 */
function registerLayerManagerCallbacks(layerManager) {
  // Callback 1: Update attribute table layer select when layers change
  layerManager.onLayerListUpdate(() => {
    const tableWidget = document.getElementById("attributeTableWidget");
    if (tableWidget && !tableWidget.classList.contains("hidden")) {
      if (typeof initializeTableLayerSelect === "function") {
        initializeTableLayerSelect();
      }
    }
  });

  // Callback 2: Update heatmap layer select when layers change
  layerManager.onLayerListUpdate(() => {
    if (
      window.heatmapEnabled &&
      typeof updateHeatmapLayerSelect === "function"
    ) {
      updateHeatmapLayerSelect();
    }
  });

  // Callback 3: Add analysis layer to layer list if it has graphics
  layerManager.onLayerListUpdate(() => {
    if (
      analysisLayer &&
      analysisLayer.graphics &&
      analysisLayer.graphics.length > 0
    ) {
      const layerList = document.getElementById("layerList");
      if (layerList) {
        const analysisItem = document.createElement("div");
        analysisItem.className = "layer-item";
        analysisItem.innerHTML = `
          <input type="checkbox" class="layer-checkbox" 
                 ${analysisLayer.visible ? "checked" : ""} 
                 onchange="analysisLayer.visible = this.checked">
          <label class="layer-name">Analysis Results (${
            analysisLayer.graphics.length
          })</label>
          <div class="layer-actions">
            <button onclick="clearAnalysisResults()" title="Clear results">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        `;
        layerList.appendChild(analysisItem);
      }
    }
  });

  console.log(
    "✅ LayerManager callbacks registered (attribute table, heatmap, analysis)"
  );
}

// ============================================================================
// COMMENTED OUT - Original implementation moved to js/layers/layer-manager.js
// ============================================================================
// Update the layer list to also update legend
// function updateLayerList() {
//   const layerList = document.getElementById("layerList");

//   // Check if we're in the side panel or original location
//   const panelLayerList = document.querySelector("#sidePanelContent #layerList");
//   const targetList = panelLayerList || layerList;

//   if (!targetList) return;

//   const { stateManager } = getState();
//   if ((stateManager.getUploadedLayers() || []).length === 0) {
//     targetList.innerHTML = `
//       <div class="empty-state">
//         <i class="fas fa-layer-group"></i>
//         <p>No layers loaded</p>
//       </div>
//     `;
//   } else {
//     targetList.innerHTML = (stateManager.getUploadedLayers() || [])
//       .map(
//         (layer, index) => `
//       <div class="layer-item">
//         <input type="checkbox" class="layer-checkbox" id="layer-${index}"
//                ${layer.visible ? "checked" : ""
//           } onchange="toggleLayer(${index})">
//         <label for="layer-${index}" class="layer-name">${layer.title}</label>
//         <div class="layer-actions">
//           <button onclick="zoomToLayer(${index})" title="Zoom to layer">
//             <i class="fas fa-search-plus"></i>
//           </button>
//           <button onclick="removeLayer(${index})" title="Remove layer">
//             <i class="fas fa-trash"></i>
//           </button>
//         </div>
//       </div>
//     `
//       )
//       .join("");
//   }

//   // Update legend if it's active
//   const legendUpdateHandler = activeWidgets.get("legendUpdateHandler");
//   if (legendUpdateHandler) {
//     legendUpdateHandler();
//   }
// }

// // Layer control functions
// function toggleLayer(index) {
//   const { stateManager } = getState();
//   const layers = stateManager.getUploadedLayers() || [];
//   if (layers[index]) layers[index].visible = !layers[index].visible;
// }

// async function zoomToLayer(index) {
//   const { stateManager } = getState();
//   const layer = (stateManager.getUploadedLayers() || [])[index];
//   if (layer && layer.fullExtent) {
//     await stateManager.getView().goTo(layer.fullExtent);
//   }
// }

// function removeLayer(index) {
//   const { stateManager } = getState();
//   const layer = (stateManager.getUploadedLayers() || [])[index];
//   if (layer) stateManager.getMap().remove(layer);
//   stateManager.removeUploadedLayer(index);
//   updateLayerList();
// }
// ============================================================================

// ============================================================================
// COMMENTED OUT - Moved to js/ui/toolbar-manager.js
// ============================================================================
// Initialize tools
// function initializeTools() {
//   // // Measure tool
//   // document.getElementById('measureBtn').addEventListener('click', toggleMeasurement);

//   // Draw tool
//   document.getElementById("drawBtn").addEventListener("click", toggleDraw);

//   // Clear tool
//   document.getElementById("clearBtn").addEventListener("click", clearAll);

//   // Locate tool
//   document.getElementById("locateBtn").addEven", locateUsick"cltListener(

// // Replace your existing toggleDraw function:
// async function toggleDraw() {
//   const btn = document.getElementById('drawBtn');

//   if (btn.classList.contains('active')) {
//     // Deactivate draw
//     btn.classList.remove('active');
//     closeSidePanel();
//     if (sketchViewModel) {
//       sketchViewModel.cancel();
//     }
//     resetDrawingTools();
//   } else {
//     // Deactivate other tools
//     document.getElementById('measureBtn').classList.remove('active');
//     if (measurementWidget) {
//       measurementWidget.clear();
//       view.ui.remove(measurementWidget);
//     }

//     btn.classList.add('active');
//     openSidePanel('Drawing Tools', 'drawingPanelTemplate');
//     await initializeSketchViewModel();
//     initializeDrawingPanel();
//   }
// }

// async function toggleDraw() {
//   const btn = document.getElementById("drawBtn");

//   // Check if button exists before using it
//   if (!btn) {
//     console.error("Draw button not found");
//     return;
//   }

//   if (btn.classList.contains("active")) {
//     // Deactivate draw
//     btn.classList.remove("active");
//     closeSidePanel();
//     const { stateManager } = getState();
//     const sketchViewModel = stateManager.getSketchViewModel();
//     if (sketchViewModel) {
//       sketchViewModel.cancel();
//     }
//     resetDrawingTools();
//   } else {
//     // Deactivate other tools
//     const { stateManager } = getState();
//     const measureBtn = document.getElementById("measureBtn");
//     if (measureBtn) {
//       measureBtn.classList.remove("active");
//     }
//     const measurementWidget = stateManager.getMeasurementWidget();
//     const view = stateManager.getView();
//     if (measurementWidget && view) {
//       measurementWidget.clear();
//       view.ui.remove(measurementWidget);
//     }

//     btn.classList.add("active");
//     openSidePanel("Drawing Tools", "drawingPanelTemplate");
//     await initializeSketchViewModel();
//     initializeDrawingPanel();
//   }
// }

// EXTRACTED TO: js/tools/drawing-manager.js
// Add this new function for drawing panel initialization:
// function initializeDrawingPanel() {
//   // Re-initialize drawing tool buttons in the new panel
//   const drawToolBtns = document.querySelectorAll(
//     "#sidePanelContent .draw-tool-btn"
//   );

//   drawToolBtns.forEach((btn) => {
//     btn.addEventListener("click", () => {
//       const tool = btn.dataset.tool;

//       // Update active state
//       drawToolBtns.forEach((b) => b.classList.remove("active"));
//       btn.classList.add("active");

//       // Start drawing
//       const { stateManager } = getState();
//       stateManager.setActiveDrawingTool(tool);
//       startDrawingWithTool(tool);
//     });
//   });

//   // Re-initialize clear button
//   const clearBtn = document.querySelector("#sidePanelContent #clearDrawings");
//   if (clearBtn) {
//     clearBtn.addEventListener("click", () => {
//       if (confirm("Clear all drawings?")) {
//         const { stateManager } = getState();
//         const drawLayer = stateManager.getDrawLayer();
//         const sketchViewModel = stateManager.getSketchViewModel();
//         if (drawLayer) drawLayer.removeAll();
//         if (sketchViewModel) sketchViewModel.cancel();
//         resetDrawingTools();
//       }
//     });
//   }

//   // Re-initialize color and opacity controls
//   const colorInput = document.querySelector("#sidePanelContent #drawColor");
//   const opacityInput = document.querySelector("#sidePanelContent #drawOpacity");
//   const opacityValue = document.querySelector(
//     "#sidePanelContent .slider-value"
//   );

//   if (colorInput) {
//     colorInput.addEventListener("change", updateActiveGraphicsSymbology);
//   }

//   if (opacityInput) {
//     opacityInput.addEventListener("input", (e) => {
//       if (opacityValue) {
//         opacityValue.textContent = e.target.value + "%";
//       }
//       updateActiveGraphicsSymbology();
//     });
//   }
// }

// EXTRACTED TO: js/tools/drawing-manager.js
// Initialize SketchViewModel
// async function initializeSketchViewModel() {
//   const { stateManager } = getState();
//   let sketchViewModel = stateManager.getSketchViewModel();

//   if (!sketchViewModel) {
//     const [SketchViewModel, GraphicsLayer] = await Promise.all([
//       loadModule("esri/widgets/Sketch/SketchViewModel"),
//       loadModule("esri/layers/GraphicsLayer"),
//     ]);

//     const view = stateManager.getView();
//     const displayMap = stateManager.getMap();
//     let drawLayer = stateManager.getDrawLayer();

//     // Create graphics layer if it doesn't exist
//     if (!drawLayer) {
//       drawLayer = new GraphicsLayer({
//         title: "Drawings",
//         listMode: "show",
//       });
//       displayMap.add(drawLayer);
//       stateManager.setDrawLayer(drawLayer);
//     }

//     // Create SketchViewModel with proper configuration
//     sketchViewModel = new SketchViewModel({
//       view: view,
//       layer: drawLayer,
//       updateOnGraphicClick: false,
//       defaultUpdateOptions: {
//         toggleToolOnClick: false,
//         enableRotation: false,
//         enableScaling: false,
//         enableZ: false,
//       },
//       defaultCreateOptions: {
//         hasZ: false,
//         mode: "click", // Important for proper drawing
//       },
//     });

//     // Store in StateManager
//     stateManager.setSketchViewModel(sketchViewModel);

//     console.log("SketchViewModel initialized");

//     // Set up permanent event listeners
//     sketchViewModel.on("create", (event) => {
//       if (event.state === "start") {
//         view.container.style.cursor = "crosshair";
//       } else if (event.state === "complete" || event.state === "cancel") {
//         view.container.style.cursor = "default";
//       }
//     });
//   }

//   return sketchViewModel;
// }

// function cancelBufferDrawing () {
//   console.log("Canceling buffer drawing");

//   // Get stateManager instance
//   const { stateManager } = getState();

//   // Restore modal
//   disableDrawingMode("bufferModal");

//   // Reset cursor
//   const view = stateManager.getView();
//   if (view) {
//     view.container.style.cursor = "default";
//   }

//   const sketchViewModel = stateManager.getSketchViewModel();
//   if (sketchViewModel) {
//     sketchViewModel.cancel();
//   }

//   stateManager.setAnalysisDrawing(false);

//   const indicator = document.getElementById("drawingIndicator");
//   if (indicator) {
//     indicator.remove();
//   }

//   if (window.currentBufferHandler) {
//     window.currentBufferHandler.remove();
//   }

//   // Reset button states
//   document.querySelectorAll(".draw-option-btn").forEach((btn) => {
//     btn.classList.remove("active");
//   });
// };

// window.debugDrawing = function () {
//   const { stateManager } = getState();
//   const sketchViewModel = stateManager.getSketchViewModel();
//   const view = stateManager.getView();
//   const drawLayer = stateManager.getDrawLayer();

//   console.log("Debug Info:");
//   console.log("- SketchViewModel exists:", !!sketchViewModel);
//   console.log("- View exists:", !!view);
//   console.log("- DrawLayer exists:", !!drawLayer);
//   console.log("- Analysis drawing active:", stateManager.isAnalysisDrawing());
//   if (view) {
//     console.log("- Current cursor:", view.container.style.cursor);
//   }

//   if (sketchViewModel) {
//     console.log("- SketchViewModel state:", sketchViewModel.state);
//     console.log("- SketchViewModel layer:", sketchViewModel.layer);
//   }
// };

// Function to move modal for drawing
// function enableDrawingMode(modalId) {
//   const modal = document.getElementById(modalId);
//   const modalContent = modal.querySelector(".modal-content");

//   // Create a temporary container outside the modal
//   let tempContainer = document.getElementById("tempModalContainer");
//   if (!tempContainer) {
//     tempContainer = document.createElement("div");
//     tempContainer.id = "tempModalContainer";
//     tempContainer.style.cssText = `
//       position: fixed;
//       top: 80px;
//       right: 20px;
//       z-index: 50;
//       max-width: 400px;
//     `;
//     document.body.appendChild(tempContainer);
//   }

//   // Move modal content to temp container
//   modal.setAttribute("data-drawing", "true");
//   modal.style.display = "none";
//   tempContainer.appendChild(modalContent);
// }

// Function to restore modal
// function disableDrawingMode(modalId) {
//   const modal = document.getElementById(modalId);
//   const tempContainer = document.getElementById("tempModalContainer");
//   const modalContent = tempContainer?.querySelector(".modal-content");

//   if (modalContent && modal.getAttribute("data-drawing") === "true") {
//     modal.style.display = "";
//     modal.appendChild(modalContent);
//     modal.removeAttribute("data-drawing");

//     // Clean up temp container
//     if (tempContainer && tempContainer.children.length === 0) {
//       tempContainer.remove();
//     }
//   }
// }

// Setup SketchViewModel events
// function setupSketchViewModelEvents() {
//   const { stateManager } = getState();
//   const sketchViewModel = stateManager.getSketchViewModel();

//   if (!sketchViewModel) {
//     console.warn('SketchViewModel not initialized');
//     return;
//   }

//   // Handle create events
//   sketchViewModel.on("create", (event) => {
//     if (event.state === "complete") {
//       // Apply custom symbology when creation is complete
//       applyCustomSymbology(event.graphic);

//       // Continue drawing if tool is still active
//       if (getState().stateManager.getActiveDrawingTool()) {
//         setTimeout(() => {
//           if (getState().stateManager.getActiveDrawingTool()) {
//             startDrawingWithTool(getState().stateManager.getActiveDrawingTool());
//           }
//         }, 100);
//       }
//     }
//   });

//   // Handle update events
//   sketchViewModel.on("update", (event) => {
//     if (event.state === "complete") {
//       event.graphics.forEach((graphic) => {
//         applyCustomSymbology(graphic);
//       });
//     }
//   });
// }

// Initialize drawing tool buttons
// function initializeDrawingToolButtons() {
//   const drawToolBtns = document.querySelectorAll(".draw-tool-btn");
//   const clearDrawingsBtn = document.getElementById("clearDrawings");

//   // Remove existing listeners first
//   drawToolBtns.forEach((btn) => {
//     const newBtn = btn.cloneNode(true);
//     btn.parentNode.replaceChild(newBtn, btn);
//   });

//   // Add new listeners
//   document.querySelectorAll(".draw-tool-btn").forEach((btn) => {
//     btn.addEventListener("click", () => {
//       const tool = btn.dataset.tool;

//       // Update active state
//       document
//         .querySelectorAll(".draw-tool-btn")
//         .forEach((b) => b.classList.remove("active"));
//       btn.classList.add("active");

//       // Start drawing
//       const { stateManager } = getState();
//       stateManager.setActiveDrawingTool(tool);
//       startDrawingWithTool(tool);
//     });
//   });

//   // Clear drawings button
//   const newClearBtn = clearDrawingsBtn.cloneNode(true);
//   clearDrawingsBtn.parentNode.replaceChild(newClearBtn, clearDrawingsBtn);

//   document.getElementById("clearDrawings").addEventListener("click", () => {
//     if (confirm("Clear all drawings?")) {
//       const { stateManager } = getState();
//       const drawLayer = stateManager.getDrawLayer();
//       const sketchViewModel = stateManager.getSketchViewModel();
//       if (drawLayer) drawLayer.removeAll();
//       if (sketchViewModel) sketchViewModel.cancel();
//       resetDrawingTools();
//     }
//   });

//   // Color and opacity change handlers
//   document
//     .getElementById("drawColor")
//     .addEventListener("change", updateActiveGraphicsSymbology);
//   document
//     .getElementById("drawOpacity")
//     .addEventListener("input", updateActiveGraphicsSymbology);
// }

// EXTRACTED TO: js/tools/drawing-manager.js
// Start drawing with specific tool
// function startDrawingWithTool(tool) {
//   const { stateManager } = getState();
//   const sketchViewModel = stateManager.getSketchViewModel();
//   const view = stateManager.getView();

//   if (!sketchViewModel) {
//     console.error('SketchViewModel not initialized. Call initializeSketchViewModel first.');
//     return;
//   }

//   // Cancel any active operation
//   sketchViewModel.cancel();

//   // Set cursor for drawing
//   if (view) {
//     view.container.style.cursor = "crosshair";
//   }

//   // Get current symbology settings
//   const color = hexToRgb(
//     document.getElementById("drawColor")?.value || "#2196F3"
//   );
//   const opacity = (document.getElementById("drawOpacity")?.value || 70) / 100;

//   // Set symbology based on tool
//   switch (tool) {
//     case "point":
//       sketchViewModel.pointSymbol = {
//         type: "simple-marker",
//         style: "circle",
//         color: [...color, opacity],
//         size: 12,
//         outline: {
//           color: [255, 255, 255, 1],
//           width: 2,
//         },
//       };
//       break;
//     case "polyline":
//       sketchViewModel.polylineSymbol = {
//         type: "simple-line",
//         color: [...color, opacity],
//         width: 3,
//         cap: "round",
//         join: "round",
//       };
//       break;
//     case "polygon":
//     case "rectangle":
//     case "circle":
//       sketchViewModel.polygonSymbol = {
//         type: "simple-fill",
//         color: [...color, opacity * 0.5],
//         outline: {
//           color: [...color, 1],
//           width: 2,
//         },
//       };
//       break;
//   }

//   // Create
//     console.log("Starting to draw:", tool);
//     sketchViewModel.create(tool);
//   } catch (error) {
//     console.error("Error creating geometry:", error);
//     showNotification("Error starting drawing tool", "error");
//     view.container.style.cursor = "default";
//   }
// }

// EXTRACTED TO: js/tools/drawing-manager.js
// Apply custom symbology to graphic
// function applyCustomSymbology(graphic) {
//   if (!graphic) return;

//   const color = hexToRgb(document.getElementById("drawColor").value);
//   const opacity = document.getElementById("drawOpacity").value / 100;

//   switch (graphic.geometry.type) {
//     case "point":
//       graphic.symbol = {
//         type: "simple-marker",
//         style: "circle",
//         color: [...color, opacity],
//         size: 12,
//         outline: {
//           color: [255, 255, 255, 1],
//           width: 2,
//         },
//       };
//       break;
//     case "polyline":
//       graphic.symbol = {
//         type: "simple-line",
//         color: [...color, opacity],
//         width: 3,
//         cap: "round",
//         join: "round",
//       };
//       break;
//     case "polygon":
//       graphic.symbol = {
//         type: "simple-fill",
//         color: [...color, opacity * 0.5],
//         outline: {
//           color: [...color, 1],
//           width: 2,
//         },
//       };
//       break;
//   }
// }

// EXTRACTED TO: js/tools/drawing-manager.js
// Update symbology of active graphics
// function updateActiveGraphicsSymbology() {
//   const { stateManager } = getState();
//   const drawLayer = stateManager.getDrawLayer();
//   if (!drawLayer) return;

//   drawLayer.graphics.forEach((graphic) => {
//     applyCustomSymbology(graphic);
//   });
// }

// EXTRACTED TO: js/tools/drawing-manager.js
// Reset drawing tools
// function resetDrawingTools() {
//   const { stateManager } = getState();
//   stateManager.setActiveDrawingTool(null);
//   document.querySelectorAll(".draw-tool-btn").forEach((btn) => {
//     btn.classList.remove("active");
//   });
//   const sketchViewModel = stateManager.getSketchViewModel();
//   if (sketchViewModel) {
//     sketchViewModel.cancel();
//   }
// }

// EXTRACTED TO: js/tools/drawing-manager.js
// Update the clearAll function
// function clearAll() {
//   if (confirm("Clear all drawings and measurements?")) {
//     const { stateManager } = getState();
//     const drawLayer = stateManager.getDrawLayer();
//     const view = stateManager.getView();
//     const measurementWidget = stateManager.getMeasurementWidget();
//     const sketchViewModel = stateManager.getSketchViewModel();

//     if (drawLayer) {
//       drawLayer.removeAll();
//     }
//     if (view) {
//       view.graphics.removeAll();
//     }
//     if (measurementWidget) {
//       measurementWidget.clear();
//     }
//     if (sketchViewModel) {
//       sketchViewModel.cancel();
//     }
//     resetDrawingTools();
//   }
// }

// Make sure hexToRgb function exists
// function hexToRgb(hex) {
//   const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
//   return result
//     ? [
//       parseInt(result[1], 16),
//       parseInt(result[2], 16),
//       parseInt(result[3], 16),
//     ]
//     : [33, 150, 243];
// }

// Replace the existing createGraphic function with this version:
// async function createGraphic(event, tool, color, opacity) {
//   const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

//   // Clear preview
//   view.graphics.removeAll();

//   const symbol = getSymbolForTool(tool, color, opacity);

//   const graphic = new Graphic({
//     geometry: event.geometry,
//     symbol: symbol
//   });

//   drawLayer.add(graphic);

//   // Don't automatically restart drawing here
//   // Let the tool button or UI control handle starting new drawings
//   // Remove the startDrawing() call
// }

// Update startDrawing to handle continuous drawing mode
// async function startDrawing(tool) {
//   try {
//     stopDrawing(); // Stop any existing drawing

//     currentDrawTool = tool;
//     drawingActive = true;

//     const [Draw, Graphic] = await Promise.all([
//       loadModule("esri/views/draw/Draw"),
//       loadModule("esri/Graphic")
//     ]);

//     // Create new Draw instance
//     draw = new Draw({
//       view: view
//     });

//     // Get drawing options
//     const color = hexToRgb(document.getElementById("drawColor").value);
//     const opacity = document.getElementById("drawOpacity").value / 100;

//     // Create the drawing action
//     let action;
//     switch(tool) {
//       case "point":
//         action = draw.create("point");
//         break;
//       case "polyline":
//         action = draw.create("polyline");
//         break;
//       case "polygon":
//         action = draw.create("polygon");
//         break;
//       case "rectangle":
//         action = draw.create("rectangle");
//         break;
//       case "circle":
//         action = draw.create("circle");
//         break;
//       default:
//         console.error("Unknown drawing tool:", tool);
//         return;
//     }

//     // Handle vertex add for preview
//     action.on("vertex-add", (event) => {
//       updateGraphicPreview(event, tool, color, opacity);
//     });

//     // Handle cursor update for preview
//     action.on("cursor-update", (event) => {
//       updateGraphicPreview(event, tool, color, opacity);
//     });

//     // Handle drawing completion
//     action.on("draw-complete", (event) => {
//       createGraphic(event, tool, color, opacity);

//       // Only restart if continuous drawing mode is enabled
//       // This should be controlled by a UI setting
//       if (drawingActive && currentDrawTool === tool) {
//         setTimeout(() => startDrawing(tool), 100);
//       }
//     });

//   } catch (error) {
//     console.error("Error starting drawing:", error);
//     showNotification("Error starting drawing tool", "error");
//   }
// }

// Replace the startDrawing function:
// async function startDrawing(tool) {
//   try {
//     stopDrawing(); // Stop any existing drawing

//     currentDrawTool = tool;
//     drawingActive = true;

//     const [Draw, Graphic] = await Promise.all([
//       loadModule("esri/views/draw/Draw"),
//       loadModule("esri/Graphic"),
//     ]);

//     // Create new Draw instance
//     draw = new Draw({
//       view: view,
//     });

//     // Get drawing options
//     const color = hexToRgb(document.getElementById("drawColor").value);
//     const opacity = document.getElementById("drawOpacity").value / 100;

//     // Create the drawing action
//     let action;
//     switch (tool) {
//       case "point":
//         action = draw.create("point");
//         break;
//       case "polyline":
//         action = draw.create("polyline");
//         break;
//       case "polygon":
//         action = draw.create("polygon");
//         break;
//       case "rectangle":
//         action = draw.create("rectangle");
//         break;
//       case "circle":
//         action = draw.create("circle");
//         break;
//       default:
//         console.error("Unknown drawing tool:", tool);
//         return;
//     }

//     // Handle vertex add for preview
//     action.on("vertex-add", (event) => {
//       updateGraphicPreview(event, tool, color, opacity);
//     });

//     // Handle cursor update for preview
//     action.on("cursor-update", (event) => {
//       updateGraphicPreview(event, tool, color, opacity);
//     });

//     // Handle drawing completion
//     action.on("draw-complete", (event) => {
//       createGraphic(event, tool, color, opacity);
//     });
//   } catch (error) {
//     console.error("Error starting drawing:", error);
//     showNotification("Error starting drawing tool", "error");
//   }
// }
// Add preview function
// async function updateGraphicPreview(event, tool, color, opacity) {
//   const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

//   // Remove previous preview
//   view.graphics.removeAll();

//   if (!event.vertices || event.vertices.length === 0) return;

//   let geometry;

//   switch (tool) {
//     case "point":
//       geometry = {
//         type: "point",
//         longitude: event.coordinates[0],
//         latitude: event.coordinates[1],
//         spatialReference: view.spatialReference,
//       };
//       break;
//     case "polyline":
//       geometry = {
//         type: "polyline",
//         paths: [event.vertices],
//         spatialReference: view.spatialReference,
//       };
//       break;
//     case "polygon":
//     case "rectangle":
//     case "circle":
//       geometry = {
//         type: "polygon",
//         rings: [event.vertices],
//         spatialReference: view.spatialReference,
//       };
//       break;
//   }

//   if (geometry) {
//     const symbol = getSymbolForTool(tool, color, opacity);
//     const graphic = new Graphic({
//       geometry: geometry,
//       symbol: symbol,
//     });

//     view.graphics.add(graphic);
//   }
// }

// Replace the createGraphic function:
// async function createGraphic(event, tool, color, opacity) {
//   const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

//   // Clear preview
//   view.graphics.removeAll();

//   const symbol = getSymbolForTool(tool, color, opacity);

//   const graphic = new Graphic({
//     geometry: event.geometry,
//     symbol: symbol,
//   });

//   drawLayer.add(graphic);

//   // Continue drawing if still active
//   if (drawingActive && currentDrawTool === tool) {
//     // Small delay to prevent immediate drawing
//     setTimeout(() => {
//       if (drawingActive && currentDrawTool === tool) {
//         startDrawing(tool);
//       }
//     }, 100);
//   }
// }
// Add helper function for symbols
// function getSymbolForTool(tool, color, opacity) {
//   let symbol;

//   switch (tool) {
//     case "point":
//       symbol = {
//         type: "simple-marker",
//         style: "circle",
//         color: [...color, opacity],
//         size: 12,
//         outline: {
//           color: [255, 255, 255, 1],
//           width: 2,
//         },
//       };
//       break;
//     case "polyline":
//       symbol = {
//         type: "simple-line",
//         color: [...color, opacity],
//         width: 3,
//         cap: "round",
//         join: "round",
//       };
//       break;
//     case "polygon":
//     case "rectangle":
//     case "circle":
//       symbol = {
//         type: "simple-fill",
//         color: [...color, opacity * 0.5],
//         outline: {
//           color: [...color, 1],
//           width: 2,
//         },
//       };
//       break;
//   }

//   return symbol;
// }

// Update the stopDrawing function:
// function stopDrawing() {
//   drawingActive = false;
//   currentDrawTool = null;

//   // Clear preview graphics
//   view.graphics.removeAll();

//   if (draw) {
//     try {
//       draw.complete(); // Complete any active drawing
//       draw.destroy(); // Destroy the draw instance
//     } catch (e) {
//       // Ignore errors during cleanup
//     }
//     draw = null;
//   }

//   // Reset all drawing tool buttons
//   document.querySelectorAll(".draw-tool-btn").forEach((btn) => {
//     btn.classList.remove("active");
//   });
// }

// Locate user
// Locate user - Fixed version
// async function locateUser() {
//   const btn = document.getElementById("locateBtn");

//   if (!navigator.geolocation) {
//     showNotification("Geolocation is not supported by your browser", "error");
//     return;
//   }

//   btn.classList.add("locating");
//   btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

//   navigator.geolocation.getCurrentPosition(
//     async (position) => {
//       const [Point, Graphic] = await Promise.all([
//         loadModule("esri/geometry/Point"),
//         loadModule("esri/Graphic"),
//       ]);

//       const userLocation = new Point({
//         longitude: position.coords.longitude,
//         latitude: position.coords.latitude,
//       });

//       // Add location graphic
//       const locationGraphic = new Graphic({
//         geometry: userLocation,
//         symbol: {
//           type: "simple-marker",
//           style: "circle",
//           color: [0, 122, 255, 0.8],
//           size: 12,
//           outline: {
//             color: [255, 255, 255, 1],
//             width: 2,
//           },
//         },
//       });

//       view.graphics.add(locationGraphic);

//       // Go to location
//       await view.goTo({
//         target: userLocation,
//         zoom: 15,
//       });

//       btn.classList.remove("locating");
//       btn.innerHTML = '<i class="fas fa-crosshairs"></i>';

//       // Remove graphic after 5 seconds
//       setTimeout(() => {
//         view.graphics.remove(locationGraphic);
//       }, 5000);
//     },
//     (error) => {
//       btn.classList.remove("locating");
//       btn.innerHTML = '<i class="fas fa-crosshairs"></i>';
//       showNotification("Unable to retrieve your location", "error");
//       console.error("Geolocation error:", error);
//     }
//   );
// }

// Initialize coordinate display
// function initializeCoordinateDisplay(view) {
//   // Fallback to window.view if not passed (backward compatibility)
//   const mapView = view || window.view;
//   if (!mapView) {
//     console.warn("initializeCoordinateDisplay: view not available");
//     return;
//   }

//   let currentCoords = { lat: 0, lon: 0 };

//   mapView.on("pointer-move", (event) => {
//     const point = mapView.toMap({ x: event.x, y: event.y });
//     if (point) {
//       currentCoords.lat = point.latitude.toFixed(6);
//       currentCoords.lon = point.longitude.toFixed(6);
//       document.getElementById(
//         "coordDisplay"
//       ).textContent = `Lat: ${currentCoords.lat}, Lon: ${currentCoords.lon}`;
//     }
//   });

//   // Add copy functionality
//   const copyBtn = document.getElementById("copyCoords");
//   if (copyBtn) {
//     copyBtn.addEventListener("click", () => {
//       const coordText = `${currentCoords.lat}, ${currentCoords.lon}`;
//       navigator.clipboard
//         .writeText(coordText)
//         .then(() => {
//           // Visual feedback
//           copyBtn.classList.add("copied");
//           const icon = copyBtn.querySelector("i");
//           icon.classList.remove("fa-copy");
//           icon.classList.add("fa-check");

//           showNotification("Coordinates copied!", "success");

//           // Reset after 2 seconds
//           setTimeout(() => {
//             copyBtn.classList.remove("copied");
//             icon.classList.remove("fa-check");
//             icon.classList.add("fa-copy");
//           }, 2000);
//         })
//         .catch(() => {
//           showNotification("Failed to copy coordinates", "error");
//         });
//     });
//   }
// }

// ============================================================================
// EXTRACTED TO: js/events/map-event-handler.js
// ============================================================================
// Initialize event handlers
// function initializeEventHandlers(stateManager) {
//     const { popupManager } = getState();

//   // Get state from StateManager for proper scope access
//   const view = stateManager ? stateManager.getView() : window.view;
//   const uploadedLayers = stateManager
//     ? stateManager.getUploadedLayers()
//     : window.uploadedLayers;
//   const countriesLayer = stateManager
//     ? stateManager.getCountriesLayer()
//     : window.countriesLayer;
//   const flashGraphicsLayer = stateManager
//     ? stateManager.getFlashGraphicsLayer()
//     : window.flashGraphicsLayer;

  // Handle country click for info display (nested function with closure access)
  // async function handleCountryClick(event) {
  //   if (!countriesLayer) return;

  //   // First check if we clicked on any uploaded features
  //   try {
  //     const response = await view.hitTest(event);
  //     const uploadedFeatureHit = response.results.find(
  //       (result) =>
  //         result.graphic &&
  //         result.graphic.layer &&
  //         uploadedLayers.includes(result.graphic.layer)
  //     );

  //     // If we clicked on an uploaded feature, don't show country info
  //     if (uploadedFeatureHit) {
  //       return;
  //     }

  //     // Now proceed with country query
  //     const query = countriesLayer.createQuery();
  //     query.geometry = event.mapPoint;
  //     query.spatialRelationship = "intersects";
  //     query.outFields = ["COUNTRY", "Shape__Area", "Shape__Length"];
  //     query.returnGeometry = true;

  //     const result = await countriesLayer.queryFeatures(query);

  //     if (result.features.length > 0) {
  //       const feature = result.features[0];
  //       const countryName = feature.attributes.COUNTRY;
  //       const area = Math.floor(feature.attributes.Shape__Area / 1000000);
  //       const length = Math.floor(feature.attributes.Shape__Length / 1000);

  //       // Clear previous animations
  //       flashGraphicsLayer.removeAll();

  //       // Update info display
  //       document.getElementById("countryName").textContent = countryName;
  //       document.getElementById("countryDetails").innerHTML = `
  //         <strong>Area:</strong> ${area.toLocaleString()} km²<br>
  //         <strong>Perimeter:</strong> ${length.toLocaleString()} km
  //       `;

  //       // Show the info display
  //       const infoDisplay = document.getElementById("countryInfo");
  //       infoDisplay.classList.remove("hidden");

  //       // Zoom to country with animation
  //       view.goTo({
  //         target: feature.geometry.extent.expand(1.2),
  //         duration: 1000,
  //       });

  //       // Add flash animation
  //       createCountryFlashAnimation(feature.geometry);

  //       // Hide after 5 seconds
  //       getState().stateManager.clearCountryInfoTimeout();
  //       getState().stateManager.setCountryInfoTimeout(
  //         setTimeout(() => {
  //           infoDisplay.classList.add("hidden");
  //           getState().stateManager.getFlashGraphicsLayer().removeAll();
  //         }, 5000)
  //       );
  //     }
  //   } catch (error) {
  //     console.error("Error querying country:", error);
  //   }
  // }

  // Click handler for features
  // In initializeEventHandlers function, replace the click handler with this:
  // view.on("click", async (event) => {
  //   // Check for country first
  //   await handleCountryClick(event);

  //   try {
  //     const response = await view.hitTest(event);

  //     // Filter for actual features with graphics
  //     const results = response.results.filter(
  //       (result) =>
  //         result.graphic && result.graphic.layer && result.graphic.attributes
  //     );

  //     if (results.length > 0) {
  //       const result = results[0];
  //       const graphic = result.graphic;

  //       // For feature layers, query the feature to ensure we have all attributes
  //       if (graphic.layer && graphic.layer.queryFeatures) {
  //         try {
  //           const query = graphic.layer.createQuery();
  //           query.where = `${graphic.layer.objectIdField} = ${
  //             graphic.attributes[graphic.layer.objectIdField]
  //           }`;
  //           query.outFields = ["*"];
  //           query.returnGeometry = true;

  //           const featureSet = await graphic.layer.queryFeatures(query);
  //           if (featureSet.features.length > 0) {
  //             // Use the queried feature which should have all attributes
  //             popupManager.showCustomPopup(featureSet.features[0], event.mapPoint);
  //           } else {
  //             popupManager.showCustomPopup(graphic, event.mapPoint);
  //           }
  //         } catch (queryError) {
  //           console.warn(
  //             "Could not query feature, using hitTest result:",
  //             queryError
  //           );
  //           popupManager.showCustomPopup(graphic, event.mapPoint);
  //         }
  //       } else {
  //         popupManager.showCustomPopup(graphic, event.mapPoint);
  //       }
  //     } else {
  //       popupManager.closeCustomPopup();
  //     }
  //   } catch (error) {
  //     console.error("Error in click handler:", error);
  //   }
  // });

  // Search functionality (pass view for proper scope)
  // COMMENTED OUT - EXTRACTED TO js/ui/search-manager.js
  // initializeSearch(view);
// }

// Export initializeEventHandlers for MapInitializer
// window.initializeEventHandlers = initializeEventHandlers;

// ============================================================================
// COMMENTED OUT - Moved inside initializeEventHandlers as nested function
// ============================================================================
// handleCountryClick is now defined inside initializeEventHandlers
// so it has proper access to view, countriesLayer, flashGraphicsLayer via closure
// ============================================================================
// async function handleCountryClick(event) {
//   if (!countriesLayer) return;
//   // ... (moved inside initializeEventHandlers)
// }
// Create modern flash animation for country
// Create modern flash animation for country
// async function createCountryFlashAnimation(geometry) {
//   const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

//   // Clear previous animations
//   flashGraphicsLayer.removeAll();

//   // Simple yellow flash animation
//   let opacity = 1;
//   const flashInterval = 50; // milliseconds
//   let flashCount = 0;
//   const maxFlashes = 3;

//   const flash = () => {
//     flashGraphicsLayer.removeAll();

//     // Create simple flash graphic
//     const flashGraphic = new Graphic({
//       geometry: geometry,
//       symbol: {
//         type: "simple-fill",
//         color: [255, 255, 0, opacity * 0.4], // Yellow fill
//         outline: {
//           color: [255, 255, 0, opacity], // Yellow outline
//           width: 3,
//         },
//       },
//     });

//     flashGraphicsLayer.add(flashGraphic);

//     // Toggle opacity for flash effect
//     if (flashCount % 2 === 0) {
//       opacity = 0.3;
//     } else {
//       opacity = 1;
//     }

//     flashCount++;

//     if (flashCount < maxFlashes * 2) {
//       setTimeout(flash, flashInterval);
//     } else {
//       // Final highlight
//       setTimeout(() => {
//         flashGraphicsLayer.removeAll();

//         const finalGraphic = new Graphic({
//           geometry: geometry,
//           symbol: {
//             type: "simple-fill",
//             color: [255, 255, 0, 0.15], // Light yellow fill
//             outline: {
//               color: [255, 215, 0], // Gold outline
//               width: 2,
//             },
//           },
//         });

//         flashGraphicsLayer.add(finalGraphic);

//         // Fade out after 2 seconds
//         setTimeout(() => {
//           flashGraphicsLayer.removeAll();
//         }, 2000);
//       }, 100);
//     }
//   };

//   // Start the flash immediately
//   flash();
// }

// ============================================================================
// SEARCH FUNCTIONALITY - EXTRACTED TO js/ui/search-manager.js
// ============================================================================
// Replace the beginning of initializeSearch() function with this:
// async function initializeSearch(view) {
//   // Fallback to window.view if not passed (backward compatibility)
//   const mapView = view || window.view;

//   if (!mapView) {
//     console.warn("initializeSearch: view not available");
//     return;
//   }

//   const [Search] = await Promise.all([loadModule("esri/widgets/Search")]);

//   const searchInput = document.getElementById("searchInput");
//   const clearSearchBtn = document.getElementById("clearSearch");
//   const suggestionsDiv = document.getElementById("searchSuggestions");

//   // Create search widget with proper configuration
//   const { stateManager } = getState();
//   // Create and store search widget in state manager
//   stateManager.setSearchWidget(new Search({
//     view: mapView,
//     container: document.createElement("div"),
//     includeDefaultSources: true,
//     locationEnabled: false,
//     popupEnabled: false,
//     autoSelect: false,
//   }));
//   const searchWidget = stateManager.getSearchWidget();

//   // Wait for the view to be ready instead
//   await mapView.when();

//   let searchTimeout;
//   let currentSuggestions = [];

//   // Input handler with debouncing
//   searchInput.addEventListener("input", (e) => {
//     const value = e.target.value.trim();

//     // Show/hide clear button
//     clearSearchBtn.style.display = value ? "block" : "none";

//     // Clear timeout
//     clearTimeout(searchTimeout);

//     if (value.length < 2) {
//       hideSuggestions();
//       return;
//     }

//     // Show loading state
//     showSuggestionsLoading();

//     // Debounce search
//     searchTimeout = setTimeout(async () => {
//       await getSuggestions(value);
//     }, 300);
//   });
//   // Clear search
//   clearSearchBtn.addEventListener("click", () => {
//     searchInput.value = "";
//     clearSearchBtn.style.display = "none";
//     hideSuggestions();
//   });

//   // Replace the getSuggestions function with this simpler version:
//   async function getSuggestions(searchTerm) {
//     try {
//       currentSuggestions = [];

//       // Perform a direct search instead of using suggest
//       const searchWidget = stateManager.getSearchWidget();
//       searchWidget.searchTerm = searchTerm;

//       try {
//         const results = await searchWidget.search();

//         if (results && results.results) {
//           results.results.forEach((sourceResults) => {
//             if (sourceResults.results && sourceResults.results.length > 0) {
//               sourceResults.results.slice(0, 5).forEach((result, idx) => {
//                 currentSuggestions.push({
//                   text: result.name || searchTerm,
//                   key: result.address || "",
//                   feature: result.feature,
//                   extent: result.extent,
//                   index: idx,
//                 });
//               });
//             }
//           });
//         }

//         if (currentSuggestions.length > 0) {
//           displaySuggestions(currentSuggestions);
//         } else {
//           showNoResults();
//         }
//       } catch (searchError) {
//         console.error("Search error:", searchError);
//         showNoResults();
//       }
//     } catch (error) {
//       console.error("Error in suggestions:", error);
//       showNoResults();
//     }
//   }

//   // Perform direct search as fallback
//   async function performDirectSearch(searchTerm) {
//     try {
//       const searchWidget = stateManager.getSearchWidget();
//       searchWidget.viewModel.searchTerm = searchTerm;
//       const searchResponse = await searchWidget.viewModel.search();

//       if (searchResponse && searchResponse.length > 0) {
//         const suggestions = [];
//         searchResponse.forEach((response) => {
//           if (response.results && response.results.length > 0) {
//             response.results.slice(0, 5).forEach((result) => {
//               suggestions.push({
//                 text: result.name || searchTerm,
//                 key: result.name || searchTerm,
//                 feature: result.feature,
//                 extent: result.extent,
//               });
//             });
//           }
//         });

//         if (suggestions.length > 0) {
//           displaySuggestions(suggestions);
//         } else {
//           showNoResults();
//         }
//       } else {
//         showNoResults();
//       }
//     } catch (error) {
//       console.error("Direct search error:", error);
//       showNoResults();
//     }
//   }

//   // Display suggestions
//   function displaySuggestions(suggestions) {
//     if (suggestions.length === 0) {
//       showNoResults();
//       return;
//     }

//     let html = "";
//     suggestions.forEach((suggestion, index) => {
//       const icon = getIconForSuggestion(suggestion);
//       const displayText = suggestion.text || "Unknown Location";
//       const subText = suggestion.key !== suggestion.text ? suggestion.key : "";

//       html += `
//         <div class="suggestion-item" data-index="${index}">
//           <i class="${icon}"></i>
//           <div class="suggestion-text">
//             <div class="suggestion-name">${displayText}</div>
//             ${subText ? `<div class="suggestion-address">${subText}</div>` : ""}
//           </div>
//         </div>
//       `;
//     });

//     suggestionsDiv.innerHTML = html;
//     suggestionsDiv.classList.add("active");

//     // Add click handlers
//     document.querySelectorAll(".suggestion-item").forEach((item) => {
//       item.addEventListener("click", () => {
//         const index = parseInt(item.dataset.index);
//         selectSuggestion(currentSuggestions[index]);
//       });
//     });
//   }

//   // Select a suggestion
//   async function selectSuggestion(suggestion) {
//     searchInput.value = suggestion.text;
//     hideSuggestions();

//     try {
//       if (suggestion.feature || suggestion.extent) {
//         // Direct result from search
//         if (suggestion.extent) {
//           await view.goTo({
//             target: suggestion.extent,
//             zoom: 15,
//           });
//         } else if (suggestion.feature && suggestion.feature.geometry) {
//           await view.goTo({
//             target: suggestion.feature.geometry,
//             zoom: 15,
//           });
//           addSearchMarker(suggestion.feature);
//         }
//       } else if (suggestion.suggestResult) {
//         // Suggestion result - need to search
//         const searchWidget = stateManager.getSearchWidget();
//         searchWidget.viewModel.searchTerm = suggestion.text;
//         const response = await searchWidget.viewModel.search(
//           suggestion.suggestResult
//         );

//         if (response && response.length > 0 && response[0].results.length > 0) {
//           const result = response[0].results[0];

//           if (result.extent) {
//             await view.goTo({
//               target: result.extent,
//               zoom: 15,
//             });
//           } else if (result.feature && result.feature.geometry) {
//             await view.goTo({
//               target: result.feature.geometry,
//               zoom: 15,
//             });
//             addSearchMarker(result.feature);
//           }
//         }
//       }
//     } catch (error) {
//       console.error("Error selecting suggestion:", error);
//       showNotification("Error finding location", "error");
//     }
//   }

//   // Rest of the functions remain the same...
//   // (addSearchMarker, getIconForSuggestion, showSuggestionsLoading, showNoResults, hideSuggestions)

//   // Add marker for search result
//   async function addSearchMarker(feature) {
//     const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

//     // Remove previous search markers
//     view.graphics.removeAll();

//     const graphic = new Graphic({
//       geometry: feature.geometry,
//       symbol: {
//         type: "simple-marker",
//         style: "circle",
//         color: [226, 119, 40, 0.8],
//         size: 12,
//         outline: {
//           color: [255, 255, 255, 1],
//           width: 2,
//         },
//       },
//       attributes: feature.attributes,
//       popupTemplate: {
//         title:
//           feature.attributes.PlaceName ||
//           feature.attributes.name ||
//           "Search Result",
//         content:
//           feature.attributes.Place_addr ||
//           feature.attributes.address ||
//           "Location",
//       },
//     });

//     view.graphics.add(graphic);

//     // Remove marker after 10 seconds
//     setTimeout(() => {
//       view.graphics.remove(graphic);
//     }, 10000);
//   }

//   // Get icon for suggestion type
//   function getIconForSuggestion(suggestion) {
//     const text = (suggestion.text || "").toLowerCase();
//     if (text.includes("restaurant") || text.includes("food"))
//       return "fas fa-utensils";
//     if (text.includes("hotel") || text.includes("lodging")) return "fas fa-bed";
//     if (text.includes("park")) return "fas fa-tree";
//     if (text.includes("school") || text.includes("university"))
//       return "fas fa-graduation-cap";
//     if (text.includes("hospital") || text.includes("medical"))
//       return "fas fa-hospital";
//     if (text.includes("shopping") || text.includes("store"))
//       return "fas fa-shopping-cart";
//     if (text.includes("airport")) return "fas fa-plane";
//     if (text.includes("station")) return "fas fa-train";
//     return "fas fa-map-marker-alt";
//   }

//   // Show loading state
//   function showSuggestionsLoading() {
//     suggestionsDiv.innerHTML =
//       '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
//     suggestionsDiv.classList.add("active");
//   }

//   // Show no results
//   function showNoResults() {
//     suggestionsDiv.innerHTML =
//       '<div class="search-no-results">No results found</div>';
//     suggestionsDiv.classList.add("active");
//   }

//   // Hide suggestions
//   function hideSuggestions() {
//     suggestionsDiv.classList.remove("active");
//     currentSuggestions = [];
//   }

//   // Handle clicks outside to close suggestions
//   document.addEventListener("click", (e) => {
//     if (!e.target.closest(".search-container")) {
//       hideSuggestions();
//     }
//   });

//   // Handle Enter key in search input
//   searchInput.addEventListener("keydown", async (e) => {
//     if (e.key === "Enter") {
//       e.preventDefault();
//       const value = searchInput.value.trim();
//       if (value.length > 0) {
//         if (currentSuggestions.length > 0) {
//           selectSuggestion(currentSuggestions[0]);
//         } else {
//           // Perform direct search
//           showSuggestionsLoading();
//           await performDirectSearch(value);
//         }
//       }
//     } else if (e.key === "Escape") {
//       hideSuggestions();
//       searchInput.blur();
//     }
//   });

//   // Keyboard navigation for suggestions
//   let selectedSuggestionIndex = -1;

//   searchInput.addEventListener("keydown", (e) => {
//     const suggestionItems = document.querySelectorAll(".suggestion-item");

//     if (e.key === "ArrowDown" && suggestionItems.length > 0) {
//       e.preventDefault();
//       selectedSuggestionIndex = Math.min(
//         selectedSuggestionIndex + 1,
//         suggestionItems.length - 1
//       );
//       updateSelectedSuggestion(suggestionItems);
//     } else if (e.key === "ArrowUp" && suggestionItems.length > 0) {
//       e.preventDefault();
//       selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
//       updateSelectedSuggestion(suggestionItems);
//     } else if (
//       e.key === "Enter" &&
//       selectedSuggestionIndex >= 0 &&
//       currentSuggestions.length > 0
//     ) {
//       e.preventDefault();
//       selectSuggestion(currentSuggestions[selectedSuggestionIndex]);
//     }
//   });

//   function updateSelectedSuggestion(items) {
//     items.forEach((item, index) => {
//       if (index === selectedSuggestionIndex) {
//         item.style.background = "rgba(33, 150, 243, 0.1)";
//       } else {
//         item.style.background = "";
//       }
//     });
//   }
// }

// ============================================================================
// COMMENTED OUT - Moved to js/features/popup-manager.js
// ============================================================================
// Replace showCustomPopup with this enhanced version
// function showCustomPopup(graphic, mapPoint) {
//   const { stateManager } = getState();
//   stateManager.setCurrentPopupFeature(graphic);
//   const popup = document.getElementById("customPopup");
//   const content = document.getElementById("popupContent");
//   const title = document.getElementById("popupTitle");

//   // Set title - use layer title or feature name if available
//   const layerTitle = graphic.layer?.title || "Feature Information";
//   const featureName =
//     graphic.attributes?.name ||
//     graphic.attributes?.Name ||
//     graphic.attributes?.title ||
//     graphic.attributes?.Title ||
//     "";

//   title.textContent = featureName || layerTitle;

//   // Build comprehensive attribute table
//   const attributes = graphic.attributes;
//   let html = '<div class="attribute-list">';

//   if (attributes && Object.keys(attributes).length > 0) {
//     // Get all attributes and sort them
//     // const sortedKeys = Object.keys(attributes).sort((a, b) => {
//     //   // Put important fields first
//     //   const priorityFields = ['name', 'title', 'id', 'type', 'category'];
//     //   const aPriority = priorityFields.findIndex(f => a.toLowerCase().includes(f));
//     //   const bPriority = priorityFields.findIndex(f => b.toLowerCase().includes(f));

//     //   if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
//     //   if (aPriority !== -1) return -1;
//     //   if (bPriority !== -1) return 1;

//     //   return a.localeCompare(b);
//     // });

//     const sortedKeys = Object.keys(attributes).sort((a, b) => {
//       // Fields to show at the end
//       const endFields = [
//         "shape_area",
//         "shape__area",
//         "shape_length",
//         "shape__length",
//         "shape_leng",
//         "fid",
//       ];
//       const aIsEnd = endFields.some((f) => a.toLowerCase() === f.toLowerCase());
//       const bIsEnd = endFields.some((f) => b.toLowerCase() === f.toLowerCase());

//       if (aIsEnd && !bIsEnd) return 1;
//       if (!aIsEnd && bIsEnd) return -1;

//       // Put important fields first
//       const priorityFields = [
//         "name",
//         "title",
//         "id",
//         "type",
//         "category",
//         "objectid",
//       ];
//       const aPriority = priorityFields.findIndex((f) =>
//         a.toLowerCase().includes(f)
//       );
//       const bPriority = priorityFields.findIndex((f) =>
//         b.toLowerCase().includes(f)
//       );

//       if (aPriority !== -1 && bPriority !== -1) return aPriority - bPriority;
//       if (aPriority !== -1) return -1;
//       if (bPriority !== -1) return 1;

//       return a.localeCompare(b);
//     });

//     // Display each attribute
//     sortedKeys.forEach((key) => {
//       const value = attributes[key];

//       // Skip internal fields
//       if (key.startsWith("_") || key === "ObjectID" || key === "FID") {
//         return;
//       }

//       // Format the value based on type
//       let displayValue = formatAttributeValue(value, key);

//       if (displayValue !== null && displayValue !== "") {
//         html += `
//           <div class="attribute-row">
//             <span class="attribute-label">${formatFieldName(key)}:</span>
//             <span class="attribute-value">${displayValue}</span>
//           </div>
//         `;
//       }
//     });
//   } else {
//     html += '<div class="no-attributes">No attributes available</div>';
//   }

//   html += "</div>";

//   // Add geometry information
//   if (graphic.geometry) {
//     html += '<div class="geometry-info">';
//     html += "<h4>Geometry Information</h4>";

//     // Create a container for async geometry calculations
//     html += '<div id="geometryDetails">Loading...</div>';
//     html += "</div>";
//   }

//   // Add action buttons
//   html += `
//     <div class="popup-actions">
//       <button class="popup-action-btn" onclick="zoomToFeature()">
//         <i class="fas fa-search-plus"></i> Zoom to Feature
//       </button>
//       <button class="popup-action-btn" onclick="copyFeatureInfo()">
//         <i class="fas fa-copy"></i> Copy Info
//       </button>
//     </div>
//   `;

//   content.innerHTML = html;

//   // Position popup
//   positionPopup(popup, mapPoint);

//   // Show popup
//   popup.classList.remove("hidden");

//   // Now calculate geometry details asynchronously
//   if (graphic.geometry) {
//     updateGeometryDetails(graphic.geometry);
//   }
// }

// // Add new function to update geometry details asynchronously
// async function updateGeometryDetails(geometry) {
//   const detailsDiv = document.getElementById("geometryDetails");
//   if (!detailsDiv) return;

//   let html = "";

//   try {
//     switch (geometry.type) {
//       case "point":
//         html = `
//           <div class="attribute-row">
//             <span class="attribute-label">Type:</span>
//             <span class="attribute-value">Point</span>
//           </div>
//           <div class="attribute-row">
//             <span class="attribute-label">Longitude:</span>
//             <span class="attribute-value">${geometry.longitude.toFixed(
//               6
//             )}</span>
//           </div>
//           <div class="attribute-row">
//             <span class="attribute-label">Latitude:</span>
//             <span class="attribute-value">${geometry.latitude.toFixed(6)}</span>
//           </div>
//         `;
//         break;

//       case "polyline":
//         const length = await calculateLength(geometry);
//         html = `
//           <div class="attribute-row">
//             <span class="attribute-label">Type:</span>
//             <span class="attribute-value">Line</span>
//           </div>
//           <div class="attribute-row">
//             <span class="attribute-label">Length:</span>
//             <span class="attribute-value">${length}</span>
//           </div>
//           <div class="attribute-row">
//             <span class="attribute-label">Vertices:</span>
//             <span class="attribute-value">${countVertices(geometry)}</span>
//           </div>
//         `;
//         break;

//       case "polygon":
//         const area = await calculateArea(geometry);
//         const perimeter = await calculatePerimeter(geometry);
//         // Continue the polygon case and complete the updateGeometryDetails function
//         html = `
//           <div class="attribute-row">
//             <span class="attribute-label">Type:</span>
//             <span class="attribute-value">Polygon</span>
//           </div>
//           <div class="attribute-row">
//             <span class="attribute-label">Area:</span>
//             <span class="attribute-value">${area}</span>
//           </div>
//           <div class="attribute-row">
//             <span class="attribute-label">Perimeter:</span>
//             <span class="attribute-value">${perimeter}</span>
//           </div>
//           <div class="attribute-row">
//             <span class="attribute-label">Vertices:</span>
//             <span class="attribute-value">${countVertices(geometry)}</span>
//           </div>
//         `;
//         break;
//     }

//     detailsDiv.innerHTML = html;
//   } catch (error) {
//     console.error("Error calculating geometry details:", error);
//     detailsDiv.innerHTML =
//       '<div class="error-message">Unable to calculate geometry details</div>';
//   }
// }

// // Add helper functions for formatting and calculations
// function formatAttributeValue(value, key) {
//   if (value === null || value === undefined) {
//     return "N/A";
//   }

//   // Check if it's a date field by name or value
//   const dateKeywords = ["date", "time", "تاريخ", "وقت"];
//   const keyLower = key.toLowerCase();
//   const isDateField = dateKeywords.some((keyword) =>
//     keyLower.includes(keyword)
//   );

//   // Check if value looks like a timestamp (large number)
//   const isTimestamp =
//     typeof value === "number" && value > 1000000000 && value < 10000000000000;

//   if (isDateField || isTimestamp) {
//     try {
//       const date = new Date(value);
//       if (!isNaN(date.getTime())) {
//         // Format date in Gregorian (Miladi) format
//         const day = date.getDate().toString().padStart(2, "0");
//         const month = (date.getMonth() + 1).toString().padStart(2, "0");
//         const year = date.getFullYear();

//         // If the time is 00:00, show only the date
//         if (date.getHours() === 0 && date.getMinutes() === 0) {
//           return `${day}/${month}/${year}`;
//         }

//         // Include time if it's not 00:00
//         const hours = date.getHours().toString().padStart(2, "0");
//         const minutes = date.getMinutes().toString().padStart(2, "0");
//         return `${day}/${month}/${year} ${hours}:${minutes}`;
//       }
//     } catch (e) {
//       // If date parsing fails, continue to default handling
//     }
//   }

//   // Check if it's a number
//   if (typeof value === "number") {
//     // Format large numbers with commas, but not timestamps
//     if (!isTimestamp && Math.abs(value) >= 1000) {
//       return value.toLocaleString();
//     }
//     // Round decimals to 4 places
//     if (value % 1 !== 0) {
//       return value.toFixed(4).replace(/\.?0+$/, "");
//     }
//     return value.toString();
//   }

//   // Check if it's a boolean
//   if (typeof value === "boolean") {
//     return value
//       ? '<span class="bool-true">Yes</span>'
//       : '<span class="bool-false">No</span>';
//   }

//   // Check if it's a URL
//   if (
//     typeof value === "string" &&
//     (value.startsWith("http://") || value.startsWith("https://"))
//   ) {
//     return `<a href="${value}" target="_blank" class="attribute-link">${value}</a>`;
//   }

//   // Check if it's an email
//   if (typeof value === "string" && value.includes("@")) {
//     return `<a href="mailto:${value}" class="attribute-link">${value}</a>`;
//   }

//   // Default string value
//   return value.toString();
// }

// Calculate geometry measurements
// async function calculateLength(geometry) {
//   try {
//     const [geometryEngine] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//     ]);

//     const length = geometryEngine.geodesicLength(geometry, "meters");
//     if (length > 1000) {
//       return (length / 1000).toFixed(2) + " km";
//     }
//     return length.toFixed(2) + " m";
//   } catch (error) {
//     return "N/A";
//   }
// }

// async function calculateArea(geometry) {
//   try {
//     const [geometryEngine] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//     ]);

//     const area = geometryEngine.geodesicArea(geometry, "square-meters");
//     if (area > 1000000) {
//       return (area / 1000000).toFixed(2) + " km²";
//     } else if (area > 10000) {
//       return (area / 10000).toFixed(2) + " ha";
//     }
//     return area.toFixed(2) + " m²";
//   } catch (error) {
//     return "N/A";
//   }
// }

// async function calculatePerimeter(geometry) {
//   try {
//     const [geometryEngine] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//     ]);

//     const perimeter = geometryEngine.geodesicLength(geometry, "meters");
//     if (perimeter > 1000) {
//       return (perimeter / 1000).toFixed(2) + " km";
//     }
//     return perimeter.toFixed(2) + " m";
//   } catch (error) {
//     return "N/A";
//   }
// }

// function countVertices(geometry) {
//   if (geometry.type === "polygon") {
//     return geometry.rings[0]?.length - 1 || 0; // -1 because first and last are same
//   } else if (geometry.type === "polyline") {
//     return geometry.paths[0]?.length || 0;
//   }
//   return 0;
// }

// // Position popup intelligently
// function positionPopup(popup, mapPoint) {
//   const screenPoint = view.toScreen(mapPoint);
//   const popupWidth = 400; // Max width from CSS
//   const popupHeight = 500; // Estimated max height
//   const padding = 20;

//   let left = screenPoint.x + 10;
//   let top = screenPoint.y + 10;

//   // Check if popup would go off right edge
//   if (left + popupWidth > window.innerWidth - padding) {
//     left = screenPoint.x - popupWidth - 10;
//   }

//   // Check if popup would go off bottom edge
//   if (top + popupHeight > window.innerHeight - padding) {
//     top = screenPoint.y - popupHeight - 10;
//   }

//   // Ensure popup doesn't go off left or top edges
//   left = Math.max(padding, left);
//   top = Math.max(padding, top);

//   popup.style.left = left + "px";
//   popup.style.top = top + "px";
// }

// Popup action functions
// function zoomToFeature() {
//   const { stateManager } = getState();
//   if (
//     stateManager.getCurrentPopupFeature() &&
//     stateManager.getCurrentPopupFeature().geometry
//   ) {
//     stateManager.getView().goTo({
//       target: stateManager.getCurrentPopupFeature().geometry,
//       zoom: stateManager.getView().zoom + 2,
//     });
//   }
// }

// function copyFeatureInfo() {
//   if (!getState().stateManager.getCurrentPopupFeature()) return;

//   let text = "Feature Information\n";
//   text += "==================\n\n";

//   // Add attributes
//   if (getState().stateManager.getCurrentPopupFeature().attributes) {
//     text += "Attributes:\n";
//     Object.entries(
//       getState().stateManager.getCurrentPopupFeature().attributes
//     ).forEach(([key, value]) => {
//       if (!key.startsWith("_") && key !== "ObjectID" && key !== "FID") {
//         text += `${formatFieldName(key)}: ${value || "N/A"}\n`;
//       }
//     });
//   }

//   // Copy to clipboard
//   navigator.clipboard
//     .writeText(text)
//     .then(() => {
//       showNotification("Feature information copied to clipboard", "success");
//     })
//     .catch(() => {
//       showNotification("Failed to copy to clipboard", "error");
//     });
// }

// Export functions for popup actions
// window.zoomToFeature = zoomToFeature;
// window.copyFeatureInfo = copyFeatureInfo;

// Close custom popup
// function closeCustomPopup() {
//   const popup = document.getElementById("customPopup");
//   popup.classList.add("hidden");
//   getState().stateManager.setCurrentPopupFeature(null);
// }

// // Utility functions
// function formatFieldName(fieldName) {
//   return fieldName
//     .replace(/_/g, ' ')
//     .replace(/\b\w/g, l => l.toUpperCase());
// }

// Update formatFieldName to handle various field name formats
// function formatFieldName(fieldName) {
//   // Common field name mappings
//   const fieldMappings = {
//     OBJECTID: "Object ID",
//     ANAME: "Arabic Name",
//     ENAME: "English Name",
//     REDION_CAP: "Region Capital",
//     AREA_: "Area",
//     SAUDI_MAN_: "Saudi Men",
//     SAUDI_WOME: "Saudi Women",
//     NONSAUDI_M: "Non-Saudi Men",
//     NONSAUDI_W: "Non-Saudi Women",
//     SHAPE_Leng: "Shape Length",
//     Shape_Length: "Shape Length",
//     Shape_Area: "Shape Area",
//     FolderPath: "Folder Path",
//     SymbolID: "Symbol ID",
//     AltMode: "Altitude Mode",
//     Snippet: "Snippet",
//     PopupInfo: "Popup Info",
//     HasLabel: "Has Label",
//     LabelID: "Label ID",
//   };

//   // Check if we have a mapping
//   if (fieldMappings[fieldName]) {
//     return fieldMappings[fieldName];
//   }

//   // Otherwise, format the field name
//   return fieldName
//     .replace(/_/g, " ")
//     .replace(/([A-Z])/g, " $1")
//     .trim()
//     .split(" ")
//     .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
//     .join(" ");
// }

// function debounce(func, wait) {
//   let timeout;
//   return function executedFunction(...args) {
//     const later = () => {
//       clearTimeout(timeout);
//       func(...args);
//     };
//     clearTimeout(timeout);
//     timeout = setTimeout(later, wait);
//   };
// }

// Wrapper function for backward compatibility
function showNotification(message, type = "info") {
  if (window.notificationManager) {
    window.notificationManager.showNotification(message, type);
  } else {
    console.warn("NotificationManager not initialized yet:", message);
  }
}

// Update the window resize handler (find and replace the existing one)
// Find and update the window resize handler:
let resizeTimeout;
window.addEventListener("resize", () => {
  const { popupManager } = getState();

  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Close popup on resize
    popupManager.closeCustomPopup();

    // Get control panel reference properly
    const controlPanel = document.querySelector(".control-panel");

    // Adjust mobile UI
    if (
      window.innerWidth < 768 &&
      controlPanel &&
      !controlPanel.classList.contains("collapsed")
    ) {
      togglePanel(true);
    }
  }, 250);
});

// Export global functions for inline handlers
// window.toggleLayer = toggleLayer;
// window.zoomToLayer = zoomToLayer;
// window.removeLayer = removeLayer;
// window.closeCustomPopup = closeCustomPopup;

// ============================================================================
// COMMENTED OUT - Moved to js/widgets/widget-manager.js
// ============================================================================
// Widget Management System
// const activeWidgets = new Map();

// // Replace the toggleWidget function to remove basemapGallery and compass cases
// async function toggleWidget(widgetName) {
//   try {
//     switch (widgetName) {
//       case "legend":
//         await toggleLegend();
//         break;
//       case "bookmarks":
//         await toggleBookmarks();
//         break;
//       case "print":
//         await togglePrint();
//         break;
//       case "home":
//         await toggleHome();
//         break;
//       case "fullscreen":
//         await toggleFullscreen();
//         break;
//       case "swipe":
//         await toggleSwipe();
//         break;
//     }
//   } catch (error) {
//     console.error(`Error toggling ${widgetName} widget:`, error);
//     showNotification(`Error loading ${widgetName} widget`, "error");
//   }
// }

// // Replace Legend Widget with fixed version
// async function toggleLegend() {
//   const legendDiv = document.getElementById("legendWidget");

//   if (!activeWidgets.has("legend") || legendDiv.classList.contains("hidden")) {
//     if (!activeWidgets.has("legend")) {
//       const [Legend] = await Promise.all([loadModule("esri/widgets/Legend")]);

//       const legend = new Legend({
//         view: view,
//         container: "legendContent",
//       });

//       activeWidgets.set("legend", legend);
//     }

//     // Update layer infos every time it's shown
//     const legend = activeWidgets.get("legend");
//     legend.layerInfos = [
//       ...getState()
//         .stateManager.getUploadedLayers()
//         .map((layer) => ({
//           layer: layer,
//           title: layer.title,
//         })),
//       {
//         layer: drawLayer,
//         title: "Drawings",
//       },
//     ];

//     legendDiv.classList.remove("hidden");

//     // Update button state
//     const btn = document.querySelector('[onclick*="legend"]');
//     if (btn) btn.classList.add("active");
//   } else {
//     legendDiv.classList.add("hidden");

//     // Update button state
//     const btn = document.querySelector('[onclick*="legend"]');
//     if (btn) btn.classList.remove("active");
//   }
// }
// Bookmarks Widget
// async function toggleBookmarks() {
//   const bookmarksDiv = document.getElementById("bookmarksWidget");

//   if (!activeWidgets.has("bookmarks")) {
//     bookmarksDiv.classList.remove("hidden");

//     // Remove any inline positioning styles
//     bookmarksDiv.style.position = "";
//     bookmarksDiv.style.top = "";
//     bookmarksDiv.style.left = "";
//     bookmarksDiv.style.right = "";
//     activeWidgets.set("bookmarks", true);

//     // Initialize bookmarks
//     loadBookmarks();

//     // Add bookmark button handler
//     document.getElementById("addBookmark").onclick = addBookmark;
//   } else {
//     activeWidgets.delete("bookmarks");
//     bookmarksDiv.classList.add("hidden");
//   }
// }

// Bookmarks functionality
// let bookmarks = JSON.parse(localStorage.getItem("gisBookmarks") || "[]");

// function loadBookmarks() {
//   const bookmarksList = document.getElementById("bookmarksList");
//   bookmarksList.innerHTML = "";

//   if (bookmarks.length === 0) {
//     bookmarksList.innerHTML = '<p class="empty-state">No bookmarks saved</p>';
//     return;
//   }

//   bookmarks.forEach((bookmark, index) => {
//     const bookmarkDiv = document.createElement("div");
//     bookmarkDiv.className = "bookmark-item";
//     bookmarkDiv.innerHTML = `
//       <span class="bookmark-name">${bookmark.name}</span>
//       <button class="bookmark-delete" onclick="deleteBookmark(${index})">
//         <i class="fas fa-trash"></i>
//       </button>
//     `;

//     bookmarkDiv.addEventListener("click", (e) => {
//       if (!e.target.closest(".bookmark-delete")) {
//         goToBookmark(bookmark);
//       }
//     });

//     bookmarksList.appendChild(bookmarkDiv);
//   });
// }

// async function addBookmark() {
//   const name = prompt("Enter bookmark name:");
//   if (!name) return;

//   const bookmark = {
//     name: name,
//     extent: view.extent.toJSON(),
//     timestamp: Date.now(),
//   };

//   bookmarks.push(bookmark);
//   localStorage.setItem("gisBookmarks", JSON.stringify(bookmarks));
//   loadBookmarks();
//   showNotification("Bookmark saved", "success");
// }

// function deleteBookmark(index) {
//   if (confirm("Delete this bookmark?")) {
//     bookmarks.splice(index, 1);
//     localStorage.setItem("gisBookmarks", JSON.stringify(bookmarks));
//     loadBookmarks();
//     showNotification("Bookmark deleted", "success");
//   }
// }

// async function goToBookmark(bookmark) {
//   const [Extent] = await Promise.all([loadModule("esri/geometry/Extent")]);

//   const extent = Extent.fromJSON(bookmark.extent);
//   await view.goTo(extent);
// }

// COMMENTED OUT - Moved to js/layers/basemap-manager.js
// Basemap Gallery Widget
// async function toggleBasemapGallery() {
//   if (!activeWidgets.has("basemapGallery")) {
//     const [BasemapGallery, Expand] = await Promise.all([
//       loadModule("esri/widgets/BasemapGallery"),
//       loadModule("esri/widgets/Expand"),
//     ]);

//     const basemapGallery = new BasemapGallery({
//       view: view,
//     });

//     const expand = new Expand({
//       view: view,
//       content: basemapGallery,
//       expandIconClass: "esri-icon-basemap",
//       expandTooltip: "Basemap Gallery",
//     });

//     view.ui.add(expand, "top-left");
//     activeWidgets.set("basemapGallery", expand);
//   } else {
//     const expand = activeWidgets.get("basemapGallery");
//     view.ui.remove(expand);
//     expand.destroy();
//     activeWidgets.delete("basemapGallery");
//   }
// }

// Compass Widget
// async function toggleCompass() {
//   if (!activeWidgets.has("compass")) {
//     const [Compass] = await Promise.all([loadModule("esri/widgets/Compass")]);

//     const compass = new Compass({
//       view: view,
//     });

//     view.ui.add(compass, "top-left");
//     activeWidgets.set("compass", compass);
//   } else {
//     const compass = activeWidgets.get("compass");
//     view.ui.remove(compass);
//     compass.destroy();
//     activeWidgets.delete("compass");
//   }
// }

// Replace toggleFullscreen with this improved implementation
// async function toggleFullscreen() {
//   const btn = document.querySelector('[onclick*="fullscreen"]');

//   if (!btn) return;

//   const icon = btn.querySelector("i");

//   const isFullscreen =
//     document.fullscreenElement ||
//     document.webkitFullscreenElement ||
//     document.mozFullScreenElement ||
//     document.msFullscreenElement;

//   if (!isFullscreen) {
//     const elem = document.documentElement;
//     const requestFullscreen =
//       elem.requestFullscreen ||
//       elem.webkitRequestFullscreen ||
//       elem.mozRequestFullScreen ||
//       elem.msRequestFullscreen;

//     if (requestFullscreen) {
//       requestFullscreen
//         .call(elem)
//         .then(() => {
//           btn.classList.add("active");
//           if (icon) {
//             icon.classList.remove("fa-expand");
//             icon.classList.add("fa-compress");
//           }

//           activeWidgets.set("fullscreen", true);
//           showNotification("Entered fullscreen mode", "success");
//         })
//         .catch((error) => {
//           console.error("Error entering fullscreen:", error);
//           showNotification("Unable to enter fullscreen mode", "error");
//         });
//     }
//   } else {
//     const exitFullscreen =
//       document.exitFullscreen ||
//       document.webkitExitFullscreen ||
//       document.mozCancelFullScreen ||
//       document.msExitFullscreen;

//     if (exitFullscreen) {
//       exitFullscreen
//         .call(document)
//         .then(() => {
//           btn.classList.remove("active");
//           if (icon) {
//             icon.classList.remove("fa-compress");
//             icon.classList.add("fa-expand");
//           }

//           activeWidgets.delete("fullscreen");
//           showNotification("Exited fullscreen mode", "success");
//         })
//         .catch((error) => {
//           console.error("Error exiting fullscreen:", error);
//         });
//     }
//   }
// }
// Add fullscreen change listener on app initialization
// Replace your existing initializeFullscreenListener function:
// function initializeFullscreenListener() {
//   const fullscreenEvents = [
//     "fullscreenchange",
//     "webkitfullscreenchange",
//     "mozfullscreenchange",
//     "MSFullscreenChange",
//   ];

//   fullscreenEvents.forEach((eventName) => {
//     document.addEventListener(eventName, () => {
//       const btn = document.querySelector('[onclick*="fullscreen"]');
//       if (!btn) return;

//       const icon = btn.querySelector("i");
//       if (!icon) return; // Add null check

//       const isFullscreen =
//         document.fullscreenElement ||
//         document.webkitFullscreenElement ||
//         document.mozFullScreenElement ||
//         document.msFullscreenElement;

//       if (!isFullscreen) {
//         // User exited fullscreen
//         btn.classList.remove("active");
//         icon.classList.remove("fa-compress");
//         icon.classList.add("fa-expand");
//         activeWidgets.delete("fullscreen");
//       }
//     });
//   });
// }

// Replace toggleHome with this implementation using view.goTo()
// async function toggleHome() {
//   const btn = document.querySelector('[onclick*="home"]');

//   if (!homeExtent) {
//     showNotification("Home extent not available", "error");
//     return;
//   }

//   // Animate button
//   btn.classList.add("active");

//   // Go to home extent using view's goTo method
//   view
//     .goTo(homeExtent, {
//       duration: 1000,
//       easing: "ease-in-out",
//     })
//     .then(() => {
//       showNotification("Returned to home extent", "success");

//       // Remove active state after animation
//       setTimeout(() => {
//         btn.classList.remove("active");
//       }, 500);
//     })
//     .catch((error) => {
//       console.error("Error going to home extent:", error);
//       showNotification("Unable to return to home extent", "error");
//       btn.classList.remove("active");
//     });
// }

// Zoom in function
// async function zoomIn() {
//   const currentZoom = view.zoom;
//   view.goTo({
//     zoom: currentZoom + 1,
//     duration: 300,
//   });
// }

// Zoom out function
// async function zoomOut() {
//   const currentZoom = view.zoom;
//   view.goTo({
//     zoom: currentZoom - 1,
//     duration: 300,
//   });
// }

// Export zoom functions
// window.zoomIn = zoomIn;
// window.zoomOut = zoomOut;

// ============================================================================
// COMMENTED OUT - Moved to js/tools/measurement-manager.js
// ============================================================================
// async function toggleMeasurement() {
//   // FUNCTION COMMENTED OUT - Remove this line to re-enable
//   // return;

//   const btn = document.getElementById("measureBtn");
//   const resultsDiv = document.getElementById("measurementResults");

//   if (!measurementWidget) {
//     const [Measurement, reactiveUtils] = await Promise.all([
//       loadModule("esri/widgets/Measurement"),
//       loadModule("esri/core/reactiveUtils"),
//     ]);

//     measurementWidget = new Measurement({
//       view: view,
//       activeTool: "distance",
//     });

//     view.ui.add(measurementWidget, "top-right");

//     // Show custom results widget
//     if (resultsDiv) {
//       resultsDiv.classList.remove("hidden");
//     }

//     // Watch for measurement changes
//     const watchHandles = [];

//     // Watch distance measurements
//     const distanceHandle = reactiveUtils.watch(
//       () => measurementWidget.viewModel.activeViewModel?.measurement,
//       (measurement) => {
//         if (measurement && measurementWidget.activeTool === "distance") {
//           updateMeasurementResults({
//             distance: measurement.length.value,
//             distanceUnit: measurement.length.unit,
//           });
//         }
//       }
//     );
//     watchHandles.push(distanceHandle);

//     // Watch area measurements
//     const areaHandle = reactiveUtils.watch(
//       () => measurementWidget.viewModel.activeViewModel?.measurement,
//       (measurement) => {
//         if (measurement && measurementWidget.activeTool === "area") {
//           updateMeasurementResults({
//             area: measurement.area.value,
//             areaUnit: measurement.area.unit,
//             perimeter: measurement.length.value,
//             perimeterUnit: measurement.length.unit,
//           });
//         }
//       }
//     );
//     watchHandles.push(areaHandle);

//     activeWidgets.set("measurementHandles", watchHandles);

//     // Add tool change listener
//     measurementWidget.watch("activeTool", (tool) => {
//       if (!tool) {
//         // Clear results when no tool is active
//         const content = document.getElementById("measurementContent");
//         if (content) {
//           content.innerHTML =
//             '<div style="color: var(--text-secondary);">Select a measurement tool</div>';
//         }
//       }
//     });
//   }

//   if (btn.classList.contains("active")) {
//     // Deactivate measurement
//     measurementWidget.clear();
//     measurementWidget.activeTool = null;
//     view.ui.remove(measurementWidget);
//     btn.classList.remove("active");

//     if (resultsDiv) {
//       resultsDiv.classList.add("hidden");
//     }

//     // Remove watch handles
//     const handles = activeWidgets.get("measurementHandles");
//     if (handles) {
//       handles.forEach((handle) => handle.remove());
//       activeWidgets.delete("measurementHandles");
//     }

//     measurementWidget.destroy();
//     measurementWidget = null;
//   } else {
//     // Activate measurement
//     btn.classList.add("active");
//     closeSidePanel(); // Close any open panels
//     const { stateManager, drawingManager } = getState();
//     const sketchViewModel = stateManager.getSketchViewModel();
//     if (sketchViewModel) {
//       sketchViewModel.cancel();
//     }
//     drawingManager.resetDrawingTools();
//   }
// }

// // Update the measurement results display function
// function updateMeasurementResults(measurement) {
//   const content = document.getElementById("measurementContent");
//   if (!content) return;

//   let html = '<div class="measurement-display">';

//   if (measurement.distance !== undefined) {
//     // Distance measurement
//     html += `
//       <div class="measurement-item">
//         <i class="fas fa-ruler-horizontal"></i>
//         <span class="measurement-label">Distance:</span>
//         <span class="measurement-value">${measurement.distance.toFixed(2)} ${
//       measurement.distanceUnit
//     }</span>
//       </div>
//     `;
//   } else if (measurement.area !== undefined) {
//     // Area measurement
//     html += `
//       <div class="measurement-item">
//         <i class="fas fa-vector-square"></i>
//         <span class="measurement-label">Area:</span>
//         <span class="measurement-value">${measurement.area.toFixed(2)} ${
//       measurement.areaUnit
//     }</span>
//       </div>
//       <div class="measurement-item">
//         <i class="fas fa-draw-polygon"></i>
//         <span class="measurement-label">Perimeter:</span>
//         <span class="measurement-value">${measurement.perimeter.toFixed(2)} ${
//       measurement.perimeterUnit
//     }</span>
//       </div>
//     `;
//   }

//   html += "</div>";
//   content.innerHTML = html;
// }

// Replace the toggleSwipe function with this version
// async function toggleSwipe() {
//   if (!activeWidgets.has("swipe")) {
//     if (getState().stateManager.getUploadedLayers().length < 2) {
//       showNotification("Need at least 2 layers for swipe comparison", "error");
//       return;
//     }

//     // Temporarily suppress console warnings for deprecated widget
//     const originalWarn = console.warn;
//     console.warn = () => {};

//     try {
//       const [Swipe] = await Promise.all([loadModule("esri/widgets/Swipe")]);

//       const swipe = new Swipe({
//         view: getState().stateManager.getView(),
//         leadingLayers: [getState().stateManager.getUploadedLayers()[0]],
//         trailingLayers: [getState().stateManager.getUploadedLayers()[1]],
//         direction: "horizontal",
//         position: 50,
//       });

//       getState().stateManager.getView().ui.add(swipe);
//       activeWidgets.set("swipe", swipe);
//       showNotification("Swipe between first two layers", "info");

//       // Update widget button state
//       document.querySelector('[onclick*="swipe"]').classList.add("active");
//     } finally {
//       // Restore console.warn
//       console.warn = originalWarn;
//     }
//   } else {
//     const swipe = activeWidgets.get("swipe");
//     view.ui.remove(swipe);
//     swipe.destroy();
//     activeWidgets.delete("swipe");

//     // Remove active state
//     document.querySelector('[onclick*="swipe"]').classList.remove("active");
//   }
// }

// Update Print widget to handle the null value warnings better
// Apply similar fix to togglePrint:
// async function togglePrint() {
//   const printDiv = document.getElementById("printWidget");

//   if (!activeWidgets.has("print") || printDiv.classList.contains("hidden")) {
//     const originalWarn = console.warn;
//     console.warn = (msg) => {
//       if (!msg.includes('The specified value "null"')) {
//         originalWarn(msg);
//       }
//     };

//     try {
//       if (!activeWidgets.has("print")) {
//         const [Print] = await Promise.all([loadModule("esri/widgets/Print")]);

//         const print = new Print({
//           view: view,
//           container: "printContent",
//           printServiceUrl:
//             "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
//         });

//         activeWidgets.set("print", print);
//       }

//       printDiv.classList.remove("hidden");
//       document.querySelector('[onclick*="print"]')?.classList.add("active");
//     } finally {
//       setTimeout(() => {
//         console.warn = originalWarn;
//       }, 1000);
//     }
//   } else {
//     printDiv.classList.add("hidden");
//     document.querySelector('[onclick*="print"]')?.classList.remove("active");
//   }
// }

// // Add this function to make toolbar draggable (optional)
// function makeToolbarDraggable() {
//   const toolbar = document.querySelector('.main-toolbar');
//   if (!toolbar || window.innerWidth < 768) return;

//   let isDragging = false;
//   let currentX;
//   let currentY;
//   let initialX;
//   let initialY;
//   let xOffset = 0;
//   let yOffset = 0;

//   // Add drag handle
//   const dragHandle = document.createElement('div');
//   dragHandle.className = 'toolbar-drag-handle';
//   dragHandle.innerHTML = '<i class="fas fa-grip-vertical"></i>';
//   dragHandle.style.cssText = `
//     cursor: move;
//     padding: var(--spacing-sm);
//     color: var(--text-light);
//     display: flex;
//     align-items: center;
//   `;
//   toolbar.insertBefore(dragHandle, toolbar.firstChild);

//   dragHandle.addEventListener('mousedown', dragStart);
//   document.addEventListener('mousemove', drag);
//   document.addEventListener('mouseup', dragEnd);

//   function dragStart(e) {
//     initialX = e.clientX - xOffset;
//     initialY = e.clientY - yOffset;

//     if (e.target.closest('.toolbar-drag-handle')) {
//       isDragging = true;
//       toolbar.style.position = 'fixed';
//       toolbar.style.left = 'auto';
//       toolbar.style.bottom = 'auto';
//       toolbar.style.transform = 'none';
//     }
//   }

//   function drag(e) {
//     if (isDragging) {
//       e.preventDefault();
//       currentX = e.clientX - initialX;
//       currentY = e.clientY - initialY;

//       xOffset = currentX;
//       yOffset = currentY;

//       toolbar.style.transform = `translate(${currentX}px, ${currentY}px)`;
//     }
//   }

//   function dragEnd(e) {
//     initialX = currentX;
//     initialY = currentY;
//     isDragging = false;
//   }
// }

// // Call this in your initialization
// if (window.innerWidth > 768) {
//   makeToolbarDraggable();
// }

// Close measurement results
// function closeMeasurementResults() {
//   document.getElementById("measurementResults").classList.add("hidden");
// }

// Add this debug function to check what attributes are available
// function debugLayerAttributes() {
//   console.log("=== Layer Attributes Debug ===");
//   getState().stateManager.getUploadedLayers().forEach((layer, index) => {
//     console.log(`\nLayer ${index}: ${layer.title}`);
//     console.log("Fields:", layer.fields);
//     console.log("OutFields:", layer.outFields);

//     // Query first feature to see attributes
//     if (layer.queryFeatures) {
//       const query = layer.createQuery();
//       query.where = "1=1";
//       query.outFields = ["*"];
//       query.num = 1;

//       layer.queryFeatures(query).then((result) => {
//         if (result.features.length > 0) {
//           console.log(
//             "Sample feature attributes:",
//             result.features[0].attributes
//           );
//         }
//       });
//     }
//   });
// }

// // Export for console access
// window.debugLayerAttributes = debugLayerAttributes;

// Export global functions for widget management
// window.toggleWidget = toggleWidget;
// window.deleteBookmark = deleteBookmark;
// window.closeMeasurementResults = closeMeasurementResults;

// ============================================================================
// COMMENTED OUT - Moved to js/features/attribute-table.js
// ============================================================================
// Attribute Table System - All functionality extracted to AttributeTable class
// ============================================================================

// // Attribute Table System
// let currentTableLayer = null;
// let tableData = [];
// let filteredData = [];
// let currentPage = 1;
// const recordsPerPage = 50;
// let sortColumn = null;
// let sortDirection = "asc";

// // Toggle Attribute Table
// async function toggleAttributeTable() {
//   const tableWidget = document.getElementById("attributeTableWidget");
//   const btn = document.getElementById("tableBtn");

//   if (!tableWidget) {
//     console.error("Attribute table widget not found");
//     return;
//   }

//   if (tableWidget.classList.contains("hidden")) {
//     tableWidget.classList.remove("hidden");
//     if (btn) btn.classList.add("active");
//     initializeTableLayerSelect();

//     if (getState().stateManager.getUploadedLayers().length > 0) {
//       const select = document.getElementById("tableLayerSelect");
//       if (select) {
//         select.value = 0;
//         await loadTableData(0);
//       }
//     }
//   } else {
//     tableWidget.classList.add("hidden");
//     if (btn) btn.classList.remove("active");
//   }
// }

// Initialize layer select dropdown
// function initializeTableLayerSelect() {
//   const select = document.getElementById("tableLayerSelect");
//   select.innerHTML = '<option value="">Select a layer...</option>';

//   getState()
//     .stateManager.getUploadedLayers()
//     .forEach((layer, index) => {
//       const option = document.createElement("option");
//       option.value = index;
//       option.textContent = layer.title;
//       select.appendChild(option);
//     });

//   select.addEventListener("change", async (e) => {
//     if (e.target.value !== "") {
//       await loadTableData(parseInt(e.target.value));
//     } else {
//       clearTable();
//     }
//   });

//   // Initialize search
//   const searchInput = document.getElementById("tableSearchInput");
//   searchInput.addEventListener(
//     "input",
//     debounce((e) => {
//       filterTableData(e.target.value);
//     }, 300)
//   );
// }

// Load table data from layer
// async function loadTableData(layerIndex) {
//   try {
//     const layer = getState().stateManager.getUploadedLayers()[layerIndex];
//     if (!layer) return;

//     currentTableLayer = layer;
//     showTableLoading();

//     // Query all features
//     const query = layer.createQuery();
//     query.where = "1=1";
//     query.outFields = ["*"];
//     query.returnGeometry = true;

//     const result = await layer.queryFeatures(query);

//     // Convert features to table data
//     tableData = result.features.map((feature, index) => ({
//       _id: index,
//       _feature: feature,
//       ...feature.attributes,
//     }));

//     filteredData = [...tableData];
//     currentPage = 1;

//     renderTable();
//     updatePagination();
//   } catch (error) {
//     console.error("Error loading table data:", error);
//     showTableError("Error loading data");
//   }
// }

// Show loading state
// function showTableLoading() {
//   const container = document.getElementById("tableContainer");
//   container.innerHTML = `
//     <div class="table-empty-state">
//       <i class="fas fa-spinner fa-spin"></i>
//       <p>Loading data...</p>
//     </div>
//   `;
// }

// Show error state
// function showTableError(message) {
//   const container = document.getElementById("tableContainer");
//   container.innerHTML = `
//     <div class="table-empty-state">
//       <i class="fas fa-exclamation-triangle"></i>
//       <p>${message}</p>
//     </div>
//   `;
// }

// Clear table
// function clearTable() {
//   const container = document.getElementById("tableContainer");
//   container.innerHTML = `
//     <div class="table-empty-state">
//       <i class="fas fa-table"></i>
//       <p>Select a layer to view its attributes</p>
//     </div>
//   `;
//   document.getElementById("tablePaginationInfo").textContent = "0 records";
//   document.getElementById("tablePageInfo").textContent = "Page 0 of 0";
// }

// Render table
// function renderTable() {
//   if (filteredData.length === 0) {
//     showTableError("No data to display");
//     return;
//   }

//   const { popupManager } = getState();

//   // Get columns (excluding internal fields)
//   const columns = Object.keys(filteredData[0]).filter(
//     (key) => !key.startsWith("_") && key !== "ObjectID" && key !== "FID"
//   );

//   // Calculate pagination
//   const startIndex = (currentPage - 1) * recordsPerPage;
//   const endIndex = Math.min(startIndex + recordsPerPage, filteredData.length);
//   const pageData = filteredData.slice(startIndex, endIndex);

//   // Build table HTML
//   let html = '<table class="attribute-data-table">';

//   // Header
//   html += "<thead><tr>";
//   html += '<th style="width: 50px;">#</th>';
//   columns.forEach((col) => {
//     const sortClass = sortColumn === col ? `sort-${sortDirection}` : "";
//     html += `<th class="${sortClass}" onclick="sortTable('${col}')">
//       ${popupManager.formatFieldName(col)}</th>`;
//   });
//   html += "</tr></thead>";

//   // Body
//   html += "<tbody>";
//   pageData.forEach((row, index) => {
//     html += `<tr onclick="selectTableRow(${row._id})" data-id="${row._id}">`;
//     html += `<td>${startIndex + index + 1}</td>`;
//     columns.forEach((col) => {
//       const value = formatTableValue(row[col]);
//       html += `<td>${value}</td>`;
//     });
//     html += "</tr>";
//   });
//   html += "</tbody>";
//   html += "</table>";

//   document.getElementById("tableContainer").innerHTML = html;
// }

// Format table value
// function formatTableValue(value) {
//   if (value === null || value === undefined) {
//     return '<span style="color: #999; font-style: italic;">null</span>';
//   }
//   if (typeof value === "boolean") {
//     return value
//       ? '<span style="color: #4CAF50;">✓</span>'
//       : '<span style="color: #f44336;">✗</span>';
//   }
//   if (typeof value === "number") {
//     return value.toLocaleString();
//   }
//   if (typeof value === "string" && value.length > 50) {
//     return value.substring(0, 50) + "...";
//   }
//   return value.toString();
// }

// Sort table
// function sortTable(column) {
//   if (sortColumn === column) {
//     sortDirection = sortDirection === "asc" ? "desc" : "asc";
//   } else {
//     sortColumn = column;
//     sortDirection = "asc";
//   }

//   filteredData.sort((a, b) => {
//     const aVal = a[column];
//     const bVal = b[column];

//     if (aVal === null || aVal === undefined) return 1;
//     if (bVal === null || bVal === undefined) return -1;

//     let comparison = 0;
//     if (typeof aVal === "number" && typeof bVal === "number") {
//       comparison = aVal - bVal;
//     } else {
//       comparison = aVal.toString().localeCompare(bVal.toString());
//     }

//     return sortDirection === "asc" ? comparison : -comparison;
//   });

//   currentPage = 1;
//   renderTable();
//   updatePagination();
// }

// Filter table data
// function filterTableData(searchTerm) {
//   if (!searchTerm) {
//     filteredData = [...tableData];
//   } else {
//     const term = searchTerm.toLowerCase();
//     filteredData = tableData.filter((row) => {
//       return Object.values(row).some((value) => {
//         if (value === null || value === undefined) return false;
//         return value.toString().toLowerCase().includes(term);
//       });
//     });
//   }

//   currentPage = 1;
//   renderTable();
//   updatePagination();
// }

// Select table row
// async function selectTableRow(id) {
//   const row = tableData.find((r) => r._id === id);
//   if (!row || !row._feature) return;

//   // Highlight row
//   document.querySelectorAll(".attribute-data-table tr").forEach((tr) => {
//     tr.classList.remove("selected");
//   });
//   document.querySelector(`tr[data-id="${id}"]`).classList.add("selected");

//   // Zoom to feature
//   if (row._feature.geometry) {
//     await view.goTo({
//       target: row._feature.geometry,
//       zoom: view.zoom + 2,
//     });

//     // Flash the feature
//     flashFeature(row._feature);
//   }
// }

// Flash feature on map
// async function flashFeature(feature) {
//   const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

//   const flashGraphic = new Graphic({
//     geometry: feature.geometry,
//     symbol: {
//       type: feature.geometry.type === "point" ? "simple-marker" : "simple-fill",
//       color: [255, 255, 0, 0.6],
//       outline: {
//         color: [255, 255, 0, 1],
//         width: 3,
//       },
//     },
//   });

//   view.graphics.add(flashGraphic);

//   // Remove after animation
//   setTimeout(() => {
//     view.graphics.remove(flashGraphic);
//   }, 1000);
// }

// Pagination controls
// function updatePagination() {
//   const totalPages = Math.ceil(filteredData.length / recordsPerPage);

//   document.getElementById("tablePaginationInfo").textContent = `${
//     filteredData.length
//   } record${filteredData.length !== 1 ? "s" : ""}`;
//   document.getElementById(
//     "tablePageInfo"
//   ).textContent = `Page ${currentPage} of ${totalPages}`;

//   document.getElementById("tablePrevBtn").disabled = currentPage === 1;
//   document.getElementById("tableNextBtn").disabled = currentPage === totalPages;
// }

// Continue script.js - Complete pagination and export functions

// function previousPage() {
//   if (currentPage > 1) {
//     currentPage--;
//     renderTable();
//     updatePagination();
//   }
// }

// function nextPage() {
//   const totalPages = Math.ceil(filteredData.length / recordsPerPage);
//   if (currentPage < totalPages) {
//     currentPage++;
//     renderTable();
//     updatePagination();
//   }
// }

// function refreshTable() {
//   if (currentTableLayer) {
//     const layerIndex = getState()
//       .stateManager.getUploadedLayers()
//       .indexOf(currentTableLayer);
//     if (layerIndex !== -1) {
//       loadTableData(layerIndex);
//     }
//   }
// }

// Export functionality
// function showExportOptions() {
//   const modal = document.getElementById("exportModal");
//   const select = document.getElementById("exportLayerSelect");

//   // Populate layer select
//   select.innerHTML = '<option value="">Select a layer...</option>';
//   getState()
//     .stateManager.getUploadedLayers()
//     .forEach((layer, index) => {
//       const option = document.createElement("option");
//       option.value = index;
//       option.textContent = layer.title;
//       select.appendChild(option);
//     });

//   modal.classList.remove("hidden");
// }

// function closeExportModal() {
//   document.getElementById("exportModal").classList.add("hidden");
// }

// // Export data in different formats
// async function exportData(format) {
//   const layerIndex = document.getElementById("exportLayerSelect").value;
//   if (layerIndex === "") {
//     showNotification("Please select a layer to export", "error");
//     return;
//   }

//   const layer =
//     getState().stateManager.getUploadedLayers()[parseInt(layerIndex)];

//   try {
//     showNotification("Preparing export...", "info");

//     // Query all features
//     const query = layer.createQuery();
//     query.where = "1=1";
//     query.outFields = ["*"];
//     query.returnGeometry = true;

//     const result = await layer.queryFeatures(query);

//     switch (format) {
//       case "csv":
//         exportToCSV(result.features, layer.title);
//         break;
//       case "geojson":
//         exportToGeoJSON(result.features, layer.title);
//         break;
//       case "excel":
//         exportToExcel(result.features, layer.title);
//         break;
//     }

//     closeExportModal();
//   } catch (error) {
//     console.error("Export error:", error);
//     showNotification("Error exporting data", "error");
//   }
// }

// Export to CSV
// function exportToCSV(features, filename) {
//   if (features.length === 0) {
//     showNotification("No data to export", "error");
//     return;
//   }

//   // Get all unique field names
//   const fields = new Set();
//   features.forEach((feature) => {
//     Object.keys(feature.attributes).forEach((key) => {
//       if (!key.startsWith("_")) {
//         fields.add(key);
//       }
//     });
//   });

//   const fieldArray = Array.from(fields);

//   // Build CSV content
//   let csv = fieldArray.map((field) => `"${field}"`).join(",") + "\n";

//   features.forEach((feature) => {
//     const row = fieldArray.map((field) => {
//       const value = feature.attributes[field];
//       if (value === null || value === undefined) return '""';
//       if (
//         typeof value === "string" &&
//         (value.includes(",") || value.includes('"') || value.includes("\n"))
//       ) {
//         return `"${value.replace(/"/g, '""')}"`;
//       }
//       return `"${value}"`;
//     });
//     csv += row.join(",") + "\n";
//   });

//   // Download file
//   downloadFile(csv, `${filename}.csv`, "text/csv");
//   showNotification("CSV exported successfully", "success");
// }

// Export to GeoJSON
// function exportToGeoJSON(features, filename) {
//   const geojson = {
//     type: "FeatureCollection",
//     features: features.map((feature) => {
//       const geometry = feature.geometry.toJSON();

//       // Clean attributes
//       const properties = {};
//       Object.entries(feature.attributes).forEach(([key, value]) => {
//         if (!key.startsWith("_") && value !== null && value !== undefined) {
//           properties[key] = value;
//         }
//       });

//       return {
//         type: "Feature",
//         geometry: geometry,
//         properties: properties,
//       };
//     }),
//   };

//   const json = JSON.stringify(geojson, null, 2);
//   downloadFile(json, `${filename}.geojson`, "application/json");
//   showNotification("GeoJSON exported successfully", "success");
// }

// Export to Excel (using CSV format that Excel can open)
// function exportToExcel(features, filename) {
//   // For simplicity, we'll create a CSV that Excel can open
//   // For true Excel format, you'd need a library like SheetJS
//   exportToCSV(features, filename + "_excel");
//   showNotification("Data exported for Excel (CSV format)", "success");
// }

// Download file utility
// function downloadFile(content, filename, mimeType) {
//   const blob = new Blob([content], { type: mimeType });
//   const url = URL.createObjectURL(blob);
//   const link = document.createElement("a");
//   link.href = url;
//   link.download = filename;
//   document.body.appendChild(link);
//   link.click();
//   document.body.removeChild(link);
//   URL.revokeObjectURL(url);
// }

// Statistics panel for attribute table
// function showTableStatistics() {
//   if (!currentTableLayer || tableData.length === 0) return;

//   const stats = calculateStatistics(tableData);
//   let html = '<div class="table-statistics">';
//   html += "<h4>Statistics</h4>";

//   Object.entries(stats).forEach(([field, stat]) => {
//     if (stat.type === "numeric") {
//       html += `
//         <div class="stat-group">
//           <h5>${formatFieldName(field)}</h5>
//           <div class="stat-row">
//             <span>Count:</span> <span>${stat.count}</span>
//           </div>
//           <div class="stat-row">
//             <span>Min:</span> <span>${stat.min.toFixed(2)}</span>
//           </div>
//           <div class="stat-row">
//             <span>Max:</span> <span>${stat.max.toFixed(2)}</span>
//           </div>
//           <div class="stat-row">
//             <span>Average:</span> <span>${stat.avg.toFixed(2)}</span>
//           </div>
//           <div class="stat-row">
//             <span>Sum:</span> <span>${stat.sum.toFixed(2)}</span>
//           </div>
//         </div>
//       `;
//     }
//   });

//   html += "</div>";

//   // Show in a modal or panel
//   showStatisticsModal(html);
// }

// Calculate statistics for numeric fields
// function calculateStatistics(data) {
//   const stats = {};

//   if (data.length === 0) return stats;

//   // Get numeric fields
//   const firstRow = data[0];
//   Object.keys(firstRow).forEach((field) => {
//     if (field.startsWith("_")) return;

//     const values = data
//       .map((row) => row[field])
//       .filter(
//         (val) => val !== null && val !== undefined && typeof val === "number"
//       );

//     if (values.length > 0) {
//       stats[field] = {
//         type: "numeric",
//         count: values.length,
//         min: Math.min(...values),
//         max: Math.max(...values),
//         sum: values.reduce((a, b) => a + b, 0),
//         avg: values.reduce((a, b) => a + b, 0) / values.length,
//       };
//     }
//   });

//   return stats;
// }

// ============================================================================
// COMMENTED OUT - updateLayerList moved to js/layers/layer-manager.js
// ============================================================================
// Update layer list to refresh table if active
// const originalUpdateLayerList = updateLayerList;
// updateLayerList = function () {
//   originalUpdateLayerList();

//   // Update table layer select if table is open
//   const tableWidget = document.getElementById("attributeTableWidget");
//   if (!tableWidget.classList.contains("hidden")) {
//     initializeTableLayerSelect();
//   }
// };
// ============================================================================

// Export functions for global access
// window.toggleAttributeTable = toggleAttributeTable;
// window.refreshTable = refreshTable;
// window.previousPage = previousPage;
// window.nextPage = nextPage;
// window.sortTable = sortTable;
// window.selectTableRow = selectTableRow;
// window.showExportOptions = showExportOptions;
// window.closeExportModal = closeExportModal;
// window.exportData = exportData;

// Heatmap Visualization System - declare as global
// window.heatmapEnabled = false;
// window.heatmapLayer = null;
// window.originalRenderers = new Map();
// Update the currentHeatmapSettings object
// window.currentHeatmapSettings = {
//   field: null,
//   radius: 10,
//   maxPixelIntensity: 100,
//   blurRadius: 15,
//   colorScheme: "default",
//   minDensity: 0, // Add this
//   maxDensity: 10, // Add this
// };

// Color schemes for heatmap
// const heatmapColorSchemes = {
//   default: [
//     { ratio: 0, color: [133, 193, 233, 0] },
//     { ratio: 0.15, color: [133, 193, 233, 0.4] },
//     { ratio: 0.3, color: [144, 217, 100, 0.7] },
//     { ratio: 0.5, color: [255, 215, 0, 0.8] },
//     { ratio: 0.8, color: [255, 115, 0, 0.9] },
//     { ratio: 1, color: [255, 0, 0, 1] },
//   ],
//   blue: [
//     { ratio: 0, color: [0, 0, 0, 0] },
//     { ratio: 0.2, color: [30, 144, 255, 0.5] },
//     { ratio: 0.5, color: [0, 191, 255, 0.7] },
//     { ratio: 0.8, color: [0, 0, 255, 0.9] },
//     { ratio: 1, color: [0, 0, 139, 1] },
//   ],
//   green: [
//     { ratio: 0, color: [0, 0, 0, 0] },
//     { ratio: 0.2, color: [144, 238, 144, 0.5] },
//     { ratio: 0.5, color: [34, 139, 34, 0.7] },
//     { ratio: 0.8, color: [0, 100, 0, 0.9] },
//     { ratio: 1, color: [0, 50, 0, 1] },
//   ],
//   // Continue the heatmap color schemes and functionality
//   purple: [
//     { ratio: 0, color: [0, 0, 0, 0] },
//     { ratio: 0.2, color: [221, 160, 221, 0.5] },
//     { ratio: 0.5, color: [186, 85, 211, 0.7] },
//     { ratio: 0.8, color: [138, 43, 226, 0.9] },
//     { ratio: 1, color: [75, 0, 130, 1] },
//   ],
// };

// Make sure toggleHeatmap is defined as a global function
// In your toggleHeatmap function, make sure to show controls:
// async function toggleHeatmap() {
//   const toggle = document.getElementById("heatmapToggle");
//   const layerSelect = document.getElementById("heatmapLayerSelect");
//   const settingsBtn = document.getElementById("heatmapSettingsBtn");
//   const controls = document.getElementById("heatmapControls");

//   heatmapEnabled = toggle.checked;

//   if (heatmapEnabled) {
//     // Show controls container
//     if (controls) {
//       controls.style.display = "block";
//     }

//     updateHeatmapLayerSelect();

//     if (layerSelect.value) {
//       await applyHeatmap(parseInt(layerSelect.value));
//     }
//   } else {
//     // Hide controls container
//     if (controls) {
//       controls.style.display = "none";
//     }

//     restoreOriginalRenderers();
//   }
// }

// Update heatmap layer select
// function updateHeatmapLayerSelect() {
//   const select = document.getElementById("heatmapLayerSelect");
//   select.innerHTML = '<option value="">Select point layer...</option>';

//   // Only show point layers
//   getState()
//     .stateManager.getUploadedLayers()
//     .forEach((layer, index) => {
//       // Check if layer has point geometry
//       if (
//         layer.geometryType === "point" ||
//         (layer.source &&
//           layer.source.length > 0 &&
//           layer.source.items[0]?.geometry?.type === "point")
//       ) {
//         const option = document.createElement("option");
//         option.value = index;
//         option.textContent = layer.title;
//         select.appendChild(option);
//       }
//     });

//   select.addEventListener("change", async (e) => {
//     if (e.target.value && heatmapEnabled) {
//       await applyHeatmap(parseInt(e.target.value));
//     }
//   });
// }

// Update the applyHeatmap and applyHeatmapSettings functions
// async function applyHeatmap(layerIndex) {
//   try {
//     const layer = getState().stateManager.getUploadedLayers()[layerIndex];
//     if (!layer) return;

//     const [HeatmapRenderer] = await Promise.all([
//       loadModule("esri/renderers/HeatmapRenderer"),
//     ]);

//     if (!getState().stateManager.getOriginalRenderer(layer.id)) {
//       getState().stateManager.setOriginalRenderer(layer.id, layer.renderer);
//     }

//     // Create heatmap renderer with density settings
//     const heatmapRenderer = new HeatmapRenderer({
//       field: currentHeatmapSettings.field,
//       colorStops: heatmapColorSchemes[currentHeatmapSettings.colorScheme],
//       radius: currentHeatmapSettings.radius,
//       maxPixelIntensity: currentHeatmapSettings.maxPixelIntensity,
//       minPixelIntensity: 0,
//       blurRadius: currentHeatmapSettings.blurRadius,
//       maxDensity: currentHeatmapSettings.maxDensity, // Add this
//       minDensity: currentHeatmapSettings.minDensity, // Add this
//     });

//     layer.renderer = heatmapRenderer;
//     heatmapLayer = layer;

//     updateHeatmapFieldSelect(layer);
//     showNotification("Heatmap applied", "success");
//   } catch (error) {
//     console.error("Error applying heatmap:", error);
//     showNotification("Error applying heatmap", "error");
//   }
// }

// Restore original renderers
// function restoreOriginalRenderers() {
//   getState()
//     .stateManager.getUploadedLayers()
//     .forEach((layer) => {
//       const originalRenderer = getState().stateManager.getOriginalRenderer(
//         layer.id
//       );
//       if (originalRenderer) {
//         layer.renderer = originalRenderer;
//         getState().stateManager.setOriginalRenderer(layer.id, null);
//       }
//     });
//   heatmapLayer = null;
// }

// Show heatmap settings
// function showHeatmapSettings() {
//   if (!heatmapLayer) {
//     showNotification("Please select a layer first", "error");
//     return;
//   }

//   const modal = document.getElementById("heatmapModal");
//   modal.classList.remove("hidden");

//   // Initialize sliders
//   initializeHeatmapSliders();
// }

// Close heatmap settings
// function closeHeatmapSettings() {
//   document.getElementById("heatmapModal").classList.add("hidden");
// }

// Initialize heatmap sliders
// function initializeHeatmapSliders() {
//   // Radius slider
//   const radiusSlider = document.getElementById("heatmapRadius");
//   const radiusValue = document.getElementById("radiusValue");
//   radiusSlider.value = currentHeatmapSettings.radius;
//   radiusValue.textContent = currentHeatmapSettings.radius;

//   radiusSlider.addEventListener("input", (e) => {
//     radiusValue.textContent = e.target.value;
//     currentHeatmapSettings.radius = parseInt(e.target.value);
//   });

//   // Intensity slider
//   const intensitySlider = document.getElementById("heatmapIntensity");
//   const intensityValue = document.getElementById("intensityValue");
//   intensitySlider.value = currentHeatmapSettings.maxIntensity;
//   intensityValue.textContent = currentHeatmapSettings.maxIntensity;

//   intensitySlider.addEventListener("input", (e) => {
//     intensityValue.textContent = e.target.value;
//     currentHeatmapSettings.maxIntensity = parseInt(e.target.value);
//   });

//   // Blur slider
//   const blurSlider = document.getElementById("heatmapBlur");
//   const blurValue = document.getElementById("blurValue");
//   blurSlider.value = currentHeatmapSettings.blurRadius;
//   blurValue.textContent = currentHeatmapSettings.blurRadius;

//   blurSlider.addEventListener("input", (e) => {
//     blurValue.textContent = e.target.value;
//     currentHeatmapSettings.blurRadius = parseInt(e.target.value);
//   });

//   // Min Density slider
//   const minDensitySlider = document.getElementById("heatmapMinDensity");
//   const minDensityValue = document.getElementById("minDensityValue");
//   minDensitySlider.value = currentHeatmapSettings.minDensity;
//   minDensityValue.textContent = currentHeatmapSettings.minDensity;

//   minDensitySlider.addEventListener("input", (e) => {
//     minDensityValue.textContent = e.target.value;
//     currentHeatmapSettings.minDensity = parseFloat(e.target.value);
//   });

//   // Max Density slider
//   const maxDensitySlider = document.getElementById("heatmapMaxDensity");
//   const maxDensityValue = document.getElementById("maxDensityValue");
//   maxDensitySlider.value = currentHeatmapSettings.maxDensity;
//   maxDensityValue.textContent = currentHeatmapSettings.maxDensity;

//   maxDensitySlider.addEventListener("input", (e) => {
//     maxDensityValue.textContent = e.target.value;
//     currentHeatmapSettings.maxDensity = parseFloat(e.target.value);
//   });
// }

// Update heatmap field select
// function updateHeatmapFieldSelect(layer) {
//   const select = document.getElementById("heatmapField");
//   select.innerHTML = '<option value="">None (Equal weight)</option>';

//   if (layer.fields) {
//     layer.fields.forEach((field) => {
//       if (
//         field.type === "double" ||
//         field.type === "integer" ||
//         field.type === "single" ||
//         field.type === "small-integer"
//       ) {
//         const option = document.createElement("option");
//         option.value = field.name;
//         option.textContent = formatFieldName(field.name);
//         select.appendChild(option);
//       }
//     });
//   }

//   select.value = currentHeatmapSettings.field || "";
// }

// Select color scheme
// function selectColorScheme(scheme) {
//   currentHeatmapSettings.colorScheme = scheme;

//   // Update UI
//   document.querySelectorAll(".color-scheme").forEach((btn) => {
//     btn.classList.remove("active");
//   });
//   document.querySelector(`[data-scheme="${scheme}"]`).classList.add("active");
// }

// Update applyHeatmapSettings to include density
// async function applyHeatmapSettings() {
//   if (!heatmapLayer) return;

//   try {
//     const [HeatmapRenderer] = await Promise.all([
//       loadModule("esri/renderers/HeatmapRenderer"),
//     ]);

//     const fieldSelect = document.getElementById("heatmapField");
//     currentHeatmapSettings.field = fieldSelect.value || null;

//     const heatmapRenderer = new HeatmapRenderer({
//       field: currentHeatmapSettings.field,
//       colorStops: heatmapColorSchemes[currentHeatmapSettings.colorScheme],
//       radius: currentHeatmapSettings.radius,
//       maxPixelIntensity: currentHeatmapSettings.maxPixelIntensity,
//       minPixelIntensity: 0,
//       blurRadius: currentHeatmapSettings.blurRadius,
//       maxDensity: currentHeatmapSettings.maxDensity, // Add this
//       minDensity: currentHeatmapSettings.minDensity, // Add this
//     });

//     heatmapLayer.renderer = heatmapRenderer;

//     closeHeatmapSettings();
//     showNotification("Heatmap settings applied", "success");
//   } catch (error) {
//     console.error("Error applying heatmap settings:", error);
//     showNotification("Error applying settings", "error");
//   }
// }

// ============================================================================
// COMMENTED OUT - updateLayerList moved to js/layers/layer-manager.js
// ============================================================================
// Update layer list to refresh heatmap select
// const originalUpdateLayerList2 = updateLayerList;
// updateLayerList = function () {
//   originalUpdateLayerList2();

//   // Update heatmap layer select if enabled
//   if (heatmapEnabled) {
//     updateHeatmapLayerSelect();
//   }
// };
// ============================================================================

// // Listen for zoom changes to optimize heatmap
// view.watch('zoom', (zoom) => {
//   if (heatmapEnabled && heatmapLayer) {
//     // Adjust radius based on zoom level for better visualization
//     const baseRadius = currentHeatmapSettings.radius;
//     const zoomFactor = Math.max(1, Math.min(3, zoom / 10));

//     if (heatmapLayer.renderer && heatmapLayer.renderer.type === 'heatmap') {
//       heatmapLayer.renderer.radius = baseRadius * zoomFactor;
//     }
//   }
// });

// Export functions
// window.toggleHeatmap = toggleHeatmap;
// window.showHeatmapSettings = showHeatmapSettings;
// window.closeHeatmapSettings = closeHeatmapSettings;
// window.selectColorScheme = selectColorScheme;
// window.applyHeatmapSettings = applyHeatmapSettings;

// Classification System
// function initializeClassificationPanel() {
//   const layerSelect = document.getElementById("classifyLayerSelect");
//   const fieldSelect = document.getElementById("classifyFieldSelect");
//   const fieldSection = document.getElementById("classifyFieldSection");
//   const actionsSection = document.querySelector(".classification-actions");
//   const { popupManager } = getState();

//   // Populate layers
//   layerSelect.innerHTML = '<option value="">Choose a layer...</option>';
//   getState()
//     .stateManager.getUploadedLayers()
//     .forEach((layer, index) => {
//       const option = document.createElement("option");
//       option.value = index;
//       option.textContent = layer.title;
//       layerSelect.appendChild(option);
//     });

//   // Layer change handler
//   layerSelect.addEventListener("change", async (e) => {
//     const layerIndex = e.target.value;
//     if (layerIndex === "") {
//       fieldSection.style.display = "none";
//       actionsSection.style.display = "none";
//       document.getElementById("fieldStatistics").style.display = "none";
//       return;
//     }

//     const layer =
//       getState().stateManager.getUploadedLayers()[parseInt(layerIndex)];
//     getState().stateManager.setCurrentClassificationLayer(layer);

//     // Populate fields
//     fieldSelect.innerHTML = '<option value="">Choose a field...</option>';
//     if (layer.fields) {
//       layer.fields.forEach((field) => {
//         if (
//           field.type === "double" ||
//           field.type === "integer" ||
//           field.type === "single" ||
//           field.type === "small-integer" ||
//           field.type === "string" ||
//           field.type === "oid"
//         ) {
//           const option = document.createElement("option");
//           option.value = field.name;
//           option.textContent = popupManager.formatFieldName(field.name);
//           fieldSelect.appendChild(option);
//         }
//       });
//     }

//     fieldSection.style.display = "block";
//   });

//   // Field change handler
//   fieldSelect.addEventListener("change", async (e) => {
//     const fieldName = e.target.value;
//     if (fieldName && getState().stateManager.getCurrentClassificationLayer()) {
//       const stats = await analyzeFieldForClassification(
//         getState().stateManager.getCurrentClassificationLayer(),
//         fieldName
//       );
//       showClassificationStatistics(stats);
//       actionsSection.style.display = stats ? "flex" : "none";
//     } else {
//       document.getElementById("fieldStatistics").style.display = "none";
//       actionsSection.style.display = "none";
//     }
//   });
// }

// Analyze field values for classification
// async function analyzeFieldForClassification(layer, fieldName) {
//   try {
//     const query = layer.createQuery();
//     query.outFields = [fieldName];
//     query.where = "1=1";
//     query.returnGeometry = false;

//     const results = await layer.queryFeatures(query);

//     if (results.features.length === 0) {
//       return null;
//     }

//     const values = results.features.map(
//       (feature) => feature.attributes[fieldName]
//     );
//     const validValues = values.filter(
//       (value) => value !== null && value !== undefined && value !== ""
//     );

//     // Count occurrences
//     const valueCount = {};
//     validValues.forEach((value) => {
//       const key = String(value);
//       valueCount[key] = (valueCount[key] || 0) + 1;
//     });

//     // Sort by count
//     const sortedValues = Object.entries(valueCount)
//       .sort((a, b) => b[1] - a[1])
//       .slice(0, 20); // Limit to top 20

//     return {
//       totalFeatures: results.features.length,
//       validCount: validValues.length,
//       uniqueCount: Object.keys(valueCount).length,
//       sortedValues: sortedValues,
//       fieldName: fieldName,
//     };
//   } catch (error) {
//     console.error("Error analyzing field:", error);
//     showNotification("Error analyzing field values", "error");
//     return null;
//   }
// }

// Show classification statistics
// function showClassificationStatistics(stats) {
//   const statsDiv = document.getElementById("fieldStatistics");
//   const statsContent = statsDiv.querySelector(".stats-content");

//   if (!stats) {
//     statsDiv.style.display = "none";
//     return;
//   }

//   let html = `
//     <div class="stats-summary">
//       <div><strong>Total Features:</strong> ${stats.totalFeatures}</div>
//       <div><strong>Valid Values:</strong> ${stats.validCount}</div>
//       <div><strong>Unique Values:</strong> ${stats.uniqueCount}</div>
//     </div>
//   `;

//   if (stats.uniqueCount <= 20) {
//     html += "<div><strong>Top Values:</strong></div>";
//     html += '<div class="stats-values">';

//     stats.sortedValues.forEach(([value, count]) => {
//       const percentage = ((count / stats.validCount) * 100).toFixed(1);
//       html += `
//         <div class="stat-value-item">
//           <span class="stat-value-name">${value}</span>
//           <span class="stat-value-count">${count} (${percentage}%)</span>
//         </div>
//       `;
//     });

//     html += "</div>";
//   } else {
//     html += `
//       <div style="color: var(--warning-color); margin-top: var(--spacing-sm);">
//         <i class="fas fa-exclamation-triangle"></i> 
//         Too many unique values (${stats.uniqueCount}). Showing top 20 values only.
//       </div>
//     `;
//   }

//   statsContent.innerHTML = html;
//   statsDiv.style.display = "block";
// }

// Generate colors for classification
// function generateClassificationColors(count) {
//   const colorSchemes = [
//     // Blue to Red
//     [
//       [56, 149, 211],
//       [65, 171, 93],
//       [255, 204, 0],
//       [255, 127, 0],
//       [215, 25, 28],
//     ],
//     // Purple to Orange
//     [
//       [94, 79, 162],
//       [158, 154, 200],
//       [247, 247, 247],
//       [253, 174, 97],
//       [244, 109, 67],
//     ],
//     // Green gradient
//     [
//       [247, 252, 245],
//       [199, 233, 192],
//       [120, 198, 121],
//       [49, 163, 84],
//       [0, 109, 44],
//     ],
//     // Spectral
//     [
//       [215, 48, 39],
//       [252, 141, 89],
//       [254, 224, 139],
//       [145, 191, 219],
//       [69, 117, 180],
//     ],
//   ];

//   // Use a color scheme based on count
//   const schemeIndex = count % colorSchemes.length;
//   const scheme = colorSchemes[schemeIndex];

//   const colors = [];
//   for (let i = 0; i < count; i++) {
//     if (count <= scheme.length) {
//       colors.push(scheme[i]);
//     } else {
//       // Interpolate colors if we need more than available
//       const index = (i / (count - 1)) * (scheme.length - 1);
//       const lowerIndex = Math.floor(index);
//       const upperIndex = Math.ceil(index);
//       const ratio = index - lowerIndex;

//       const lowerColor = scheme[lowerIndex];
//       const upperColor = scheme[upperIndex];

//       const interpolated = [
//         Math.round(lowerColor[0] + (upperColor[0] - lowerColor[0]) * ratio),
//         Math.round(lowerColor[1] + (upperColor[1] - lowerColor[1]) * ratio),
//         Math.round(lowerColor[2] + (upperColor[2] - lowerColor[2]) * ratio),
//       ];

//       colors.push(interpolated);
//     }
//   }

//   return colors;
// }

// Apply classification
// async function applyClassification() {
//   const fieldSelect = document.getElementById("classifyFieldSelect");
//   const fieldName = fieldSelect.value;

//   if (!fieldName || !getState().stateManager.getCurrentClassificationLayer()) {
//     showNotification("Please select a field for classification", "error");
//     return;
//   }

//   try {
//     showNotification("Applying classification...", "info");

//     const stats = await analyzeFieldForClassification(
//       getState().stateManager.getCurrentClassificationLayer(),
//       fieldName
//     );

//     if (!stats || stats.uniqueCount === 0) {
//       showNotification("No valid values found", "error");
//       return;
//     }

//     // Store original renderer
//     const currentLayer =
//       getState().stateManager.getCurrentClassificationLayer();
//     if (!getState().stateManager.getOriginalRenderer(currentLayer.id)) {
//       getState().stateManager.setOriginalRenderer(
//         currentLayer.id,
//         currentLayer.renderer
//       );
//     }

//     const colors = generateClassificationColors(stats.sortedValues.length);
//     const geometryType = currentLayer.geometryType;

//     // Create unique value infos
//     const uniqueValueInfos = stats.sortedValues.map(([value, count], index) => {
//       const color = colors[index];
//       let symbol;

//       switch (geometryType) {
//         case "point":
//           symbol = {
//             type: "simple-marker",
//             color: color,
//             size: 10,
//             outline: {
//               color: [255, 255, 255, 1],
//               width: 1,
//             },
//           };
//           break;
//         case "polyline":
//           symbol = {
//             type: "simple-line",
//             color: color,
//             width: 3,
//             style: "solid",
//           };
//           break;
//         case "polygon":
//           symbol = {
//             type: "simple-fill",
//             color: [...color, 0.7],
//             outline: {
//               color: color,
//               width: 2,
//             },
//           };
//           break;
//       }

//       return {
//         value: value,
//         symbol: symbol,
//         label: `${value} (${count})`,
//       };
//     });

//     // Create default symbol
//     const defaultSymbol = createDefaultClassificationSymbol(geometryType);

//     // Apply renderer
//     currentLayer.renderer = {
//       type: "unique-value",
//       field: fieldName,
//       uniqueValueInfos: uniqueValueInfos,
//       defaultSymbol: defaultSymbol,
//       defaultLabel: "Other",
//     };

//     // Create legend
//     createClassificationLegend(stats, colors, fieldName);

//     // Close panel
//     closeSidePanel();
//     showNotification("Classification applied successfully", "success");
//   } catch (error) {
//     console.error("Error applying classification:", error);
//     showNotification("Error applying classification", "error");
//   }
// }

// Create default symbol for classification
// function createDefaultClassificationSymbol(geometryType) {
//   const grayColor = [128, 128, 128];

//   switch (geometryType) {
//     case "point":
//       return {
//         type: "simple-marker",
//         color: [...grayColor, 0.6],
//         size: 8,
//         outline: {
//           color: [255, 255, 255, 0.8],
//           width: 1,
//         },
//       };
//     case "polyline":
//       return {
//         type: "simple-line",
//         color: [...grayColor, 0.6],
//         width: 2,
//       };
//     case "polygon":
//       return {
//         type: "simple-fill",
//         color: [...grayColor, 0.3],
//         outline: {
//           color: grayColor,
//           width: 1,
//         },
//       };
//   }
// }

// Create classification legend
// function createClassificationLegend(stats, colors, fieldName) {
//     const { popupManager } = getState();

//   // Remove existing legend
//   const existingLegend = document.getElementById("classificationLegend");
//   if (existingLegend) {
//     existingLegend.remove();
//   }

//   const legendDiv = document.createElement("div");
//   legendDiv.id = "classificationLegend";
//   legendDiv.className = "classification-legend";

//   let legendHTML = `
//     <div class="widget-header" style="margin: -12px -12px 12px; padding: 12px;">
//       <h3 style="font-size: 16px; display: flex; align-items: center; gap: 8px;">
//         <i class="fas fa-list" style="color: var(--primary-color);"></i>
//         ${
//           fieldName === "GARDENSTATUS"
//             ? "حالة الحديقة"
//             : popupManager.formatFieldName(fieldName)
//         }
//       </h3>
//       <button class="widget-close" onclick="removeClassificationLegend()">
//         <i class="fas fa-times"></i>
//       </button>
//     </div>
//   `;

//   stats.sortedValues.forEach(([value, count], index) => {
//     const color = colors[index];
//     const percentage = ((count / stats.validCount) * 100).toFixed(1);

//     legendHTML += `
//       <div class="legend-item">
//         <div class="legend-color" style="background-color: rgb(${color[0]}, ${color[1]}, ${color[2]})"></div>
//         <div class="legend-label">${value}</div>
//         <div class="legend-count">${count}</div>
//       </div>
//     `;
//   });

//   legendDiv.innerHTML = legendHTML;
//   document.body.appendChild(legendDiv);
// }

// Reset classification
// function resetClassification() {
//   const currentLayer = getState().stateManager.getCurrentClassificationLayer();
//   if (!currentLayer) return;

//   const originalRenderer = getState().stateManager.getOriginalRenderer(
//     currentLayer.id
//   );
//   if (originalRenderer) {
//     currentLayer.renderer = originalRenderer;
//     getState().stateManager.setOriginalRenderer(currentLayer.id, null);
//   }

//   removeClassificationLegend();
//   showNotification("Classification reset", "success");
// }

// Remove classification legend
// function removeClassificationLegend() {
//   const legend = document.getElementById("classificationLegend");
//   if (legend) {
//     legend.remove();
//   }
// }

// Export classification functions
// window.applyClassification = applyClassification;
// window.resetClassification = resetClassification;
// window.removeClassificationLegend = removeClassificationLegend;

// ============================================================================
// COMMENTED OUT - Spatial Analysis System moved to js/tools/analysis-manager.js
// ============================================================================
// let analysisLayer = null;
// let distanceMeasurementActive = false;
// let distanceFeatures = [];

// ============================================================================
// COMMENTED OUT - initializeAnalysisLayer moved to js/tools/analysis-manager.js
// ============================================================================
// async function initializeAnalysisLayer() {
//   if (!analysisLayer) {
//     const [GraphicsLayer] = await Promise.all([
//       loadModule("esri/layers/GraphicsLayer"),
//     ]);

//     analysisLayer = new GraphicsLayer({
//       title: "Analysis Results",
//       listMode: "show",
//     });

//     displayMap.add(analysisLayer);
//   }
// }

// ============================================================================
// COMMENTED OUT - closeBufferModal moved to js/tools/analysis-manager.js
// ============================================================================
// Update closeBufferModal to have option to keep drawn features
// function closeBufferModal() {
//   // Ensure modal is restored
//   disableDrawingMode("bufferModal");

//   const modal = document.getElementById("bufferModal");
//   modal.classList.remove("drawing-active");
//   modal.classList.add("hidden");

//   // Cancel any active drawing
//   const { stateManager } = getState();
//   const sketchViewModel = stateManager.getSketchViewModel();
//   if (sketchViewModel) {
//     sketchViewModel.cancel();
//   }

//   // Remove drawing indicator if exists
//   const indicator = document.getElementById("drawingIndicator");
//   if (indicator) {
//     indicator.remove();
//   }

//   // Clean up handlers
//   if (window.currentBufferHandler) {
//     window.currentBufferHandler.remove();
//   }

//   stopAnalysisDrawing();
// }

// ============================================================================
// COMMENTED OUT - executeBuffer moved to js/tools/analysis-manager.js
// ============================================================================
// Update executeBuffer to keep the drawn features visible
// async function executeBuffer() {
//   const distance = parseFloat(document.getElementById("bufferDistance").value);
//   const unit = document.getElementById("bufferUnit").value;
//   const unionResults = document.getElementById("bufferUnion").checked;

//   if (!distance || distance <= 0) {
//     showNotification("Please enter a valid buffer distance", "error");
//     return;
//   }

//   try {
//     showNotification("Creating buffers...", "info");

//     const [geometryEngine, Graphic] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//       loadModule("esri/Graphic"),
//     ]);

//     let features = [];

//     // Find the active button more reliably
//     const modal = document.getElementById("bufferModal");
//     const activeButton = modal.querySelector(".button-group-item.active");
//     const isUsingLayer =
//       activeButton && activeButton.textContent.includes("From Layer");

//     console.log(
//       "Active button:",
//       activeButton?.textContent,
//       "Using layer:",
//       isUsingLayer
//     );

//     if (isUsingLayer) {
//       const layerIndex = document.getElementById("bufferLayerSelect").value;
//       if (layerIndex === "") {
//         showNotification("Please select a layer", "error");
//         return;
//       }

//       const layer = getState().stateManager.getUploadedLayers()[parseInt(layerIndex)];
//       const query = layer.createQuery();
//       query.where = "1=1";
//       query.returnGeometry = true;

//       const result = await layer.queryFeatures(query);
//       features = result.features;
//     } else {
//       if (getState().stateManager.getDrawnFeatures().buffer.length === 0) {
//         showNotification("Please draw at least one feature", "error");
//         return;
//       }
//       features = getState().stateManager.getDrawnFeatures().buffer;
//     }

//     // Convert distance to meters
//     let bufferDistance = distance;
//     switch (unit) {
//       case "kilometers":
//         bufferDistance = distance * 1000;
//         break;
//       case "feet":
//         bufferDistance = distance * 0.3048;
//         break;
//       case "miles":
//         bufferDistance = distance * 1609.34;
//         break;
//     }

//     // Create buffers
//     const buffers = [];
//     features.forEach((feature) => {
//       const buffer = geometryEngine.geodesicBuffer(
//         feature.geometry,
//         bufferDistance,
//         "meters"
//       );

//       if (buffer) {
//         buffers.push(buffer);
//       }
//     });

//     // Union buffers if requested
//     let finalGeometry;
//     if (unionResults && buffers.length > 1) {
//       finalGeometry = geometryEngine.union(buffers);
//     } else {
//       finalGeometry = buffers;
//     }

//     // Clear previous analysis results
//     analysisLayer.removeAll();

//     // Add buffer graphics
//     if (Array.isArray(finalGeometry)) {
//       finalGeometry.forEach((geom, index) => {
//         const graphic = new Graphic({
//           geometry: geom,
//           symbol: {
//             type: "simple-fill",
//             color: [255, 0, 0, 0.2],
//             outline: {
//               color: [255, 0, 0, 1],
//               width: 2,
//             },
//           },
//           attributes: {
//             type: "Buffer",
//             distance: `${distance} ${unit}`,
//             featureIndex: index,
//           },
//         });
//         analysisLayer.add(graphic);
//       });
//     } else {
//       const graphic = new Graphic({
//         geometry: finalGeometry,
//         symbol: {
//           type: "simple-fill",
//           color: [255, 0, 0, 0.2],
//           outline: {
//             color: [255, 0, 0, 1],
//             width: 2,
//           },
//         },
//         attributes: {
//           type: "Buffer",
//           distance: `${distance} ${unit}`,
//           union: true,
//         },
//       });
//       analysisLayer.add(graphic);
//     }

//     // Zoom to results
//     if (analysisLayer.graphics.length > 0) {
//       await view.goTo(analysisLayer.graphics);
//     }

//     closeBufferModal();
//     showNotification(
//       `Created ${analysisLayer.graphics.length} buffer(s)`,
//       "success"
//     );
//   } catch (error) {
//     console.error("Buffer analysis error:", error);
//     showNotification("Error creating buffers: " + error.message, "error");
//   }
// }

// Update intersection analysis to use the new modal
// async function startIntersectAnalysis() {
//   await initializeAnalysisLayer();

//   const modal = document.getElementById("intersectModal");

//   if (!modal) {
//     console.error("Intersect modal not found");
//     return;
//   }

//   // Reset drawn features
//   getState().stateManager.setIntersectFeature1(null);
//   getState().stateManager.setIntersectFeature2(null);

//   // Populate layer selects
//   const polygonLayers = getState().stateManager.getUploadedLayers().filter(
//     (layer) => layer.geometryType === "polygon"
//   );

//   ["intersectLayer1Select", "intersectLayer2Select"].forEach((selectId) => {
//     const select = document.getElementById(selectId);
//     if (select) {
//       select.innerHTML = '<option value="">Select a layer...</option>';

//       polygonLayers.forEach((layer, index) => {
//         const option = document.createElement("option");
//         option.value = index;
//         option.textContent = layer.title;
//         select.appendChild(option);
//       });
//     }
//   });

//   // Remove hidden class to show modal
//   modal.classList.remove("hidden");
//   console.log("Intersect modal opened");
// }

// window.debugModals = function () {
//   const bufferModal = document.getElementById("bufferModal");
//   const intersectModal = document.getElementById("intersectModal");

//   console.log("Buffer Modal:", {
//     exists: !!bufferModal,
//     classes: bufferModal?.className,
//     display: bufferModal ? window.getComputedStyle(bufferModal).display : "N/A",
//     visibility: bufferModal
//       ? window.getComputedStyle(bufferModal).visibility
//       : "N/A",
//     zIndex: bufferModal ? window.getComputedStyle(bufferModal).zIndex : "N/A",
//   });

//   console.log("Intersect Modal:", {
//     exists: !!intersectModal,
//     classes: intersectModal?.className,
//     display: intersectModal
//       ? window.getComputedStyle(intersectModal).display
//       : "N/A",
//     visibility: intersectModal
//       ? window.getComputedStyle(intersectModal).visibility
//       : "N/A",
//     zIndex: intersectModal
//       ? window.getComputedStyle(intersectModal).zIndex
//       : "N/A",
//   });
// };
// Update closeIntersectModal to properly clean up
// function closeIntersectModal() {
//   const modal = document.getElementById("intersectModal");
//   modal.classList.remove("drawing-active");
//   modal.classList.add("hidden");

//   // Cancel any active drawing
//   const { stateManager } = getState();
//   const sketchViewModel = stateManager.getSketchViewModel();
//   if (sketchViewModel) {
//     sketchViewModel.cancel();
//   }

//   // Remove drawing indicator if exists
//   const indicator = document.getElementById("intersectDrawingIndicator");
//   if (indicator) {
//     indicator.remove();
//   }

//   // Clean up handlers
//   if (window.intersectDrawHandler) {
//     window.intersectDrawHandler.remove();
//   }

//   stopAnalysisDrawing();

//   // Clear drawn features if user wants
//   if (getState().stateManager.getDrawnFeatures().intersect1) {
//     getState().stateManager.getDrawLayer().remove(getState().stateManager.getDrawnFeatures().intersect1);
//     getState().stateManager.setIntersectFeature1(null);
//   }
//   if (getState().stateManager.getDrawnFeatures().intersect2) {
//     getState().stateManager.getDrawLayer().remove(getState().stateManager.getDrawnFeatures().intersect2);
//     getState().stateManager.setIntersectFeature2(null);
//   }
// }

// Fix setIntersectSource with proper event handling
// function setIntersectSource (featureNum, source) {
//   // Find the correct section in the modal
//   const modal = document.getElementById("intersectModal");
//   const sections = modal.querySelectorAll(".feature-section");
//   const targetSection = sections[featureNum - 1];

//   if (!targetSection) {
//     console.error("Could not find feature section for feature", featureNum);
//     return;
//   }

//   // Update button states within this section
//   const buttons = targetSection.querySelectorAll(".button-group-item");
//   buttons.forEach((btn) => {
//     btn.classList.remove("active");
//   });

//   // Find and activate the correct button
//   const activeButton = Array.from(buttons).find((btn) => {
//     const buttonText = btn.textContent.toLowerCase();
//     return (
//       (source === "layer" && buttonText.includes("layer")) ||
//       (source === "draw" && buttonText.includes("draw"))
//     );
//   });

//   if (activeButton) {
//     activeButton.classList.add("active");
//   }

//   // Show/hide sections
//   const layerSection = document.getElementById(
//     `intersectLayer${featureNum}Section`
//   );
//   const drawSection = document.getElementById(
//     `intersectDraw${featureNum}Section`
//   );

//   if (layerSection && drawSection) {
//     if (source === "layer") {
//       layerSection.style.display = "block";
//       drawSection.style.display = "none";
//     } else {
//       layerSection.style.display = "none";
//       drawSection.style.display = "block";
//     }
//   }
// };

// Intersection drawing using existing sketch
// async function startIntersectDrawing(featureNum) {
//   // Add drawing mode to modal
//   const modal = document.getElementById("intersectModal");
//   modal.classList.add("drawing-active");

//   const { stateManager, drawingManager } = getState();
//   let sketchViewModel = stateManager.getSketchViewModel();

//   if (!sketchViewModel) {
//     sketchViewModel = await drawingManager.initializeSketchViewModel();
//   }

//   // Clear previous drawing for this feature
//   if (featureNum === 1 && stateManager.getDrawnFeatures().intersect1) {
//     stateManager.getDrawLayer().remove(stateManager.getDrawnFeatures().intersect1);
//     stateManager.setIntersectFeature1(null);
//   } else if (featureNum === 2 && stateManager.getDrawnFeatures().intersect2) {
//     stateManager.getDrawLayer().remove(stateManager.getDrawnFeatures().intersect2);
//     stateManager.setIntersectFeature2(null);
//   }

//   // Set custom symbology for intersection polygons
//   const color = featureNum === 1 ? [255, 0, 0] : [0, 0, 255];
//   sketchViewModel.polygonSymbol = {
//     type: "simple-fill",
//     color: [...color, 0.3],
//     outline: {
//       color: [...color, 1],
//       width: 2,
//     },
//   };

//   // Create drawing indicator
//   if (!document.getElementById("intersectDrawingIndicator")) {
//     const indicator = document.createElement("div");
//     indicator.id = "intersectDrawingIndicator";
//     indicator.style.cssText = `
//       position: fixed;
//       top: 20px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: var(--primary-color);
//       color: white;
//       padding: 12px 24px;
//       border-radius: 8px;
//       box-shadow: var(--shadow-lg);
//       z-index: 2000;
//       display: flex;
//       align-items: center;
//       gap: 8px;
//     `;
//     document.body.appendChild(indicator);
//   }

//   const indicator = document.getElementById("intersectDrawingIndicator");
//   indicator.innerHTML = `
//     <i class="fas fa-draw-polygon"></i>
//     <span>Drawing polygon ${featureNum}. Click to add vertices, double-click to complete.</span>
//     <button onclick="cancelIntersectDrawing()" style="
//       background: white;
//       color: var(--primary-color);
//       border: none;
//       padding: 4px 8px;
//       border-radius: 4px;
//       margin-left: 12px;
//       cursor: pointer;
//     ">Cancel</button>
//   `;

//   // Clear previous handler
//   if (window.intersectDrawHandler) {
//     window.intersectDrawHandler.remove();
//   }

//   // Set up one-time event listener
//   window.intersectDrawHandler = sketchViewModel.on("create", (event) => {
//     if (event.state === "complete") {
//       // Remove drawing mode
//       modal.classList.remove("drawing-active");

//       if (featureNum === 1) {
//         getState().stateManager.setIntersectFeature1(event.graphic);
//         document.querySelector("#intersectDraw1Section button").innerHTML =
//           '<i class="fas fa-edit"></i> Redraw First Polygon';
//       } else {
//         getState().stateManager.setIntersectFeature2(event.graphic);
//         document.querySelector("#intersectDraw2Section button").innerHTML =
//           '<i class="fas fa-edit"></i> Redraw Second Polygon';
//       }

//       // Remove indicator
//       const indicatorEl = document.getElementById("intersectDrawingIndicator");
//       if (indicatorEl) {
//         indicatorEl.remove();
//       }

//       showNotification(`Polygon ${featureNum} drawn successfully`, "success");

//       // Remove handler
//       window.intersectDrawHandler.remove();
//     }
//   });

//   // Start drawing polygon
//   sketchViewModel.create("polygon");
// }

// Update cancel function
// function cancelIntersectDrawing () {
//   const modal = document.getElementById("intersectModal");
//   modal.classList.remove("drawing-active");

//   const { stateManager } = getState();
//   const sketchViewModel = stateManager.getSketchViewModel();
//   if (sketchViewModel) {
//     sketchViewModel.cancel();
//   }

//   const indicator = document.getElementById("intersectDrawingIndicator");
//   if (indicator) {
//     indicator.remove();
//   }

//   if (window.intersectDrawHandler) {
//     window.intersectDrawHandler.remove();
//   }
// };

// Update executeIntersection to show non-intersecting parts
// async function executeIntersection() {
//   try {
//     showNotification("Performing intersection analysis...", "info");

//     const [geometryEngine, Graphic] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//       loadModule("esri/Graphic"),
//     ]);

//     let features1 = [];
//     let features2 = [];

//     // Get modal and find active buttons correctly
//     const modal = document.getElementById("intersectModal");
//     const featureSections = modal.querySelectorAll(".feature-section");

//     // Check first feature source
//     const firstSectionButtons =
//       featureSections[0].querySelectorAll(".button-group-item");
//     const source1ActiveBtn = Array.from(firstSectionButtons).find((btn) =>
//       btn.classList.contains("active")
//     );
//     const source1IsLayer =
//       source1ActiveBtn && source1ActiveBtn.textContent.includes("From Layer");

//     console.log(
//       "Source 1 - Active button:",
//       source1ActiveBtn?.textContent,
//       "Is layer:",
//       source1IsLayer
//     );

//     if (source1IsLayer) {
//       const layerIndex = document.getElementById("intersectLayer1Select").value;
//       if (layerIndex === "") {
//         showNotification("Please select first layer", "error");
//         return;
//       }

//       const polygonLayers = getState().stateManager.getUploadedLayers().filter(
//         (layer) => layer.geometryType === "polygon"
//       );
//       const layer = polygonLayers[parseInt(layerIndex)];

//       const query = layer.createQuery();
//       query.where = "1=1";
//       query.returnGeometry = true;

//       const result = await layer.queryFeatures(query);
//       features1 = result.features;
//     } else {
//       if (!getState().stateManager.getDrawnFeatures().intersect1) {
//         showNotification("Please draw the first polygon", "error");
//         return;
//       }
//       features1 = [getState().stateManager.getDrawnFeatures().intersect1];
//     }

//     // Check second feature source
//     const secondSectionButtons =
//       featureSections[1].querySelectorAll(".button-group-item");
//     const source2ActiveBtn = Array.from(secondSectionButtons).find((btn) =>
//       btn.classList.contains("active")
//     );
//     const source2IsLayer =
//       source2ActiveBtn && source2ActiveBtn.textContent.includes("From Layer");

//     console.log(
//       "Source 2 - Active button:",
//       source2ActiveBtn?.textContent,
//       "Is layer:",
//       source2IsLayer
//     );

//     if (source2IsLayer) {
//       const layerIndex = document.getElementById("intersectLayer2Select").value;
//       if (layerIndex === "") {
//         showNotification("Please select second layer", "error");
//         return;
//       }

//       const polygonLayers = getState().stateManager.getUploadedLayers().filter(
//         (layer) => layer.geometryType === "polygon"
//       );
//       const layer = polygonLayers[parseInt(layerIndex)];

//       const query = layer.createQuery();
//       query.where = "1=1";
//       query.returnGeometry = true;

//       const result = await layer.queryFeatures(query);
//       features2 = result.features;
//     } else {
//       if (!getState().stateManager.getDrawnFeatures().intersect2) {
//         showNotification("Please draw the second polygon", "error");
//         return;
//       }
//       features2 = [getState().stateManager.getDrawnFeatures().intersect2];
//     }

//     // Clear previous results
//     analysisLayer.removeAll();

//     // Check if user wants to keep non-intersecting parts
//     const keepNonIntersecting = document.getElementById(
//       "keepNonIntersecting"
//     ).checked;

//     // Perform intersection and difference analysis
//     let intersectionCount = 0;
//     let allIntersections = [];
//     let allFeatures1 = [];
//     let allFeatures2 = [];

//     // Collect all geometries for union later
//     features1.forEach((feature) => allFeatures1.push(feature.geometry));
//     features2.forEach((feature) => allFeatures2.push(feature.geometry));

//     // Perform intersections
//     features1.forEach((feature1) => {
//       features2.forEach((feature2) => {
//         const intersection = geometryEngine.intersect(
//           feature1.geometry,
//           feature2.geometry
//         );

//         if (intersection) {
//           allIntersections.push(intersection);

//           // Add intersection graphic
//           const graphic = new Graphic({
//             geometry: intersection,
//             symbol: {
//               type: "simple-fill",
//               color: [0, 255, 0, 0.5],
//               outline: {
//                 color: [0, 150, 0, 1],
//                 width: 3,
//               },
//             },
//             attributes: {
//               type: "Intersection",
//               analysisType: "Intersecting Area",
//               source1: source1IsLayer ? "Layer" : "Drawn",
//               source2: source2IsLayer ? "Layer" : "Drawn",
//             },
//           });
//           analysisLayer.add(graphic);
//           intersectionCount++;
//         }
//       });
//     });

//     // If user wants non-intersecting parts
//     if (keepNonIntersecting && allIntersections.length > 0) {
//       // Union all intersections
//       let unionedIntersections =
//         allIntersections.length > 1
//           ? geometryEngine.union(allIntersections)
//           : allIntersections[0];

//       // Calculate non-intersecting parts for features1
//       features1.forEach((feature1, index) => {
//         try {
//           const difference = geometryEngine.difference(
//             feature1.geometry,
//             unionedIntersections
//           );
//           if (difference) {
//             const graphic = new Graphic({
//               geometry: difference,
//               symbol: {
//                 type: "simple-fill",
//                 color: [255, 0, 0, 0.3],
//                 outline: {
//                   color: [200, 0, 0, 0.8],
//                   width: 2,
//                   style: "dash",
//                 },
//               },
//               attributes: {
//                 type: "Non-Intersection",
//                 analysisType: "Non-Intersecting Area (Set 1)",
//                 featureIndex: index,
//                 source: source1IsLayer ? "Layer 1" : "Drawn 1",
//               },
//             });
//             analysisLayer.add(graphic);
//           }
//         } catch (e) {
//           console.warn("Error calculating difference for feature1:", e);
//         }
//       });

//       // Calculate non-intersecting parts for features2
//       features2.forEach((feature2, index) => {
//         try {
//           const difference = geometryEngine.difference(
//             feature2.geometry,
//             unionedIntersections
//           );
//           if (difference) {
//             const graphic = new Graphic({
//               geometry: difference,
//               symbol: {
//                 type: "simple-fill",
//                 color: [0, 0, 255, 0.3],
//                 outline: {
//                   color: [0, 0, 200, 0.8],
//                   width: 2,
//                   style: "dash",
//                 },
//               },
//               attributes: {
//                 type: "Non-Intersection",
//                 analysisType: "Non-Intersecting Area (Set 2)",
//                 featureIndex: index,
//                 source: source2IsLayer ? "Layer 2" : "Drawn 2",
//               },
//             });
//             analysisLayer.add(graphic);
//           }
//         } catch (e) {
//           console.warn("Error calculating difference for feature2:", e);
//         }
//       });
//     }

//     // Clear drawn features from draw layer
//     if (!source1IsLayer && getState().stateManager.getDrawnFeatures().intersect1) {
//       getState().stateManager.getDrawLayer().remove(getState().stateManager.getDrawnFeatures().intersect1);
//     }
//     if (!source2IsLayer && getState().stateManager.getDrawnFeatures().intersect2) {
//       getState().stateManager.getDrawLayer().remove(getState().stateManager.getDrawnFeatures().intersect2);
//     }

//     // Report results
//     if (intersectionCount > 0) {
//       await view.goTo(analysisLayer.graphics);

//       let message = `Found ${intersectionCount} intersection(s)`;
//       if (keepNonIntersecting) {
//         const totalGraphics = analysisLayer.graphics.length;
//         const nonIntersectingCount = totalGraphics - intersectionCount;
//         message += ` and ${nonIntersectingCount} non-intersecting area(s)`;
//       }
//       showNotification(message, "success");

//       // Update layer list to show breakdown
//       updateLayerList();
//     } else {
//       showNotification("No intersections found", "info");

//       // If no intersections but user wants to see non-intersecting parts, show original polygons
//       if (keepNonIntersecting) {
//         features1.forEach((feature, index) => {
//           const graphic = new Graphic({
//             geometry: feature.geometry,
//             symbol: {
//               type: "simple-fill",
//               color: [255, 0, 0, 0.3],
//               outline: {
//                 color: [200, 0, 0, 0.8],
//                 width: 2,
//                 style: "dash",
//               },
//             },
//             attributes: {
//               type: "Non-Intersection",
//               analysisType: "Original Polygon (Set 1)",
//               featureIndex: index,
//             },
//           });
//           analysisLayer.add(graphic);
//         });

//         features2.forEach((feature, index) => {
//           const graphic = new Graphic({
//             geometry: feature.geometry,
//             symbol: {
//               type: "simple-fill",
//               color: [0, 0, 255, 0.3],
//               outline: {
//                 color: [0, 0, 200, 0.8],
//                 width: 2,
//                 style: "dash",
//               },
//             },
//             attributes: {
//               type: "Non-Intersection",
//               analysisType: "Original Polygon (Set 2)",
//               featureIndex: index,
//             },
//           });
//           analysisLayer.add(graphic);
//         });

//         await view.goTo(analysisLayer.graphics);
//       }
//     }

//     closeIntersectModal();
//   } catch (error) {
//     console.error("Intersection error:", error);
//     showNotification("Error performing intersection", "error");
//   }
// }

// async function performIntersection(layer1, layer2) {
//   try {
//     showNotification("Performing intersection analysis...", "info");

//     const [geometryEngine, Graphic] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//       loadModule("esri/Graphic"),
//     ]);

//     // Query features from both layers
//     const query1 = layer1.createQuery();
//     query1.where = "1=1";
//     query1.returnGeometry = true;

//     const query2 = layer2.createQuery();
//     query2.where = "1=1";
//     query2.returnGeometry = true;

//     const [result1, result2] = await Promise.all([
//       layer1.queryFeatures(query1),
//       layer2.queryFeatures(query2),
//     ]);

//     // Clear previous results
//     analysisLayer.removeAll();

//     // Perform intersection
//     let intersectionCount = 0;
//     result1.features.forEach((feature1) => {
//       result2.features.forEach((feature2) => {
//         const intersection = geometryEngine.intersect(
//           feature1.geometry,
//           feature2.geometry
//         );

//         if (intersection) {
//           const graphic = new Graphic({
//             geometry: intersection,
//             symbol: {
//               type: "simple-fill",
//               color: [0, 255, 0, 0.4],
//               outline: {
//                 color: [0, 150, 0, 1],
//                 width: 2,
//               },
//             },
//             attributes: {
//               type: "Intersection",
//               layer1: layer1.title,
//               layer2: layer2.title,
//             },
//           });
//           analysisLayer.add(graphic);
//           intersectionCount++;
//         }
//       });
//     });

//     if (intersectionCount > 0) {
//       await view.goTo(analysisLayer.graphics);
//       showNotification(`Found ${intersectionCount} intersections`, "success");
//     } else {
//       showNotification("No intersections found", "info");
//     }
//   } catch (error) {
//     console.error("Intersection error:", error);
//     showNotification("Error performing intersection", "error");
//   }
// }

// Update distance analysis to support drawing

// async function startDistanceAnalysis() {
//   await initializeAnalysisLayer();

//   const panel = document.getElementById("distancePanel");
//   if (!panel) return;

//   panel.classList.remove("hidden");

//   // Reset the panel content with both options
//   const panelContent = panel.querySelector(".widget-content");
//   panelContent.innerHTML = `
//     <div class="button-group" style="margin-bottom: 12px;">
//       <button class="button-group-item active" onclick="window.setDistanceSource('select')">
//         <i class="fas fa-mouse-pointer"></i> Select Features
//       </button>
//       <button class="button-group-item" onclick="window.setDistanceSource('draw')">
//         <i class="fas fa-map-marker-alt"></i> Draw Points
//       </button>
//     </div>
//     <p class="help-text" id="distanceHelp">Click on two features to measure distance</p>
//     <div id="distanceResult" class="analysis-result"></div>
//     <button class="action-btn secondary" onclick="clearDistanceMeasurement()">
//       Clear Measurement
//     </button>
//   `;

//   distanceMeasurementActive = true;
//   distanceFeatures = [];

//   // Set up click handler for feature selection
//   if (window.distanceClickHandler) {
//     window.distanceClickHandler.remove();
//   }

//   window.distanceClickHandler = view.on("click", handleDistanceClick);
//   view.container.style.cursor = "crosshair";
// }

// Fix setDistanceSource function
// async function setDistanceSource (source) {
//   const buttons = document.querySelectorAll(
//     "#distancePanel .button-group-item"
//   );
//   buttons.forEach((btn) => btn.classList.remove("active"));

//   // Find and activate the clicked button
//   const activeButton = Array.from(buttons).find((btn) =>
//     btn.getAttribute("onclick").includes(source)
//   );
//   if (activeButton) {
//     activeButton.classList.add("active");
//   }

//   const helpText = document.getElementById("distanceHelp");
//   distanceFeatures = [];

//   // Clear any existing graphics
//   const distanceGraphics = analysisLayer.graphics.filter(
//     (g) => g.attributes && g.attributes.type === "Distance Measurement"
//   );
//   analysisLayer.removeMany(distanceGraphics.toArray());

//   if (source === "draw") {
//     helpText.textContent =
//       "Click on map to place two points for distance measurement";

//     // Remove click handler for feature selection
//     if (window.distanceClickHandler) {
//       window.distanceClickHandler.remove();
//     }

//     // Initialize sketch for point drawing
//     const { stateManager } = getState();
//     let sketchViewModel = stateManager.getSketchViewModel();
//     if (!sketchViewModel) {
//       sketchViewModel = await initializeSketchViewModel();
//     }

//     // Clear any previous distance drawing handler
//     if (window.distanceDrawHandler) {
//       window.distanceDrawHandler.remove();
//     }

//     let pointCount = 0;
//     const tempPoints = [];

//     // Set point symbol for distance measurement
//     sketchViewModel.pointSymbol = {
//       type: "simple-marker",
//       style: "circle",
//       color: [255, 0, 255, 0.8],
//       size: 12,
//       outline: {
//         color: [255, 255, 255, 1],
//         width: 2,
//       },
//     };

//     window.distanceDrawHandler = sketchViewModel.on("create", async (event) => {
//       if (event.state === "complete" && event.tool === "point") {
//         tempPoints.push(event.graphic);
//         pointCount++;

//         if (pointCount === 1) {
//           helpText.textContent = "Click to place the second point";
//           // Start drawing another point
//           sketchViewModel.create("point");
//         } else if (pointCount === 2) {
//           // Calculate distance using the two points
//           distanceFeatures = tempPoints;
//           await calculateDistance();

//           // Clean up
//           window.distanceDrawHandler.remove();
//           view.container.style.cursor = "default";
//           helpText.textContent = "Distance calculated";
//         }
//       }
//     });

//     // Start drawing first point
//     sketchViewModel.create("point");
//   } else {
//     helpText.textContent = "Click on two features to measure distance";

//     // Remove drawing handler
//     if (window.distanceDrawHandler) {
//       window.distanceDrawHandler.remove();
//     }

//     // Re-enable click handler for feature selection
//     if (window.distanceClickHandler) {
//       window.distanceClickHandler.remove();
//     }
//     window.distanceClickHandler = view.on("click", handleDistanceClick);
//   }
// };

// Update handleDistanceClick to ensure it continues working:
// async function handleDistanceClick(event) {
//   if (!distanceMeasurementActive) return;

//   const response = await view.hitTest(event);
//   const results = response.results.filter(
//     (r) => r.graphic && r.graphic.layer && r.graphic.geometry
//   );

//   if (results.length > 0) {
//     // Add visual indicator for selected feature
//     const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

//     const selectedGraphic = new Graphic({
//       geometry: results[0].graphic.geometry,
//       symbol: {
//         type:
//           results[0].graphic.geometry.type === "point"
//             ? "simple-marker"
//             : "simple-fill",
//         color: [255, 0, 255, 0.3],
//         outline: {
//           color: [255, 0, 255, 1],
//           width: 2,
//         },
//       },
//       attributes: {
//         type: "Distance Selection",
//       },
//     });

//     view.graphics.add(selectedGraphic);
//     distanceFeatures.push(results[0].graphic);

//     if (distanceFeatures.length === 1) {
//       showNotification(
//         "First feature selected. Click another feature.",
//         "info"
//       );
//     } else if (distanceFeatures.length === 2) {
//       // Clear selection graphics
//       const selectionGraphics = view.graphics.items.filter(
//         (g) => g.attributes && g.attributes.type === "Distance Selection"
//       );
//       view.graphics.removeMany(selectionGraphics);

//       calculateDistance();
//     }
//   }
// }

// async function calculateDistance() {
//   try {
//     const [geometryEngine, Graphic, Polyline] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//       loadModule("esri/Graphic"),
//       loadModule("esri/geometry/Polyline"),
//     ]);

//     const geom1 = distanceFeatures[0].geometry;
//     const geom2 = distanceFeatures[1].geometry;

//     // Get centroids for non-point geometries
//     const point1 =
//       geom1.type === "point" ? geom1 : geom1.centroid || geom1.extent.center;
//     const point2 =
//       geom2.type === "point" ? geom2 : geom2.centroid || geom2.extent.center;

//     // Calculate distance
//     const distance = geometryEngine.geodesicLength(
//       new Polyline({
//         paths: [
//           [
//             [point1.x, point1.y],
//             [point2.x, point2.y],
//           ],
//         ],
//         spatialReference: view.spatialReference,
//       }),
//       "meters"
//     );

//     // Display result
//     let distanceText;
//     if (distance > 1000) {
//       distanceText = `${(distance / 1000).toFixed(2)} km`;
//     } else {
//       distanceText = `${distance.toFixed(2)} m`;
//     }

//     document.getElementById("distanceResult").innerHTML = `
//       <strong>Distance:</strong> ${distanceText}
//     `;

//     // Clear previous distance lines
//     const previousLines = analysisLayer.graphics.filter(
//       (g) => g.attributes && g.attributes.type === "Distance Measurement"
//     );
//     analysisLayer.removeMany(previousLines.toArray());

//     // Draw line between features
//     const line = new Polyline({
//       paths: [
//         [
//           [point1.x, point1.y],
//           [point2.x, point2.y],
//         ],
//       ],
//       spatialReference: view.spatialReference,
//     });

//     const lineGraphic = new Graphic({
//       geometry: line,
//       symbol: {
//         type: "simple-line",
//         color: [255, 0, 255, 1],
//         width: 3,
//         style: "dash",
//       },
//       attributes: {
//         type: "Distance Measurement",
//         distance: distanceText,
//       },
//     });

//     analysisLayer.add(lineGraphic);

//     // Reset for next measurement
//     distanceFeatures = [];
//     distanceMeasurementActive = true; // Keep active for continuous measurement

//     // Update help text
//     const helpText = document.getElementById("distanceHelp");
//     if (helpText) {
//       helpText.textContent =
//         "Distance calculated. Click two more features to measure again.";
//     }
//   } catch (error) {
//     console.error("Distance calculation error:", error);
//     showNotification("Error calculating distance", "error");
//   }
// }

// function closeDistancePanel() {
//   document.getElementById("distancePanel").classList.add("hidden");
//   clearDistanceMeasurement();
// }

// function clearDistanceMeasurement() {
//   distanceMeasurementActive = false;
//   distanceFeatures = [];
//   view.container.style.cursor = "default";
//   document.getElementById("distanceResult").innerHTML = "";

//   // Remove distance lines from analysis layer
//   const distanceGraphics = analysisLayer.graphics.filter(
//     (g) => g.attributes && g.attributes.type === "Distance Measurement"
//   );
//   analysisLayer.removeMany(distanceGraphics.toArray());
// }

// Area Analysis
// async function startAreaAnalysis() {
//   await initializeAnalysisLayer();

//   const polygonLayers = getState().stateManager.getUploadedLayers().filter(
//     (layer) =>
//       layer.geometryType === "polygon" ||
//       (layer.graphics &&
//         layer.graphics.length > 0 &&
//         layer.graphics.getItemAt(0).geometry.type === "polygon")
//   );

//   if (polygonLayers.length === 0) {
//     showNotification("No polygon layers found", "error");
//     return;
//   }

//   try {
//     const [geometryEngine] = await Promise.all([
//       loadModule("esri/geometry/geometryEngine"),
//     ]);

//     let totalArea = 0;
//     let featureCount = 0;

//     for (const layer of polygonLayers) {
//       const query = layer.createQuery();
//       query.where = "1=1";
//       query.returnGeometry = true;

//       const result = await layer.queryFeatures(query);

//       result.features.forEach((feature) => {
//         if (feature.geometry && feature.geometry.type === "polygon") {
//           const area = geometryEngine.geodesicArea(
//             feature.geometry,
//             "square-meters"
//           );
//           totalArea += Math.abs(area);
//           featureCount++;
//         }
//       });
//     }

//     // Display results
//     let areaText;
//     if (totalArea > 1000000) {
//       areaText = `${(totalArea / 1000000).toFixed(2)} km²`;
//     } else if (totalArea > 10000) {
//       areaText = `${(totalArea / 10000).toFixed(2)} hectares`;
//     } else {
//       areaText = `${totalArea.toFixed(2)} m²`;
//     }

//     showNotification(
//       `Total area of ${featureCount} polygons: ${areaText}`,
//       "success"
//     );
//   } catch (error) {
//     console.error("Area calculation error:", error);
//     showNotification("Error calculating area", "error");
//   }
// }

// Time-Aware Features System
// let timeSlider = null;
// let timeAnimation = null;
// let timeEnabledLayer = null;

// async function toggleTimeControls() {
//   const toggle = document.getElementById("timeToggle");
//   const panel = document.getElementById("timeControlsPanel");

//   if (toggle.checked) {
//     panel.style.display = "block";
//     initializeTimeLayerSelect();
//   } else {
//     panel.style.display = "none";
//     if (timeSlider) {
//       destroyTimeSlider();
//     }
//   }
// }

// function initializeTimeLayerSelect() {
//   const select = document.getElementById("timeLayerSelect");
//   select.innerHTML = '<option value="">Select time-enabled layer...</option>';

//   // Continue script.js - Complete time-aware features implementation

//   getState()
//     .stateManager.getUploadedLayers()
//     .forEach((layer, index) => {
//       const option = document.createElement("option");
//       option.value = index;
//       option.textContent = layer.title;
//       select.appendChild(option);
//     });

//   select.addEventListener("change", async (e) => {
//     if (e.target.value !== "") {
//       await setupTimeFields(parseInt(e.target.value));
//     }
//   });
// }

// async function setupTimeFields(layerIndex) {
//   const layer = getState().stateManager.getUploadedLayers()[layerIndex];
//   timeEnabledLayer = layer;

//   const fieldSelect = document.getElementById("timeFieldSelect");
//   const fieldContainer = document.querySelector(".time-field-select");

//   fieldSelect.innerHTML = '<option value="">Select date field...</option>';

//   // Get date fields
//   if (layer.fields) {
//     const dateFields = layer.fields.filter(
//       (field) =>
//         field.type === "date" ||
//         field.name.toLowerCase().includes("date") ||
//         field.name.toLowerCase().includes("time")
//     );

//     if (dateFields.length === 0) {
//       // If no date fields, check all fields for date-like values
//       layer.fields.forEach((field) => {
//         const option = document.createElement("option");
//         option.value = field.name;
//         option.textContent = formatFieldName(field.name);
//         fieldSelect.appendChild(option);
//       });
//     } else {
//       dateFields.forEach((field) => {
//         const option = document.createElement("option");
//         option.value = field.name;
//         option.textContent = formatFieldName(field.name);
//         fieldSelect.appendChild(option);
//       });
//     }
//   }

//   fieldContainer.style.display = "block";

//   fieldSelect.addEventListener("change", async (e) => {
//     if (e.target.value !== "") {
//       await createTimeSlider(layer, e.target.value);
//     }
//   });
// }

// async function createTimeSlider(layer, dateField) {
//   try {
//     const [TimeSlider] = await Promise.all([
//       loadModule("esri/widgets/TimeSlider"),
//     ]);

//     // Query to get date range
//     const query = layer.createQuery();
//     query.where = "1=1";
//     query.outFields = [dateField];

//     const result = await layer.queryFeatures(query);

//     // Get min and max dates
//     let minDate = null;
//     let maxDate = null;

//     result.features.forEach((feature) => {
//       const dateValue = feature.attributes[dateField];
//       if (dateValue) {
//         const date = new Date(dateValue);
//         if (!isNaN(date.getTime())) {
//           if (!minDate || date < minDate) minDate = date;
//           if (!maxDate || date > maxDate) maxDate = date;
//         }
//       }
//     });

//     if (!minDate || !maxDate) {
//       showNotification("No valid dates found in selected field", "error");
//       return;
//     }

//     // Destroy existing time slider
//     if (timeSlider) {
//       destroyTimeSlider();
//     }

//     // Create time slider
//     timeSlider = new TimeSlider({
//       container: "timeSliderDiv",
//       mode: "time-window",
//       fullTimeExtent: {
//         start: minDate,
//         end: maxDate,
//       },
//       timeExtent: {
//         start: minDate,
//         end: maxDate,
//       },
//       stops: {
//         interval: {
//           value: 1,
//           unit: "days",
//         },
//       },
//     });

//     // Apply time filter to layer
//     timeSlider.watch("timeExtent", (timeExtent) => {
//       if (timeEnabledLayer && timeExtent) {
//         const startTime = timeExtent.start.getTime();
//         const endTime = timeExtent.end.getTime();

//         // Create definition expression
//         const definitionExpression = `${dateField} >= ${startTime} AND ${dateField} <= ${endTime}`;
//         timeEnabledLayer.definitionExpression = definitionExpression;
//       }
//     });

//     document.querySelector(".time-slider-container").style.display = "block";
//     showNotification("Time slider created successfully", "success");
//   } catch (error) {
//     console.error("Time slider error:", error);
//     showNotification("Error creating time slider", "error");
//   }
// }

// function destroyTimeSlider() {
//   if (timeSlider) {
//     timeSlider.destroy();
//     timeSlider = null;
//   }

//   if (timeEnabledLayer) {
//     timeEnabledLayer.definitionExpression = null;
//     timeEnabledLayer = null;
//   }

//   if (timeAnimation) {
//     clearInterval(timeAnimation);
//     timeAnimation = null;
//   }

//   document.querySelector(".time-slider-container").style.display = "none";
// }

// Time Animation Controls
// function playTimeAnimation() {
//   if (!timeSlider) return;

//   const playIcon = document.getElementById("playIcon");
//   const speed = parseFloat(document.getElementById("animationSpeed").value);

//   if (timeAnimation) {
//     // Pause
//     clearInterval(timeAnimation);
//     timeAnimation = null;
//     playIcon.className = "fas fa-play";
//   } else {
//     // Play
//     playIcon.className = "fas fa-pause";

//     const fullExtent = timeSlider.fullTimeExtent;
//     const interval = timeSlider.stops.interval;
//     const animationDelay = 1000 / speed; // milliseconds

//     timeAnimation = setInterval(() => {
//       const currentEnd = timeSlider.timeExtent.end;
//       const nextEnd = new Date(
//         currentEnd.getTime() + interval.value * 86400000
//       ); // Convert days to ms

//       if (nextEnd <= fullExtent.end) {
//         timeSlider.timeExtent = {
//           start: timeSlider.timeExtent.start,
//           end: nextEnd,
//         };
//       } else {
//         // Loop back to start
//         timeSlider.timeExtent = {
//           start: fullExtent.start,
//           end: new Date(
//             fullExtent.start.getTime() +
//               (currentEnd - timeSlider.timeExtent.start)
//           ),
//         };
//       }
//     }, animationDelay);
//   }
// }

// function stopTimeAnimation() {
//   if (timeAnimation) {
//     clearInterval(timeAnimation);
//     timeAnimation = null;
//     document.getElementById("playIcon").className = "fas fa-play";
//   }

//   // Reset to full extent
//   if (timeSlider) {
//     timeSlider.timeExtent = timeSlider.fullTimeExtent;
//   }
// }

// Export spatial analysis functions
// window.startBufferAnalysis = startBufferAnalysis;
// window.closeBufferModal = closeBufferModal;
// window.executeBuffer = executeBuffer;
// window.startIntersectAnalysis = startIntersectAnalysis;
// window.startDistanceAnalysis = startDistanceAnalysis;
// window.closeDistancePanel = closeDistancePanel;
// window.clearDistanceMeasurement = clearDistanceMeasurement;
// window.startAreaAnalysis = startAreaAnalysis;

// Export time control functions
// window.toggleTimeControls = toggleTimeControls;
// window.playTimeAnimation = playTimeAnimation;
// window.stopTimeAnimation = stopTimeAnimation;

// ============================================================================
// COMMENTED OUT - updateLayerList moved to js/layers/layer-manager.js
// ============================================================================
// Update layer list to include analysis layer
// const originalUpdateLayerList3 = updateLayerList;
// updateLayerList = function () {
//   originalUpdateLayerList3();

//   // Add analysis layer to layer list if it exists and has graphics
//   if (analysisLayer && analysisLayer.graphics.length > 0) {
//     const layerList = document.getElementById("layerList");
//     const analysisItem = document.createElement("div");
//     analysisItem.className = "layer-item";
//     analysisItem.innerHTML = `
//       <input type="checkbox" class="layer-checkbox"
//              ${analysisLayer.visible ? "checked" : ""}
//              onchange="analysisLayer.visible = this.checked">
//       <label class="layer-name">Analysis Results (${analysisLayer.graphics.length
//       })</label>
//       <div class="layer-actions">
//         <button onclick="clearAnalysisResults()" title="Clear results">
//           <i class="fas fa-trash"></i>
//         </button>
//       </div>
//     `;
//     layerList.appendChild(analysisItem);
//   }
// };
// ============================================================================

// Clear analysis results
// function clearAnalysisResults() {
//   if (analysisLayer) {
//     analysisLayer.removeAll();
//     updateLayerList();
//     showNotification("Analysis results cleared", "success");
//   }
// }

// window.clearAnalysisResults = clearAnalysisResults;

// Buffer Analysis with Drawing
// async function startBufferAnalysis() {
//   await initializeAnalysisLayer();

//   const modal = document.getElementById("bufferModal");
//   const select = document.getElementById("bufferLayerSelect");

//   // Make sure modal exists
//   if (!modal) {
//     console.error("Buffer modal not found");
//     return;
//   }

//   // Reset drawn features
//   getState().stateManager.clearDrawnFeatures();

//   // Populate layer select
//   select.innerHTML = '<option value="">Select a layer...</option>';
//   getState().stateManager.getUploadedLayers().forEach((layer, index) => {
//     const option = document.createElement("option");
//     option.value = index;
//     option.textContent = layer.title;
//     select.appendChild(option);
//   });

//   // Remove hidden class to show modal
//   modal.classList.remove("hidden");
//   console.log("Buffer modal opened");
// }

// Update setBufferSource to properly manage button states
// function setBufferSource(source) {
//   const modal = document.getElementById("bufferModal");
//   const buttons = modal.querySelectorAll(".button-group-item");

//   buttons.forEach((btn) => {
//     btn.classList.remove("active");
//   });

//   // Find and activate the correct button
//   const targetButton = Array.from(buttons).find((btn) => {
//     const onclick = btn.getAttribute("onclick");
//     return onclick && onclick.includes(`'${source}'`);
//   });

//   if (targetButton) {
//     targetButton.classList.add("active");
//   }

//   const layerSection = document.getElementById("bufferLayerSection");
//   const drawSection = document.getElementById("bufferDrawSection");

//   if (source === "layer") {
//     layerSection.style.display = "block";
//     drawSection.style.display = "none";
//     stopAnalysisDrawing();
//   } else {
//     layerSection.style.display = "none";
//     drawSection.style.display = "block";
//   }
// }

// Make sure to export it
// window.setBufferSource = setBufferSource;

// Add this function to minimize/restore modal
// window.toggleModalMinimize = function (modalId) {
//   const modal = document.getElementById(modalId);
//   const modalContent = modal.querySelector(".modal-content");

//   if (modal.classList.contains("minimized")) {
//     modal.classList.remove("minimized");
//     modalContent.style.display = "";
//   } else {
//     modal.classList.add("minimized");
//     modalContent.style.display = "none";

//     // Show a small floating indicator
//     const indicator = document.createElement("div");
//     indicator.className = "modal-minimized-indicator";
//     indicator.innerHTML = `
//       <span>${
//         modalId === "bufferModal" ? "Buffer" : "Intersection"
//       } Analysis</span>
//       <button onclick="toggleModalMinimize('${modalId}')">
//         <i class="fas fa-window-maximize"></i>
//       </button>
//     `;
//     modal.appendChild(indicator);
//   }
// };

// Buffer Analysis with existing drawing
// Update your startBufferDrawing function:
// async function startBufferDrawing(type) {
//   console.log("Starting buffer drawing for type:", type);

//   // Add drawing mode to modal to hide backdrop
//   const modal = document.getElementById("bufferModal");
//   modal.classList.add("drawing-active");

//   // Show drawing indicator
//   if (!document.getElementById("drawingIndicator")) {
//     const indicator = document.createElement("div");
//     indicator.id = "drawingIndicator";
//     indicator.style.cssText = `
//       position: fixed;
//       top: 20px;
//       left: 50%;
//       transform: translateX(-50%);
//       background: var(--primary-color);
//       color: white;
//       padding: 12px 24px;
//       border-radius: 8px;
//       box-shadow: var(--shadow-lg);
//       z-index: 2000;
//       display: flex;
//       align-items: center;
//       gap: 8px;
//     `;
//     indicator.innerHTML = `
//       <i class="fas fa-pencil-alt"></i>
//       <span>Drawing ${type}. ${type === "point"
//         ? "Click to place point"
//         : "Click to add vertices, double-click to complete"
//       }.</span>
//       <button onclick="cancelBufferDrawing()" style="
//         background: white;
//         color: var(--primary-color);
//         border: none;
//         padding: 4px 8px;
//         border-radius: 4px;
//         margin-left: 12px;
//         cursor: pointer;
//       ">Cancel</button>
//     `;
//     document.body.appendChild(indicator);
//   }

//   // Initialize SketchViewModel if needed
//   const { stateManager } = getState();
//   let sketchViewModel = stateManager.getSketchViewModel();
//   if (!sketchViewModel) {
//     sketchViewModel = await initializeSketchViewModel();
//   }

//   // Cancel any existing drawing
//   if (sketchViewModel) {
//     sketchViewModel.cancel();
//   }

//   const view = stateManager.getView();

//   getState().stateManager.setAnalysisDrawing(true);
//   getState().stateManager.setAnalysisDrawType(type);

//   // Update button states
//   document.querySelectorAll(".draw-option-btn").forEach((btn) => {
//     btn.classList.remove("active");
//     if (btn.getAttribute("onclick")?.includes(type)) {
//       btn.classList.add("active");
//     }
//   });

//   const helpText = document.getElementById("bufferDrawHelp");
//   if (helpText) {
//     helpText.style.display = "block";
//   }

//   // Clear previous handlers
//   if (window.currentBufferHandler) {
//     window.currentBufferHandler.remove();
//   }

//   // Set cursor
//   view.container.style.cursor = "crosshair";

//   // Set symbology for buffer analysis
//   const bufferColor = [0, 122, 255]; // Blue color for buffer features
//   const bufferOpacity = 0.7;

//   switch (type) {
//     case "point":
//       sketchViewModel.pointSymbol = {
//         type: "simple-marker",
//         style: "circle",
//         color: [...bufferColor, bufferOpacity],
//         size: 12,
//         outline: {
//           color: [255, 255, 255, 1],
//           width: 2,
//         },
//       };
//       break;
//     case "polyline":
//       sketchViewModel.polylineSymbol = {
//         type: "simple-line",
//         color: [...bufferColor, 1],
//         width: 3,
//         cap: "round",
//         join: "round",
//       };
//       break;
//     case "polygon":
//       sketchViewModel.polygonSymbol = {
//         type: "simple-fill",
//         color: [...bufferColor, bufferOpacity * 0.5],
//         outline: {
//           color: [...bufferColor, 1],
//           width: 2,
//         },
//       };
//       break;
//   }

//   // Set up event handler
//   window.currentBufferHandler = sketchViewModel.on("create", (event) => {
//     if (event.state === "complete") {
//       console.log("Drawing complete:", event);

//       // Restore modal
//       disableDrawingMode("bufferModal");

//       // Remove drawing indicator
//       const indicator = document.getElementById("drawingIndicator");
//       if (indicator) {
//         indicator.remove();
//       }

//       // Reset cursor
//       view.container.style.cursor = "default";

//       // Add to drawn features
//       getState().stateManager.addBufferFeature(event.graphic);

//       // Show success message
//       showNotification(`${type} added to buffer analysis`, "success");

//       // Update help text to show count
//       if (helpText) {
//         helpText.innerHTML = `
//           <i class="fas fa-check-circle"></i> ${getState().stateManager.getDrawnFeatures().buffer.length} feature(s) drawn.
//           Click a tool to draw more or execute analysis.
//         `;
//       }

//       // Clean up
//       getState().stateManager.setAnalysisDrawing(false);
//       window.currentBufferHandler.remove();
//     }
//   });

//   // Start drawing
//   try {
//     console.log("Creating sketch for:", type);
//     sketchViewModel.create(type);
//   } catch (error) {
//     console.error("Error starting sketch:", error);
//     showNotification("Error starting drawing", "error");
//     cancelBufferDrawing();
//   }
// }

// function getAnalysisDrawSymbol(type) {
//   switch (type) {
//     case "point":
//       return {
//         type: "simple-marker",
//         style: "circle",
//         color: [0, 122, 255, 0.8],
//         size: 12,
//         outline: {
//           color: [255, 255, 255, 1],
//           width: 2,
//         },
//       };
//     case "polyline":
//       return {
//         type: "simple-line",
//         color: [0, 122, 255, 1],
//         width: 3,
//         cap: "round",
//       };
//     case "polygon":
//       return {
//         type: "simple-fill",
//         color: [0, 122, 255, 0.3],
//         outline: {
//           color: [0, 122, 255, 1],
//           width: 2,
//         },
//       };
//   }
// }

// Stop analysis drawing
// function stopAnalysisDrawing() {
//   const stateManager = getState().stateManager;
//   const sketchViewModel = stateManager.getSketchViewModel();

//   stateManager.setAnalysisDrawing(false);
//   stateManager.setAnalysisDrawType(null);

//   // Cancel any active sketching
//   if (sketchViewModel) {
//     sketchViewModel.cancel();
//   }

//   // Remove event handlers
//   if (window.analysisHandles) {
//     window.analysisHandles.forEach((handle) => handle.remove());
//     window.analysisHandles = [];
//   }

//   // Reset drawing tool buttons
//   document
//     .querySelectorAll(".draw-mini-btn")
//     .forEach((btn) => btn.classList.remove("active"));
// }

// App Tour Function
// function startAppTour() {
//   // Check if Shepherd is loaded
//   if (typeof Shepherd === "undefined") {
//     showNotification(
//       "Tour library not loaded. Please refresh the page.",
//       "error"
//     );
//     return;
//   }

//   // Create tour
//   const tour = new Shepherd.Tour({
//     useModalOverlay: true,
//     defaultStepOptions: {
//       cancelIcon: {
//         enabled: true,
//       },
//       scrollTo: {
//         behavior: "smooth",
//         block: "center",
//       },
//       classes: "shadow-lg",
//       arrow: true,
//     },
//   });

//   // Add after const tour = new Shepherd.Tour({...});
//   tour.on("complete", () => {
//     localStorage.setItem("gisStudioTourCompleted", "true");
//   });

//   tour.on("cancel", () => {
//     localStorage.setItem("gisStudioTourCompleted", "true");
//   });

//   // Define tour steps with FontAwesome icons
//   tour.addStep({
//     title: '<i class="fas fa-globe-americas"></i> Welcome to GIS Explorer!',
//     text: "This powerful GIS web application lets you visualize, analyze, and interact with geographic data. Let's take a quick tour of the main features.",
//     buttons: [
//       {
//         text: "Skip Tour",
//         classes: "shepherd-button-secondary",
//         action: tour.cancel,
//       },
//       {
//         text: "Let's Start!",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-search"></i> Search Location',
//     text: "Use the search bar to find any place in the world. Just type an address, city, or landmark and select from the suggestions.",
//     attachTo: {
//       element: ".search-container",
//       on: "bottom",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-cloud-upload-alt"></i> Upload Your Data',
//     text: "Click here to upload your geographic data. Supports CSV files with coordinates and GeoJSON files with various geometry types.",
//     attachTo: {
//       element: "#uploadBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-layer-group"></i> Layer Management',
//     text: "Manage all your uploaded layers here. Toggle visibility, zoom to extent, or remove layers.",
//     attachTo: {
//       element: "#layersBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-map"></i> Change Basemap',
//     text: "Switch between different basemap styles like satellite, streets, topographic, and more.",
//     attachTo: {
//       element: "#basemapBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-pencil-alt"></i> Drawing Tools',
//     text: "Draw points, lines, polygons, rectangles, and circles on the map. Customize colors and opacity.",
//     attachTo: {
//       element: "#drawBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-crosshairs"></i> Find Your Location',
//     text: "Click to zoom to your current location using GPS.",
//     attachTo: {
//       element: "#locateBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-chart-area"></i> Spatial Analysis',
//     text: "Perform spatial analysis like buffer zones, intersections, distance measurements, and area calculations.",
//     attachTo: {
//       element: "#analysisBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-fire"></i> Data Visualization',
//     text: "Create heatmaps and time-based animations to visualize patterns in your data.",
//     attachTo: {
//       element: "#visualizeBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-palette"></i> Classification Tool',
//     text: "Classify and color-code your data based on attribute values for better visualization.",
//     attachTo: {
//       element: "#classificationBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-table"></i> Attribute Table',
//     text: "View and search through all attributes of your layers in a tabular format. Export data as CSV or Excel.",
//     attachTo: {
//       element: "#tableBtn",
//       on: "top",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-bolt"></i> Quick Actions',
//     text: "Access frequently used tools: Zoom controls, Home view, Fullscreen mode, Clear all, and this Tour!",
//     attachTo: {
//       element: ".quick-actions",
//       on: "left",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-globe"></i> Country Information',
//     text: "Click anywhere on the map to see country information including area and perimeter with a beautiful animation.",
//     attachTo: {
//       element: "#displayMap",
//       on: "center",
//     },
//     buttons: [
//       {
//         text: "Back",
//         action: tour.back,
//       },
//       {
//         text: "Next",
//         action: tour.next,
//       },
//     ],
//   });

//   tour.addStep({
//     title: '<i class="fas fa-trophy"></i> You\'re Ready!',
//     text: "That's it! You now know the basics of GIS Studio. Explore the tools, upload your data, and start creating amazing maps!",
//     buttons: [
//       {
//         text: "Finish Tour",
//         action: tour.complete,
//       },
//     ],
//   });

//   // Start the tour
//   tour.start();
// }

// Export the tour function
// window.startAppTour = startAppTour;
// Make initializeMap available globally for main.js
// window.initializeMap = initializeMap;
// window.setupFeatureTour = setupFeatureTour;

// Export functions for module system - ES6 module exports
// ES6 Module Exports
// NOTE: These exports will be gradually removed as functionality is extracted to separate modules
// Each export will be commented out when its functionality is moved to a dedicated module

export {
  // Core initialization functions (will be moved to map-initializer.js)
  initializeMap,
  // initializeUI,
  // initializeEventHandlers,

  // Module loader (will be moved to module-loader.js)
  loadModule,

  // Notification functions (will be moved to notification-manager.js)
  showNotification,

  // Panel functions (will be moved to panel-manager.js)
  // openSidePanel,
  // closeSidePanel,
  // clearToolbarActiveStates,

  // Layer management functions (DELEGATED to layer-manager.js) ✅
  toggleLayer,
  removeLayer,
  updateLayerList,
  zoomToLayer,

  // File upload functions (will be moved to upload-handler.js)
  // loadGeoJSON,
  // loadCSV,
  // handleFiles,

  // Drawing functions (will be moved to drawing-manager.js)
  // startDrawingWithTool,
  // clearAll,
  // initializeSketchViewModel,
  // initializeDrawingPanel,

  // Classification functions (will be moved to classification-manager.js)
  // initializeClassificationPanel,
  // applyClassification,
  // resetClassification,

  // Toolbar functions (will be moved to toolbar-manager.js)
  // locateUser,

  // Measurement functions (will be moved to measurement-manager.js)
  // toggleMeasurement,
  // closeMeasurementResults,
  // closeDistancePanel,
  // clearDistanceMeasurement,

  // Tour functions (will be moved to tour-manager.js)
  // toggleFeatureTour,
  // nextFeature,
  // previousFeature,
  // closeTourControls,
  // manuallyStartTour,

  // Tab system functions (MOVED to js/ui/tab-system.js) ✅
  // initializeMapTabs,
  // redirectToTabPlatform,

  // Widget functions (will be moved to widget-manager.js)
  // toggleWidget,

  // Attribute table functions (will be moved to attribute-table.js)
  // toggleAttributeTable,
  // refreshTable,
  // previousPage,
  // nextPage,
  // sortTable,
  // selectTableRow,
  // showExportOptions,
  // closeExportModal,
  // exportData,

  // Zoom functions (will be moved to toolbar-manager.js or map-event-handler.js)
  // zoomIn,
  // zoomOut,

  // Analysis functions (will be moved to analysis-manager.js)
  // startBufferAnalysis,
  // startIntersectAnalysis,
  // startDistanceAnalysis,
  // startAreaAnalysis,
  // executeBuffer,
  // executeIntersection,
  // setDistanceSource,
  // setBufferSource,
  // setIntersectSource,
  // startBufferDrawing,
  // startIntersectDrawing,
  // cancelIntersectDrawing,
  // cancelBufferDrawing,
  // closeBufferModal,
  // closeIntersectModal,

  // Visualization functions (will be moved to visualization-manager.js)
  // toggleHeatmap,
  // selectColorScheme,
  // showHeatmapSettings,
  // closeHeatmapSettings,
  // applyHeatmapSettings,
  // toggleTimeControls,
  // playTimeAnimation,
  // stopTimeAnimation,

  // Popup functions (will be moved to popup-manager.js)
  // closeCustomPopup,
  // zoomToFeature,
  // copyFeatureInfo,

  // App tour function (will be moved to tour-manager.js)
  // startAppTour,
  // closeTourPopup,

  // ============================================================================
  // deleteBookmark,
};

// Global variables - These will be moved to StateManager
// var displayMap;
// let view;
// let uploadedLayers = [];
// let measurementWidget;
// let searchWidget;
// let currentPopupFeature = null;
// let sketchViewModel = null;
// let drawLayer = null;
// let activeDrawingTool = null;
// let homeExtent = null;
// let countriesLayer = null;
// let countryInfoTimeout = null;
// let flashGraphicsLayer = null;
// let activeNotifications = [];
// let currentClassificationLayer = null;
// let originalRenderers = new Map();
// let analysisDrawing = false;
// let analysisDrawType = null;
// let drawnFeatures = { buffer: [], intersect1: null, intersect2: null };
// let featureTourActive = false;
// let featureTourInterval = null;
// let currentFeatureIndex = 0;
// let tourFeatures = [];
// let tourLayer = null;
// let highlightHandle = null;
// let autoControl = null;
// let chevronIcon = null;
// let chevronBtn = null;
// let featureDetails = null;
