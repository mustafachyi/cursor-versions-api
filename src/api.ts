import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Platform, Version, FlatVersionResponse } from './types';
import { WindowsSetupType } from './types';
import { cache } from './data';
import { 
  sortPlatforms, 
  detectWindowsSetupType, 
  getSystemSetupUrl, 
  normalizePlatformName 
} from './utils';

// Initialize API with CORS support
export const app = new Hono().use('/*', cors());

// Utility function to process version data into flat response format
const createFlatVersionResponse = (version: Version): FlatVersionResponse => {
  if (!version.platforms) {
    return { version: version.version, date: version.date, platforms: {} };
  }

  const response: FlatVersionResponse = { 
    version: version.version, 
    date: version.date, 
    platforms: {} 
  };
  
  const windowsInstallers = new Map<string, { user?: string; system?: string }>();
  
  // Process all platforms in single pass for better performance
  sortPlatforms(Object.keys(version.platforms)).forEach(name => {
    const url = version.platforms[name];
    const normalizedName = normalizePlatformName(name);
    
    if (!name.startsWith('win32-')) {
      response.platforms[normalizedName] = { url };
      return;
    }

    const installers = windowsInstallers.get(normalizedName) || {};
    const setupType = detectWindowsSetupType(url, name);
    
    if (name.endsWith('-user') || setupType === WindowsSetupType.USER) {
      installers.user = url;
    } else if (name.endsWith('-system') || setupType === WindowsSetupType.SYSTEM) {
      installers.system = url;
    }
    
    windowsInstallers.set(normalizedName, installers);
  });

  // Process Windows installers
  windowsInstallers.forEach((installers, platform) => {
    if (installers.user && installers.system) {
      response.platforms[platform] = {
        url: installers.user,
        systemUrl: installers.system
      };
    } else if (installers.user) {
      const systemUrl = getSystemSetupUrl(installers.user);
      response.platforms[platform] = {
        url: installers.user,
        ...(systemUrl && { systemUrl })
      };
    } else if (installers.system) {
      response.platforms[platform] = { url: installers.system };
    }
  });

  return response;
};

// API Routes
app.get('/api/v1/versions', (c) => {
  if (!cache.ordered.versions.length) {
    return c.json({ error: 'No data available' }, 503);
  }

  const query = c.req.query();
  const limit = Math.min(
    Number(query.limit) || (query.limit === '1' ? 1 : cache.ordered.versions.length),
    cache.ordered.versions.length
  );

  // Handle platform-specific request
  if (query.platform) {
    const platformData = cache.byPlatform.get(query.platform);
    return !platformData 
      ? c.json({ error: 'Platform not found' }, 404)
      : c.json(limit === 1 ? platformData[0] : { versions: platformData.slice(0, limit) });
  }

  // Handle version-specific request
  if (query.version) {
    const version = cache.byId.get(query.version);
    return !version
      ? c.json({ error: 'Version not found' }, 404)
      : c.json(createFlatVersionResponse(version));
  }

  // Handle latest version request
  if (limit === 1) {
    const latest = cache.byId.get(cache.latest.version);
    return !latest
      ? c.json({ error: 'No versions available' }, 404)
      : c.json(createFlatVersionResponse(latest));
  }

  // Handle multiple versions request
  const versions = cache.ordered.versions
    .slice(0, limit)
    .reduce((acc: FlatVersionResponse[], id) => {
      const version = cache.byId.get(id);
      if (version) acc.push(createFlatVersionResponse(version));
      return acc;
    }, []);

  return c.json({ versions });
});

// Health check endpoint
app.get('/api/v1/status', (c) => c.json({
  status: cache.ordered.versions.length > 0 ? 'healthy' : 'degraded',
  versions: cache.meta.totalVersions,
  platforms: cache.ordered.platforms.length,
  lastChecked: cache.meta.lastChecked,
  sha: { primary: cache.meta.sha.primary, secondary: cache.meta.sha.secondary }
})); 