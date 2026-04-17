// Preload script runs in an isolated context before the renderer page loads.
// The renderer communicates with the backend exclusively via Next.js API routes
// over HTTP (no IPC needed), so this file is intentionally minimal.
export {};
