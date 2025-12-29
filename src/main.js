// ============================================================================
// MAIN APPLICATION ENTRY POINT
// ============================================================================
// This file orchestrates the initialization of the GIS application.
// 
// INITIALIZATION PHASES:
// 1. Foundation Modules    - Core state and notification systems
// 2. Core Services         - Basic services with minimal dependencies
// 3. Feature Services      - Feature implementations using core services
// 4. UI Managers           - UI coordination (handles circular dependencies)
// 5. Complex Managers      - High-level coordinators
// 6. Event Handlers        - Event handling after all modules ready
// 7. Application Init      - Async initialization sequence
//
// CIRCULAR DEPENDENCIES:
// - ClassificationManager ↔ PanelManager: UI coordination requires bidirectional reference
// - SwipeManager ↔ PanelManager: Panel needs swipe manager for UI initialization
// - SwipeManager → AnalysisManager: Late binding for analysis layer access
// - DrawingManager → SwipeManager: Late binding for clearAll coordination
//
// These are handled via setter injection after construction.
// ============================================================================

// ============================================================================
// IMPORTS - TIER 0: FOUNDATION MODULES
// ============================================================================
// Core modules with no dependencies. These provide fundamental services
// (state management, notifications) that all other modules depend on.
import { StateManager } from "./core/state-manager.js";
import { NotificationManager } from "./ui/notification-manager.js";

// ============================================================================
// IMPORTS - TIER 1: CORE SERVICE MODULES
// ============================================================================
// Basic services that depend only on Foundation modules. These provide
// core functionality (layer management, drawing, popups) used by higher-level modules.
import { LayerManager } from "./layers/layer-manager.js";
import { BasemapManager } from "./layers/basemap-manager.js";
import { DrawingManager } from "./tools/drawing-manager.js";
import { PopupManager } from "./features/popup-manager.js";

// ============================================================================
// IMPORTS - TIER 2: FEATURE SERVICE MODULES
// ============================================================================
// Feature implementations that depend on Foundation + Core Services.
// These provide specific application features (tours, analysis, visualization).
import { TourManager } from "./features/tour-manager.js";
import { CountryInfo } from "./features/country-info.js";
import { VisualizationManager } from "./tools/visualization-manager.js";
import { AnalysisManager } from "./tools/analysis-manager.js";
import { AttributeTable } from "./features/attribute-table.js";
import { UploadHandler } from "./layers/upload-handler.js";
import { ReportsManager } from "./features/reports-manager.js";
import { AdvancedSearchManager } from "./features/advanced-search-manager.js";
import { RegionNavigationManager } from "./features/region-navigation-manager.js";

// ============================================================================
// IMPORTS - TIER 3: UI MANAGER MODULES
// ============================================================================
// UI coordination modules that depend on Foundation + Services + Features.
// These manage user interface components and handle circular dependencies.
import { ClassificationManager } from "./features/classification-manager.js";
import { PanelManager } from "./ui/panel-manager.js";
import { SwipeManager } from "./tools/swipe-manager.js";
import { MeasurementManager } from "./tools/measurement-manager.js";
import { ToolbarManager } from "./ui/toolbar-manager.js";
import { TabSystem } from "./ui/tab-system.js";
import { SearchManager } from "./ui/search-manager.js";
import { WidgetManager } from "./widgets/widget-manager.js";

// ============================================================================
// IMPORTS - TIER 4: COMPLEX MANAGER MODULES
// ============================================================================
// High-level coordinators that depend on multiple tiers.
// These orchestrate complex initialization and coordination across modules.
import { MapInitializer } from "./core/map-initializer.js";

// ============================================================================
// IMPORTS - TIER 5: EVENT HANDLER MODULES
// ============================================================================
// Event handlers that depend on all other modules.
// These coordinate interactions and respond to user/system events.
import { MapEventHandler } from "./events/map-event-handler.js";
import { CoordinateDisplay } from "./events/coordinate-display.js";
import { WindowEventHandler } from "./events/window-event-handler.js";

// ============================================================================
// IMPORTS - UTILITIES
// ============================================================================
// Utility functions and custom elements
import { bindWindowFunctions } from "./window-bindings.js";
import "./ui/liquid-glass-effect.js"; // Custom element auto-registers

