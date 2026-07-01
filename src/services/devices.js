export function currentDeviceSnapshot() {
  const nav = globalThis.navigator || {};
  return {
    id: 'current-browser',
    browser: nav.userAgentData?.brands?.[0]?.brand || 'Current browser',
    os: nav.platform || 'Unknown OS',
    location: 'Approximate location unavailable',
    lastActive: new Date().toLocaleString(),
    trusted: true
  };
}
