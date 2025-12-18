/**
 * Generates a demo URL using the current browser's hostname.
 * This allows demos to work both locally and when accessed remotely.
 */
export const getDemoUrl = (port: number | undefined): string => {
  if (!port) return '#';
  const hostname = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${hostname}:${port}`;
};
