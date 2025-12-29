// ============================================================================
// MODULE LOADER - ArcGIS Module Loading Utilities
// ============================================================================
// Provides wrapper functions for loading ArcGIS API modules with error handling
// and consistent Promise-based interface.
// ============================================================================

/**
 * Load a single ArcGIS module
 * @param {string} moduleName - The name of the ArcGIS module to load (e.g., "esri/Map")
 * @returns {Promise} Promise that resolves with the loaded module
 */
export function loadModule(moduleName) {
  return new Promise((resolve, reject) => {
    require([moduleName], (module) => {
      if (module) {
        resolve(module);
      } else {
        reject(new Error(`Module not found: ${moduleName}`));
      }
    }, (error) => {
      console.error(`Error loading module ${moduleName}:`, error);
      reject(error);
    });
  });
}

/**
 * Load multiple ArcGIS modules in parallel
 * @param {string[]} moduleNames - Array of module names to load
 * @returns {Promise<Array>} Promise that resolves with an array of loaded modules
 */
export function loadModules(moduleNames) {
  if (!Array.isArray(moduleNames)) {
    return Promise.reject(new Error('moduleNames must be an array'));
  }

  if (moduleNames.length === 0) {
    return Promise.resolve([]);
  }

  return Promise.all(moduleNames.map(moduleName => loadModule(moduleName)));
}

/**
 * Load modules with error recovery - returns null for failed modules instead of rejecting
 * @param {string[]} moduleNames - Array of module names to load
 * @returns {Promise<Array>} Promise that resolves with an array of loaded modules (null for failed loads)
 */
export async function loadModulesSafe(moduleNames) {
  if (!Array.isArray(moduleNames)) {
    throw new Error('moduleNames must be an array');
  }

  const results = await Promise.allSettled(
    moduleNames.map(moduleName => loadModule(moduleName))
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      console.warn(`Failed to load module ${moduleNames[index]}:`, result.reason);
      return null;
    }
  });
}

/**
 * Check if a module can be loaded (useful for optional features)
 * @param {string} moduleName - The name of the module to check
 * @returns {Promise<boolean>} Promise that resolves to true if module exists
 */
export async function moduleExists(moduleName) {
  try {
    await loadModule(moduleName);
    return true;
  } catch (error) {
    return false;
  }
}

// ============================================================================
// USAGE EXAMPLES
// ============================================================================
// 
// Single module:
//   const Map = await loadModule("esri/Map");
//
// Multiple modules:
//   const [Map, MapView] = await loadModules(["esri/Map", "esri/views/MapView"]);
//
// Safe loading (won't reject on failure):
//   const [Map, View] = await loadModulesSafe(["esri/Map", "esri/views/MapView"]);
//
// Check if module exists:
//   const exists = await moduleExists("esri/widgets/CustomWidget");
// ============================================================================
