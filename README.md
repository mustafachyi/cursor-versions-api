# Cursor Versions API

A lightweight, caching API server providing access to Cursor editor download links and version history.

## Overview

This service fetches Cursor version information from public GitHub repositories, processes it, caches it locally, and exposes it via a simple REST API. It aims to provide a reliable and fast way to query available Cursor versions and their download URLs for different platforms.

## Features

*   Fetches version data from primary and secondary GitHub sources.
*   Merges and deduplicates version information.
*   In-memory caching for fast responses.
*   Periodically checks for updates in the background.
*   Provides endpoints to query versions by ID, platform, or get the latest.
*   Distinguishes between user and system installers for Windows.
*   Includes a status endpoint for monitoring.

## Tech Stack

*   Runtime: Bun
*   Framework: Hono
*   Language: TypeScript
*   API Client: @octokit/rest

## API Documentation

Base URL: `/api/v1`

### GET /versions

Retrieves version information.

**Query Parameters:**

*   `limit` (optional, number): Limits the number of versions returned. If `limit=1`, returns the latest version. Defaults to all versions.
*   `platform` (optional, string): Filters versions available for a specific platform (e.g., `win32-x64`, `darwin-arm64`). If combined with `limit=1`, returns the latest version for that platform.
*   `version` (optional, string): Retrieves data for a specific version ID (e.g., `0.25.0`).

**Responses:**

*   **Latest Version (`limit=1` or no parameters and `limit=1` implied):**
    ```json
    {
      "version": "0.25.0",
      "date": "2024-01-15T10:00:00Z",
      "platforms": {
        "win32-x64": { "url": "...", "systemUrl": "..." },
        "darwin-arm64": { "url": "..." },
        "linux-x64": { "url": "..." }
        // ... other platforms
      }
    }
    ```
*   **Multiple Versions (e.g., `limit=5`):**
    ```json
    {
      "versions": [
        {
          "version": "0.25.0",
          "date": "...",
          "platforms": { ... }
        },
        {
          "version": "0.24.1",
          "date": "...",
          "platforms": { ... }
        }
        // ... up to limit
      ]
    }
    ```
*   **Platform Specific (e.g., `platform=darwin-arm64&limit=1`):**
    ```json
    {
        "version": "0.25.0",
        "date": "...",
        "url": "...",
        "platforms": ["win32-x64", "darwin-arm64", ...] 
    }
    ```
*   **Platform Specific Multiple (e.g., `platform=darwin-arm64&limit=5`):**
     ```json
    {
      "versions": [
          {
              "version": "0.25.0",
              "date": "...",
              "url": "...",
              "platforms": [...] 
          },
          {
              "version": "0.24.1",
              "date": "...",
              "url": "...",
              "platforms": [...] 
          }
          // ... up to limit
      ]
    }
    ```
*   **Version Specific (e.g., `version=0.25.0`):**
    ```json
    {
      "version": "0.25.0",
      "date": "...",
      "platforms": { ... }
    }
    ```
*   **Errors:** `404 Not Found` (if platform/version not found), `503 Service Unavailable` (if cache is not yet populated).

### GET /status

Provides the current status of the API and cache.

**Response:**

```json
{
  "status": "healthy", // or "degraded" if cache is empty
  "versions": 150,
  "platforms": 6,
  "lastChecked": "2025-02-20T12:00:00.000Z",
  "sha": {
    "primary": "abc123...",
    "secondary": "def456..."
  }
}
```

## Setup and Installation

1.  **Clone the repository:**
    ```bash
    # Replace with your chosen repository name if different
    git clone https://github.com/mustafachyi/cursor-versions-api.git 
    cd cursor-versions-api
    ```
2.  **Install dependencies:**
    ```bash
    bun install
    ```

## Usage

*   **Development (with hot-reloading):**
    ```bash
    bun run dev
    ```
*   **Production:**
    ```bash
    bun run start
    ```

The API will be available at `http://localhost:3000` by default (or the port specified by the `PORT` environment variable).

## Configuration

*   **Port:** Set the `PORT` environment variable (defaults to `3000`).
*   **Data Sources & Update Interval:** Configured in `src/config.ts`. 