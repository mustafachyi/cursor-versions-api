import { app } from './api';
import { CONFIG } from './config';
import { cache, checkForUpdates, updateCache } from './data';

// Cache management setup
const RETRY_DELAY = 5000; // 5 seconds in milliseconds

const setupCacheRefresh = (): NodeJS.Timer => 
  setInterval(async () => {
    try {
      if (await checkForUpdates()) {
        await updateCache();
      }
    } catch (error) {
      console.error('Cache refresh failed:', error);
    }
  }, CONFIG.updateInterval);

// Application initialization
const initializeApp = async (): Promise<void> => {
  try {
    // Load initial cache data
    const cacheLoaded = await updateCache();
    if (!cacheLoaded) {
      console.error('Initial cache load failed - retrying in background');
      setTimeout(updateCache, RETRY_DELAY);
    }

    // Setup background cache updates
    setupCacheRefresh();

    // Initialize HTTP server
    Bun.serve({
      fetch: app.fetch,
      port: CONFIG.port,
      development: process.env.NODE_ENV !== 'production'
    });

    console.log(`API running at http://localhost:${CONFIG.port}`);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start application
initializeApp();