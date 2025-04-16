// Repository configuration for version data sources
export const GITHUB = {
  primary: {
    owner: 'oslook',
    repo: 'cursor-ai-downloads',
    path: 'version-history.json',
    branch: 'main'
  },
  secondary: {
    owner: 'worryzyy',
    repo: 'cursor-ver-dl',
    path: 'cursor-version-archive.json',
    branch: 'master'
  }
} as const;

// Runtime configuration
export const CONFIG = {
  updateInterval: 600_000, // 10 minutes in milliseconds
  port: Number(process.env.PORT ?? 3000)
} as const;

// Platform configuration
export const PLATFORM_ORDER = [
  // Windows platforms
  'win32-x64',
  'win32-arm64',
  // macOS platforms
  'darwin-universal',
  'darwin-x64',
  'darwin-arm64',
  // Linux platforms
  'linux-x64',
  'linux-arm64'
] as const;

// Platform name normalization map
export const PLATFORM_MAP = Object.freeze({
  windows: 'win32-x64',
  windows_arm64: 'win32-arm64',
  mac: 'darwin-universal',
  mac_arm64: 'darwin-arm64',
  mac_intel: 'darwin-x64',
  linux: 'linux-x64'
}) satisfies Record<string, string>;