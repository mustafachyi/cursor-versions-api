# Cursor Versions API

A lightweight, caching API server providing access to Cursor editor download links and version history.

## Overview

This service fetches Cursor version information from public GitHub repositories, processes it, caches it locally, and exposes it via a simple REST API. It aims to provide a reliable and fast way to query available Cursor versions and their download URLs for different platforms.

## Features

*   Fetches version data from primary and secondary GitHub sources
*   Merges and deduplicates version information
*   In-memory caching for fast responses
*   Periodically checks for updates in the background
*   Provides endpoints to query versions by ID, platform, or get the latest
*   Distinguishes between user and system installers for Windows
*   Includes a status endpoint for monitoring

## Tech Stack

*   Runtime: Bun
*   Framework: Hono
*   Language: TypeScript
*   API Client: @octokit/rest

## API Documentation

Base URL: `/api/v1`

### GET /versions

Retrieves version information with optimized response handling.

**Query Parameters:**

*   `limit` (optional, number): Maximum number of versions to return. Defaults to all versions
*   `platform` (optional, string): Filter by platform (e.g., `win32-x64`, `darwin-arm64`)
*   `version` (optional, string): Get specific version or 'latest'

**Response Types:**

*   **Latest Version (`version=latest` or `limit=1`):**
    ```json
    {
      "version": "0.25.0",
      "date": "2024-01-15T10:00:00Z",
      "platforms": {
        "win32-x64": { "url": "...", "systemUrl": "..." },
        "darwin-arm64": { "url": "..." },
        "linux-x64": { "url": "..." }
      }
    }
    ```

*   **Platform-Specific Latest (`platform=darwin-arm64&limit=1`):**
    ```json
    {
      "version": "0.25.0",
      "date": "...",
      "url": "...",
      "platforms": ["win32-x64", "darwin-arm64", ...]
    }
    ```

*   **Multiple Versions (`limit=n`):**
    ```json
    {
      "versions": [
        {
          "version": "0.25.0",
          "date": "...",
          "platforms": { ... }
        }
      ]
    }
    ```

*   **Platform-Specific Versions (`platform=darwin-arm64`):**
    ```json
    {
      "versions": [
        {
          "version": "0.25.0",
          "date": "...",
          "url": "...",
          "platforms": [...]
        }
      ]
    }
    ```

**Error Responses:**

*   `404 Not Found`: Platform or version not found
*   `503 Service Unavailable`: Cache not populated

### GET /status

Provides API and cache health information.

**Response:**

```json
{
  "status": "healthy",
  "versions": 150,
  "platforms": 6,
  "lastChecked": "2025-02-20T12:00:00.000Z",
  "sha": {
    "primary": "abc123...",
    "secondary": "def456..."
  }
}
```

## Live Demo

A public instance is available at `https://cursor-versions.selfhoster.nl`

Example queries:
*   Latest version: [`/api/v1/versions?version=latest`](https://cursor-versions.selfhoster.nl/api/v1/versions?version=latest)
*   Platform specific: [`/api/v1/versions?platform=darwin-arm64`](https://cursor-versions.selfhoster.nl/api/v1/versions?platform=darwin-arm64)
*   Health check: [`/api/v1/status`](https://cursor-versions.selfhoster.nl/api/v1/status)

## Setup

1.  **Clone:**
    ```bash
    git clone https://github.com/mustafachyi/cursor-versions-api.git 
    cd cursor-versions-api
    ```
2.  **Install:**
    ```bash
    bun install
    ```

## Usage

*   **Development:**
    ```bash
    bun run dev
    ```
*   **Production:**
    ```bash
    bun run start
    ```

Server runs on port 3000 by default (configurable via `PORT` environment variable).

## Configuration

*   **GitHub Token:** Set `GITHUB_TOKEN` environment variable with `public_repo` scope to avoid rate limits
*   **Port:** Configure via `PORT` environment variable
*   **Update Interval:** Set in `src/config.ts` 