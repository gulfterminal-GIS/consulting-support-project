/**
 * AnalysisManager - Spatial analysis tools
 * 
 * Handles buffer, intersect, distance, and area analysis operations
 * Manages analysis layer and drawing modes for analysis tools
 */

import { loadModule } from "../core/module-loader.js";

export class AnalysisManager {
  constructor(stateManager, notificationManager, layerManager, drawingManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.layerManager = layerManager;
    this.drawingManager = drawingManager;
    this.analysisLayer = null;
    this.distanceMeasurementActive = false;
    this.distanceFeatures = [];
    
    // Event handler storage
    this.currentBufferHandler = null;
    this.intersectDrawHandler = null;
    this.distanceClickHandler = null;
    this.distanceDrawHandler = null;
    this.analysisHandles = [];
  }

  /**
   * Initialize the analysis layer if it doesn't exist
   */
  async initializeAnalysisLayer() {
    if (!this.analysisLayer) {
      const [GraphicsLayer] = await Promise.all([
        loadModule("esri/layers/GraphicsLayer"),
      ]);

      this.analysisLayer = new GraphicsLayer({
        title: "Analysis Results",
        listMode: "show",
      });

      const map = this.stateManager.getMap();
      map.add(this.analysisLayer);
    }
  }

  /**
   * Clear all analysis results
   */
  clearAnalysisResults() {
    if (this.analysisLayer) {
      this.analysisLayer.removeAll();
      this.layerManager.updateLayerList();
      this.notificationManager.showNotification("Analysis results cleared", "success");
    }
  }

  /**
   * Start buffer analysis
   */
  async startBufferAnalysis() {
    await this.initializeAnalysisLayer();

    const modal = document.getElementById("bufferModal");
    const select = document.getElementById("bufferLayerSelect");

    if (!modal) {
      console.error("Buffer modal not found");
      return;
    }

    // Reset drawn features
    this.stateManager.clearDrawnFeatures();

    // Populate layer select
    select.innerHTML = '<option value="">Select a layer...</option>';
    this.stateManager.getUploadedLayers().forEach((layer, index) => {
      const option = document.createElement("option");
      option.value = index;
      option.textContent = layer.title;
      select.appendChild(option);
    });

    // Remove hidden class to show modal
    modal.classList.remove("hidden");
    console.log("Buffer modal opened");
  }

  /**
   * Set buffer source (layer or draw)
   */
  setBufferSource(source) {
    const modal = document.getElementById("bufferModal");
    const buttons = modal.querySelectorAll(".button-group-item");

    buttons.forEach((btn) => {
      btn.classList.remove("active");
    });

    // Find and activate the correct button
    const targetButton = Array.from(buttons).find((btn) => {
      const onclick = btn.getAttribute("onclick");
      return onclick && onclick.includes(`'${source}'`);
    });

    if (targetButton) {
      targetButton.classList.add("active");
    }

    const layerSection = document.getElementById("bufferLayerSection");
    const drawSection = document.getElementById("bufferDrawSection");

    if (source === "layer") {
      layerSection.style.display = "block";
      drawSection.style.display = "none";
      this.stopAnalysisDrawing();
    } else {
      layerSection.style.display = "none";
      drawSection.style.display = "block";
    }
  }

  /**
   * Start drawing for buffer analysis
   */
  async startBufferDrawing(type) {
    console.log("Starting buffer drawing for type:", type);

    const modal = document.getElementById("bufferModal");
    modal.classList.add("drawing-active");

    // Show drawing indicator
    if (!document.getElementById("drawingIndicator")) {
      const indicator = document.createElement("div");
      indicator.id = "drawingIndicator";
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-color);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 2000;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      indicator.innerHTML = `
        <i class="fas fa-pencil-alt"></i>
        <span>Drawing ${type}. ${type === "point"
          ? "Click to place point"
          : "Click to add vertices, double-click to complete"
        }.</span>
        <button onclick="cancelBufferDrawing()" style="
          background: white;
          color: var(--primary-color);
          border: none;
          padding: 4px 8px;
          border-radius: 4px;
          margin-left: 12px;
          cursor: pointer;
        ">Cancel</button>
      `;
      document.body.appendChild(indicator);
    }

    // Initialize SketchViewModel if needed
    let sketchViewModel = this.stateManager.getSketchViewModel();
    if (!sketchViewModel) {
      // Get drawingManager from instance
      sketchViewModel = await this.drawingManager.initializeSketchViewModel();
    }

    // Cancel any existing drawing
    if (sketchViewModel) {
      sketchViewModel.cancel();
    }

    const view = this.stateManager.getView();

    this.stateManager.setAnalysisDrawing(true);
    this.stateManager.setAnalysisDrawType(type);

    // Update button states
    document.querySelectorAll(".draw-option-btn").forEach((btn) => {
      btn.classList.remove("active");
      if (btn.getAttribute("onclick")?.includes(type)) {
        btn.classList.add("active");
      }
    });

    const helpText = document.getElementById("bufferDrawHelp");
    if (helpText) {
      helpText.style.display = "block";
    }

    // Clear previous handlers
    if (this.currentBufferHandler) {
      this.currentBufferHandler.remove();
    }

