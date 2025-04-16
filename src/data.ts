import { Octokit } from '@octokit/rest';
import type { CacheStore, Version, Platform, CursorArchiveVersion } from './types';
import { WindowsSetupType } from './types';
import { GITHUB } from './config';
import { compareVersions, normalizePlatformName, sortPlatforms, detectWindowsSetupType, getSystemSetupUrl } from './utils';

// Initialize core services
export const octokit = new Octokit({
  auth: process.env.GITHUB_TOKEN
});

// Initialize cache store
export const cache: CacheStore = {
  byId: new Map(),
  byPlatform: new Map(),
  ordered: { versions: [], platforms: [] },
  latest: { version: '', byPlatform: {} },
  meta: { 
    sha: { primary: null, secondary: null }, 
    lastChecked: new Date().toISOString(), 
    totalVersions: 0 
  }
};

// Source data fetching functions
export const fetchPrimarySource = async (): Promise<Version[]> => {
  const { data } = await octokit.rest.repos.getContent({
    ...GITHUB.primary,
    ref: GITHUB.primary.branch
  });

  if (!('content' in data)) throw new Error('Invalid primary source');
  
  const { versions } = JSON.parse(Buffer.from(data.content, 'base64').toString()) as { versions: Version[] };
  cache.meta.sha.primary = 'sha' in data ? data.sha : null;
  
  return versions;
};

export const fetchSecondarySource = async (): Promise<Version[]> => {
  const { data } = await octokit.rest.repos.getContent({
    ...GITHUB.secondary,
    ref: GITHUB.secondary.branch
  });

  if (!('content' in data)) throw new Error('Invalid secondary source');
  
  const archiveData = JSON.parse(Buffer.from(data.content, 'base64').toString()) as Record<string, CursorArchiveVersion>;
  cache.meta.sha.secondary = 'sha' in data ? data.sha : null;
  
  return Object.entries(archiveData).map(([version, data]) => ({
    version,
    date: data.date,
    platforms: Object.entries(data.platforms).reduce((acc, [platform, details]) => {
      acc[normalizePlatformName(platform)] = details.url;
      return acc;
    }, {} as Platform)
  }));
};

// Cache management functions
export const checkForUpdates = async (): Promise<boolean> => {
  try {
    const [primaryResult, secondaryResult] = await Promise.allSettled([
      octokit.rest.repos.getContent({ ...GITHUB.primary, ref: GITHUB.primary.branch }),
      octokit.rest.repos.getContent({ ...GITHUB.secondary, ref: GITHUB.secondary.branch })
    ]);

    cache.meta.lastChecked = new Date().toISOString();
    
    return (
      (primaryResult.status === 'fulfilled' && 
       'sha' in primaryResult.value.data && 
       cache.meta.sha.primary !== primaryResult.value.data.sha) ||
      (secondaryResult.status === 'fulfilled' && 
       'sha' in secondaryResult.value.data && 
       cache.meta.sha.secondary !== secondaryResult.value.data.sha)
    );
  } catch (error) {
    console.error('Update check failed:', error);
    return false;
  }
};

// Version processing functions
const processVersions = (versions: Version[]): void => {
  const processed = new Set<string>();
  const allPlatforms = new Set<string>();
  const windowsInstallers = new Map<string, { user?: string; system?: string }>();
  
  // Process versions and collect platform data
  for (const version of versions) {
    if (processed.has(version.version)) continue;
    
    processed.add(version.version);
    cache.byId.set(version.version, version);
    cache.ordered.versions.push(version.version);
    
    // Process platforms and collect Windows installers
    Object.entries(version.platforms).forEach(([platform, url]) => {
      const normalizedPlatform = normalizePlatformName(platform);
      allPlatforms.add(normalizedPlatform);
      
      if (!platform.startsWith('win32-')) return;
      
      const installers = windowsInstallers.get(normalizedPlatform) ?? {};
      const setupType = detectWindowsSetupType(url, platform);
      
      if (platform.endsWith('-user') || setupType === WindowsSetupType.USER) {
        installers.user = url;
      } else if (platform.endsWith('-system') || setupType === WindowsSetupType.SYSTEM) {
        installers.system = url;
      }
      
      windowsInstallers.set(normalizedPlatform, installers);
    });
  }
  
  cache.ordered.platforms = sortPlatforms(Array.from(allPlatforms));
  
  // Build platform-specific version lists
  for (const version of versions) {
    const platforms = Object.entries(version.platforms);
    const platformsList = sortPlatforms([...new Set(platforms.map(([name]) => normalizePlatformName(name)))]);
    
    // Process non-Windows platforms
    platforms.forEach(([platform, url]) => {
      const normalizedPlatform = normalizePlatformName(platform);
      if (normalizedPlatform.startsWith('win32-')) return;
      
      const platformData = { version: version.version, date: version.date, url, platforms: platformsList };
      const platformVersions = cache.byPlatform.get(normalizedPlatform) ?? [];
      const insertAt = platformVersions.findIndex(v => compareVersions(v.version, version.version) > 0);
      
      insertAt === -1 ? platformVersions.push(platformData) : platformVersions.splice(insertAt, 0, platformData);
      cache.byPlatform.set(normalizedPlatform, platformVersions);
    });
    
    // Process Windows platforms
    windowsInstallers.forEach((installers, platform) => {
      if (!platform.startsWith('win32-')) return;
      
      const platformData = {
        version: version.version,
        date: version.date,
        url: installers.user ?? installers.system ?? '',
        platforms: platformsList
      };
      
      if (installers.user && installers.system) {
        platformData.url = installers.user;
        (platformData as any).systemUrl = installers.system;
      } else if (installers.user) {
        platformData.url = installers.user;
        const systemUrl = getSystemSetupUrl(installers.user);
        if (systemUrl) (platformData as any).systemUrl = systemUrl;
      }
      
      if (!platformData.url) return;
      
      const platformVersions = cache.byPlatform.get(platform) ?? [];
      const insertAt = platformVersions.findIndex(v => compareVersions(v.version, version.version) > 0);
      
      insertAt === -1 ? platformVersions.push(platformData) : platformVersions.splice(insertAt, 0, platformData);
      cache.byPlatform.set(platform, platformVersions);
    });
  }
};

const updateLatestVersions = (): void => {
  if (!cache.ordered.versions.length) return;
  
  cache.latest.version = cache.ordered.versions[0];
  cache.ordered.platforms.forEach(platform => {
    const versions = cache.byPlatform.get(platform);
    if (versions?.length) cache.latest.byPlatform[platform] = versions[0].version;
  });
};

// Main cache update function
export const updateCache = async (): Promise<boolean> => {
  try {
    const [primary, secondary] = await Promise.all([
      fetchPrimarySource().catch(() => []),
      fetchSecondarySource().catch(() => [])
    ]);

    if (!primary.length && !secondary.length) return false;

    cache.byId.clear();
    cache.byPlatform.clear();
    cache.ordered.versions = [];
    cache.ordered.platforms = [];
    
    const allVersions = [...primary, ...secondary].sort((a, b) => compareVersions(a.version, b.version));
    processVersions(allVersions);
    updateLatestVersions();
    
    cache.meta.totalVersions = cache.ordered.versions.length;
    return true;
  } catch (error) {
    console.error('Cache update failed:', error);
    return false;
  }
};