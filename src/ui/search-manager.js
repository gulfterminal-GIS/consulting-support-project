/**
 * SearchManager - Handles search functionality and coordinate display
 * Manages the search widget, suggestions, and location finding
 */

import { loadModule } from '../core/module-loader.js';

export class SearchManager {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.searchTimeout = null;
    this.currentSuggestions = [];
    this.selectedSuggestionIndex = -1;
  }

  /**
   * Initialize search functionality
   */
  async initialize() {
    const view = this.stateManager.getView();
    
    if (!view) {
      console.warn("SearchManager: view not available");
      return;
    }

    const [Search] = await Promise.all([loadModule("esri/widgets/Search")]);

    const searchInput = document.getElementById("searchInput");
    const clearSearchBtn = document.getElementById("clearSearch");
    const suggestionsDiv = document.getElementById("searchSuggestions");

    // Create and store search widget in state manager
    this.stateManager.setSearchWidget(new Search({
      view: view,
      container: document.createElement("div"),
      includeDefaultSources: true,
      locationEnabled: false,
      popupEnabled: false,
      autoSelect: false,
    }));

    // Wait for the view to be ready
    await view.when();

    // Setup event listeners
    this.setupSearchInput(searchInput, clearSearchBtn, suggestionsDiv);
    this.setupClearButton(searchInput, clearSearchBtn, suggestionsDiv);
    this.setupKeyboardNavigation(searchInput);
    this.setupClickOutside(suggestionsDiv);
  }

  /**
   * Setup search input event handlers
   */
  setupSearchInput(searchInput, clearSearchBtn, suggestionsDiv) {
    searchInput.addEventListener("input", (e) => {
      const value = e.target.value.trim();

      // Show/hide clear button
      clearSearchBtn.style.display = value ? "block" : "none";

      // Clear timeout
      clearTimeout(this.searchTimeout);

      if (value.length < 2) {
        this.hideSuggestions(suggestionsDiv);
        return;
      }

      // Show loading state
      this.showSuggestionsLoading(suggestionsDiv);

      // Debounce search
      this.searchTimeout = setTimeout(async () => {
        await this.getSuggestions(value, suggestionsDiv);
      }, 300);
    });

    // Handle Enter key
    searchInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        const value = searchInput.value.trim();
        if (value.length > 0) {
          if (this.currentSuggestions.length > 0) {
            await this.selectSuggestion(this.currentSuggestions[0], searchInput, suggestionsDiv);
          } else {
            // Perform direct search
            this.showSuggestionsLoading(suggestionsDiv);
            await this.performDirectSearch(value, suggestionsDiv);
          }
        }
      } else if (e.key === "Escape") {
        this.hideSuggestions(suggestionsDiv);
        searchInput.blur();
      }
    });
  }

  /**
   * Setup clear button
   */
  setupClearButton(searchInput, clearSearchBtn, suggestionsDiv) {
    clearSearchBtn.addEventListener("click", () => {
      searchInput.value = "";
      clearSearchBtn.style.display = "none";
      this.hideSuggestions(suggestionsDiv);
    });
  }

  /**
   * Get search suggestions
   */
  async getSuggestions(searchTerm, suggestionsDiv) {
    try {
      this.currentSuggestions = [];

      const searchWidget = this.stateManager.getSearchWidget();
      searchWidget.searchTerm = searchTerm;

      try {
        const results = await searchWidget.search();

        if (results && results.results) {
          results.results.forEach((sourceResults) => {
            if (sourceResults.results && sourceResults.results.length > 0) {
              sourceResults.results.slice(0, 5).forEach((result, idx) => {
                this.currentSuggestions.push({
                  text: result.name || searchTerm,
                  key: result.address || "",
                  feature: result.feature,
                  extent: result.extent,
                  index: idx,
                });
              });
            }
          });
        }

        if (this.currentSuggestions.length > 0) {
          this.displaySuggestions(this.currentSuggestions, suggestionsDiv);
        } else {
          this.showNoResults(suggestionsDiv);
        }
      } catch (searchError) {
        console.error("Search error:", searchError);
        this.showNoResults(suggestionsDiv);
      }
    } catch (error) {
      console.error("Error in suggestions:", error);
      this.showNoResults(suggestionsDiv);
    }
  }

  /**
   * Perform direct search as fallback
   */
  async performDirectSearch(searchTerm, suggestionsDiv) {
    try {
      const searchWidget = this.stateManager.getSearchWidget();
      searchWidget.viewModel.searchTerm = searchTerm;
      const searchResponse = await searchWidget.viewModel.search();

      if (searchResponse && searchResponse.length > 0) {
        const suggestions = [];
        searchResponse.forEach((response) => {
          if (response.results && response.results.length > 0) {
            response.results.slice(0, 5).forEach((result) => {
              suggestions.push({
                text: result.name || searchTerm,
                key: result.name || searchTerm,
                feature: result.feature,
                extent: result.extent,
              });
            });
          }
        });

        if (suggestions.length > 0) {
          this.displaySuggestions(suggestions, suggestionsDiv);
        } else {
          this.showNoResults(suggestionsDiv);
        }
      } else {
        this.showNoResults(suggestionsDiv);
      }
    } catch (error) {
      console.error("Direct search error:", error);
      this.showNoResults(suggestionsDiv);
    }
  }

  /**
   * Display search suggestions
   */
  displaySuggestions(suggestions, suggestionsDiv) {
    if (suggestions.length === 0) {
      this.showNoResults(suggestionsDiv);
      return;
    }

    let html = "";
    suggestions.forEach((suggestion, index) => {
      const icon = this.getIconForSuggestion(suggestion);
      const displayText = suggestion.text || "Unknown Location";
      const subText = suggestion.key !== suggestion.text ? suggestion.key : "";

      html += `
        <div class="suggestion-item" data-index="${index}">
          <i class="${icon}"></i>
          <div class="suggestion-text">
            <div class="suggestion-name">${displayText}</div>
            ${subText ? `<div class="suggestion-address">${subText}</div>` : ""}
          </div>
        </div>
      `;
    });

    suggestionsDiv.innerHTML = html;
    suggestionsDiv.classList.add("active");

    // Add click handlers
    const searchInput = document.getElementById("searchInput");
    document.querySelectorAll(".suggestion-item").forEach((item) => {
      item.addEventListener("click", () => {
        const index = parseInt(item.dataset.index);
        this.selectSuggestion(this.currentSuggestions[index], searchInput, suggestionsDiv);
      });
    });
  }

  /**
   * Select a suggestion and navigate to it
   */
  async selectSuggestion(suggestion, searchInput, suggestionsDiv) {
    searchInput.value = suggestion.text;
    this.hideSuggestions(suggestionsDiv);

    const view = this.stateManager.getView();

    try {
      if (suggestion.feature || suggestion.extent) {
        // Direct result from search
        if (suggestion.extent) {
          await view.goTo({
            target: suggestion.extent,
            zoom: 15,
          });
        } else if (suggestion.feature && suggestion.feature.geometry) {
          await view.goTo({
            target: suggestion.feature.geometry,
            zoom: 15,
          });
          await this.addSearchMarker(suggestion.feature);
        }
      } else if (suggestion.suggestResult) {
        // Suggestion result - need to search
        const searchWidget = this.stateManager.getSearchWidget();
        searchWidget.viewModel.searchTerm = suggestion.text;
        const response = await searchWidget.viewModel.search(
          suggestion.suggestResult
        );

        if (response && response.length > 0 && response[0].results.length > 0) {
          const result = response[0].results[0];

          if (result.extent) {
            await view.goTo({
              target: result.extent,
              zoom: 15,
            });
          } else if (result.feature && result.feature.geometry) {
            await view.goTo({
              target: result.feature.geometry,
              zoom: 15,
            });
            await this.addSearchMarker(result.feature);
          }
        }
      }
    } catch (error) {
      console.error("Error selecting suggestion:", error);
      this.notificationManager.showNotification("Error finding location", "error");
    }
  }

  /**
   * Add marker for search result
   */
  async addSearchMarker(feature) {
    const [Graphic] = await Promise.all([loadModule("esri/Graphic")]);
    const view = this.stateManager.getView();

    // Remove previous search markers
    view.graphics.removeAll();

    const graphic = new Graphic({
      geometry: feature.geometry,
      symbol: {
        type: "simple-marker",
        style: "circle",
        color: [226, 119, 40, 0.8],
        size: 12,
        outline: {
          color: [255, 255, 255, 1],
          width: 2,
        },
      },
      attributes: feature.attributes,
      popupTemplate: {
        title:
          feature.attributes.PlaceName ||
          feature.attributes.name ||
          "Search Result",
        content:
          feature.attributes.Place_addr ||
          feature.attributes.address ||
          "Location",
      },
    });

    view.graphics.add(graphic);

    // Remove marker after 10 seconds
    setTimeout(() => {
      view.graphics.remove(graphic);
    }, 10000);
  }

  /**
   * Get icon for suggestion type
   */
  getIconForSuggestion(suggestion) {
    const text = (suggestion.text || "").toLowerCase();
    if (text.includes("restaurant") || text.includes("food"))
      return "fas fa-utensils";
    if (text.includes("hotel") || text.includes("lodging")) return "fas fa-bed";
    if (text.includes("park")) return "fas fa-tree";
    if (text.includes("school") || text.includes("university"))
      return "fas fa-graduation-cap";
    if (text.includes("hospital") || text.includes("medical"))
      return "fas fa-hospital";
    if (text.includes("shopping") || text.includes("store"))
      return "fas fa-shopping-cart";
    if (text.includes("airport")) return "fas fa-plane";
    if (text.includes("station")) return "fas fa-train";
    return "fas fa-map-marker-alt";
  }

  /**
   * Show loading state
   */
  showSuggestionsLoading(suggestionsDiv) {
    suggestionsDiv.innerHTML =
      '<div class="search-loading"><i class="fas fa-spinner fa-spin"></i> Searching...</div>';
    suggestionsDiv.classList.add("active");
  }

  /**
   * Show no results message
   */
  showNoResults(suggestionsDiv) {
    suggestionsDiv.innerHTML =
      '<div class="search-no-results">No results found</div>';
    suggestionsDiv.classList.add("active");
  }

  /**
   * Hide suggestions dropdown
   */
  hideSuggestions(suggestionsDiv) {
    suggestionsDiv.classList.remove("active");
    this.currentSuggestions = [];
    this.selectedSuggestionIndex = -1;
  }

  /**
   * Setup keyboard navigation for suggestions
   */
  setupKeyboardNavigation(searchInput) {
    searchInput.addEventListener("keydown", (e) => {
      const suggestionItems = document.querySelectorAll(".suggestion-item");

      if (e.key === "ArrowDown" && suggestionItems.length > 0) {
        e.preventDefault();
        this.selectedSuggestionIndex = Math.min(
          this.selectedSuggestionIndex + 1,
          suggestionItems.length - 1
        );
        this.updateSelectedSuggestion(suggestionItems);
      } else if (e.key === "ArrowUp" && suggestionItems.length > 0) {
        e.preventDefault();
        this.selectedSuggestionIndex = Math.max(this.selectedSuggestionIndex - 1, -1);
        this.updateSelectedSuggestion(suggestionItems);
      } else if (
        e.key === "Enter" &&
        this.selectedSuggestionIndex >= 0 &&
        this.currentSuggestions.length > 0
      ) {
        e.preventDefault();
        const searchInput = document.getElementById("searchInput");
        const suggestionsDiv = document.getElementById("searchSuggestions");
        this.selectSuggestion(this.currentSuggestions[this.selectedSuggestionIndex], searchInput, suggestionsDiv);
      }
    });
  }

  /**
   * Update visual selection of suggestions
   */
  updateSelectedSuggestion(items) {
    items.forEach((item, index) => {
      if (index === this.selectedSuggestionIndex) {
        item.style.background = "rgba(33, 150, 243, 0.1)";
      } else {
        item.style.background = "";
      }
    });
  }

  /**
   * Setup click outside to close suggestions
   */
  setupClickOutside(suggestionsDiv) {
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".search-container")) {
        this.hideSuggestions(suggestionsDiv);
      }
    });
  }
}