// ============================================================================
// PHASE 2: FOUNDATION MODULES
// ============================================================================
// Create the core state management and notification systems.
// These have no dependencies and must be created first.

const stateManager = new StateManager();
const notificationManager = new NotificationManager();

console.log("✓ Foundation modules initialized");

// ============================================================================
// PHASE 3: CORE SERVICE MODULES
// ============================================================================
// Create basic services that depend only on foundation modules.
// These provide core functionality used by higher-level modules.

const layerManager = new LayerManager(stateManager, notificationManager);
const basemapManager = new BasemapManager(stateManager, notificationManager);
const drawingManager = new DrawingManager(stateManager, notificationManager);
const popupManager = new PopupManager(stateManager, notificationManager);

console.log("✓ Core service modules initialized");

// ============================================================================
// PHASE 4: FEATURE SERVICE MODULES
// ============================================================================
// Create feature implementations that depend on foundation and core services.
// These provide specific application features.

const tourManager = new TourManager(stateManager, notificationManager, popupManager);
const countryInfo = new CountryInfo(stateManager, notificationManager);
const visualizationManager = new VisualizationManager(stateManager, notificationManager, layerManager);
const analysisManager = new AnalysisManager(stateManager, notificationManager, layerManager, drawingManager);
const attributeTable = new AttributeTable(stateManager, notificationManager, popupManager);
const uploadHandler = new UploadHandler(stateManager, layerManager, notificationManager);
const reportsManager = new ReportsManager(stateManager, notificationManager, layerManager);
// Note: advancedSearchManager needs panelManager, will be set after PanelManager creation
const advancedSearchManager = new AdvancedSearchManager(stateManager, notificationManager, layerManager, null);
const regionNavigationManager = new RegionNavigationManager(stateManager, notificationManager);

console.log("✓ Feature service modules initialized");

// ============================================================================
// PHASE 5: UI MANAGER MODULES
// ============================================================================
// Create UI coordination modules. This phase handles circular dependencies
// through setter injection after construction.

// Create ClassificationManager with null PanelManager (will be set after PanelManager creation)
const classificationManager = new ClassificationManager(
  stateManager,
  notificationManager,
  null, // PanelManager - set via setter after creation
  popupManager
);

// Create PanelManager (depends on ClassificationManager and UploadHandler)
const panelManager = new PanelManager(
  stateManager,
  notificationManager,
  basemapManager,
  classificationManager,
  uploadHandler,
  reportsManager,
  advancedSearchManager
);

// CIRCULAR DEPENDENCY RESOLUTION: ClassificationManager ↔ PanelManager
// ClassificationManager needs PanelManager for UI operations
// PanelManager needs ClassificationManager for classification panel initialization
classificationManager.panelManager = panelManager;

// CIRCULAR DEPENDENCY RESOLUTION: AdvancedSearchManager → PanelManager
// AdvancedSearchManager needs PanelManager to re-open search panel after clearing results
advancedSearchManager.panelManager = panelManager;

// Create SwipeManager (depends on PanelManager)
const swipeManager = new SwipeManager(stateManager, notificationManager, panelManager);

// CIRCULAR DEPENDENCY RESOLUTION: SwipeManager ↔ PanelManager
// PanelManager needs SwipeManager for swipe panel initialization
panelManager.setSwipeManager(swipeManager);

// LATE BINDING: SwipeManager → AnalysisManager
// SwipeManager needs access to analysis layers
swipeManager.setAnalysisManager(analysisManager);

// LATE BINDING: DrawingManager → SwipeManager
// DrawingManager needs SwipeManager for clearAll coordination
drawingManager.setSwipeManager(swipeManager);

// Create remaining UI managers
const measurementManager = new MeasurementManager(
  stateManager,
  notificationManager,
  panelManager,
  drawingManager
);

const toolbarManager = new ToolbarManager(
  stateManager,
  panelManager,
  notificationManager,
  drawingManager,
  measurementManager
);

const tabSystem = new TabSystem(notificationManager);
const searchManager = new SearchManager(stateManager, notificationManager);

const widgetManager = new WidgetManager(
  stateManager,
  notificationManager,
  panelManager,
  drawingManager,
  popupManager
);

console.log("✓ UI manager modules initialized");

// ============================================================================
// PHASE 6: COMPLEX MANAGER MODULES
// ============================================================================
// Create high-level coordinators that depend on multiple modules.

