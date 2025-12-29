// Bookmarks Widget
// Manages spatial bookmarks for saving and navigating to map extents

import { loadModule } from "../core/module-loader.js";

export class BookmarksWidget {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.bookmarks = JSON.parse(localStorage.getItem("gisBookmarks") || "[]");
    this.isActive = false;
  }

  /**
   * Toggle Bookmarks widget visibility
   */
  async toggle() {
    const bookmarksDiv = document.getElementById("bookmarksWidget");
    const btn = document.querySelector('[onclick*="bookmarks"]');

    if (!this.isActive) {
      bookmarksDiv.classList.remove("hidden");
      if (btn) btn.classList.add("active");

      // Remove any inline positioning styles
      bookmarksDiv.style.position = "";
      bookmarksDiv.style.top = "";
      bookmarksDiv.style.left = "";
      bookmarksDiv.style.right = "";
      this.isActive = true;

      // Initialize bookmarks
      this.loadBookmarks();

      // Add bookmark button handler
      document.getElementById("addBookmark").onclick = () => this.addBookmark();
    } else {
      this.isActive = false;
      bookmarksDiv.classList.add("hidden");
      if (btn) btn.classList.remove("active");
    }
  }

  /**
   * Load bookmarks from localStorage and display them
   */
  loadBookmarks() {
    const bookmarksList = document.getElementById("bookmarksList");
    bookmarksList.innerHTML = "";

    if (this.bookmarks.length === 0) {
      bookmarksList.innerHTML =
        '<p class="empty-state">No bookmarks saved</p>';
      return;
    }

    this.bookmarks.forEach((bookmark, index) => {
      const bookmarkDiv = document.createElement("div");
      bookmarkDiv.className = "bookmark-item";
      bookmarkDiv.innerHTML = `
        <span class="bookmark-name">${bookmark.name}</span>
        <button class="bookmark-delete" onclick="deleteBookmark(${index})">
          <i class="fas fa-trash"></i>
        </button>
      `;

      bookmarkDiv.addEventListener("click", (e) => {
        if (!e.target.closest(".bookmark-delete")) {
          this.goToBookmark(bookmark);
        }
      });

      bookmarksList.appendChild(bookmarkDiv);
    });
  }

  /**
   * Add a new bookmark
   */
  async addBookmark() {
    const name = prompt("Enter bookmark name:");
    if (!name) return;

    const bookmark = {
      name: name,
      extent: this.stateManager.getView().extent.toJSON(),
      timestamp: Date.now(),
    };

    this.bookmarks.push(bookmark);
    localStorage.setItem("gisBookmarks", JSON.stringify(this.bookmarks));
    this.loadBookmarks();
    this.notificationManager.showNotification("Bookmark saved", "success");
  }

  /**
   * Delete a bookmark
   * @param {number} index - Index of bookmark to delete
   */
  deleteBookmark(index) {
    if (confirm("Delete this bookmark?")) {
      this.bookmarks.splice(index, 1);
      localStorage.setItem("gisBookmarks", JSON.stringify(this.bookmarks));
      this.loadBookmarks();
      this.notificationManager.showNotification("Bookmark deleted", "success");
    }
  }

  /**
   * Navigate to a bookmark
   * @param {Object} bookmark - Bookmark object with extent
   */
  async goToBookmark(bookmark) {
    const [Extent] = await Promise.all([loadModule("esri/geometry/Extent")]);

    const extent = Extent.fromJSON(bookmark.extent);
    await this.stateManager.getView().goTo(extent);
  }

  /**
   * Get bookmarks array
   * @returns {Array} Array of bookmarks
   */
  getBookmarks() {
    return this.bookmarks;
  }

  /**
   * Check if widget is active
   * @returns {boolean} Active state
   */
  isWidgetActive() {
    return this.isActive;
  }
}
