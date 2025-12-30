/**
 * AdvancedSearchManager - Professional advanced search with query builder
 * 
 * Features:
 * - Search across layers, regions, or all data
 * - Visual query builder with AND/OR operators
 * - Field-based filtering with multiple conditions
 * - Real-time result preview
 * - Beautiful result visualization
 * - Export search results
 * - Save/load search queries
 */

import { loadModule } from "../core/module-loader.js";

export class AdvancedSearchManager {
  constructor(stateManager, notificationManager, layerManager, panelManager = null) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.layerManager = layerManager;
    this.panelManager = panelManager;
    
    // Search state
    this.searchCriteria = [];
    this.searchResults = null;
    this.resultLayer = null;
    this.savedQueries = this.loadSavedQueries();
    
    // Query ID counter
    this.criteriaIdCounter = 0;
  }

  /**
   * Initialize advanced search panel
   */
  initializeAdvancedSearchPanel() {
    this.populateSearchScopes();
    this.setupEventListeners();
    this.renderQueryBuilder();
  }

  /**
   * Populate search scope options
   */
  populateSearchScopes() {
    const scopeSelect = document.getElementById("searchScopeSelect");
    if (!scopeSelect) return;
    
    scopeSelect.innerHTML = '<option value="all">جميع الطبقات</option>';
    
    // Add regions
    const map = this.stateManager.getMap();
    if (map) {
      map.layers.forEach((layer, index) => {
        if (layer.type === 'group') {
          const option = document.createElement("option");
          option.value = `region-${index}`;
          option.textContent = layer.title;
          scopeSelect.appendChild(option);
        }
      });
    }
    
    // Add individual layers
    const uploadedLayers = this.stateManager.getUploadedLayers();
    uploadedLayers.forEach((layer, index) => {
      const option = document.createElement("option");
      option.value = `layer-${index}`;
      option.textContent = layer.title;
      scopeSelect.appendChild(option);
    });
  }

  /**
   * Setup event listeners
   */
  setupEventListeners() {
    const scopeSelect = document.getElementById("searchScopeSelect");
    const addCriteriaBtn = document.getElementById("addSearchCriteria");
    const executeSearchBtn = document.getElementById("executeSearch");
    const clearSearchBtn = document.getElementById("clearSearch");
    const saveQueryBtn = document.getElementById("saveQuery");
    
    if (scopeSelect) {
      scopeSelect.addEventListener("change", () => this.onScopeChange());
    }
    
    if (addCriteriaBtn) {
      addCriteriaBtn.addEventListener("click", () => this.addSearchCriteria());
    }
    
    if (executeSearchBtn) {
      executeSearchBtn.addEventListener("click", () => this.executeSearch());
    }
    
    if (clearSearchBtn) {
      clearSearchBtn.addEventListener("click", () => this.clearSearch());
    }
    
    if (saveQueryBtn) {
      saveQueryBtn.addEventListener("click", () => this.saveCurrentQuery());
    }
  }

  /**
   * Handle scope change
   */
  onScopeChange() {
    this.searchCriteria = [];
    this.renderQueryBuilder();
  }

  /**
   * Add new search criteria
   */
  addSearchCriteria() {
    const criteriaId = this.criteriaIdCounter++;
    
    this.searchCriteria.push({
      id: criteriaId,
      field: "",
      operator: "contains",
      value: "",
      logicalOperator: this.searchCriteria.length > 0 ? "AND" : null
    });
    
    this.renderQueryBuilder();
  }

  /**
   * Remove search criteria
   */
  removeCriteria(criteriaId) {
    this.searchCriteria = this.searchCriteria.filter(c => c.id !== criteriaId);
    
    // Reset first criteria logical operator
    if (this.searchCriteria.length > 0) {
      this.searchCriteria[0].logicalOperator = null;
    }
    
    this.renderQueryBuilder();
  }

  /**
   * Update criteria
   */
  updateCriteria(criteriaId, field, value) {
    const criteria = this.searchCriteria.find(c => c.id === criteriaId);
    if (criteria) {
      criteria[field] = value;
    }
  }

  /**
   * Render query builder UI
   */
  async renderQueryBuilder() {
    const container = document.getElementById("queryBuilderContainer");
    if (!container) return;
    
    if (this.searchCriteria.length === 0) {
      container.innerHTML = `
        <div class="empty-query-state">
          <i class="fas fa-search"></i>
          <p>انقر على "إضافة شرط" لبدء البحث</p>
        </div>
      `;
      return;
    }
    
    // Get available fields
    const fields = await this.getAvailableFields();
    
    let html = '<div class="query-criteria-list">';
    
    this.searchCriteria.forEach((criteria, index) => {
      html += this.renderCriteriaRow(criteria, index, fields);
    });
    
    html += '</div>';
    
    container.innerHTML = html;
    
    // Attach event listeners
    this.attachCriteriaEventListeners();
  }

  /**
   * Render single criteria row
   */
  renderCriteriaRow(criteria, index, fields) {
    const selectedField = fields.find(f => f.name === criteria.field);
    const fieldType = selectedField?.type || 'string';
    
    let html = '<div class="criteria-row" data-criteria-id="' + criteria.id + '">';
    
    // Logical operator (AND/OR) - only for non-first criteria
    if (index > 0) {
      html += `
        <div class="logical-operator">
          <button class="logic-btn ${criteria.logicalOperator === 'AND' ? 'active' : ''}" 
                  data-criteria-id="${criteria.id}" data-operator="AND">
            <i class="fas fa-plus-circle"></i> AND
          </button>
          <button class="logic-btn ${criteria.logicalOperator === 'OR' ? 'active' : ''}" 
                  data-criteria-id="${criteria.id}" data-operator="OR">
            <i class="fas fa-code-branch"></i> OR
          </button>
        </div>
      `;
    }
    
    html += '<div class="criteria-content">';
    
    // Field selector
    html += '<div class="criteria-field-wrapper">';
    html += '<select class="criteria-field" data-criteria-id="' + criteria.id + '">';
    html += '<option value="">اختر حقل...</option>';
    fields.forEach(field => {
      const selected = field.name === criteria.field ? 'selected' : '';
      html += `<option value="${field.name}" ${selected}>${field.alias || field.name}</option>`;
    });
    html += '</select>';
    html += '</div>';
    
    // Operator selector
    html += '<div class="criteria-operator-wrapper">';
    html += '<select class="criteria-operator" data-criteria-id="' + criteria.id + '">';
    
    if (fieldType === 'string') {
      html += `
        <option value="contains" ${criteria.operator === 'contains' ? 'selected' : ''}>يحتوي على</option>
        <option value="equals" ${criteria.operator === 'equals' ? 'selected' : ''}>يساوي</option>
        <option value="starts" ${criteria.operator === 'starts' ? 'selected' : ''}>يبدأ بـ</option>
        <option value="ends" ${criteria.operator === 'ends' ? 'selected' : ''}>ينتهي بـ</option>
        <option value="not-contains" ${criteria.operator === 'not-contains' ? 'selected' : ''}>لا يحتوي على</option>
      `;
    } else {
      html += `
        <option value="equals" ${criteria.operator === 'equals' ? 'selected' : ''}>يساوي</option>
        <option value="not-equals" ${criteria.operator === 'not-equals' ? 'selected' : ''}>لا يساوي</option>
        <option value="greater" ${criteria.operator === 'greater' ? 'selected' : ''}>أكبر من</option>
        <option value="less" ${criteria.operator === 'less' ? 'selected' : ''}>أقل من</option>
        <option value="greater-equal" ${criteria.operator === 'greater-equal' ? 'selected' : ''}>أكبر من أو يساوي</option>
        <option value="less-equal" ${criteria.operator === 'less-equal' ? 'selected' : ''}>أقل من أو يساوي</option>
      `;
    }
    
    html += '</select>';
    html += '</div>';
    
    // Value input with datalist for autocomplete
    html += '<div class="criteria-value-wrapper">';
    const inputType = fieldType === 'string' ? 'text' : 'number';
    const datalistId = `datalist-${criteria.id}`;
    html += `
      <input type="${inputType}" 
             class="criteria-value" 
             data-criteria-id="${criteria.id}" 
             value="${criteria.value}" 
             placeholder="القيمة أو ابحث..."
             list="${datalistId}"
             autocomplete="off">
      <datalist id="${datalistId}"></datalist>
    `;
    html += '</div>';
    
    // Remove button
    html += '<div class="criteria-remove-wrapper">';
    html += `
      <button class="remove-criteria-btn" data-criteria-id="${criteria.id}" title="حذف">
        <i class="fas fa-times"></i>
      </button>
    `;
    html += '</div>';
    
    html += '</div></div>';
    
    return html;
  }

  /**
   * Attach event listeners to criteria rows
   */
  attachCriteriaEventListeners() {
    // Logical operator buttons
    document.querySelectorAll('.logic-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const criteriaId = parseInt(btn.dataset.criteriaId);
        const operator = btn.dataset.operator;
        this.updateCriteria(criteriaId, 'logicalOperator', operator);
        this.renderQueryBuilder();
      });
    });
    
    // Field selectors
    document.querySelectorAll('.criteria-field').forEach(select => {
      select.addEventListener('change', async (e) => {
        const criteriaId = parseInt(select.dataset.criteriaId);
        this.updateCriteria(criteriaId, 'field', e.target.value);
        await this.renderQueryBuilder();
        // Load field values for autocomplete
        await this.loadFieldValues(criteriaId, e.target.value);
      });
    });
    
    // Operator selectors
    document.querySelectorAll('.criteria-operator').forEach(select => {
      select.addEventListener('change', (e) => {
        const criteriaId = parseInt(select.dataset.criteriaId);
        this.updateCriteria(criteriaId, 'operator', e.target.value);
      });
    });
    
    // Value inputs
    document.querySelectorAll('.criteria-value').forEach(input => {
      input.addEventListener('input', (e) => {
        const criteriaId = parseInt(input.dataset.criteriaId);
        this.updateCriteria(criteriaId, 'value', e.target.value);
      });
    });
    
    // Remove buttons
    document.querySelectorAll('.remove-criteria-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const criteriaId = parseInt(btn.dataset.criteriaId);
        this.removeCriteria(criteriaId);
      });
    });
  }

  /**
   * Get available fields from selected scope
   */
  async getAvailableFields() {
    const scopeSelect = document.getElementById("searchScopeSelect");
    if (!scopeSelect) return [];
    
    const scope = scopeSelect.value;
    const fields = new Map();
    
    try {
      if (scope === 'all') {
        // Get fields from all layers
        const map = this.stateManager.getMap();
        if (map) {
          for (const layer of map.layers.items) {
            if (layer.type === 'group') {
              for (const subLayer of layer.layers.items) {
                this.collectFields(subLayer, fields);
              }
            } else {
              this.collectFields(layer, fields);
            }
          }
        }
        
        const uploadedLayers = this.stateManager.getUploadedLayers();
        uploadedLayers.forEach(layer => this.collectFields(layer, fields));
        
      } else if (scope.startsWith('region-')) {
        // Get fields from region
        const index = parseInt(scope.split('-')[1]);
        const map = this.stateManager.getMap();
        const groupLayer = map.layers.getItemAt(index);
        
        if (groupLayer && groupLayer.type === 'group') {
          for (const subLayer of groupLayer.layers.items) {
            this.collectFields(subLayer, fields);
          }
        }
        
      } else if (scope.startsWith('layer-')) {
        // Get fields from single layer
        const index = parseInt(scope.split('-')[1]);
        const layer = this.stateManager.getUploadedLayers()[index];
        if (layer) {
          this.collectFields(layer, fields);
        }
      }
    } catch (error) {
      console.error("Error getting fields:", error);
    }
    
    return Array.from(fields.values());
  }

  /**
   * Collect fields from a layer
   */
  collectFields(layer, fieldsMap) {
    if (!layer.fields) return;
    
    layer.fields.forEach(field => {
      if (field.name !== 'OBJECTID' && field.name !== 'FID') {
        if (!fieldsMap.has(field.name)) {
          fieldsMap.set(field.name, {
            name: field.name,
            alias: field.alias || field.name,
            type: field.type
          });
        }
      }
    });
  }

  /**
   * Load field values for autocomplete
   */
  async loadFieldValues(criteriaId, fieldName) {
    if (!fieldName) return;
    
    const datalist = document.getElementById(`datalist-${criteriaId}`);
    if (!datalist) return;
    
    try {
      const scopeSelect = document.getElementById("searchScopeSelect");
      const scope = scopeSelect.value;
      const layersToSearch = this.getLayersToSearch(scope);
      
      const uniqueValues = new Set();
      
      // Collect unique values from all layers (limit to first 100)
      for (const layer of layersToSearch) {
        try {
          const query = layer.createQuery();
          query.where = "1=1";
          query.outFields = [fieldName];
          query.returnGeometry = false;
          query.returnDistinctValues = true;
          query.num = 100;
          
          const result = await layer.queryFeatures(query);
          
          result.features.forEach(feature => {
            const value = feature.attributes[fieldName];
            if (value !== null && value !== undefined && value !== '') {
              uniqueValues.add(String(value));
            }
          });
          
          // Stop if we have enough values
          if (uniqueValues.size >= 100) break;
        } catch (error) {
          // Skip layers that don't have this field
          continue;
        }
      }
      
      // Populate datalist
      datalist.innerHTML = '';
      Array.from(uniqueValues).sort().slice(0, 100).forEach(value => {
        const option = document.createElement('option');
        option.value = value;
        datalist.appendChild(option);
      });
      
    } catch (error) {
      console.warn('Error loading field values:', error);
    }
  }

  /**
   * Execute search
   */
  async executeSearch() {
    if (this.searchCriteria.length === 0) {
      this.notificationManager.showNotification(
        "الرجاء إضافة شرط بحث واحد على الأقل",
        "warning"
      );
      return;
    }
    
    // Validate criteria
    for (const criteria of this.searchCriteria) {
      if (!criteria.field || !criteria.value) {
        this.notificationManager.showNotification(
          "الرجاء ملء جميع حقول البحث",
          "warning"
        );
        return;
      }
    }
    
    try {
      this.notificationManager.showNotification("جاري البحث...", "info");
      
      const scopeSelect = document.getElementById("searchScopeSelect");
      const scope = scopeSelect.value;
      
      // Build query
      const whereClause = this.buildWhereClause();
      
      // Execute search based on scope
      const results = await this.searchInScope(scope, whereClause);
      
      // Display results
      this.displayResults(results);
      
      this.notificationManager.showNotification(
        `تم العثور على ${results.totalFeatures} نتيجة`,
        "success"
      );
      
    } catch (error) {
      console.error("Search error:", error);
      this.notificationManager.showNotification(
        "حدث خطأ أثناء البحث",
        "error"
      );
    }
  }

  /**
   * Build WHERE clause from criteria
   */
  buildWhereClause() {
    let clause = "";
    
    this.searchCriteria.forEach((criteria, index) => {
      if (index > 0 && criteria.logicalOperator) {
        clause += ` ${criteria.logicalOperator} `;
      }
      
      const fieldClause = this.buildFieldClause(criteria);
      clause += fieldClause;
    });
    
    return clause || "1=1";
  }

  /**
   * Build field clause
   */
  buildFieldClause(criteria) {
    const field = criteria.field;
    const operator = criteria.operator;
    const value = criteria.value;
    
    // Escape single quotes in value
    const escapedValue = String(value).replace(/'/g, "''");
    
    // Determine if field is string or numeric
    const isString = isNaN(value);
    
    // Check if field name contains non-ASCII characters (Arabic, etc.)
    const hasNonAscii = /[^\x00-\x7F]/.test(field);
    
    switch (operator) {
      case 'contains':
        // For non-ASCII field names, use simple LIKE without UPPER
        if (hasNonAscii) {
          return `${field} LIKE '%${escapedValue}%'`;
        }
        return `UPPER(${field}) LIKE UPPER('%${escapedValue}%')`;
        
      case 'equals':
        if (isString) {
          if (hasNonAscii) {
            return `${field} = '${escapedValue}'`;
          }
          return `UPPER(${field}) = UPPER('${escapedValue}')`;
        }
        return `${field} = ${value}`;
        
      case 'not-equals':
        if (isString) {
          if (hasNonAscii) {
            return `${field} <> '${escapedValue}'`;
          }
          return `UPPER(${field}) <> UPPER('${escapedValue}')`;
        }
        return `${field} <> ${value}`;
        
      case 'starts':
        if (hasNonAscii) {
          return `${field} LIKE '${escapedValue}%'`;
        }
        return `UPPER(${field}) LIKE UPPER('${escapedValue}%')`;
        
      case 'ends':
        if (hasNonAscii) {
          return `${field} LIKE '%${escapedValue}'`;
        }
        return `UPPER(${field}) LIKE UPPER('%${escapedValue}')`;
        
      case 'not-contains':
        if (hasNonAscii) {
          return `${field} NOT LIKE '%${escapedValue}%'`;
        }
        return `UPPER(${field}) NOT LIKE UPPER('%${escapedValue}%')`;
        
      case 'greater':
        return `${field} > ${value}`;
      case 'less':
        return `${field} < ${value}`;
      case 'greater-equal':
        return `${field} >= ${value}`;
      case 'less-equal':
        return `${field} <= ${value}`;
      default:
        return `${field} = '${escapedValue}'`;
    }
  }

  /**
   * Search in scope
   */
  async searchInScope(scope, whereClause) {
    const results = {
      features: [],
      totalFeatures: 0,
      layers: []
    };
    
    const layersToSearch = this.getLayersToSearch(scope);
    
    for (const layer of layersToSearch) {
      try {
        const query = layer.createQuery();
        query.where = whereClause;
        query.outFields = ["*"];
        query.returnGeometry = true;
        
        const result = await layer.queryFeatures(query);
        
        if (result.features.length > 0) {
          results.features.push(...result.features);
          results.totalFeatures += result.features.length;
          results.layers.push({
            layer: layer,
            count: result.features.length
          });
        }
      } catch (error) {
        console.warn(`Error searching layer ${layer.title}:`, error);
      }
    }
    
    this.searchResults = results;
    return results;
  }

  /**
   * Get layers to search based on scope
   */
  getLayersToSearch(scope) {
    const layers = [];
    
    if (scope === 'all') {
      const map = this.stateManager.getMap();
      if (map) {
        map.layers.forEach(layer => {
          if (layer.type === 'group') {
            layers.push(...layer.layers.items);
          } else {
            layers.push(layer);
          }
        });
      }
      layers.push(...this.stateManager.getUploadedLayers());
      
    } else if (scope.startsWith('region-')) {
      const index = parseInt(scope.split('-')[1]);
      const map = this.stateManager.getMap();
      const groupLayer = map.layers.getItemAt(index);
      if (groupLayer && groupLayer.type === 'group') {
        layers.push(...groupLayer.layers.items);
      }
      
    } else if (scope.startsWith('layer-')) {
      const index = parseInt(scope.split('-')[1]);
      const layer = this.stateManager.getUploadedLayers()[index];
      if (layer) {
        layers.push(layer);
      }
    }
    
    return layers;
  }

  /**
   * Display search results
   */
  async displayResults(results) {
    // Clear previous result layer
    this.clearResultLayer();
    
    if (results.totalFeatures === 0) {
      this.notificationManager.showNotification(
        "لم يتم العثور على نتائج",
        "warning"
      );
      return;
    }
    
    // Store results for pagination
    this.searchResults = results;
    
    // Highlight results on map
    await this.highlightResultsOnMap(results);
    
    // Show results in side panel
    this.showResultsInPanel(results);
    
    // Zoom to results
    await this.zoomToSearchResults();
  }

  /**
   * Show results in side panel
   */
  showResultsInPanel(results) {
    console.log('📋 Showing results in panel. Page:', this.currentPage, 'Results:', results);
    
    const panelContent = document.getElementById("sidePanelContent");
    if (!panelContent) {
      console.error('❌ Panel content element not found!');
      return;
    }
    
    // Prepare all features
    let allFeatures = [];
    results.layers.forEach((layerResult, layerIndex) => {
      const features = results.features.filter(f => f.layer === layerResult.layer);
      features.forEach((feature, featureIndex) => {
        allFeatures.push({
          feature,
          layerIndex,
          featureIndex,
          layerName: layerResult.layer.title
        });
      });
    });
    
    console.log('📊 Total features:', allFeatures.length);
    
    // Store for pagination - DON'T reset currentPage if it's already set
    this.allResultFeatures = allFeatures;
    if (!this.currentPage || this.currentPage < 1) {
      this.currentPage = 1;
    }
    this.itemsPerPage = 10;
    this.totalPages = Math.ceil(allFeatures.length / this.itemsPerPage);
    
    console.log('📄 Current page:', this.currentPage, 'Total pages:', this.totalPages);
    
    let html = `
      <div class="search-results-panel">
        <!-- Results Header -->
        <liquid-glass-effect>
          <div class="results-panel-header">
            <div class="results-stats-compact">
              <div class="stat-badge">
                <i class="fas fa-check-circle"></i>
                <span>${results.totalFeatures} نتيجة</span>
              </div>
              <div class="stat-badge">
                <i class="fas fa-layer-group"></i>
                <span>${results.layers.length} طبقة</span>
              </div>
            </div>
            <div class="results-panel-actions">
              <button class="icon-btn" onclick="window.exportSearchResults()" title="تصدير">
                <i class="fas fa-download"></i>
              </button>
              <button class="icon-btn" onclick="window.clearSearchResults()" title="مسح">
                <i class="fas fa-eraser"></i>
              </button>
            </div>
          </div>
        </liquid-glass-effect>
        
        <!-- Search in Results -->
        <liquid-glass-effect>
          <div class="results-search-box">
            <i class="fas fa-search"></i>
            <input type="text" 
                   id="resultsSearchInput" 
                   placeholder="ابحث في النتائج..." 
                   class="results-search-input">
          </div>
        </liquid-glass-effect>
        
        <!-- Results List -->
        <div class="results-list" id="searchResultsList">
    `;
    
    // Add features for current page
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = Math.min(startIndex + this.itemsPerPage, allFeatures.length);
    const pageFeatures = allFeatures.slice(startIndex, endIndex);
    
    pageFeatures.forEach((item, index) => {
      html += this.generateCompactFeatureCard(item, startIndex + index);
    });
    
    html += `
        </div>
        
        <!-- Pagination -->
        <div class="results-pagination">
          <button class="pagination-btn" 
                  id="prevPageBtn" 
                  onclick="window.goToPreviousPage()"
                  ${this.currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-right"></i>
            <span>السابق</span>
          </button>
          <div class="pagination-info">
            <span>صفحة ${this.currentPage} من ${this.totalPages}</span>
            <span class="page-range">(${startIndex + 1}-${endIndex} من ${allFeatures.length})</span>
          </div>
          <button class="pagination-btn" 
                  id="nextPageBtn" 
                  onclick="window.goToNextPage()"
                  ${this.currentPage === this.totalPages ? 'disabled' : ''}>
            <span>التالي</span>
            <i class="fas fa-chevron-left"></i>
          </button>
        </div>
      </div>
    `;
    
    panelContent.innerHTML = html;
    
    // Setup search in results
    this.setupResultsSearch();
  }

  /**
   * Go to next page
   */
  goToNextPage() {
    console.log('🔄 Next page clicked. Current page:', this.currentPage, 'Total pages:', this.totalPages);
    console.log('📊 Search results:', this.searchResults);
    
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      console.log('✅ Moving to page:', this.currentPage);
      
      if (this.searchResults) {
        this.showResultsInPanel(this.searchResults);
      } else {
        console.error('❌ No search results stored!');
        this.notificationManager.showNotification(
          "خطأ في التنقل بين الصفحات",
          "error"
        );
      }
    } else {
      console.log('⚠️ Already on last page');
    }
  }

  /**
   * Go to previous page
   */
  goToPreviousPage() {
    console.log('🔄 Previous page clicked. Current page:', this.currentPage, 'Total pages:', this.totalPages);
    
    if (this.currentPage > 1) {
      this.currentPage--;
      console.log('✅ Moving to page:', this.currentPage);
      
      if (this.searchResults) {
        this.showResultsInPanel(this.searchResults);
      } else {
        console.error('❌ No search results stored!');
        this.notificationManager.showNotification(
          "خطأ في التنقل بين الصفحات",
          "error"
        );
      }
    } else {
      console.log('⚠️ Already on first page');
    }
  }

  /**
   * Generate compact feature card for panel
   */
  generateCompactFeatureCard(item, index) {
    const { feature, layerIndex, featureIndex, layerName } = item;
    const attributes = feature.attributes;
    
    // Get first 3 non-empty attributes
    const displayFields = Object.keys(attributes)
      .filter(key => key !== 'OBJECTID' && key !== 'FID')
      .filter(key => {
        const val = attributes[key];
        return val !== null && val !== undefined && val !== '';
      })
      .slice(0, 3);
    
    let html = `
      <liquid-glass-effect>
        <div class="result-card" data-index="${index}" data-layer-index="${layerIndex}" data-feature-index="${featureIndex}">
          <div class="result-card-header">
            <div class="result-card-title">
              <i class="fas fa-map-marker-alt"></i>
              <span class="result-layer-name">${layerName}</span>
            </div>
            <span class="result-number">#${index + 1}</span>
          </div>
          <div class="result-card-body">
    `;
    
    displayFields.forEach(field => {
      const value = attributes[field];
      html += `
        <div class="result-field">
          <span class="result-field-label">${field}:</span>
          <span class="result-field-value">${value}</span>
        </div>
      `;
    });
    
    html += `
          </div>
          <div class="result-card-actions">
            <button class="result-action-btn" onclick="window.zoomToFeature(${layerIndex}, ${featureIndex})" title="تكبير">
              <i class="fas fa-search-plus"></i>
              <span>تكبير</span>
            </button>
            <button class="result-action-btn" onclick="window.showFeatureDetails(${layerIndex}, ${featureIndex})" title="التفاصيل">
              <i class="fas fa-info-circle"></i>
              <span>التفاصيل</span>
            </button>
          </div>
        </div>
      </liquid-glass-effect>
    `;
    
    return html;
  }

  /**
   * Setup search in results
   */
  setupResultsSearch() {
    const searchInput = document.getElementById("resultsSearchInput");
    if (!searchInput) return;
    
    searchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase();
      
      if (searchTerm === '') {
        // Reset to show all results with pagination
        this.currentPage = 1;
        this.showResultsInPanel(this.searchResults);
        return;
      }
      
      // Filter features
      const filteredFeatures = this.allResultFeatures.filter(item => {
        const attributes = item.feature.attributes;
        return Object.values(attributes).some(value => {
          if (value === null || value === undefined) return false;
          return String(value).toLowerCase().includes(searchTerm);
        });
      });
      
      // Show filtered results
      this.showFilteredResults(filteredFeatures, searchTerm);
    });
  }

  /**
   * Show filtered results
   */
  showFilteredResults(filteredFeatures, searchTerm) {
    const resultsList = document.getElementById("searchResultsList");
    const pagination = document.querySelector(".results-pagination");
    
    if (!resultsList) return;
    
    // Hide pagination during search
    if (pagination) {
      pagination.style.display = 'none';
    }
    
    if (filteredFeatures.length === 0) {
      resultsList.innerHTML = `
        <div class="no-results-found">
          <i class="fas fa-search"></i>
          <p>لم يتم العثور على نتائج لـ "${searchTerm}"</p>
        </div>
      `;
      return;
    }
    
    // Show all filtered results (no pagination during search)
    let html = '';
    filteredFeatures.forEach((item, index) => {
      html += this.generateCompactFeatureCard(item, index);
    });
    
    resultsList.innerHTML = html;
  }

  /**
   * Show feature details in panel
   */
  showFeatureInPanel(feature, layer) {
    const panelContent = document.getElementById("sidePanelContent");
    if (!panelContent) return;
    
    const attributes = feature.attributes;
    
    let html = `
      <div class="feature-details-panel">
        <div class="feature-details-header">
          <button class="back-btn" onclick="window.backToSearchResults()">
            <i class="fas fa-arrow-right"></i>
            <span>العودة للنتائج</span>
          </button>
          <h3><i class="fas fa-info-circle"></i> تفاصيل القطعة</h3>
        </div>
        
        <div class="feature-details-layer">
          <i class="fas fa-layer-group"></i>
          <span>${layer.title}</span>
        </div>
        
        <div class="feature-details-content">
    `;
    
    // Display all attributes
    Object.keys(attributes).forEach(key => {
      if (key === 'OBJECTID' || key === 'FID') return;
      
      const value = attributes[key];
      if (value !== null && value !== undefined && value !== '') {
        html += `
          <div class="detail-row">
            <div class="detail-label">${key}</div>
            <div class="detail-value">${value}</div>
          </div>
        `;
      }
    });
    
    html += `
        </div>
      </div>
    `;
    
    panelContent.innerHTML = html;
  }

  /**
   * Back to search results
   */
  backToSearchResults() {
    if (this.searchResults) {
      this.showResultsInPanel(this.searchResults);
    }
  }

  /**
   * Clear search results
   */
  clearSearchResults() {
    this.clearResultLayer();
    this.searchResults = null;
    
    // Re-render the search panel
    if (this.panelManager) {
      this.panelManager.openSidePanel("بحث متقدم", "advancedSearchPanelTemplate");
      this.initializeAdvancedSearchPanel();
    }
  }

  /**
   * Generate results HTML
   */
  generateResultsHTML(results) {
    let html = `
      <div class="results-header">
        <div class="results-stats">
          <div class="stat-card">
            <i class="fas fa-check-circle"></i>
            <div class="stat-content">
              <span class="stat-value">${results.totalFeatures}</span>
              <span class="stat-label">نتيجة</span>
            </div>
          </div>
          <div class="stat-card">
            <i class="fas fa-layer-group"></i>
            <div class="stat-content">
              <span class="stat-value">${results.layers.length}</span>
              <span class="stat-label">طبقة</span>
            </div>
          </div>
        </div>
        <div class="results-actions">
          <button class="action-btn secondary" onclick="window.zoomToSearchResults()">
            <i class="fas fa-search-location"></i> تكبير للنتائج
          </button>
          <button class="action-btn secondary" onclick="window.exportSearchResults()">
            <i class="fas fa-download"></i> تصدير
          </button>
        </div>
      </div>
    `;
    
    // Results by layer
    html += '<div class="results-by-layer">';
    
    results.layers.forEach((layerResult, layerIndex) => {
      const layer = layerResult.layer;
      const features = results.features.filter(f => f.layer === layer);
      
      html += `
        <div class="layer-results-section">
          <div class="layer-results-header" onclick="window.toggleLayerResults(${layerIndex})">
            <div class="layer-info">
              <i class="fas fa-layer-group"></i>
              <span class="layer-name">${layer.title}</span>
              <span class="result-count">${layerResult.count} نتيجة</span>
            </div>
            <i class="fas fa-chevron-down toggle-icon"></i>
          </div>
          <div class="layer-results-content" id="layerResults${layerIndex}">
            <div class="results-grid">
      `;
      
      features.slice(0, 50).forEach((feature, featureIndex) => {
        html += this.generateFeatureCard(feature, layerIndex, featureIndex);
      });
      
      if (features.length > 50) {
        html += `
          <div class="more-results-notice">
            <i class="fas fa-info-circle"></i>
            عرض أول 50 نتيجة من ${features.length}
          </div>
        `;
      }
      
      html += `
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    
    return html;
  }

  /**
   * Generate feature card HTML
   */
  generateFeatureCard(feature, layerIndex, featureIndex) {
    const attributes = feature.attributes;
    const displayFields = Object.keys(attributes)
      .filter(key => key !== 'OBJECTID' && key !== 'FID')
      .slice(0, 4);
    
    let html = `
      <div class="feature-card" data-layer-index="${layerIndex}" data-feature-index="${featureIndex}">
        <div class="feature-card-header">
          <i class="fas fa-map-marker-alt"></i>
          <span>قطعة #${feature.attributes.OBJECTID || featureIndex + 1}</span>
        </div>
        <div class="feature-card-body">
    `;
    
    displayFields.forEach(field => {
      const value = attributes[field];
      if (value !== null && value !== undefined && value !== '') {
        html += `
          <div class="feature-field">
            <span class="field-label">${field}:</span>
            <span class="field-value">${value}</span>
          </div>
        `;
      }
    });
    
    html += `
        </div>
        <div class="feature-card-actions">
          <button class="card-action-btn" onclick="window.zoomToFeature(${layerIndex}, ${featureIndex})" title="تكبير">
            <i class="fas fa-search-plus"></i>
          </button>
          <button class="card-action-btn" onclick="window.showFeatureDetails(${layerIndex}, ${featureIndex})" title="التفاصيل">
            <i class="fas fa-info-circle"></i>
          </button>
        </div>
      </div>
    `;
    
    return html;
  }

  /**
   * Highlight results on map
   */
  async highlightResultsOnMap(results) {
    const [GraphicsLayer, Graphic] = await Promise.all([
      loadModule("esri/layers/GraphicsLayer"),
      loadModule("esri/Graphic")
    ]);
    
    const view = this.stateManager.getView();
    if (!view) return;
    
    // Create result layer
    this.resultLayer = new GraphicsLayer({
      title: "نتائج البحث",
      listMode: "hide"
    });
    
    // Add graphics
    results.features.forEach(feature => {
      const graphic = new Graphic({
        geometry: feature.geometry,
        symbol: this.getHighlightSymbol(feature.geometry.type),
        attributes: feature.attributes
      });
      
      this.resultLayer.add(graphic);
    });
    
    view.map.add(this.resultLayer);
  }

  /**
   * Get highlight symbol based on geometry type
   */
  getHighlightSymbol(geometryType) {
    switch (geometryType) {
      case 'point':
      case 'multipoint':
        return {
          type: "simple-marker",
          color: [255, 215, 0, 0.8],
          size: 12,
          outline: {
            color: [255, 140, 0, 1],
            width: 2
          }
        };
      case 'polyline':
        return {
          type: "simple-line",
          color: [255, 215, 0, 0.9],
          width: 3
        };
      case 'polygon':
        return {
          type: "simple-fill",
          color: [255, 215, 0, 0.3],
          outline: {
            color: [255, 140, 0, 1],
            width: 2
          }
        };
      default:
        return null;
    }
  }

  /**
   * Attach result event listeners
   */
  attachResultEventListeners(results) {
    // Store results for window functions
    window._currentSearchResults = results;
    window._advancedSearchManager = this;
  }

  /**
   * Toggle layer results visibility
   */
  toggleLayerResults(layerIndex) {
    const content = document.getElementById(`layerResults${layerIndex}`);
    const section = content?.closest('.layer-results-section');
    
    if (content && section) {
      content.classList.toggle('collapsed');
      section.classList.toggle('collapsed');
    }
  }

  /**
   * Zoom to all search results
   */
  async zoomToSearchResults() {
    if (!this.searchResults || this.searchResults.features.length === 0) return;
    
    const view = this.stateManager.getView();
    if (!view) return;
    
    try {
      const geometries = this.searchResults.features.map(f => f.geometry).filter(g => g);
      
      if (geometries.length === 0) return;
      
      const geometryEngine = await loadModule("esri/geometry/geometryEngine");
      
      // Union all geometries
      let combinedGeometry = geometries[0];
      for (let i = 1; i < geometries.length; i++) {
        try {
          const unionResult = geometryEngine.union([combinedGeometry, geometries[i]]);
          if (unionResult) {
            combinedGeometry = unionResult;
          }
        } catch (e) {
          // Skip if union fails
          continue;
        }
      }
      
      if (combinedGeometry && combinedGeometry.extent) {
        await view.goTo(combinedGeometry.extent.expand(1.5), {
          duration: 1000,
          easing: "ease-in-out"
        });
      } else {
        // Fallback: zoom to first feature
        await view.goTo({
          target: geometries[0],
          zoom: 14
        });
      }
    } catch (error) {
      console.error("Error zooming to results:", error);
      // Fallback: zoom to first feature
      try {
        if (this.searchResults.features.length > 0 && this.searchResults.features[0].geometry) {
          await view.goTo({
            target: this.searchResults.features[0].geometry,
            zoom: 14
          });
        }
      } catch (e) {
        console.error("Fallback zoom failed:", e);
      }
    }
  }

  /**
   * Zoom to specific feature
   */
  async zoomToFeature(layerIndex, featureIndex) {
    if (!this.searchResults) return;
    
    const layerResult = this.searchResults.layers[layerIndex];
    const features = this.searchResults.features.filter(f => f.layer === layerResult.layer);
    const feature = features[featureIndex];
    
    if (!feature || !feature.geometry) return;
    
    const view = this.stateManager.getView();
    if (!view) return;
    
    try {
      await view.goTo({
        target: feature.geometry,
        zoom: 16
      }, {
        duration: 1000,
        easing: "ease-in-out"
      });
      
      // Flash the feature
      await this.flashFeature(feature);
    } catch (error) {
      console.error("Error zooming to feature:", error);
    }
  }

  /**
   * Flash feature on map
   */
  async flashFeature(feature) {
    if (!feature || !feature.geometry) return;
    
    const view = this.stateManager.getView();
    if (!view) return;
    
    try {
      const Graphic = await loadModule("esri/Graphic");
      
      const flashGraphic = new Graphic({
        geometry: feature.geometry,
        symbol: {
          type: "simple-fill",
          color: [255, 255, 0, 0.5],
          outline: {
            color: [255, 140, 0, 1],
            width: 3
          }
        }
      });
      
      view.graphics.add(flashGraphic);
      
      setTimeout(() => {
        view.graphics.remove(flashGraphic);
      }, 2000);
    } catch (error) {
      console.warn("Error flashing feature:", error);
    }
  }
  /**
   * Show feature details
   */
  showFeatureDetails(layerIndex, featureIndex) {
    if (!this.searchResults) return;
    
    const layerResult = this.searchResults.layers[layerIndex];
    const features = this.searchResults.features.filter(f => f.layer === layerResult.layer);
    const feature = features[featureIndex];
    
    if (!feature) return;
    
    // Show details in side panel
    this.showFeatureInPanel(feature, layerResult.layer);
  }

  /**
   * Export search results
   */
  async exportSearchResults() {
    if (!this.searchResults || this.searchResults.totalFeatures === 0) {
      this.notificationManager.showNotification(
        "لا توجد نتائج للتصدير",
        "warning"
      );
      return;
    }
    
    try {
      this.notificationManager.showNotification("جاري التصدير...", "info");
      
      // Create CSV content
      let csv = '\uFEFF'; // UTF-8 BOM
      
      // Header
      csv += 'نتائج البحث المتقدم\n';
      csv += `التاريخ: ${new Date().toLocaleString('ar-SA')}\n`;
      csv += `عدد النتائج: ${this.searchResults.totalFeatures}\n\n`;
      
      // Results by layer
      this.searchResults.layers.forEach(layerResult => {
        const layer = layerResult.layer;
        const features = this.searchResults.features.filter(f => f.layer === layer);
        
        csv += `\nالطبقة: ${layer.title}\n`;
        csv += `عدد النتائج: ${features.length}\n\n`;
        
        if (features.length > 0) {
          // Get field names
          const fields = Object.keys(features[0].attributes)
            .filter(key => key !== 'OBJECTID' && key !== 'FID');
          
          // Header row
          csv += fields.join(',') + '\n';
          
          // Data rows
          features.forEach(feature => {
            const values = fields.map(field => {
              const value = feature.attributes[field];
              return value !== null && value !== undefined ? `"${value}"` : '';
            });
            csv += values.join(',') + '\n';
          });
        }
        
        csv += '\n';
      });
      
      // Download CSV
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `search_results_${Date.now()}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      this.notificationManager.showNotification(
        "تم تصدير النتائج بنجاح",
        "success"
      );
    } catch (error) {
      console.error("Export error:", error);
      this.notificationManager.showNotification(
        "حدث خطأ في التصدير",
        "error"
      );
    }
  }

  /**
   * Clear search
   */
  clearSearch() {
    this.searchCriteria = [];
    this.criteriaIdCounter = 0;
    this.renderQueryBuilder();
    this.clearResultLayer();
    
    const modal = document.getElementById("searchResultsModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  /**
   * Clear result layer
   */
  clearResultLayer() {
    if (this.resultLayer) {
      const view = this.stateManager.getView();
      if (view) {
        view.map.remove(this.resultLayer);
      }
      this.resultLayer = null;
    }
  }

  /**
   * Close results modal
   */
  closeResultsModal() {
    const modal = document.getElementById("searchResultsModal");
    if (modal) {
      modal.classList.add("hidden");
    }
  }

  /**
   * Save current query
   */
  saveCurrentQuery() {
    if (this.searchCriteria.length === 0) {
      this.notificationManager.showNotification(
        "لا يوجد استعلام للحفظ",
        "warning"
      );
      return;
    }
    
    const name = prompt("أدخل اسم الاستعلام:");
    if (!name) return;
    
    const query = {
      name: name,
      criteria: JSON.parse(JSON.stringify(this.searchCriteria)),
      date: new Date().toISOString()
    };
    
    this.savedQueries.push(query);
    this.saveSavedQueries();
    
    this.notificationManager.showNotification(
      "تم حفظ الاستعلام بنجاح",
      "success"
    );
  }

  /**
   * Load saved queries from localStorage
   */
  loadSavedQueries() {
    try {
      const saved = localStorage.getItem('advancedSearchQueries');
      return saved ? JSON.parse(saved) : [];
    } catch (error) {
      console.error("Error loading saved queries:", error);
      return [];
    }
  }

  /**
   * Save queries to localStorage
   */
  saveSavedQueries() {
    try {
      localStorage.setItem('advancedSearchQueries', JSON.stringify(this.savedQueries));
    } catch (error) {
      console.error("Error saving queries:", error);
    }
  }
}
