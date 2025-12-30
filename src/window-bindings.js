/**
 * Window Bindings - Centralized window function exposure for HTML event handlers
 * 
 * This file serves as a single source of truth for all functions that need to be
 * exposed on the window object for inline HTML event handlers (onclick, onchange, etc.)
 * 
 * Benefits:
 * - Single file to audit all global exposures
 * - Clear API surface for HTML event handlers
 * - Easier migration path when removing inline handlers
 * - Better for security auditing
 * 
 * Reference: .kiro/specs/gis-app-modularization/window-functions.md
 */

/**
 * Bind all window functions for HTML event handlers
 * @param {Object} managers - Object containing all manager instances
 */
export function bindWindowFunctions(managers) {
  const {
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
    popupManager,
    attributeTable,
    classificationManager,
    tourManager,
    countryInfo,
    mapEventHandler,
    coordinateDisplay,
    widgetManager,
    swipeManager,
    // Future managers will be added here as they're created:
  } = managers;

  // ============================================================================
  // WIDGET MANAGEMENT
  // Module: js/widgets/widget-manager.js ✅
  // ============================================================================
  
  window.toggleWidget = (name) => {
    return widgetManager.toggleWidget(name);
  };

  window.deleteBookmark = (index) => {
    return widgetManager.deleteBookmark(index);
  };

  // ============================================================================
  // ATTRIBUTE TABLE
  // Future module: js/features/attribute-table.js
  // ============================================================================
  
  window.toggleAttributeTable = () => {
    return attributeTable.toggleAttributeTable();
  };

  window.refreshTable = () => {
    return attributeTable.refreshTable();
  };

  window.sortTable = (column) => {
    return attributeTable.sortTable(column);
  };
  window.selectTableRow = (rowId) => {
    return attributeTable.selectTableRow(rowId);
  };

  window.showExportOptions = () => {
    return attributeTable.showExportOptions();
  };

  window.closeExportModal = () => {
    return attributeTable.closeExportModal();
  };

  window.exportData = (format) => {
    return attributeTable.exportData(format);
  };

  window.previousPage = () => {
    return attributeTable.previousPage();
  };

  window.nextPage = () => {
    return attributeTable.nextPage();
  };

  // ============================================================================
  // TOUR SYSTEM
  // Module: js/features/tour-manager.js ✅
  // ============================================================================
  
  window.manuallyStartTour = () => {
    return tourManager.manuallyStartTour();
  };

  window.startAppTour = () => {
    return tourManager.startAppTour();
  };

  window.toggleFeatureTour = () => {
    return tourManager.toggleFeatureTour();
  };

  window.nextFeature = () => {
    return tourManager.nextFeature();
  };

  window.previousFeature = () => {
    return tourManager.previousFeature();
  };

  window.closeTourControls = () => {
    return tourManager.closeTourControls();
  };

  window.closeTourPopup = () => {
    return tourManager.closeTourPopup();
  };

  // ============================================================================
  // ZOOM CONTROLS
  // Module: js/widgets/widget-manager.js ✅
  // ============================================================================
  
  window.zoomIn = () => {
    return widgetManager.zoomIn();
  };

  window.zoomOut = () => {
    return widgetManager.zoomOut();
  };

  // ============================================================================
  // ANALYSIS TOOLS
  // Module: js/tools/analysis-manager.js
  // ============================================================================
  
  window.startBufferAnalysis = () => {
    return analysisManager.startBufferAnalysis();
  };

  window.startIntersectAnalysis = () => {
    return analysisManager.startIntersectAnalysis();
  };

  window.startDistanceAnalysis = () => {
    return analysisManager.startDistanceAnalysis();
  };

  window.startAreaAnalysis = () => {
    return analysisManager.startAreaAnalysis();
  };

  window.executeBuffer = () => {
    return analysisManager.executeBuffer();
  };

  window.executeIntersection = () => {
    return analysisManager.executeIntersection();
  };

  window.setBufferSource = (source) => {
    return analysisManager.setBufferSource(source);
  };

  window.startBufferDrawing = (tool) => {
    return analysisManager.startBufferDrawing(tool);
  };

  window.closeBufferModal = () => {
    return analysisManager.closeBufferModal();
  };

  window.closeIntersectModal = () => {
    return analysisManager.closeIntersectModal();
  };

  window.setDistanceSource = (source) => {
    return analysisManager.setDistanceSource(source);
  };

  window.setIntersectSource = (featureNum, source) => {
    return analysisManager.setIntersectSource(featureNum, source);
  };

  window.startIntersectDrawing = (featureNum) => {
    return analysisManager.startIntersectDrawing(featureNum);
  };

  window.cancelIntersectDrawing = () => {
    return analysisManager.cancelIntersectDrawing();
  };

  window.cancelBufferDrawing = () => {
    return analysisManager.cancelBufferDrawing();
  };

  window.clearAnalysisResults = () => {
    return analysisManager.clearAnalysisResults();
  };

  window.closeDistancePanel = () => {
    return analysisManager.closeDistancePanel();
  };

  window.clearDistanceMeasurement = () => {
    return analysisManager.clearDistanceMeasurement();
  };

  // ============================================================================
  // VISUALIZATION
  // Future module: js/tools/visualization-manager.js
  // ============================================================================
  
  window.toggleHeatmap = () => {
    return visualizationManager.toggleHeatmap();
  };

  window.selectColorScheme = (scheme) => {
    return visualizationManager.selectColorScheme(scheme);
  };

  window.showHeatmapSettings = () => {
    return visualizationManager.showHeatmapSettings();
  };

  window.closeHeatmapSettings = () => {
    return visualizationManager.closeHeatmapSettings();
  };

  window.applyHeatmapSettings = () => {
    return visualizationManager.applyHeatmapSettings();
  };

  window.toggleTimeControls = () => {
    return visualizationManager.toggleTimeControls();
  };

  window.playTimeAnimation = () => {
    return visualizationManager.playTimeAnimation();
  };

  window.stopTimeAnimation = () => {
    return visualizationManager.stopTimeAnimation();
  };

  // ============================================================================
  // CLASSIFICATION
  // Future module: js/features/classification-manager.js
  // ============================================================================
  
  window.applyClassification = () => {
    return classificationManager.applyClassification();
  };

  window.resetClassification = () => {
    return classificationManager.resetClassification();
  };

  window.removeClassificationLegend = () => {
    return classificationManager.removeClassificationLegend();
  };

  // ============================================================================
  // MEASUREMENT
  // Module: js/tools/measurement-manager.js
  // ============================================================================
  
  window.toggleMeasurement = () => {
    return measurementManager.toggleMeasurement();
  };

  window.closeMeasurementResults = () => {
    return measurementManager.closeMeasurementResults();
  };

  // ============================================================================
  // POPUP
  // Future module: js/features/popup-manager.js
  // ============================================================================
  
  window.closeCustomPopup = () => {
    return popupManager.closeCustomPopup();
  };

  window.zoomToFeature = () => {
    return popupManager.zoomToFeature();
  };

  window.copyFeatureInfo = () => {
    return popupManager.copyFeatureInfo();
  };

  // ============================================================================
  // LAYER MANAGEMENT
  // Module: js/layers/layer-manager.js ✅
  // ============================================================================
  
  window.toggleLayer = (index) => {
    return layerManager.toggleLayer(index);
  };

  window.toggleGroupLayer = (index) => {
    return layerManager.toggleGroupLayer(index);
  };

  window.zoomToLayer = (index) => {
    return layerManager.zoomToLayer(index);
  };

  window.removeLayer = (index) => {
    return layerManager.removeLayer(index);
  };
  
  // Expose layerManager to window for panel manager
  window.layerManager = layerManager;

  // ============================================================================
  // TAB SYSTEM
  // Module: js/ui/tab-system.js ✅
  // ============================================================================
  
  window.redirectToTabPlatform = (tabType) => {
    return tabSystem.redirectToTabPlatform(tabType);
  };

  // ============================================================================
  // DRAWING TOOLS
  // Module: js/tools/drawing-manager.js ✅
  // ============================================================================
  
  window.clearAll = () => {
    return drawingManager.clearAll();
  };

  window.startDrawingWithTool = (tool) => {
    return drawingManager.startDrawingWithTool(tool);
  };

  // ============================================================================
  // SWIPE COMPARISON
  // Module: js/tools/swipe-manager.js ✅
  // ============================================================================
  
  window.setSwipeMode = (mode) => {
    return swipeManager.setSwipeMode(mode);
  };

  window.setSwipeDirection = (direction) => {
    return swipeManager.setSwipeDirection(direction);
  };

  window.applySwipe = () => {
    return swipeManager.applySwipe();
  };

  window.removeSwipe = () => {
    return swipeManager.removeSwipe();
  };

  window.debugSwipeButtons = () => {
    return swipeManager.debugSwipeButtons();
  };

  // ============================================================================
  // REPORTS
  // Module: js/features/reports-manager.js ✅
  // ============================================================================
  
  window.closeReport = () => {
    return managers.reportsManager?.closeReport();
  };

  window.exportReportPDF = () => {
    return managers.reportsManager?.exportPDF();
  };

  window.exportReportExcel = () => {
    return managers.reportsManager?.exportExcel();
  };

  // ============================================================================
  // ADVANCED SEARCH
  // Module: js/features/advanced-search-manager.js ✅
  // ============================================================================
  
  window.closeSearchResults = () => {
    return managers.advancedSearchManager?.closeResultsModal();
  };

  window.zoomToSearchResults = () => {
    return managers.advancedSearchManager?.zoomToSearchResults();
  };

  window.exportSearchResults = () => {
    return managers.advancedSearchManager?.exportSearchResults();
  };

  window.toggleLayerResults = (layerIndex) => {
    return managers.advancedSearchManager?.toggleLayerResults(layerIndex);
  };

  window.zoomToFeature = (layerIndex, featureIndex) => {
    return managers.advancedSearchManager?.zoomToFeature(layerIndex, featureIndex);
  };

  window.showFeatureDetails = (layerIndex, featureIndex) => {
    return managers.advancedSearchManager?.showFeatureDetails(layerIndex, featureIndex);
  };

  window.backToSearchResults = () => {
    return managers.advancedSearchManager?.backToSearchResults();
  };

  window.backToSearchPanel = () => {
    // Close the results modal and reopen the search panel
    if (managers.advancedSearchManager) {
      managers.advancedSearchManager.closeResultsModal();
    }
    if (managers.panelManager) {
      managers.panelManager.openSidePanel("بحث متقدم", "advancedSearchPanelTemplate");
    }
  };

  window.clearSearchResults = () => {
    return managers.advancedSearchManager?.clearSearchResults();
  };

  window.goToNextPage = () => {
    return managers.advancedSearchManager?.goToNextPage();
  };

  window.goToPreviousPage = () => {
    return managers.advancedSearchManager?.goToPreviousPage();
  };

  // ============================================================================
  // REGION NAVIGATION
  // Module: js/features/region-navigation-manager.js ✅
  // ============================================================================
  
  window.navigateToRegion = (regionName) => {
    return managers.regionNavigationManager?.navigateToRegion(regionName);
  };

  console.log('✅ Window bindings initialized - All HTML event handlers connected');
}
