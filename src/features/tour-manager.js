/**
 * TourManager - Manages the feature tour system
 * 
 * Handles:
 * - Setting up feature tours for layers
 * - Creating and managing tour control UI
 * - Auto-playing through features
 * - Manual navigation (next/previous)
 * - Tour state management (play/pause)
 * - Feature highlighting and popup display
 */

export class TourManager {
  constructor(stateManager, notificationManager, popupManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.popupManager = popupManager;
  }

  /**
   * Setup feature tour for a layer
   * Queries all features and prepares tour controls
   */
  async setupFeatureTour(layer) {
    try {
      // Validate layer
      if (!layer) {
        console.warn("setupFeatureTour: no layer provided");
        return;
      }

      // Query all features
      const query = layer.createQuery();
      query.where = "1=1";
      query.returnGeometry = true;
      query.outFields = ["*"];

      const featureSet = await layer.queryFeatures(query);
      this.stateManager.setTourFeatures(featureSet.features);

      console.log(
        `Feature tour setup with ${
          this.stateManager.getTourFeatures().length
        } features`
      );

      // TOUR CONTROLS AND AUTO-START - COMMENTED OUT
      // Create tour controls
      // this.createTourControls();

      // Auto-start tour after 2 seconds
      // setTimeout(() => {
      //   this.startFeatureTour();
      // }, 2000);
    } catch (error) {
      console.error("Error setting up feature tour:", error);
    }
  }

  /**
   * Create tour control panel UI
   */
  createTourControls() {
    const controlsDiv = document.createElement("div");
    controlsDiv.className = "feature-tour-controls";

    // Create tour controls DOM
    controlsDiv.innerHTML = `
      <liquid-glass-effect>
        <header class="tour-header">
          <div class="chevron">
            <i class="bi bi-chevron-down"></i>
          </div>
          <div class="map-actions">
            <img class="backward-control" src="assets/images/fluent_next-24-regular-back.svg" alt="" onclick="previousFeature()">
            <div class="auto-control pause" onclick="toggleFeatureTour()"></div>
            <img class="forward-control" src="assets/images/fluent_next-24-regular.svg" alt="" onclick="nextFeature()">
          </div>
          <small class="feature-count" id="tourProgress">0 / 0</small>
        </header>

        <section class="overview" id="tourOverview"></section>

        <section class="feature-details"></section>
      </liquid-glass-effect>
    `;

    // Append to body
    document.body.appendChild(controlsDiv);

    // Set references
    const chevronBtn = controlsDiv.querySelector(
      ".feature-tour-controls .chevron"
    );
    const chevronIcon = controlsDiv.querySelector(
      ".feature-tour-controls .chevron i"
    );
    const featureDetails = controlsDiv.querySelector(
      ".feature-tour-controls .feature-details"
    );

    // Setup chevron handler
    if (chevronBtn) {
      chevronBtn.addEventListener("click", () => {
        const currentlyVisible =
          getComputedStyle(featureDetails).display !== "none";
        const newVisible = !currentlyVisible;

        featureDetails.style.display = newVisible ? "flex" : "none";

        if (chevronIcon) {
          chevronIcon.classList.toggle("bi-chevron-up", newVisible);
          chevronIcon.classList.toggle("bi-chevron-down", !newVisible);
        }
      });
    }
  }

