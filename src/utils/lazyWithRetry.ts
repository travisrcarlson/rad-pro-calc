import { lazy } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';

/**
 * Enhanced lazy component loader that automatically recovers from stale chunk errors
 * caused by new production deployments (e.g. "Failed to fetch dynamically imported module").
 */
export function lazyWithRetry<P extends object = Record<string, never>>(
  factory: () => Promise<{ default: ComponentType<P> }>,
  moduleName?: string
): LazyExoticComponent<ComponentType<P>> {
  return lazy(async () => {
    const retryKey = `radpro_retry_${moduleName || 'module'}`;
    let hasRetried = false;
    try {
      hasRetried = sessionStorage.getItem(retryKey) === 'true';
    } catch {
      hasRetried = false;
    }

    try {
      const module = await factory();
      try {
        sessionStorage.removeItem(retryKey);
      } catch {
        // Ignore storage errors
      }
      return module;
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      const errorName = error instanceof Error ? error.name : '';
      const isDynamicChunkError =
        errorMsg.includes('Failed to fetch dynamically imported module') ||
        errorMsg.includes('error loading dynamically imported module') ||
        errorMsg.includes('Importing a module script failed') ||
        errorName === 'ChunkLoadError';

      const isOnline = typeof navigator === 'undefined' || navigator.onLine !== false;
      if (isDynamicChunkError && !hasRetried && isOnline) {
        console.warn(`[Auto-Recovery] Dynamic chunk fetch failed for ${moduleName || 'module'}. Refreshing to load latest deployment assets...`);
        try {
          sessionStorage.setItem(retryKey, 'true');
        } catch {
          // Ignore storage errors
        }
        window.location.reload();
        // Return unresolved promise while the page reloads to prevent rendering error screens
        return new Promise<{ default: ComponentType<P> }>(() => {});
      }

      try {
        sessionStorage.removeItem(retryKey);
      } catch {
        // Ignore storage errors
      }
      throw error;
    }
  });
}
