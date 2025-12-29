/**
 * TabSystem - Manages platform integration tabs
 * Handles tab switching, backdrop display, and platform redirects
 */

export class TabSystem {
  constructor(notificationManager) {
    this.notificationManager = notificationManager;
    
    // Tab configuration
    this.tabConfig = {
      messages: {
        gardens: "التوجه الى منصة الحدائق الذكية",
        projects: "يلزم الربط بمنصة قرار لعرض المشروعات",
        assets: "يلزم الربط بالتشغيل و الصيانة لعرض الأصول",
        smartEye: "يلزم الربط بمنصة العين الذكية"
      },
      buttons: {
        gardens: {
          text: "ربط بمنصة الحدائق الذكية",
          url: "https://intelli.it.com/"
        },
        projects: {
          text: "ربط بمنصة قرار",
          url: "https://qarar2025.azurewebsites.net/"
        },
        assets: {
          text: "ربط بالتشغيل و الصيانة",
          url: "https://gt-ams.azurewebsites.net/"
        },
        smartEye: {
          text: "ربط بمنصة العين الذكية",
          url: "http://hayel.dtsit.net/dashboard"
        }
      }
    };
  }

  /**
   * Initialize map tabs with event handlers
   */
  initializeMapTabs() {
    const tabButtons = document.querySelectorAll(".top-toolbar .toolbar-label");
    const backdrop = document.getElementById("tabBackdrop");
    const contentCard = backdrop?.querySelector(".tab-content-card");

    if (!backdrop || !contentCard) {
      console.warn("Tab system elements not found in DOM");
      return;
    }

    tabButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const tabType = button.getAttribute("data-tab");

        // Get message and button info for this tab
        const message = this.tabConfig.messages[tabType];
        const buttonInfo = this.tabConfig.buttons[tabType];

        if (message && buttonInfo) {
          // Update content
          contentCard.innerHTML = `
            <div class="tab-icon-container">
              <img src="assets/images/plug.gif" alt="Loading" class="tab-gif-icon" />
            </div>
            
            <p class="tab-message-text">${message}</p>
            
            <button class="tab-action-button" onclick="redirectToTabPlatform('${tabType}')">
              <span>${buttonInfo.text}</span>
              <i class="fas fa-external-link-alt"></i>
            </button>
          `;

          // Show backdrop
          backdrop.classList.remove("hidden");
        }
      });
    });

    // Close backdrop when clicking outside
    backdrop.addEventListener("click", (e) => {
      if (e.target === backdrop) {
        backdrop.classList.add("hidden");
        // Return to gardens tab
        tabButtons.forEach((btn) => btn.classList.remove("active"));
        const gardensTab = document.querySelector('[data-tab="gardens"]');
        if (gardensTab) {
          gardensTab.classList.add("active");
        }
      }
    });
  }

  /**
   * Redirect to external platform
   * @param {string} tabType - Type of tab (gardens, projects, assets, smartEye)
   */
  redirectToTabPlatform(tabType) {
    const buttonInfo = this.tabConfig.buttons[tabType];
    
    if (!buttonInfo || !buttonInfo.url) {
      console.error(`No URL configured for tab type: ${tabType}`);
      return;
    }

    this.notificationManager.showSuccess(`جاري التوجيه إلى ${buttonInfo.text}...`);

    // Get the button element
    const button = event?.target?.closest(".tab-action-button");
    if (button) {
      button.disabled = true;
      button.innerHTML = `
        <span>جاري التحميل...</span>
        <i class="fas fa-spinner fa-spin"></i>
      `;
    }

    // Redirect after a short delay
    setTimeout(() => {
      window.open(buttonInfo.url, "_blank");
      console.log(`Redirecting to: ${buttonInfo.url}`);

      // Close the backdrop
      const backdrop = document.getElementById("tabBackdrop");
      if (backdrop) {
        backdrop.classList.add("hidden");
      }

      // Reset to gardens tab
      document.querySelectorAll(".tab-button").forEach((btn) => btn.classList.remove("active"));
      const gardensTab = document.querySelector('[data-tab="gardens"]');
      if (gardensTab) {
        gardensTab.classList.add("active");
      }
    }, 1500);
  }
}
