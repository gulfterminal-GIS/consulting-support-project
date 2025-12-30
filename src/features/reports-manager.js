/**
 * ReportsManager - Generates statistical reports for layers and regions
 * 
 * Features:
 * - Layer/Region selection
 * - Statistical analysis (min, max, count, avg, sum)
 * - Interactive charts (bar, pie, line)
 * - PDF export with charts
 * - Excel export
 * - Beautiful report templates
 */

import { loadModule } from "../core/module-loader.js";

export class ReportsManager {
  constructor(stateManager, notificationManager, layerManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.layerManager = layerManager;
    
    // Report state
    this.currentReport = null;
    this.charts = [];
  }

  /**
   * Initialize reports panel
   */
  initializeReportsPanel() {
    // Populate region selection
    this.populateRegionSelection();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Populate region selection
   */
  populateRegionSelection() {
    const regionSelect = document.getElementById("reportRegionSelect");
    
    if (!regionSelect) return;
    
    // Clear existing options (keep the default options from HTML)
    // The HTML already has the regions, so we don't need to populate them
  }

  /**
   * Populate layer selection based on region
   */
  populateLayerSelection(region) {
    const layerSelect = document.getElementById("reportLayerSelect");
    
    if (!layerSelect) return;
    
    if (!region || region === "") {
      // No region selected - disable layer select
      layerSelect.disabled = true;
      layerSelect.innerHTML = '<option value="">اختر منطقة أولاً...</option>';
      return;
    }
    
    if (region === "all") {
      // All regions selected - show all layers
      layerSelect.disabled = false;
      layerSelect.innerHTML = '<option value="">جميع الطبقات</option>';
      
      const uploadedLayers = this.stateManager.getUploadedLayers();
      uploadedLayers.forEach((layer, index) => {
        const option = document.createElement("option");
        option.value = `layer-${index}`;
        option.textContent = layer.title;
        layerSelect.appendChild(option);
      });
      return;
    }
    
    // Specific region selected - show only layers from that region
    layerSelect.disabled = false;
    layerSelect.innerHTML = '<option value="">جميع طبقات المنطقة</option>';
    
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
        option.value = `layer-${globalIndex}`;
        option.textContent = childLayer.title;
        layerSelect.appendChild(option);
      }
    });
    
    console.log(`✅ Populated ${childLayers.length} layers for region: ${region}`);
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const generateBtn = document.getElementById("generateReportBtn");
    const layerSelect = document.getElementById("reportLayerSelect");
    const regionSelect = document.getElementById("reportRegionSelect");
    
    if (generateBtn) {
      generateBtn.addEventListener("click", () => this.generateReport());
    }
    
    // Region selection triggers layer population
    if (regionSelect) {
      regionSelect.addEventListener("change", (e) => {
        this.populateLayerSelection(e.target.value);
      });
    }
  }

  /**
   * Generate report based on selection
   */
  async generateReport() {
    const layerSelect = document.getElementById("reportLayerSelect");
    const regionSelect = document.getElementById("reportRegionSelect");
    
    const layerValue = layerSelect?.value;
    const regionValue = regionSelect?.value;
    
    if (!regionValue) {
      this.notificationManager.showNotification(
        "الرجاء اختيار منطقة",
        "warning"
      );
      return;
    }

    try {
      this.notificationManager.showNotification("جاري إنشاء التقرير...", "info");
      
      let layers = [];
      let reportTitle = "";
      
      if (layerValue && layerValue !== "") {
        // Single layer report
        const index = parseInt(layerValue.split("-")[1]);
        const layer = this.stateManager.getUploadedLayers()[index];
        layers = [layer];
        reportTitle = `تقرير: ${layer.title}`;
      } else if (regionValue === "all") {
        // All regions report
        layers = this.stateManager.getUploadedLayers();
        reportTitle = "تقرير: جميع المناطق";
      } else {
        // Specific region report (all layers in that region)
        const map = this.stateManager.getMap();
        let regionGroupLayer = null;
        
        map.layers.forEach(layer => {
          if (layer.type === 'group' && layer.title === regionValue) {
            regionGroupLayer = layer;
          }
        });
        
        if (regionGroupLayer) {
          layers = regionGroupLayer.layers.toArray();
          reportTitle = `تقرير: ${regionValue}`;
        } else {
          throw new Error(`Region not found: ${regionValue}`);
        }
      }
      
      if (layers.length === 0) {
        this.notificationManager.showNotification(
          "لا توجد طبقات للتقرير",
          "warning"
        );
        return;
      }
      
      // Analyze layers
      const reportData = await this.analyzeLayers(layers, reportTitle);
      
      // Display report
      this.displayReport(reportData);
      
      this.notificationManager.showNotification(
        "تم إنشاء التقرير بنجاح",
        "success"
      );
    } catch (error) {
      console.error("Error generating report:", error);
      this.notificationManager.showNotification(
        "حدث خطأ في إنشاء التقرير",
        "error"
      );
    }
  }

  /**
   * Analyze layers and generate statistics
   */
  async analyzeLayers(layers, title) {
    const reportData = {
      title: title,
      generatedAt: new Date(),
      layers: [],
      summary: {
        totalLayers: layers.length,
        totalFeatures: 0,
        totalArea: 0,
        geometryTypes: {}
      }
    };

    for (const layer of layers) {
      try {
        const query = layer.createQuery();
        query.where = "1=1";
        query.outFields = ["*"];
        query.returnGeometry = true;
        
        const result = await layer.queryFeatures(query);
        const features = result.features;
        
        // Layer statistics
        const layerStats = {
          name: layer.title,
          featureCount: features.length,
          geometryType: layer.geometryType,
          fields: [],
          extent: layer.fullExtent
        };
        
        // Update summary
        reportData.summary.totalFeatures += features.length;
        reportData.summary.geometryTypes[layer.geometryType] = 
          (reportData.summary.geometryTypes[layer.geometryType] || 0) + features.length;
        
        // Analyze fields
        if (layer.fields && features.length > 0) {
          for (const field of layer.fields) {
            if (field.name === 'OBJECTID' || field.name === 'FID') continue;
            
            const fieldStats = await this.analyzeField(features, field);
            if (fieldStats) {
              layerStats.fields.push(fieldStats);
            }
          }
        }
        
        // Calculate total area for polygons
        if (layer.geometryType === 'polygon') {
          const [geometryEngine] = await Promise.all([
            loadModule("esri/geometry/geometryEngine")
          ]);
          
          let totalArea = 0;
          for (const feature of features) {
            // Check if geometry exists and is valid
            if (feature.geometry && feature.geometry.spatialReference) {
              try {
                const area = geometryEngine.geodesicArea(feature.geometry, "square-meters");
                if (!isNaN(area) && area > 0) {
                  totalArea += area;
                }
              } catch (geoError) {
                console.warn(`Error calculating area for feature in ${layer.title}:`, geoError);
              }
            }
          }
          layerStats.totalArea = totalArea;
          reportData.summary.totalArea += totalArea;
        }
        
        reportData.layers.push(layerStats);
      } catch (error) {
        console.warn(`Error analyzing layer ${layer.title}:`, error);
      }
    }
    
    return reportData;
  }

  /**
   * Analyze individual field statistics
   */
  async analyzeField(features, field) {
    const values = features.map(f => f.attributes[field.name])
      .filter(v => v !== null && v !== undefined && v !== '');
    
    if (values.length === 0) return null;
    
    const fieldStats = {
      name: field.name,
      alias: field.alias || field.name,
      type: field.type,
      count: values.length,
      nullCount: features.length - values.length
    };
    
    // Numeric field statistics
    if (['double', 'integer', 'single', 'small-integer'].includes(field.type)) {
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      
      if (numericValues.length > 0) {
        fieldStats.min = Math.min(...numericValues);
        fieldStats.max = Math.max(...numericValues);
        fieldStats.avg = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
        fieldStats.sum = numericValues.reduce((a, b) => a + b, 0);
        fieldStats.median = this.calculateMedian(numericValues);
      }
    }
    
    // String field statistics (unique values, most common)
    if (field.type === 'string') {
      const uniqueValues = [...new Set(values)];
      fieldStats.uniqueCount = uniqueValues.length;
      
      // Count occurrences
      const valueCounts = {};
      values.forEach(v => {
        valueCounts[v] = (valueCounts[v] || 0) + 1;
      });
      
      // Get top 10 most common values
      fieldStats.topValues = Object.entries(valueCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([value, count]) => ({ value, count }));
    }
    
    return fieldStats;
  }

  /**
   * Calculate median value
   */
  calculateMedian(values) {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  /**
   * Display report in modal
   */
  displayReport(reportData) {
    this.currentReport = reportData;
    
    const modal = document.getElementById("reportModal");
    const content = document.getElementById("reportContent");
    
    if (!modal || !content) return;
    
    // Clear previous charts
    this.destroyCharts();
    
    // Generate report HTML
    let html = this.generateReportHTML(reportData);
    content.innerHTML = html;
    
    // Show modal
    modal.classList.remove("hidden");
    
    // Generate charts after DOM is ready
    setTimeout(() => {
      this.generateCharts(reportData);
    }, 100);
  }

  /**
   * Generate report HTML
   */
  generateReportHTML(data) {
    const date = data.generatedAt.toLocaleDateString('ar-SA');
    const time = data.generatedAt.toLocaleTimeString('ar-SA');
    
    let html = `
      <div class="report-header">
        <h2>${data.title}</h2>
        <div class="report-meta">
          <span><i class="fas fa-calendar"></i> ${date}</span>
          <span><i class="fas fa-clock"></i> ${time}</span>
        </div>
      </div>
      
      <div class="report-summary">
        <h3><i class="fas fa-chart-bar"></i> ملخص عام</h3>
        <div class="summary-grid">
          <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-layer-group"></i></div>
            <div class="summary-value">${data.summary.totalLayers}</div>
            <div class="summary-label">عدد الطبقات</div>
          </div>
          <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-map-marker-alt"></i></div>
            <div class="summary-value">${data.summary.totalFeatures.toLocaleString()}</div>
            <div class="summary-label">إجمالي القطع</div>
          </div>
    `;
    
    if (data.summary.totalArea > 0) {
      const areaKm2 = (data.summary.totalArea / 1000000).toFixed(2);
      const areaHectares = (data.summary.totalArea / 10000).toFixed(2);
      html += `
          <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-vector-square"></i></div>
            <div class="summary-value">${parseFloat(areaKm2).toLocaleString()}</div>
            <div class="summary-label">المساحة الإجمالية (كم²)</div>
          </div>
          <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-expand"></i></div>
            <div class="summary-value">${parseFloat(areaHectares).toLocaleString()}</div>
            <div class="summary-label">المساحة (هكتار)</div>
          </div>
      `;
    }
    
    // Calculate average features per layer
    const avgFeaturesPerLayer = (data.summary.totalFeatures / data.summary.totalLayers).toFixed(0);
    html += `
          <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-chart-line"></i></div>
            <div class="summary-value">${parseFloat(avgFeaturesPerLayer).toLocaleString()}</div>
            <div class="summary-label">متوسط القطع لكل طبقة</div>
          </div>
    `;
    
    // Add density insight
    if (data.summary.totalArea > 0) {
      const densityPerKm2 = (data.summary.totalFeatures / (data.summary.totalArea / 1000000)).toFixed(2);
      html += `
          <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-th"></i></div>
            <div class="summary-value">${parseFloat(densityPerKm2).toLocaleString()}</div>
            <div class="summary-label">كثافة القطع (قطعة/كم²)</div>
          </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;

    // Charts section with 6 charts
    html += `
      <div class="report-charts">
        <h3><i class="fas fa-chart-pie"></i> الرسوم البيانية والتحليلات</h3>
        <div class="charts-grid">
          <div class="chart-container">
            <h4>توزيع أنواع الهندسة</h4>
            <canvas id="geometryChart"></canvas>
          </div>
          <div class="chart-container">
            <h4>توزيع القطع حسب الطبقة</h4>
            <canvas id="layerDistributionChart"></canvas>
          </div>
          <div class="chart-container">
            <h4>توزيع المساحات حسب الطبقة</h4>
            <canvas id="areaDistributionChart"></canvas>
          </div>
          <div class="chart-container">
            <h4>مقارنة الطبقات (القطع والمساحة)</h4>
            <canvas id="layerComparisonChart"></canvas>
          </div>
          <div class="chart-container">
            <h4>متوسط مساحة القطعة لكل طبقة</h4>
            <canvas id="avgAreaChart"></canvas>
          </div>
          <div class="chart-container">
            <h4>كثافة القطع حسب الطبقة</h4>
            <canvas id="densityChart"></canvas>
          </div>
        </div>
      </div>
    `;
    
    // Layer details with enhanced insights
    html += `<div class="report-layers">`;
    html += `<h3><i class="fas fa-list"></i> تفاصيل الطبقات</h3>`;
    
    data.layers.forEach((layer, index) => {
      const avgAreaPerFeature = layer.totalArea ? (layer.totalArea / layer.featureCount / 10000).toFixed(2) : 0;
      const areaKm2 = layer.totalArea ? (layer.totalArea / 1000000).toFixed(2) : 0;
      const areaHectares = layer.totalArea ? (layer.totalArea / 10000).toFixed(2) : 0;
      const densityPerKm2 = layer.totalArea ? (layer.featureCount / (layer.totalArea / 1000000)).toFixed(2) : 0;
      
      html += `
        <div class="layer-section">
          <h4><i class="fas fa-layer-group"></i> ${layer.name}</h4>
          <div class="layer-info">
            <div class="info-item">
              <span class="info-label"><i class="fas fa-map-marker-alt"></i> عدد القطع</span>
              <span class="info-value">${layer.featureCount.toLocaleString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-shapes"></i> نوع الهندسة</span>
              <span class="info-value">${this.translateGeometryType(layer.geometryType)}</span>
            </div>
      `;
      
      if (layer.totalArea) {
        html += `
            <div class="info-item">
              <span class="info-label"><i class="fas fa-vector-square"></i> المساحة الإجمالية</span>
              <span class="info-value">${parseFloat(areaKm2).toLocaleString()} كم²</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-expand"></i> المساحة بالهكتار</span>
              <span class="info-value">${parseFloat(areaHectares).toLocaleString()} هكتار</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-chart-area"></i> متوسط مساحة القطعة</span>
              <span class="info-value">${parseFloat(avgAreaPerFeature).toLocaleString()} هكتار</span>
            </div>
            <div class="info-item">
              <span class="info-label"><i class="fas fa-th"></i> كثافة القطع</span>
              <span class="info-value">${parseFloat(densityPerKm2).toLocaleString()} قطعة/كم²</span>
            </div>
        `;
      }
      
      // Add percentage of total
      const percentOfTotal = ((layer.featureCount / data.summary.totalFeatures) * 100).toFixed(1);
      html += `
            <div class="info-item">
              <span class="info-label"><i class="fas fa-percentage"></i> نسبة من الإجمالي</span>
              <span class="info-value">${percentOfTotal}%</span>
            </div>
      `;
      
      if (layer.totalArea && data.summary.totalArea > 0) {
        const areaPercentOfTotal = ((layer.totalArea / data.summary.totalArea) * 100).toFixed(1);
        html += `
            <div class="info-item">
              <span class="info-label"><i class="fas fa-chart-pie"></i> نسبة المساحة من الإجمالي</span>
              <span class="info-value">${areaPercentOfTotal}%</span>
            </div>
        `;
      }
      
      html += `</div></div>`;
    });
    
    html += `</div>`;
    
    return html;
  }

  /**
   * Translate geometry type to Arabic
   */
  translateGeometryType(type) {
    const translations = {
      'point': 'نقطة',
      'polyline': 'خط',
      'polygon': 'مضلع',
      'multipoint': 'نقاط متعددة'
    };
    return translations[type] || type;
  }

  /**
   * Translate field type to Arabic
   */
  translateFieldType(type) {
    const translations = {
      'string': 'نص',
      'integer': 'رقم صحيح',
      'double': 'رقم عشري',
      'date': 'تاريخ',
      'oid': 'معرف'
    };
    return translations[type] || type;
  }

  /**
   * Generate charts using Chart.js
   */
  generateCharts(data) {
    // Geometry type distribution chart
    this.createGeometryChart(data);
    
    // Layer distribution chart
    this.createLayerDistributionChart(data);
    
    // Area distribution chart
    this.createAreaDistributionChart(data);
    
    // Layer comparison chart
    this.createLayerComparisonChart(data);
    
    // Average area per feature chart
    this.createAvgAreaChart(data);
    
    // Density chart
    this.createDensityChart(data);
  }

  /**
   * Create geometry type distribution chart
   */
  createGeometryChart(data) {
    const canvas = document.getElementById('geometryChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    const geometryData = data.summary.geometryTypes;
    
    const chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: Object.keys(geometryData).map(k => this.translateGeometryType(k)),
        datasets: [{
          data: Object.values(geometryData),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: false
          },
          legend: {
            position: 'bottom',
            labels: {
              color: '#fff',
              font: { 
                size: 13, 
                family: 'Avenir Next, Arial',
                weight: '500'
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            titleFont: {
              size: 14,
              family: 'Avenir Next, Arial'
            },
            bodyFont: {
              size: 13,
              family: 'Avenir Next, Arial'
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  /**
   * Create layer distribution chart
   */
  createLayerDistributionChart(data) {
    const canvas = document.getElementById('layerDistributionChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.layers.map(l => l.name),
        datasets: [{
          label: 'عدد القطع',
          data: data.layers.map(l => l.featureCount),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            titleFont: {
              size: 14,
              family: 'Avenir Next, Arial'
            },
            bodyFont: {
              size: 13,
              family: 'Avenir Next, Arial'
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#fff',
              font: {
                size: 12,
                family: 'Avenir Next, Arial'
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#fff',
              font: {
                size: 11,
                family: 'Avenir Next, Arial'
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  /**
   * Create area distribution chart
   */
  createAreaDistributionChart(data) {
    const canvas = document.getElementById('areaDistributionChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    
    // Filter layers with area data
    const layersWithArea = data.layers.filter(l => l.totalArea > 0);
    
    if (layersWithArea.length === 0) return;
    
    const chart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: layersWithArea.map(l => l.name),
        datasets: [{
          label: 'المساحة (كم²)',
          data: layersWithArea.map(l => (l.totalArea / 1000000).toFixed(2)),
          backgroundColor: [
            'rgba(255, 99, 132, 0.8)',
            'rgba(54, 162, 235, 0.8)',
            'rgba(255, 206, 86, 0.8)',
            'rgba(75, 192, 192, 0.8)',
            'rgba(153, 102, 255, 0.8)',
            'rgba(255, 159, 64, 0.8)',
            'rgba(201, 203, 207, 0.8)',
            'rgba(255, 99, 255, 0.8)'
          ],
          borderColor: [
            'rgba(255, 99, 132, 1)',
            'rgba(54, 162, 235, 1)',
            'rgba(255, 206, 86, 1)',
            'rgba(75, 192, 192, 1)',
            'rgba(153, 102, 255, 1)',
            'rgba(255, 159, 64, 1)',
            'rgba(201, 203, 207, 1)',
            'rgba(255, 99, 255, 1)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#fff',
              font: { 
                size: 11, 
                family: 'Avenir Next, Arial',
                weight: '500'
              },
              padding: 12
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            titleFont: {
              size: 14,
              family: 'Avenir Next, Arial'
            },
            bodyFont: {
              size: 13,
              family: 'Avenir Next, Arial'
            },
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = parseFloat(context.parsed).toLocaleString();
                return `${label}: ${value} كم²`;
              }
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  /**
   * Create layer comparison chart (features and area)
   */
  createLayerComparisonChart(data) {
    const canvas = document.getElementById('layerComparisonChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    
    const layersWithArea = data.layers.filter(l => l.totalArea > 0);
    
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: data.layers.map(l => l.name),
        datasets: [{
          label: 'عدد القطع',
          data: data.layers.map(l => l.featureCount),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 2,
          yAxisID: 'y'
        }, {
          label: 'المساحة (كم²)',
          data: layersWithArea.map(l => (l.totalArea / 1000000).toFixed(2)),
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 2,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              color: '#fff',
              font: { 
                size: 13, 
                family: 'Avenir Next, Arial',
                weight: '500'
              },
              padding: 15
            }
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            titleFont: {
              size: 14,
              family: 'Avenir Next, Arial'
            },
            bodyFont: {
              size: 13,
              family: 'Avenir Next, Arial'
            }
          }
        },
        scales: {
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            ticks: {
              color: '#fff',
              font: {
                size: 12,
                family: 'Avenir Next, Arial'
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            ticks: {
              color: '#fff',
              font: {
                size: 12,
                family: 'Avenir Next, Arial'
              },
              callback: function(value) {
                return value.toLocaleString() + ' كم²';
              }
            },
            grid: {
              drawOnChartArea: false
            }
          },
          x: {
            ticks: {
              color: '#fff',
              font: {
                size: 11,
                family: 'Avenir Next, Arial'
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  /**
   * Create average area per feature chart
   */
  createAvgAreaChart(data) {
    const canvas = document.getElementById('avgAreaChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    
    const layersWithArea = data.layers.filter(l => l.totalArea > 0);
    
    if (layersWithArea.length === 0) return;
    
    const chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: layersWithArea.map(l => l.name),
        datasets: [{
          label: 'متوسط المساحة (هكتار)',
          data: layersWithArea.map(l => (l.totalArea / l.featureCount / 10000).toFixed(2)),
          backgroundColor: 'rgba(75, 192, 192, 0.8)',
          borderColor: 'rgba(75, 192, 192, 1)',
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            titleFont: {
              size: 14,
              family: 'Avenir Next, Arial'
            },
            bodyFont: {
              size: 13,
              family: 'Avenir Next, Arial'
            },
            callbacks: {
              label: function(context) {
                return `متوسط المساحة: ${parseFloat(context.parsed.y).toLocaleString()} هكتار`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#fff',
              font: {
                size: 12,
                family: 'Avenir Next, Arial'
              },
              callback: function(value) {
                return value.toLocaleString() + ' هكتار';
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#fff',
              font: {
                size: 11,
                family: 'Avenir Next, Arial'
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  /**
   * Create density chart
   */
  createDensityChart(data) {
    const canvas = document.getElementById('densityChart');
    if (!canvas || typeof Chart === 'undefined') return;
    
    const ctx = canvas.getContext('2d');
    
    const layersWithArea = data.layers.filter(l => l.totalArea > 0);
    
    if (layersWithArea.length === 0) return;
    
    const chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: layersWithArea.map(l => l.name),
        datasets: [{
          label: 'كثافة القطع (قطعة/كم²)',
          data: layersWithArea.map(l => (l.featureCount / (l.totalArea / 1000000)).toFixed(2)),
          borderColor: 'rgba(153, 102, 255, 1)',
          backgroundColor: 'rgba(153, 102, 255, 0.2)',
          borderWidth: 3,
          tension: 0.4,
          fill: true,
          pointRadius: 5,
          pointHoverRadius: 7,
          pointBackgroundColor: 'rgba(153, 102, 255, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.3)',
            borderWidth: 1,
            padding: 12,
            titleFont: {
              size: 14,
              family: 'Avenir Next, Arial'
            },
            bodyFont: {
              size: 13,
              family: 'Avenir Next, Arial'
            },
            callbacks: {
              label: function(context) {
                return `الكثافة: ${parseFloat(context.parsed.y).toLocaleString()} قطعة/كم²`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              color: '#fff',
              font: {
                size: 12,
                family: 'Avenir Next, Arial'
              },
              callback: function(value) {
                return value.toLocaleString();
              }
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          },
          x: {
            ticks: {
              color: '#fff',
              font: {
                size: 11,
                family: 'Avenir Next, Arial'
              },
              maxRotation: 45,
              minRotation: 45
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)'
            }
          }
        }
      }
    });
    
    this.charts.push(chart);
  }

  /**
   * Destroy all charts
   */
  destroyCharts() {
    this.charts.forEach(chart => {
      try {
        chart.destroy();
      } catch (e) {
        console.warn('Error destroying chart:', e);
      }
    });
    this.charts = [];
  }

  /**
   * Export report as PDF
   */
  async exportPDF() {
    if (!this.currentReport) {
      this.notificationManager.showNotification("لا يوجد تقرير لتصديره", "warning");
      return;
    }
    
    if (typeof jspdf === 'undefined' || !jspdf.jsPDF) {
      this.notificationManager.showNotification(
        "مكتبة PDF غير متوفرة",
        "error"
      );
      return;
    }
    
    try {
      this.notificationManager.showNotification("جاري إنشاء ملف PDF...", "info");
      
      const { jsPDF } = jspdf;
      const doc = new jsPDF('p', 'mm', 'a4');
      
      // Add Arabic font support (if available)
      let yPos = 20;
      
      // Title
      doc.setFontSize(20);
      doc.text(this.currentReport.title, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Date
      doc.setFontSize(10);
      const dateStr = this.currentReport.generatedAt.toLocaleDateString('ar-SA');
      doc.text(`Date: ${dateStr}`, 105, yPos, { align: 'center' });
      yPos += 15;
      
      // Summary
      doc.setFontSize(14);
      doc.text('Summary', 20, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.text(`Total Layers: ${this.currentReport.summary.totalLayers}`, 20, yPos);
      yPos += 7;
      doc.text(`Total Features: ${this.currentReport.summary.totalFeatures.toLocaleString()}`, 20, yPos);
      yPos += 7;
      
      if (this.currentReport.summary.totalArea > 0) {
        const areaKm2 = (this.currentReport.summary.totalArea / 1000000).toFixed(2);
        doc.text(`Total Area: ${parseFloat(areaKm2).toLocaleString()} km²`, 20, yPos);
        yPos += 10;
      }

      // Add charts as images
      if (this.charts.length > 0) {
        yPos += 10;
        doc.setFontSize(14);
        doc.text('Charts', 20, yPos);
        yPos += 10;
        
        for (let i = 0; i < this.charts.length && i < 2; i++) {
          try {
            const chartImage = this.charts[i].toBase64Image();
            doc.addImage(chartImage, 'PNG', 20, yPos, 170, 80);
            yPos += 90;
            
            if (yPos > 250 && i < this.charts.length - 1) {
              doc.addPage();
              yPos = 20;
            }
          } catch (e) {
            console.warn('Error adding chart to PDF:', e);
          }
        }
      }
      
      // Layer details
      if (yPos > 200) {
        doc.addPage();
        yPos = 20;
      }
      
      doc.setFontSize(14);
      doc.text('Layer Details', 20, yPos);
      yPos += 10;
      
      this.currentReport.layers.forEach((layer, index) => {
        if (yPos > 250) {
          doc.addPage();
          yPos = 20;
        }
        
        doc.setFontSize(12);
        doc.text(layer.name, 20, yPos);
        yPos += 7;
        
        doc.setFontSize(10);
        doc.text(`Features: ${layer.featureCount.toLocaleString()}`, 25, yPos);
        yPos += 6;
        doc.text(`Geometry: ${this.translateGeometryType(layer.geometryType)}`, 25, yPos);
        yPos += 6;
        
        if (layer.totalArea) {
          const areaKm2 = (layer.totalArea / 1000000).toFixed(2);
          doc.text(`Area: ${parseFloat(areaKm2).toLocaleString()} km²`, 25, yPos);
          yPos += 6;
        }
        
        yPos += 5;
      });
      
      // Save PDF
      const fileName = `${this.currentReport.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.pdf`;
      doc.save(fileName);
      
      this.notificationManager.showNotification("تم تصدير التقرير بنجاح", "success");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      this.notificationManager.showNotification("حدث خطأ في تصدير PDF", "error");
    }
  }

  /**
   * Export report as Excel
   */
  async exportExcel() {
    if (!this.currentReport) {
      this.notificationManager.showNotification("لا يوجد تقرير لتصديره", "warning");
      return;
    }
    
    try {
      this.notificationManager.showNotification("جاري إنشاء ملف Excel...", "info");
      
      // Create CSV content (Excel can open CSV files)
      let csv = '\uFEFF'; // UTF-8 BOM for Arabic support
      
      // Title and metadata
      csv += `${this.currentReport.title}\n`;
      csv += `Generated: ${this.currentReport.generatedAt.toLocaleString('ar-SA')}\n\n`;
      
      // Summary
      csv += 'Summary\n';
      csv += `Total Layers,${this.currentReport.summary.totalLayers}\n`;
      csv += `Total Features,${this.currentReport.summary.totalFeatures}\n`;
      
      if (this.currentReport.summary.totalArea > 0) {
        const areaKm2 = (this.currentReport.summary.totalArea / 1000000).toFixed(2);
        csv += `Total Area (km²),${areaKm2}\n`;
      }
      
      csv += '\n\n';
      
      // Layer details
      this.currentReport.layers.forEach(layer => {
        csv += `\nLayer: ${layer.name}\n`;
        csv += `Feature Count,${layer.featureCount}\n`;
        csv += `Geometry Type,${this.translateGeometryType(layer.geometryType)}\n`;
        
        if (layer.totalArea) {
          const areaKm2 = (layer.totalArea / 1000000).toFixed(2);
          csv += `Total Area (km²),${areaKm2}\n`;
        }
        
        // Field statistics
        if (layer.fields && layer.fields.length > 0) {
          csv += '\nField Statistics\n';
          csv += 'Field Name,Type,Count,Min,Max,Average,Sum\n';
          
          layer.fields.forEach(field => {
            csv += `${field.alias},${this.translateFieldType(field.type)},${field.count}`;
            
            if (field.min !== undefined) {
              csv += `,${field.min.toFixed(2)},${field.max.toFixed(2)},${field.avg.toFixed(2)},${field.sum.toFixed(2)}`;
            } else {
              csv += ',,,';
            }
            
            csv += '\n';
          });
        }
        
        csv += '\n';
      });
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${this.currentReport.title.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.notificationManager.showNotification("تم تصدير التقرير بنجاح", "success");
    } catch (error) {
      console.error("Error exporting Excel:", error);
      this.notificationManager.showNotification("حدث خطأ في تصدير Excel", "error");
    }
  }

  /**
   * Close report modal
   */
  closeReport() {
    const modal = document.getElementById("reportModal");
    if (modal) {
      modal.classList.add("hidden");
    }
    this.destroyCharts();
  }
}
