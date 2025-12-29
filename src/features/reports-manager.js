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
    // Populate layer/region selection
    this.populateReportSelections();
    
    // Setup event listeners
    this.setupEventListeners();
  }

  /**
   * Populate layer and region selections
   */
  populateReportSelections() {
    const layerSelect = document.getElementById("reportLayerSelect");
    const regionSelect = document.getElementById("reportRegionSelect");
    
    if (!layerSelect || !regionSelect) return;
    
    // Clear existing options
    layerSelect.innerHTML = '<option value="">اختر طبقة...</option>';
    regionSelect.innerHTML = '<option value="">اختر منطقة...</option>';
    
    // Add individual layers
    const uploadedLayers = this.stateManager.getUploadedLayers();
    uploadedLayers.forEach((layer, index) => {
      const option = document.createElement("option");
      option.value = `layer-${index}`;
      option.textContent = layer.title;
      layerSelect.appendChild(option);
    });

    // Add regions from map's group layers
    const map = this.stateManager.getMap();
    if (map) {
      map.layers.forEach((layer, index) => {
        if (layer.type === 'group') {
          const option = document.createElement("option");
          option.value = `region-${index}`;
          option.textContent = layer.title;
          regionSelect.appendChild(option);
        }
      });
    }
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
    
    // Mutual exclusivity between layer and region selection
    if (layerSelect && regionSelect) {
      layerSelect.addEventListener("change", () => {
        if (layerSelect.value) regionSelect.value = "";
      });
      
      regionSelect.addEventListener("change", () => {
        if (regionSelect.value) layerSelect.value = "";
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
    
    if (!layerValue && !regionValue) {
      this.notificationManager.showNotification(
        "الرجاء اختيار طبقة أو منطقة",
        "warning"
      );
      return;
    }

    try {
      this.notificationManager.showNotification("جاري إنشاء التقرير...", "info");
      
      let layers = [];
      let reportTitle = "";
      
      if (layerValue) {
        // Single layer report
        const index = parseInt(layerValue.split("-")[1]);
        const layer = this.stateManager.getUploadedLayers()[index];
        layers = [layer];
        reportTitle = `تقرير: ${layer.title}`;
      } else {
        // Region report (multiple layers)
        const index = parseInt(regionValue.split("-")[1]);
        const map = this.stateManager.getMap();
        const groupLayer = map.layers.getItemAt(index);
        layers = groupLayer.layers.toArray();
        reportTitle = `تقرير: ${groupLayer.title}`;
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
            const area = geometryEngine.geodesicArea(feature.geometry, "square-meters");
            totalArea += area;
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
      html += `
          <div class="summary-card">
            <div class="summary-icon"><i class="fas fa-vector-square"></i></div>
            <div class="summary-value">${parseFloat(areaKm2).toLocaleString()}</div>
            <div class="summary-label">المساحة الإجمالية (كم²)</div>
          </div>
      `;
    }
    
    html += `
        </div>
      </div>
    `;

    // Charts section
    html += `
      <div class="report-charts">
        <h3><i class="fas fa-chart-pie"></i> الرسوم البيانية</h3>
        <div class="charts-grid">
          <div class="chart-container">
            <canvas id="geometryChart"></canvas>
          </div>
          <div class="chart-container">
            <canvas id="layerDistributionChart"></canvas>
          </div>
        </div>
      </div>
    `;
    
    // Layer details
    html += `<div class="report-layers">`;
    
    data.layers.forEach((layer, index) => {
      html += `
        <div class="layer-section">
          <h3><i class="fas fa-layer-group"></i> ${layer.name}</h3>
          <div class="layer-info">
            <div class="info-item">
              <span class="info-label">عدد القطع:</span>
              <span class="info-value">${layer.featureCount.toLocaleString()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">نوع الهندسة:</span>
              <span class="info-value">${this.translateGeometryType(layer.geometryType)}</span>
            </div>
      `;
      
      if (layer.totalArea) {
        const areaKm2 = (layer.totalArea / 1000000).toFixed(2);
        html += `
            <div class="info-item">
              <span class="info-label">المساحة الإجمالية:</span>
              <span class="info-value">${parseFloat(areaKm2).toLocaleString()} كم²</span>
            </div>
        `;
      }
      
      html += `</div>`;
      
      // Field statistics
      if (layer.fields && layer.fields.length > 0) {
        html += `
          <div class="field-statistics">
            <h4>إحصائيات الحقول</h4>
            <div class="fields-table">
              <table>
                <thead>
                  <tr>
                    <th>الحقل</th>
                    <th>النوع</th>
                    <th>العدد</th>
                    <th>القيم</th>
                  </tr>
                </thead>
                <tbody>
        `;
        
        layer.fields.forEach(field => {
          html += `
                  <tr>
                    <td><strong>${field.alias}</strong></td>
                    <td>${this.translateFieldType(field.type)}</td>
                    <td>${field.count}</td>
                    <td>${this.formatFieldValues(field)}</td>
                  </tr>
          `;
        });
        
        html += `
                </tbody>
              </table>
            </div>
          </div>
        `;
      }
      
      html += `</div>`;
    });
    
    html += `</div>`;
    
    return html;
  }

  /**
   * Format field values for display
   */
  formatFieldValues(field) {
    if (field.min !== undefined) {
      return `
        <div class="numeric-stats">
          <span>الأدنى: ${field.min.toFixed(2)}</span>
          <span>الأعلى: ${field.max.toFixed(2)}</span>
          <span>المتوسط: ${field.avg.toFixed(2)}</span>
        </div>
      `;
    } else if (field.topValues) {
      const top3 = field.topValues.slice(0, 3);
      return `
        <div class="string-stats">
          <span>قيم فريدة: ${field.uniqueCount}</span>
          <span>الأكثر شيوعاً: ${top3[0]?.value || 'N/A'}</span>
        </div>
      `;
    }
    return '-';
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
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF'
          ]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: 'توزيع أنواع الهندسة',
            font: { size: 16, family: 'Arial' }
          },
          legend: {
            position: 'bottom'
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
          backgroundColor: '#36A2EB',
          borderColor: '#2196F3',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          title: {
            display: true,
            text: 'توزيع القطع حسب الطبقة',
            font: { size: 16, family: 'Arial' }
          },
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return value.toLocaleString();
              }
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
