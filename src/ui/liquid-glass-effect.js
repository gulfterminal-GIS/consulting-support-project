/**
 * LiquidGlassEffect Custom Element
 * 
 * A custom HTML element that creates a liquid glass visual effect
 * by wrapping content with multiple layered divs for effect, tint, and shine.
 * 
 * Usage:
 *   <liquid-glass-effect>
 *     Your content here
 *   </liquid-glass-effect>
 */

class LiquidGlassEffect extends HTMLElement {
  constructor() {
    super();
  }

  connectedCallback() {
    const content = this.innerHTML;

    this.innerHTML = `
      <div class="liquidGlass-wrapper">
        <div class="liquidGlass-effect"></div>
        <div class="liquidGlass-tint"></div>
        <div class="liquidGlass-shine"></div>
        <div class="liquidGlass-content">
            ${content}
        </div>
      </div>
    `;
  }
}

/**
 * Initialize the LiquidGlassEffect custom element
 * Registers the custom element with the browser
 */
export function initializeLiquidGlassEffect() {
  if (!customElements.get('liquid-glass-effect')) {
    customElements.define('liquid-glass-effect', LiquidGlassEffect);
  }
}

// Auto-initialize when module is imported
initializeLiquidGlassEffect();
