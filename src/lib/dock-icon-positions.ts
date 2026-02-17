const positions = new Map<string, DOMRect>();

export function registerDockIconPosition(appId: string, rect: DOMRect): void {
  positions.set(appId, rect);
}

export function getDockIconPosition(appId: string): DOMRect | undefined {
  return positions.get(appId);
}

export function unregisterDockIconPosition(appId: string): void {
  positions.delete(appId);
}
