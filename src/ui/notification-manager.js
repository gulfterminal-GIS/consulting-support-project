/**
 * NotificationManager - Handles toast notifications throughout the application
 * This is a foundation module used by ALL other modules
 */

export class NotificationManager {
  constructor() {
    this.activeNotifications = [];
  }

  /**
   * Show a notification message
   * @param {string} message - The message to display
   * @param {string} type - Type of notification: 'info', 'success', 'error', 'warning'
   */
  showNotification(message, type = "info") {
    // Create notification element
    const notification = document.createElement("div");
    notification.className = `notification ${type}`;

    // Set icon based on type
    let icon = "fa-info-circle";
    if (type === "success") icon = "fa-check-circle";
    else if (type === "error") icon = "fa-exclamation-circle";
    else if (type === "warning") icon = "fa-exclamation-triangle";

    notification.innerHTML = `
      <i class="fas ${icon}"></i>
      <span>${message}</span>
    `;

    // Calculate position based on active notifications
    const topPosition = 80 + this.activeNotifications.length * 60;

    // Get background color based on type
    let backgroundColor;
    switch (type) {
      case "success":
        backgroundColor = "#4CAF50";
        break;
      case "error":
        backgroundColor = "#f44336";
        break;
      case "warning":
        backgroundColor = "#ff9800";
        break;
      default:
        backgroundColor = "#2196F3";
    }

    document.body.appendChild(notification);

    // Add to active notifications
    this.activeNotifications.push(notification);

    // Remove after 3 seconds
    setTimeout(() => {
      this.clearNotification(notification);
    }, 3000);
  }

  /**
   * Clear a specific notification
   * @param {HTMLElement} notification - The notification element to remove
   */
  clearNotification(notification) {
    if (!notification || !notification.parentNode) return;

    notification.style.animation = "slideOut 0.3s ease-out";
    setTimeout(() => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }

      // Remove from active notifications
      const index = this.activeNotifications.indexOf(notification);
      if (index > -1) {
        this.activeNotifications.splice(index, 1);
      }

      // Reposition remaining notifications
      this.repositionNotifications();
    }, 300);
  }

  /**
   * Clear all active notifications
   */
  clearAllNotifications() {
    this.activeNotifications.forEach((notification) => {
      if (notification.parentNode) {
        document.body.removeChild(notification);
      }
    });
    this.activeNotifications = [];
  }

  /**
   * Reposition all active notifications after one is removed
   */
  repositionNotifications() {
    this.activeNotifications.forEach((notification, index) => {
      const topPosition = 80 + index * 60;
      notification.style.top = `${topPosition}px`;
    });
  }

  /**
   * Get the count of active notifications
   * @returns {number} Number of active notifications
   */
  getActiveCount() {
    return this.activeNotifications.length;
  }
}