    // Set cursor
    view.container.style.cursor = "crosshair";

    // Set symbology for buffer analysis
    const bufferColor = [0, 122, 255];
    const bufferOpacity = 0.7;

    switch (type) {
      case "point":
        sketchViewModel.pointSymbol = {
          type: "simple-marker",
          style: "circle",
          color: [...bufferColor, bufferOpacity],
          size: 12,
          outline: {
            color: [255, 255, 255, 1],
            width: 2,
          },
        };
        break;
      case "polyline":
        sketchViewModel.polylineSymbol = {
          type: "simple-line",
          color: [...bufferColor, 1],
          width: 3,
          cap: "round",
          join: "round",
        };
        break;
      case "polygon":
        sketchViewModel.polygonSymbol = {
          type: "simple-fill",
          color: [...bufferColor, bufferOpacity * 0.5],
          outline: {
            color: [...bufferColor, 1],
            width: 2,
          },
        };
        break;
    }

    // Set up event handler
    this.currentBufferHandler = sketchViewModel.on("create", (event) => {
      if (event.state === "complete") {
        console.log("Drawing complete:", event);

        // Restore modal
        this.disableDrawingMode("bufferModal");

        // Remove drawing indicator
        const indicator = document.getElementById("drawingIndicator");
        if (indicator) {
          indicator.remove();
        }

        // Reset cursor
        view.container.style.cursor = "default";

        // Add to drawn features
        this.stateManager.addBufferFeature(event.graphic);

        // Show success message
        this.notificationManager.showNotification(`${type} added to buffer analysis`, "success");

        // Update help text to show count
        if (helpText) {
          helpText.innerHTML = `
            <i class="fas fa-check-circle"></i> ${this.stateManager.getDrawnFeatures().buffer.length} feature(s) drawn. 
            Click a tool to draw more or execute analysis.
          `;
        }

        // Clean up
        this.stateManager.setAnalysisDrawing(false);
        this.currentBufferHandler.remove();
      }
    });