  /**
   * Start the application tour
   * Uses Shepherd.js to guide users through main features
   */
  startAppTour() {
    // Check if Shepherd is loaded
    if (typeof Shepherd === "undefined") {
      this.notificationManager.showNotification(
        "Tour library not loaded. Please refresh the page.",
        "error"
      );
      return;
    }
  
    // Create tour
    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true,
        },
        scrollTo: {
          behavior: "smooth",
          block: "center",
        },
        classes: "shadow-lg",
        arrow: true,
      },
    });
  
    // Add after const tour = new Shepherd.Tour({...});
    tour.on("complete", () => {
      localStorage.setItem("gisStudioTourCompleted", "true");
    });
  
    tour.on("cancel", () => {
      localStorage.setItem("gisStudioTourCompleted", "true");
    });
  
    // Define Shepherd.js steps, with FontAwesome icons
    tour.addStep({
      title: '<i class="fas fa-globe-americas"></i> Welcome to GIS Explorer!',
      text: "This powerful GIS web application lets you visualize, analyze, and interact with geographic data. Let's take a quick tour of the main features.",
      buttons: [
        {
          text: "Skip Tour",
          classes: "shepherd-button-secondary",
          action: tour.cancel,
        },
        {
          text: "Let's Start!",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-search"></i> Search Location',
      text: "Use the search bar to find any place in the world. Just type an address, city, or landmark and select from the suggestions.",
      attachTo: {
        element: ".search-container",
        on: "bottom",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-cloud-upload-alt"></i> Upload Your Data',
      text: "Click here to upload your geographic data. Supports CSV files with coordinates and GeoJSON files with various geometry types.",
      attachTo: {
        element: "#uploadBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-layer-group"></i> Layer Management',
      text: "Manage all your uploaded layers here. Toggle visibility, zoom to extent, or remove layers.",
      attachTo: {
        element: "#layersBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-map"></i> Change Basemap',
      text: "Switch between different basemap styles like satellite, streets, topographic, and more.",
      attachTo: {
        element: "#basemapBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-pencil-alt"></i> Drawing Tools',
      text: "Draw points, lines, polygons, rectangles, and circles on the map. Customize colors and opacity.",
      attachTo: {
        element: "#drawBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-crosshairs"></i> Find Your Location',
      text: "Click to zoom to your current location using GPS.",
      attachTo: {
        element: "#locateBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-chart-area"></i> Spatial Analysis',
      text: "Perform spatial analysis like buffer zones, intersections, distance measurements, and area calculations.",
      attachTo: {
        element: "#analysisBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-fire"></i> Data Visualization',
      text: "Create heatmaps and time-based animations to visualize patterns in your data.",
      attachTo: {
        element: "#visualizeBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-palette"></i> Classification Tool',
      text: "Classify and color-code your data based on attribute values for better visualization.",
      attachTo: {
        element: "#classificationBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-table"></i> Attribute Table',
      text: "View and search through all attributes of your layers in a tabular format. Export data as CSV or Excel.",
      attachTo: {
        element: "#tableBtn",
        on: "top",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-bolt"></i> Quick Actions',
      text: "Access frequently used tools: Zoom controls, Home view, Fullscreen mode, Clear all, and this Tour!",
      attachTo: {
        element: ".quick-actions",
        on: "left",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-globe"></i> Country Information',
      text: "Click anywhere on the map to see country information including area and perimeter with a beautiful animation.",
      attachTo: {
        element: "#displayMap",
        on: "center",
      },
      buttons: [
        {
          text: "Back",
          action: tour.back,
        },
        {
          text: "Next",
          action: tour.next,
        },
      ],
    });
  
    tour.addStep({
      title: '<i class="fas fa-trophy"></i> You\'re Ready!',
      text: "That's it! You now know the basics of GIS Studio. Explore the tools, upload your data, and start creating amazing maps!",
      buttons: [
        {
          text: "Finish Tour",
          action: tour.complete,
        },
      ],
    });
  
    // Start the tour
    tour.start();
  }
  

  /**
   * Start the feature tour
   * Begins auto-playing through features
   */
  startFeatureTour() {
    const tourFeatures = this.stateManager.getTourFeatures();

    if (!tourFeatures || tourFeatures.length === 0) {
      this.notificationManager.showNotification("No features to tour", "warning");
      return;
    }

    this.stateManager.setFeatureTourActive(true);
    this.stateManager.setCurrentFeatureIndex(0);

    // Show controls
    document.querySelector(".feature-tour-controls").classList.add("active");

    // Update play button
    const autoControl = document.querySelector(
      ".feature-tour-controls .auto-control"
    );
    if (autoControl) {
      autoControl.classList.remove("pause");
      autoControl.classList.add("play");
    }

    // Start touring
    this.goToFeature(this.stateManager.getCurrentFeatureIndex());

    // Auto advance every 7 seconds
    this.stateManager.setFeatureTourInterval(
      setInterval(() => {
        this.nextFeature(false); // auto-play
      }, 7000)
    );
  }

  /**
   * Stop the feature tour
   * Clears the auto-advance interval
   */
  stopFeatureTour() {
    this.stateManager.setFeatureTourActive(false);

    const interval = this.stateManager.getFeatureTourInterval();
    if (interval) {
      clearInterval(interval);
      this.stateManager.setFeatureTourInterval(null);
    }

    // Update play button
    const autoControl = document.querySelector(
      ".feature-tour-controls .auto-control"
    );
    if (autoControl) {
      autoControl.classList.add("pause");
      autoControl.classList.remove("play");
    }
  }

  /**
   * Toggle tour play/pause state
   */
  toggleFeatureTour() {
    if (this.stateManager.isFeatureTourActive()) {
      this.stopFeatureTour();
    } else {
      this.startFeatureTour();
    }
  }

  /**
   * Navigate to a specific feature by index
   */
  async goToFeature(index) {
    try {
      const view = this.stateManager.getView();

      if (!view) {
        console.error("View not available for goToFeature");
        return;
      }

      const tourFeatures = this.stateManager.getTourFeatures();
      if (!tourFeatures || index < 0 || index >= tourFeatures.length) return;

      const feature = tourFeatures[index];
      this.stateManager.setCurrentFeatureIndex(index);

      // For polygons, calculate center and use appropriate zoom
      if (feature.geometry.type === "polygon") {
        await view.goTo(
          {
            target: feature.geometry,
            zoom: 17,
          },
          {
            duration: 3000,
            easing: "ease-in-out",
          }
        );
      } else {
        // For other geometry types
        await view.goTo(
          {
            target: feature.geometry,
            zoom: 16,
            tilt: 45,
          },
          {
            duration: 3000,
            easing: "ease-in-out",
          }
        );
      }

      // Highlight the feature
      const highlightHandle = this.stateManager.getHighlightHandle();
      if (highlightHandle) {
        highlightHandle.remove();
        this.stateManager.setHighlightHandle(null);
      }

      // Add highlight with proper error handling
      const tourLayer = this.stateManager.getTourLayer();
      if (tourLayer) {
        try {
          const layerView = await view.whenLayerView(tourLayer);
          this.stateManager.setHighlightHandle(layerView.highlight(feature));
        } catch (error) {
          console.warn("Error creating highlight:", error);
        }
      }

      // Update info panel
      this.updateTourInfo(feature);

      // Update progress
      document.getElementById("tourProgress").textContent = `${index + 1} / ${
        (this.stateManager.getTourFeatures() || []).length
      }`;

      // Show popup in left-center position
      this.popupManager.showCustomPopupTour(feature);
    } catch (error) {
      console.error("Error navigating to feature:", error);
    }
  }

  /**
   * Update tour info panel with feature details
   */
  updateTourInfo(feature) {
    const tourOverview = document.getElementById("tourOverview");
    const attrs = feature.attributes;

    // Try to find name field - check common field names
    const nameFields = [
      "اسم الحديقة", "name", "Name", "NAME", "الاسم",
      "PLANNER_NAME", "planner_name", "PlannerName",
      "DISTRICT", "district", "District"
    ];
    let featureName = null;

    for (const field of nameFields) {
      if (attrs[field] && attrs[field] !== "NULL") {
        featureName = attrs[field];
        break;
      }
    }

    // If no name found, use a default based on layer title
    if (!featureName) {
      const layer = this.stateManager.getTourLayer();
      const layerTitle = layer ? layer.title : "Feature";
      featureName = `${layerTitle} ${(this.stateManager.getCurrentFeatureIndex() || 0) + 1}`;
    }

    // Try to find area field
    const areaFields = ["GARDENAREA", "gardenarea", "AREA", "area", "Shape_Area", "SHAPE_AREA"];
    let areaValue = "";
    for (const field of areaFields) {
      if (attrs[field] && attrs[field] !== "NULL") {
        areaValue = attrs[field];
        break;
      }
    }
    const areaHtml = areaValue ? `<p class="area">${parseFloat(areaValue).toFixed(2)} متر مربع</p>` : "";

    // Try to find status field
    const statusFields = ["GARDENSTATUS", "gardenstatus", "STATUS", "status", "STATE", "state"];
    let statusValue = "";
    for (const field of statusFields) {
      if (attrs[field] && attrs[field] !== "NULL") {
        statusValue = attrs[field];
        break;
      }
    }
    const statusHtml = statusValue
      ? `<div class="status">${statusValue}</div>`
      : "";

    tourOverview.innerHTML = `
        <div>
            <p class="name">${featureName}</p>
            ${areaHtml}
        </div>
        ${statusHtml}
    `;
  }

  /**
   * Navigate to next feature
   * @param {boolean} manual - If true, stops auto-play
   */
  nextFeature(manual = true) {
    if (manual) {
      this.stopFeatureTour(); // only stop when user explicitly clicks
    }

    const currentIndex = this.stateManager.getCurrentFeatureIndex();
    const tourFeatures = this.stateManager.getTourFeatures();
    const nextIndex = (currentIndex + 1) % tourFeatures.length;
    this.goToFeature(nextIndex);
  }

  /**
   * Navigate to previous feature
   * @param {boolean} manual - If true, stops auto-play
   */
  previousFeature(manual = true) {
    if (manual) {
      this.stopFeatureTour();
    }

    const currentIndex = this.stateManager.getCurrentFeatureIndex();
    const tourFeatures = this.stateManager.getTourFeatures();
    const prevIndex =
      currentIndex === 0 ? tourFeatures.length - 1 : currentIndex - 1;
    this.goToFeature(prevIndex);
  }

  /**
   * Close tour controls and stop tour
   */
  closeTourControls() {
    this.stopFeatureTour();
    document.querySelector(".feature-tour-controls").classList.remove("active");
    this.closeTourPopup();
  }

  /**
   * Close tour popup
   */
  closeTourPopup() {
    const tourPopup = document.getElementById("tourPopup");
    if (tourPopup) {
      tourPopup.classList.remove("active");
    }
  }

  /**
   * Manually start tour (called from UI)
   */
  manuallyStartTour() {
    const tourFeatures = this.stateManager.getTourFeatures();

    if (!tourFeatures || tourFeatures.length === 0) {
      this.notificationManager.showNotification("No features available for tour", "warning");
      return;
    }

    // Create tour controls if they don't exist
    const existingControls = document.querySelector(".feature-tour-controls");
    if (!existingControls) {
      this.createTourControls();
    }

    const tourControls = document.querySelector(".feature-tour-controls");
    if (tourControls) {
      tourControls.classList.add("active");
    }

    if (!this.stateManager.isFeatureTourActive()) {
      this.startFeatureTour();
    } else {
      this.closeTourControls();
    }
  }
}
