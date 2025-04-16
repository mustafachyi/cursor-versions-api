import { PLATFORM_MAP, PLATFORM_ORDER } from './config';
import { WindowsSetupType } from './types';

// Returns positive if b is newer than a
export const compareVersions = (a: string, b: string): number => {
  const [aMajor = 0, aMinor = 0, aPatch = 0] = a.split('.').map(Number);
  const [bMajor = 0, bMinor = 0, bPatch = 0] = b.split('.').map(Number);
  
  return (bMajor - aMajor) || (bMinor - aMinor) || (bPatch - aPatch);
};

// Normalizes platform names to standard format
export const normalizePlatformName = (platform: string): string => {
  if (platform.startsWith('win32-')) {
    return platform.replace(/-(?:user|system)$/, '');
  }
  return platform in PLATFORM_MAP ? PLATFORM_MAP[platform as keyof typeof PLATFORM_MAP] : platform;
};

// Sorts platforms by predefined order
export const sortPlatforms = (platforms: string[]): string[] => 
  [...platforms].sort((a, b) => {
    const aIdx = PLATFORM_ORDER.indexOf(a as typeof PLATFORM_ORDER[number]);
    const bIdx = PLATFORM_ORDER.indexOf(b as typeof PLATFORM_ORDER[number]);
    return (aIdx === -1 && bIdx === -1) ? a.localeCompare(b) : aIdx - bIdx;
  });

// Generates system installer URL from user installer URL
export const getSystemSetupUrl = (url: string): string | null => {
  if (!url) return null;
  
  const isUserSetup = url.includes('/user-setup/');
  const isUserInstaller = url.includes('CursorUserSetup');
  
  if (!isUserSetup && !isUserInstaller) return null;
  
  return url
    .replace('/user-setup/', '/system-setup/')
    .replace('CursorUserSetup', 'CursorSetup');
};

// Detects Windows installer type from URL
export const detectWindowsSetupType = (url: string, platform: string): WindowsSetupType => {
  if (!platform.startsWith('win32')) return WindowsSetupType.UNKNOWN;
  
  return url.includes('/user-setup/') || url.includes('CursorUserSetup')
    ? WindowsSetupType.USER
    : url.includes('/system-setup/') || url.includes('CursorSetup')
      ? WindowsSetupType.SYSTEM
      : WindowsSetupType.UNKNOWN;
};