    // Start drawing
    try {
      console.log("Creating sketch for:", type);
      sketchViewModel.create(type);
    } catch (error) {
      console.error("Error starting sketch:", error);
      this.notificationManager.showNotification("Error starting drawing", "error");
      this.cancelBufferDrawing();
    }
  }

  /**
   * Cancel buffer drawing
   */
  cancelBufferDrawing() {
    console.log("Canceling buffer drawing");

    // Restore modal
    this.disableDrawingMode("bufferModal");

    // Reset cursor
    const view = this.stateManager.getView();
    if (view) {
      view.container.style.cursor = "default";
    }

    const sketchViewModel = this.stateManager.getSketchViewModel();
    if (sketchViewModel) {
      sketchViewModel.cancel();
    }

    this.stateManager.setAnalysisDrawing(false);

    const indicator = document.getElementById("drawingIndicator");
    if (indicator) {
      indicator.remove();
    }

    if (this.currentBufferHandler) {
      this.currentBufferHandler.remove();
    }

    // Reset button states
    document.querySelectorAll(".draw-option-btn").forEach((btn) => {
      btn.classList.remove("active");
    });
  }

  /**
   * Close buffer modal
   */
  closeBufferModal() {
    // Ensure modal is restored
    this.disableDrawingMode("bufferModal");

    const modal = document.getElementById("bufferModal");
    modal.classList.remove("drawing-active");
    modal.classList.add("hidden");

    // Cancel any active drawing
    const sketchViewModel = this.stateManager.getSketchViewModel();
    if (sketchViewModel) {
      sketchViewModel.cancel();
    }

    // Remove drawing indicator if exists
    const indicator = document.getElementById("drawingIndicator");
    if (indicator) {
      indicator.remove();
    }

    // Clean up handlers
    if (this.currentBufferHandler) {
      this.currentBufferHandler.remove();
    }

    this.stopAnalysisDrawing();
  }

  /**
   * Execute buffer analysis
   */
  async executeBuffer() {
    const distance = parseFloat(document.getElementById("bufferDistance").value);
    const unit = document.getElementById("bufferUnit").value;
    const unionResults = document.getElementById("bufferUnion").checked;

    if (!distance || distance <= 0) {
      this.notificationManager.showNotification("Please enter a valid buffer distance", "error");
      return;
    }

    try {
      this.notificationManager.showNotification("Creating buffers...", "info");

      const [geometryEngine, Graphic] = await Promise.all([
        loadModule("esri/geometry/geometryEngine"),
        loadModule("esri/Graphic"),
      ]);

      let features = [];

      // Find the active button
      const modal = document.getElementById("bufferModal");
      const activeButton = modal.querySelector(".button-group-item.active");
      const isUsingLayer =
        activeButton && activeButton.textContent.includes("From Layer");

      console.log(
        "Active button:",
        activeButton?.textContent,
        "Using layer:",
        isUsingLayer
      );

      if (isUsingLayer) {
        const layerIndex = document.getElementById("bufferLayerSelect").value;
        if (layerIndex === "") {
          this.notificationManager.showNotification("Please select a layer", "error");
          return;
        }

        const layer = this.stateManager.getUploadedLayers()[parseInt(layerIndex)];
        const query = layer.createQuery();
        query.where = "1=1";
        query.returnGeometry = true;

        const result = await layer.queryFeatures(query);
        features = result.features;
      } else {
        if (this.stateManager.getDrawnFeatures().buffer.length === 0) {
          this.notificationManager.showNotification("Please draw at least one feature", "error");
          return;
        }
        features = this.stateManager.getDrawnFeatures().buffer;
      }

      // Convert distance to meters
      let bufferDistance = distance;
      switch (unit) {
        case "kilometers":
          bufferDistance = distance * 1000;
          break;
        case "feet":
          bufferDistance = distance * 0.3048;
          break;
        case "miles":
          bufferDistance = distance * 1609.34;
          break;
      }

      // Create buffers
      const buffers = [];
      features.forEach((feature) => {
        const buffer = geometryEngine.geodesicBuffer(
          feature.geometry,
          bufferDistance,
          "meters"
        );

        if (buffer) {
          buffers.push(buffer);
        }
      });

      // Union buffers if requested
      let finalGeometry;
      if (unionResults && buffers.length > 1) {
        finalGeometry = geometryEngine.union(buffers);
      } else {
        finalGeometry = buffers;
      }

      // Clear previous analysis results
      this.analysisLayer.removeAll();

      // Add buffer graphics
      if (Array.isArray(finalGeometry)) {
        finalGeometry.forEach((geom, index) => {
          const graphic = new Graphic({
            geometry: geom,
            symbol: {
              type: "simple-fill",
              color: [255, 0, 0, 0.2],
              outline: {
                color: [255, 0, 0, 1],
                width: 2,
              },
            },
            attributes: {
              type: "Buffer",
              distance: `${distance} ${unit}`,
              featureIndex: index,
            },
          });
          this.analysisLayer.add(graphic);
        });
      } else {
        const graphic = new Graphic({
          geometry: finalGeometry,
          symbol: {
            type: "simple-fill",
            color: [255, 0, 0, 0.2],
            outline: {
              color: [255, 0, 0, 1],
              width: 2,
            },
          },
          attributes: {
            type: "Buffer",
            distance: `${distance} ${unit}`,
            union: true,
          },
        });
        this.analysisLayer.add(graphic);
      }

      // Zoom to results
      const view = this.stateManager.getView();
      if (this.analysisLayer.graphics.length > 0) {
        await view.goTo(this.analysisLayer.graphics);
      }

      this.closeBufferModal();
      this.notificationManager.showNotification(
        `Created ${this.analysisLayer.graphics.length} buffer(s)`,
        "success"
      );
    } catch (error) {
      console.error("Buffer analysis error:", error);
      this.notificationManager.showNotification("Error creating buffers: " + error.message, "error");
    }
  }

  /**
   * Start intersect analysis
   */
  async startIntersectAnalysis() {
    await this.initializeAnalysisLayer();

    const modal = document.getElementById("intersectModal");

    if (!modal) {
      console.error("Intersect modal not found");
      return;
    }

    // Reset drawn features
    this.stateManager.setIntersectFeature1(null);
    this.stateManager.setIntersectFeature2(null);

    // Populate layer selects
    const polygonLayers = this.stateManager.getUploadedLayers().filter(
      (layer) => layer.geometryType === "polygon"
    );

    ["intersectLayer1Select", "intersectLayer2Select"].forEach((selectId) => {
      const select = document.getElementById(selectId);
      if (select) {
        select.innerHTML = '<option value="">Select a layer...</option>';

        polygonLayers.forEach((layer, index) => {
          const option = document.createElement("option");
          option.value = index;
          option.textContent = layer.title;
          select.appendChild(option);
        });
      }
    });

    // Remove hidden class to show modal
    modal.classList.remove("hidden");
    console.log("Intersect modal opened");
  }

  /**
   * Set intersect source (layer or draw)
   */
  setIntersectSource(featureNum, source) {
    const modal = document.getElementById("intersectModal");
    const sections = modal.querySelectorAll(".feature-section");
    const targetSection = sections[featureNum - 1];

    if (!targetSection) {
      console.error("Could not find feature section for feature", featureNum);
      return;
    }

    // Update button states within this section
    const buttons = targetSection.querySelectorAll(".button-group-item");
    buttons.forEach((btn) => {
      btn.classList.remove("active");
    });

    // Find and activate the correct button
    const activeButton = Array.from(buttons).find((btn) => {
      const buttonText = btn.textContent.toLowerCase();
      return (
        (source === "layer" && buttonText.includes("layer")) ||
        (source === "draw" && buttonText.includes("draw"))
      );
    });

    if (activeButton) {
      activeButton.classList.add("active");
    }

    // Show/hide sections
    const layerSection = document.getElementById(
      `intersectLayer${featureNum}Section`
    );
    const drawSection = document.getElementById(
      `intersectDraw${featureNum}Section`
    );

    if (layerSection && drawSection) {
      if (source === "layer") {
        layerSection.style.display = "block";
        drawSection.style.display = "none";
      } else {
        layerSection.style.display = "none";
        drawSection.style.display = "block";
      }
    }
  }

  /**
   * Start drawing for intersect analysis
   */
  async startIntersectDrawing(featureNum) {
    const modal = document.getElementById("intersectModal");
    modal.classList.add("drawing-active");

    let sketchViewModel = this.stateManager.getSketchViewModel();

    if (!sketchViewModel) {
      sketchViewModel = await this.drawingManager.initializeSketchViewModel();
    }

    // Clear previous drawing for this feature
    if (featureNum === 1 && this.stateManager.getDrawnFeatures().intersect1) {
      this.stateManager.getDrawLayer().remove(this.stateManager.getDrawnFeatures().intersect1);
      this.stateManager.setIntersectFeature1(null);
    } else if (featureNum === 2 && this.stateManager.getDrawnFeatures().intersect2) {
      this.stateManager.getDrawLayer().remove(this.stateManager.getDrawnFeatures().intersect2);
      this.stateManager.setIntersectFeature2(null);
    }

    // Set custom symbology for intersection polygons
    const color = featureNum === 1 ? [255, 0, 0] : [0, 0, 255];
    sketchViewModel.polygonSymbol = {
      type: "simple-fill",
      color: [...color, 0.3],
      outline: {
        color: [...color, 1],
        width: 2,
      },
    };

    // Create drawing indicator
    if (!document.getElementById("intersectDrawingIndicator")) {
      const indicator = document.createElement("div");
      indicator.id = "intersectDrawingIndicator";
      indicator.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: var(--primary-color);
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: var(--shadow-lg);
        z-index: 2000;
        display: flex;
        align-items: center;
        gap: 8px;
      `;
      document.body.appendChild(indicator);
    }

    const indicator = document.getElementById("intersectDrawingIndicator");
    indicator.innerHTML = `
      <i class="fas fa-draw-polygon"></i>
      <span>Drawing polygon ${featureNum}. Click to add vertices, double-click to complete.</span>
      <button onclick="cancelIntersectDrawing()" style="
        background: white;
        color: var(--primary-color);
        border: none;
        padding: 4px 8px;
        border-radius: 4px;
        margin-left: 12px;
        cursor: pointer;
      ">Cancel</button>
    `;

    // Clear previous handler
    if (this.intersectDrawHandler) {
      this.intersectDrawHandler.remove();
    }

    // Set up one-time event listener
    this.intersectDrawHandler = sketchViewModel.on("create", (event) => {
      if (event.state === "complete") {
        // Remove drawing mode
        modal.classList.remove("drawing-active");

        if (featureNum === 1) {
          this.stateManager.setIntersectFeature1(event.graphic);
          document.querySelector("#intersectDraw1Section button").innerHTML =
            '<i class="fas fa-edit"></i> Redraw First Polygon';
        } else {
          this.stateManager.setIntersectFeature2(event.graphic);
          document.querySelector("#intersectDraw2Section button").innerHTML =
            '<i class="fas fa-edit"></i> Redraw Second Polygon';
        }

        // Remove indicator
        const indicatorEl = document.getElementById("intersectDrawingIndicator");
        if (indicatorEl) {
          indicatorEl.remove();
        }

        this.notificationManager.showNotification(`Polygon ${featureNum} drawn successfully`, "success");

        // Remove handler
        this.intersectDrawHandler.remove();
      }
    });

    // Start drawing polygon
    sketchViewModel.create("polygon");
  }

  /**
   * Cancel intersect drawing
   */
  cancelIntersectDrawing() {
    const modal = document.getElementById("intersectModal");
    modal.classList.remove("drawing-active");

    const sketchViewModel = this.stateManager.getSketchViewModel();
    if (sketchViewModel) {
      sketchViewModel.cancel();
    }

    const indicator = document.getElementById("intersectDrawingIndicator");
    if (indicator) {
      indicator.remove();
    }

    if (this.intersectDrawHandler) {
      this.intersectDrawHandler.remove();
    }
  }

  /**
   * Close intersect modal
   */
  closeIntersectModal() {
    const modal = document.getElementById("intersectModal");
    modal.classList.remove("drawing-active");
    modal.classList.add("hidden");

    // Cancel any active drawing
    const sketchViewModel = this.stateManager.getSketchViewModel();
    if (sketchViewModel) {
      sketchViewModel.cancel();
    }

    // Remove drawing indicator if exists
    const indicator = document.getElementById("intersectDrawingIndicator");
    if (indicator) {
      indicator.remove();
    }

    // Clean up handlers
    if (this.intersectDrawHandler) {
      this.intersectDrawHandler.remove();
    }

    this.stopAnalysisDrawing();

    // Clear drawn features if user wants
    if (this.stateManager.getDrawnFeatures().intersect1) {
      this.stateManager.getDrawLayer().remove(this.stateManager.getDrawnFeatures().intersect1);
      this.stateManager.setIntersectFeature1(null);
    }
    if (this.stateManager.getDrawnFeatures().intersect2) {
      this.stateManager.getDrawLayer().remove(this.stateManager.getDrawnFeatures().intersect2);
      this.stateManager.setIntersectFeature2(null);
    }
  }

  /**
   * Execute intersection analysis
   */
  async executeIntersection() {
    try {
      this.notificationManager.showNotification("Performing intersection analysis...", "info");

      const [geometryEngine, Graphic] = await Promise.all([
        loadModule("esri/geometry/geometryEngine"),
        loadModule("esri/Graphic"),
      ]);

      let features1 = [];
      let features2 = [];

      // Get modal and find active buttons correctly
      const modal = document.getElementById("intersectModal");
      const featureSections = modal.querySelectorAll(".feature-section");

      // Check first feature source
      const firstSectionButtons =
        featureSections[0].querySelectorAll(".button-group-item");
      const source1ActiveBtn = Array.from(firstSectionButtons).find((btn) =>
        btn.classList.contains("active")
      );
      const source1IsLayer =
        source1ActiveBtn && source1ActiveBtn.textContent.includes("From Layer");

      console.log(
        "Source 1 - Active button:",
        source1ActiveBtn?.textContent,
        "Is layer:",
        source1IsLayer
      );

      if (source1IsLayer) {
        const layerIndex = document.getElementById("intersectLayer1Select").value;
        if (layerIndex === "") {
          this.notificationManager.showNotification("Please select first layer", "error");
          return;
        }

        const polygonLayers = this.stateManager.getUploadedLayers().filter(
          (layer) => layer.geometryType === "polygon"
        );
        const layer = polygonLayers[parseInt(layerIndex)];

        const query = layer.createQuery();
        query.where = "1=1";
        query.returnGeometry = true;

        const result = await layer.queryFeatures(query);
        features1 = result.features;
      } else {
        if (!this.stateManager.getDrawnFeatures().intersect1) {
          this.notificationManager.showNotification("Please draw the first polygon", "error");
          return;
        }
        features1 = [this.stateManager.getDrawnFeatures().intersect1];
      }

      // Check second feature source
      const secondSectionButtons =
        featureSections[1].querySelectorAll(".button-group-item");
      const source2ActiveBtn = Array.from(secondSectionButtons).find((btn) =>
        btn.classList.contains("active")
      );
      const source2IsLayer =
        source2ActiveBtn && source2ActiveBtn.textContent.includes("From Layer");

      console.log(
        "Source 2 - Active button:",
        source2ActiveBtn?.textContent,
        "Is layer:",
        source2IsLayer
      );

      if (source2IsLayer) {
        const layerIndex = document.getElementById("intersectLayer2Select").value;
        if (layerIndex === "") {
          this.notificationManager.showNotification("Please select second layer", "error");
          return;
        }

        const polygonLayers = this.stateManager.getUploadedLayers().filter(
          (layer) => layer.geometryType === "polygon"
        );
        const layer = polygonLayers[parseInt(layerIndex)];

        const query = layer.createQuery();
        query.where = "1=1";
        query.returnGeometry = true;

        const result = await layer.queryFeatures(query);
        features2 = result.features;
      } else {
        if (!this.stateManager.getDrawnFeatures().intersect2) {
          this.notificationManager.showNotification("Please draw the second polygon", "error");
          return;
        }
        features2 = [this.stateManager.getDrawnFeatures().intersect2];
      }

      // Clear previous results
      this.analysisLayer.removeAll();

      // Check if user wants to keep non-intersecting parts
      const keepNonIntersecting = document.getElementById(
        "keepNonIntersecting"
      ).checked;

      // Perform intersection and difference analysis
      let intersectionCount = 0;
      let allIntersections = [];
      let allFeatures1 = [];
      let allFeatures2 = [];

      // Collect all geometries for union later
      features1.forEach((feature) => allFeatures1.push(feature.geometry));
      features2.forEach((feature) => allFeatures2.push(feature.geometry));

      // Perform intersections
      features1.forEach((feature1) => {
        features2.forEach((feature2) => {
          const intersection = geometryEngine.intersect(
            feature1.geometry,
            feature2.geometry
          );

          if (intersection) {
            allIntersections.push(intersection);

            // Add intersection graphic
            const graphic = new Graphic({
              geometry: intersection,
              symbol: {
                type: "simple-fill",
                color: [0, 255, 0, 0.5],
                outline: {
                  color: [0, 150, 0, 1],
                  width: 3,
                },
              },
              attributes: {
                type: "Intersection",
                analysisType: "Intersecting Area",
                source1: source1IsLayer ? "Layer" : "Drawn",
                source2: source2IsLayer ? "Layer" : "Drawn",
              },
            });
            this.analysisLayer.add(graphic);
            intersectionCount++;
          }
        });
      });

      // If user wants non-intersecting parts
      if (keepNonIntersecting && allIntersections.length > 0) {
        // Union all intersections
        let unionedIntersections =
          allIntersections.length > 1
            ? geometryEngine.union(allIntersections)
            : allIntersections[0];

        // Calculate non-intersecting parts for features1
        features1.forEach((feature1, index) => {
          try {
            const difference = geometryEngine.difference(
              feature1.geometry,
              unionedIntersections
            );
            if (difference) {
              const graphic = new Graphic({
                geometry: difference,
                symbol: {
                  type: "simple-fill",
                  color: [255, 0, 0, 0.3],
                  outline: {
                    color: [200, 0, 0, 0.8],
                    width: 2,
                    style: "dash",
                  },
                },
                attributes: {
                  type: "Non-Intersection",
                  analysisType: "Non-Intersecting Area (Set 1)",
                  featureIndex: index,
                  source: source1IsLayer ? "Layer 1" : "Drawn 1",
                },
              });
              this.analysisLayer.add(graphic);
            }
          } catch (e) {
            console.warn("Error calculating difference for feature1:", e);
          }
        });

        // Calculate non-intersecting parts for features2
        features2.forEach((feature2, index) => {
          try {
            const difference = geometryEngine.difference(
              feature2.geometry,
              unionedIntersections
            );
            if (difference) {
              const graphic = new Graphic({
                geometry: difference,
                symbol: {
                  type: "simple-fill",
                  color: [0, 0, 255, 0.3],
                  outline: {
                    color: [0, 0, 200, 0.8],
                    width: 2,
                    style: "dash",
                  },
                },
                attributes: {
                  type: "Non-Intersection",
                  analysisType: "Non-Intersecting Area (Set 2)",
                  featureIndex: index,
                  source: source2IsLayer ? "Layer 2" : "Drawn 2",
                },
              });
              this.analysisLayer.add(graphic);
            }
          } catch (e) {
            console.warn("Error calculating difference for feature2:", e);
          }
        });
      }

      // Clear drawn features from draw layer
      if (!source1IsLayer && this.stateManager.getDrawnFeatures().intersect1) {
        this.stateManager.getDrawLayer().remove(this.stateManager.getDrawnFeatures().intersect1);
      }
      if (!source2IsLayer && this.stateManager.getDrawnFeatures().intersect2) {
        this.stateManager.getDrawLayer().remove(this.stateManager.getDrawnFeatures().intersect2);
      }

      // Report results
      const view = this.stateManager.getView();
      if (intersectionCount > 0) {
        await view.goTo(this.analysisLayer.graphics);

        let message = `Found ${intersectionCount} intersection(s)`;
        if (keepNonIntersecting) {
          const totalGraphics = this.analysisLayer.graphics.length;
          const nonIntersectingCount = totalGraphics - intersectionCount;
          message += ` and ${nonIntersectingCount} non-intersecting area(s)`;
        }
        this.notificationManager.showNotification(message, "success");

        // Update layer list to show breakdown
        this.layerManager.updateLayerList();
      } else {
        this.notificationManager.showNotification("No intersections found", "info");

        // If no intersections but user wants to see non-intersecting parts, show original polygons
        if (keepNonIntersecting) {
          features1.forEach((feature, index) => {
            const graphic = new Graphic({
              geometry: feature.geometry,
              symbol: {
                type: "simple-fill",
                color: [255, 0, 0, 0.3],
                outline: {
                  color: [200, 0, 0, 0.8],
                  width: 2,
                  style: "dash",
                },
              },
              attributes: {
                type: "Non-Intersection",
                analysisType: "Original Polygon (Set 1)",
                featureIndex: index,
              },
            });
            this.analysisLayer.add(graphic);
          });

          features2.forEach((feature, index) => {
            const graphic = new Graphic({
              geometry: feature.geometry,
              symbol: {
                type: "simple-fill",
                color: [0, 0, 255, 0.3],
                outline: {
                  color: [0, 0, 200, 0.8],
                  width: 2,
                  style: "dash",
                },
              },
              attributes: {
                type: "Non-Intersection",
                analysisType: "Original Polygon (Set 2)",
                featureIndex: index,
              },
            });
            this.analysisLayer.add(graphic);
          });

          await view.goTo(this.analysisLayer.graphics);
        }
      }

      this.closeIntersectModal();
    } catch (error) {
      console.error("Intersection error:", error);
      this.notificationManager.showNotification("Error performing intersection", "error");
    }
  }

  /**
   * Start distance analysis
   */
  async startDistanceAnalysis() {
    await this.initializeAnalysisLayer();

    const panel = document.getElementById("distancePanel");
    if (!panel) return;

    panel.classList.remove("hidden");

    // Reset the panel content with both options
    const panelContent = panel.querySelector(".widget-content");
    panelContent.innerHTML = `
      <div class="button-group" style="margin-bottom: 12px;">
        <button class="button-group-item active" onclick="setDistanceSource('select')">
          <i class="fas fa-mouse-pointer"></i> Select Features
        </button>
        <button class="button-group-item" onclick="setDistanceSource('draw')">
          <i class="fas fa-map-marker-alt"></i> Draw Points
        </button>
      </div>
      <p class="help-text" id="distanceHelp">Click on two features to measure distance</p>
      <div id="distanceResult" class="analysis-result"></div>
      <button class="action-btn secondary" onclick="clearDistanceMeasurement()">
        Clear Measurement
      </button>
    `;

    this.distanceMeasurementActive = true;
    this.distanceFeatures = [];

    // Set up click handler for feature selection
    if (this.distanceClickHandler) {
      this.distanceClickHandler.remove();
    }

    const view = this.stateManager.getView();
    this.distanceClickHandler = view.on("click", (event) => this.handleDistanceClick(event));
    view.container.style.cursor = "crosshair";
  }

  /**
   * Set distance source (select or draw)
   */
  async setDistanceSource(source) {
    const buttons = document.querySelectorAll(
      "#distancePanel .button-group-item"
    );
    buttons.forEach((btn) => btn.classList.remove("active"));

    // Find and activate the clicked button
    const activeButton = Array.from(buttons).find((btn) =>
      btn.getAttribute("onclick").includes(source)
    );
    if (activeButton) {
      activeButton.classList.add("active");
    }

    const helpText = document.getElementById("distanceHelp");
    this.distanceFeatures = [];

    // Clear any existing graphics
    const distanceGraphics = this.analysisLayer.graphics.filter(
      (g) => g.attributes && g.attributes.type === "Distance Measurement"
    );
    this.analysisLayer.removeMany(distanceGraphics.toArray());

    const view = this.stateManager.getView();

    if (source === "draw") {
      helpText.textContent =
        "Click on map to place two points for distance measurement";

      // Remove click handler for feature selection
      if (this.distanceClickHandler) {
        this.distanceClickHandler.remove();
      }

      // Initialize sketch for point drawing
      let sketchViewModel = this.stateManager.getSketchViewModel();
      if (!sketchViewModel) {
        sketchViewModel = await this.drawingManager.initializeSketchViewModel();
      }

      // Clear any previous distance drawing handler
      if (this.distanceDrawHandler) {
        this.distanceDrawHandler.remove();
      }

      let pointCount = 0;
      const tempPoints = [];

      // Set point symbol for distance measurement
      sketchViewModel.pointSymbol = {
        type: "simple-marker",
        style: "circle",
        color: [255, 0, 255, 0.8],
        size: 12,
        outline: {
          color: [255, 255, 255, 1],
          width: 2,
        },
      };

      this.distanceDrawHandler = sketchViewModel.on("create", async (event) => {
        if (event.state === "complete" && event.tool === "point") {
          tempPoints.push(event.graphic);
          pointCount++;

          if (pointCount === 1) {
            helpText.textContent = "Click to place the second point";
            // Start drawing another point
            sketchViewModel.create("point");
          } else if (pointCount === 2) {
            // Calculate distance using the two points
            this.distanceFeatures = tempPoints;
            await this.calculateDistance();

            // Clean up
            this.distanceDrawHandler.remove();
            view.container.style.cursor = "default";
            helpText.textContent = "Distance calculated";
          }
        }
      });

      // Start drawing first point
      sketchViewModel.create("point");
    } else {
      helpText.textContent = "Click on two features to measure distance";

      // Remove drawing handler
      if (this.distanceDrawHandler) {
        this.distanceDrawHandler.remove();
      }

      // Re-enable click handler for feature selection
      if (this.distanceClickHandler) {
        this.distanceClickHandler.remove();
      }
      this.distanceClickHandler = view.on("click", (event) => this.handleDistanceClick(event));
    }
  }

  /**
   * Handle distance click for feature selection
   */
  async handleDistanceClick(event) {
    if (!this.distanceMeasurementActive) return;

    const view = this.stateManager.getView();
    const response = await view.hitTest(event);
    const results = response.results.filter(
      (r) => r.graphic && r.graphic.layer && r.graphic.geometry
    );

    if (results.length > 0) {
      // Add visual indicator for selected feature
      const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);

      const selectedGraphic = new Graphic({
        geometry: results[0].graphic.geometry,
        symbol: {
          type:
            results[0].graphic.geometry.type === "point"
              ? "simple-marker"
              : "simple-fill",
          color: [255, 0, 255, 0.3],
          outline: {
            color: [255, 0, 255, 1],
            width: 2,
          },
        },
        attributes: {
          type: "Distance Selection",
        },
      });

      view.graphics.add(selectedGraphic);
      this.distanceFeatures.push(results[0].graphic);

      if (this.distanceFeatures.length === 1) {
        this.notificationManager.showNotification(
          "First feature selected. Click another feature.",
          "info"
        );
      } else if (this.distanceFeatures.length === 2) {
        // Clear selection graphics
        const selectionGraphics = view.graphics.items.filter(
          (g) => g.attributes && g.attributes.type === "Distance Selection"
        );
        view.graphics.removeMany(selectionGraphics);

        await this.calculateDistance();
      }
    }
  }

  /**
   * Calculate distance between two features
   */
  async calculateDistance() {
    try {
      const [geometryEngine, Graphic, Polyline] = await Promise.all([
        loadModule("esri/geometry/geometryEngine"),
        loadModule("esri/Graphic"),
        loadModule("esri/geometry/Polyline"),
      ]);

      const geom1 = this.distanceFeatures[0].geometry;
      const geom2 = this.distanceFeatures[1].geometry;

      // Get centroids for non-point geometries
      const point1 =
        geom1.type === "point" ? geom1 : geom1.centroid || geom1.extent.center;
      const point2 =
        geom2.type === "point" ? geom2 : geom2.centroid || geom2.extent.center;

      const view = this.stateManager.getView();

      // Calculate distance
      const distance = geometryEngine.geodesicLength(
        new Polyline({
          paths: [
            [
              [point1.x, point1.y],
              [point2.x, point2.y],
            ],
          ],
          spatialReference: view.spatialReference,
        }),
        "meters"
      );

      // Display result
      let distanceText;
      if (distance > 1000) {
        distanceText = `${(distance / 1000).toFixed(2)} km`;
      } else {
        distanceText = `${distance.toFixed(2)} m`;
      }

      document.getElementById("distanceResult").innerHTML = `
        <strong>Distance:</strong> &nbsp; ${distanceText}
      `;

      // Clear previous distance lines
      const previousLines = this.analysisLayer.graphics.filter(
        (g) => g.attributes && g.attributes.type === "Distance Measurement"
      );
      this.analysisLayer.removeMany(previousLines.toArray());

      // Draw line between features
      const line = new Polyline({
        paths: [
          [
            [point1.x, point1.y],
            [point2.x, point2.y],
          ],
        ],
        spatialReference: view.spatialReference,
      });

      const lineGraphic = new Graphic({
        geometry: line,
        symbol: {
          type: "simple-line",
          color: [255, 0, 255, 1],
          width: 3,
          style: "dash",
        },
        attributes: {
          type: "Distance Measurement",
          distance: distanceText,
        },
      });

      this.analysisLayer.add(lineGraphic);

      // Reset for next measurement
      this.distanceFeatures = [];
      this.distanceMeasurementActive = true; // Keep active for continuous measurement

      // Update help text
      const helpText = document.getElementById("distanceHelp");
      if (helpText) {
        helpText.textContent =
          "Distance calculated. Click two more features to measure again.";
      }
    } catch (error) {
      console.error("Distance calculation error:", error);
      this.notificationManager.showNotification("Error calculating distance", "error");
    }
  }

  /**
   * Close distance panel
   */
  closeDistancePanel() {
    document.getElementById("distancePanel").classList.add("hidden");
    this.clearDistanceMeasurement();
  }

  /**
   * Clear distance measurement
   */
  clearDistanceMeasurement() {
    this.distanceMeasurementActive = false;
    this.distanceFeatures = [];
    const view = this.stateManager.getView();
    view.container.style.cursor = "default";
    document.getElementById("distanceResult").innerHTML = "";

    // Remove distance lines from analysis layer
    const distanceGraphics = this.analysisLayer.graphics.filter(
      (g) => g.attributes && g.attributes.type === "Distance Measurement"
    );
    this.analysisLayer.removeMany(distanceGraphics.toArray());
  }

  /**
   * Start area analysis
   */
  async startAreaAnalysis() {
    await this.initializeAnalysisLayer();

    const polygonLayers = this.stateManager.getUploadedLayers().filter(
      (layer) =>
        layer.geometryType === "polygon" ||
        (layer.graphics &&
          layer.graphics.length > 0 &&
          layer.graphics.getItemAt(0).geometry.type === "polygon")
    );

    if (polygonLayers.length === 0) {
      this.notificationManager.showNotification("No polygon layers found", "error");
      return;
    }

    try {
      const [geometryEngine] = await Promise.all([
        loadModule("esri/geometry/geometryEngine"),
      ]);

      let totalArea = 0;
      let featureCount = 0;

      for (const layer of polygonLayers) {
        const query = layer.createQuery();
        query.where = "1=1";
        query.returnGeometry = true;

        const result = await layer.queryFeatures(query);

        result.features.forEach((feature) => {
          if (feature.geometry && feature.geometry.type === "polygon") {
            const area = geometryEngine.geodesicArea(
              feature.geometry,
              "square-meters"
            );
            totalArea += Math.abs(area);
            featureCount++;
          }
        });
      }

      // Display results
      let areaText;
      if (totalArea > 1000000) {
        areaText = `${(totalArea / 1000000).toFixed(2)} km²`;
      } else if (totalArea > 10000) {
        areaText = `${(totalArea / 10000).toFixed(2)} hectares`;
      } else {
        areaText = `${totalArea.toFixed(2)} m²`;
      }

      this.notificationManager.showNotification(
        `Total area of ${featureCount} polygons: ${areaText}`,
        "success"
      );
    } catch (error) {
      console.error("Area calculation error:", error);
      this.notificationManager.showNotification("Error calculating area", "error");
    }
  }

  /**
   * Stop analysis drawing
   */
  stopAnalysisDrawing() {
    const sketchViewModel = this.stateManager.getSketchViewModel();

    this.stateManager.setAnalysisDrawing(false);
    this.stateManager.setAnalysisDrawType(null);

    // Cancel any active sketching
    if (sketchViewModel) {
      sketchViewModel.cancel();
    }

    // Remove event handlers
    if (this.analysisHandles) {
      this.analysisHandles.forEach((handle) => handle.remove());
      this.analysisHandles = [];
    }

    // Reset drawing tool buttons
    document
      .querySelectorAll(".draw-mini-btn")
      .forEach((btn) => btn.classList.remove("active"));
  }

  /**
   * Disable drawing mode (restore modal)
   */
  disableDrawingMode(modalId) {
    const modal = document.getElementById(modalId);
    const tempContainer = document.getElementById("tempModalContainer");
    const modalContent = tempContainer?.querySelector(".modal-content");

    if (modalContent && modal.getAttribute("data-drawing") === "true") {
      modal.style.display = "";
      modal.appendChild(modalContent);
      modal.removeAttribute("data-drawing");

      // Clean up temp container
      if (tempContainer && tempContainer.children.length === 0) {
        tempContainer.remove();
      }
    }
  }

  /**
   * Get the analysis layer
   */
  getAnalysisLayer() {
    return this.analysisLayer;
  }
}
