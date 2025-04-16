// Core type definitions for platform and version data

// Platform types
export type Platform = Record<string, string>;

// Platform-specific URL and checksum information
export type PlatformDetails = {
  readonly url: string;
  readonly checksum: string;
};

// Windows installation types (user vs system level)
export enum WindowsSetupType {
  USER = 'user',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

// Platform metadata with installer type (for Windows) or just URL (for others)
export interface PlatformInfo {
  readonly url: string;
  readonly systemUrl?: string; // Windows-specific system installer URL
}

// Core version data from sources
export interface Version {
  readonly version: string;
  readonly date: string;
  readonly platforms: Platform;
}

// Flattened version response for API
export interface FlatVersionResponse {
  readonly version: string;
  readonly date: string;
  platforms: Record<string, {
    url: string;
    systemUrl?: string;
  }>;
}

// Processed version data for API responses
export interface VersionData extends Omit<Version, 'platforms'> {
  readonly url: string;
  readonly systemUrl?: string; // Windows-specific system installer URL
  readonly platforms: string[];
}

// Secondary source version format
export interface CursorArchiveVersion {
  readonly date: string;
  readonly platforms: Record<string, PlatformDetails>;
}

// Cache types
export interface CacheMetadata {
  sha: {
    primary: string | null;
    secondary: string | null;
  };
  lastChecked: string;
  totalVersions: number;
}

export interface CacheOrdering {
  versions: string[];
  platforms: string[];
}

export interface CacheLatest {
  version: string;
  byPlatform: Record<string, string>;
}

export interface CacheStore {
  readonly byId: Map<string, Version>;
  readonly byPlatform: Map<string, VersionData[]>;
  ordered: CacheOrdering;
  latest: CacheLatest;
  meta: CacheMetadata;
}