// Print Widget
// Manages the print widget for exporting map to PDF/image

import { loadModule } from "../core/module-loader.js";

export class PrintWidget {
  constructor(stateManager, notificationManager) {
    this.stateManager = stateManager;
    this.notificationManager = notificationManager;
    this.printInstance = null;
  }

  /**
   * Toggle Print widget visibility
   */
  async toggle() {
    const printDiv = document.getElementById("printWidget");

    if (!this.printInstance || printDiv.classList.contains("hidden")) {
      const originalWarn = console.warn;
      console.warn = (msg) => {
        if (!msg.includes('The specified value "null"')) {
          originalWarn(msg);
        }
      };

      try {
        if (!this.printInstance) {
          const [Print] = await Promise.all([loadModule("esri/widgets/Print")]);

          this.printInstance = new Print({
            view: this.stateManager.getView(),
            container: "printContent",
            printServiceUrl:
              "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task",
          });
        }

        printDiv.classList.remove("hidden");
        document.querySelector('[onclick*="print"]')?.classList.add("active");
      } finally {
        setTimeout(() => {
          console.warn = originalWarn;
        }, 1000);
      }
    } else {
      printDiv.classList.add("hidden");
      document.querySelector('[onclick*="print"]')?.classList.remove("active");
    }
  }

  /**
   * Get print widget instance
   * @returns {Object} Print widget instance
   */
  getPrintInstance() {
    return this.printInstance;
  }
}
