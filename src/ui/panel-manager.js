/**
 * PanelManager - Manages side panel system and panel lifecycle
 * Handles opening/closing panels, toolbar states, and panel-specific initialization
 */

export class PanelManager {
  constructor(stateManager, notificationManager, basemapManager = null, classificationManager = null, uploadHandler = null, reportsManager = null, advancedSearchManager = null) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.basemapManager = basemapManager;
    this.classificationManager = classificationManager;
    this.uploadHandler = uploadHandler;
    this.reportsManager = reportsManager;
    this.advancedSearchManager = advancedSearchManager;
    this.swipeManager = null; // Set via setSwipeManager() after initialization
    
    // Initialize panel close button event listener
    this.initializePanelCloseButton();
  }

  /**
   * Set the swipe manager instance (called after SwipeManager is created)
   * This is needed because SwipeManager is created after PanelManager,
   * but PanelManager needs to call SwipeManager.initializeSwipePanel() when opening the swipe panel
   * 
   * @param {SwipeManager} swipeManager - The swipe manager instance
   */
  setSwipeManager(swipeManager) {
    this.swipeManager = swipeManager;
  }

  /**
   * Open a side panel with specified title and template
   * @param {string} title - Panel title to display
   * @param {string} templateId - ID of the template element to load
   */
  openSidePanel(title, templateId) {
    this.clearToolbarActiveStates();

    // Mark the relevant button as active
    const buttonMap = {
      uploadPanelTemplate: "uploadBtn",
      layersPanelTemplate: "layersBtn",
      basemapPanelTemplate: "basemapBtn",
      drawingPanelTemplate: "drawBtn",
      analysisPanelTemplate: "analysisBtn",
      visualizationPanelTemplate: "visualizeBtn",
      swipePanelTemplate: "swipeBtn",
      classificationPanelTemplate: "classificationBtn",
      reportsPanelTemplate: "reportsBtn",
      advancedSearchPanelTemplate: "advancedSearchBtn",
    };

    const btnId = buttonMap[templateId];
    if (btnId) {
      document.getElementById(btnId)?.classList.add("active");
    }

    const panel = document.getElementById("sidePanel");
    const panelTitle = document.getElementById("sidePanelTitle");
    const panelContent = document.getElementById("sidePanelContent");
    const template = document.getElementById(templateId);

    if (template) {
      panelTitle.textContent = title;
      panelContent.innerHTML = template.innerHTML;
      panel.classList.add("active");

      // Initialize panel-specific functionality
      if (templateId === "uploadPanelTemplate") {
        this.initializeUploadPanel();
      } else if (templateId === "layersPanelTemplate") {
        // IMPORTANT: Re-trigger layer list update after panel content is set
        // This ensures event handlers are attached to the NEW layer list in the panel
        console.log('🔄 Layers panel opened, triggering layer list update...');
        setTimeout(() => {
          if (window.layerManager) {
            window.layerManager.updateLayerList();
          }
        }, 100);
      } else if (templateId === "basemapPanelTemplate") {
        // Delegate to BasemapManager if available
        if (this.basemapManager) {
          this.basemapManager.initializeBasemapPanel();
        }
      } else if (templateId === "swipePanelTemplate") {
        // Delegate to SwipeManager if available
        if (this.swipeManager) {
          this.swipeManager.initializeSwipePanel();
        }
      } else if (templateId === "classificationPanelTemplate") {
        // Delegate to ClassificationManager if available
        if (this.classificationManager) {
          this.classificationManager.initializeClassificationPanel();
        }
      } else if (templateId === "reportsPanelTemplate") {
        // Delegate to ReportsManager if available
        if (this.reportsManager) {
          this.reportsManager.initializeReportsPanel();
        }
      } else if (templateId === "advancedSearchPanelTemplate") {
        // Delegate to AdvancedSearchManager if available
        if (this.advancedSearchManager) {
          this.advancedSearchManager.initializeAdvancedSearchPanel();
        }
      }
    }
  }  /**
   
* Clear active states from all toolbar buttons
   * Preserves measurement button state if measurement widget is active
   */
  clearToolbarActiveStates() {
    document.querySelectorAll(".toolbar-btn").forEach((btn) => {
      // Don't clear measure button if measurement is active
      const measurementWidget = this.stateManager.getMeasurementWidget();
      if (btn.id !== "measureBtn" || !measurementWidget) {
        btn.classList.remove("active");
      }
    });
  }

  /**
   * Close the side panel and clean up active states
   */
  closeSidePanel() {
    const panel = document.getElementById("sidePanel");
    panel.classList.remove("active");

    // Clean up any active states
    document.querySelectorAll(".toolbar-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
  }

  /**
   * Initialize upload panel functionality when opened
   * Sets up drag & drop zone and file input handling
   */
  initializeUploadPanel() {
    const dropZone = document.querySelector("#sidePanelContent #dropZone");
    const fileInput = document.querySelector("#sidePanelContent #fileInput");

    if (!dropZone || !fileInput) return;

    // Prevent default drag behaviors
    ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
      dropZone.addEventListener(eventName, this.preventDefaults, false);
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
    dropZone.addEventListener(
      "drop",
      (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        if (this.uploadHandler) {
          this.uploadHandler.handleFiles(files);
        }
      },
      false
    );

    // Handle click to browse
    dropZone.addEventListener("click", () => {
      fileInput.click();
    });

    // Handle file input change
    fileInput.addEventListener("change", (e) => {
      if (this.uploadHandler) {
        this.uploadHandler.handleFiles(e.target.files);
      }
    });
  }

  /**
   * Initialize panel close button event listener
   */
  initializePanelCloseButton() {
    const closeButton = document.getElementById("sidePanelClose");
    if (closeButton) {
      closeButton.addEventListener("click", () => {
        this.closeSidePanel();
      });
    }
  }

  /**
   * Prevent default drag behaviors for file upload
   * @param {Event} e - The drag event
   */
  preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }
}