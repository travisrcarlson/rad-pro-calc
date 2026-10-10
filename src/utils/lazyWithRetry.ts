import { lazy } from 'react';
import type { ComponentType } from 'react';

/**
 * Enhanced lazy component loader that automatically recovers from stale chunk errors
 * caused by new production deployments (e.g. "Failed to fetch dynamically imported module").
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  moduleName?: string
) {
  return lazy(async () => {
    const retryKey = `radpro_retry_${moduleName || 'module'}`;
    const hasRetried = sessionStorage.getItem(retryKey) === 'true';

    try {
      const module = await factory();
      // Reset retry marker upon successful import
      sessionStorage.removeItem(retryKey);
      return module;
    } catch (error: any) {
      const errorMsg = error?.message || String(error);
      const isDynamicChunkError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('error loading dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        error?.name === 'ChunkLoadError';

      if (isDynamicChunkError && !hasRetried) {
        console.warn(`[Auto-Recovery] Dynamic chunk fetch failed for ${moduleName || 'module'}. Refreshing to load latest deployment assets...`);
        sessionStorage.setItem(retryKey, 'true');
        window.location.reload();
        // Return unresolved promise while the page reloads to prevent rendering error screens
        return new Promise<{ default: T }>(() => {});
      }

      // If already retried or genuine error, clear key and surface to ErrorBoundary
      sessionStorage.removeItem(retryKey);
      throw error;
    }
  });
}