const mapInitializer = new MapInitializer(
  stateManager,
  notificationManager,
  tourManager,
  layerManager,
  classificationManager,
  visualizationManager,
  widgetManager
);

console.log("✓ Complex manager modules initialized");

// ============================================================================
// PHASE 7: EVENT HANDLER MODULES
// ============================================================================
// Create event handlers after all other modules are ready.
// Event handlers coordinate interactions between modules.

const mapEventHandler = new MapEventHandler(stateManager, popupManager, countryInfo);
const coordinateDisplay = new CoordinateDisplay(stateManager, notificationManager);
const windowEventHandler = new WindowEventHandler(popupManager, panelManager);

console.log("✓ Event handler modules initialized");

// ============================================================================
// PHASE 8: APPLICATION INITIALIZATION
// ============================================================================
// Async initialization function that starts the application.
// This follows the proper sequence for map application initialization:
// 1. Initialize map and view
// 2. Initialize UI components
// 3. Initialize event handlers
// 4. Bind window functions

async function initializeApplication() {
  try {
    console.log("🚀 Starting GIS application initialization...");

    // ========================================================================
    // STEP 1: INITIALIZE MAP
    // ========================================================================
    // Initialize the ArcGIS map and view. This must happen before any
    // map-dependent operations (widgets, layers, etc.)
    
    console.log("📍 Initializing map...");
    await mapInitializer.initializeMap();
    console.log("✓ Map initialized successfully");

    // ========================================================================
    // STEP 2: INITIALIZE UI COMPONENTS
    // ========================================================================
    // Initialize UI components after the map is ready
    
    console.log("🎨 Initializing UI components...");
    
    // Initialize toolbar
    toolbarManager.initialize();
    
    // Register LayerManager callbacks for cross-module communication
    layerManager.setupCallbacks(
      attributeTable,
      visualizationManager,
      analysisManager,
      swipeManager
    );
    
    // Initialize tab system
    tabSystem.initializeMapTabs();
    
    // Initialize file upload
    uploadHandler.initializeFileUpload();
    
    // Initialize widget manager fullscreen listener
    widgetManager.initializeFullscreenListener();
    
    console.log("✓ UI components initialized");

    // ========================================================================
    // STEP 3: INITIALIZE EVENT HANDLERS
    // ========================================================================
    // Initialize event handlers after all modules are ready
    
    console.log("🎯 Initializing event handlers...");
    
    mapEventHandler.initializeEventHandlers();
    coordinateDisplay.initialize();
    windowEventHandler.initialize();
    
    console.log("✓ Event handlers initialized");

    // ========================================================================
    // STEP 4: BIND WINDOW FUNCTIONS
    // ========================================================================
    // Bind functions to window object for HTML event handlers (onclick, etc.)
    // This must happen last to ensure all modules are ready
    
    console.log("🔗 Binding window functions...");
    
    bindWindowFunctions({
      stateManager,
      notificationManager,
      mapInitializer,
      panelManager,
      toolbarManager,
      tabSystem,
      searchManager,
      layerManager,
      uploadHandler,
      basemapManager,
      drawingManager,
      analysisManager,
      measurementManager,
      visualizationManager,
      swipeManager,
      popupManager,
      attributeTable,
      classificationManager,
      tourManager,
      countryInfo,
      mapEventHandler,
      coordinateDisplay,
      windowEventHandler,
      widgetManager,
      reportsManager,
      advancedSearchManager,
      regionNavigationManager,
    });
    
    console.log("✓ Window functions bound");

    // ========================================================================
    // APPLICATION READY
    // ========================================================================
    
    console.log("✅ Application initialized successfully");
    console.log("📊 State snapshot:", stateManager.getStateSnapshot());
    
  } catch (error) {
    // ========================================================================
    // ERROR HANDLING
    // ========================================================================
    
    console.error("❌ Failed to initialize application:", error);
    console.error("Error details:", {
      message: error.message,
      stack: error.stack,
    });
    
    notificationManager.showNotification(
      "Failed to initialize map. Please refresh the page.",
      "error"
    );
    
    // Re-throw to allow external error handlers to catch
    throw error;
  }
}

// ============================================================================
// PHASE 9: START APPLICATION
// ============================================================================
// Start the application initialization process

initializeApplication();
