/**
 * Canvas utility functions for the circuit builder.
 */

export const GRID_SIZE = 10; // px

/** Snap a value to the nearest grid point */
export function snapToGrid(value: number, gridSize = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

/** Convert a mouse event position to SVG canvas coordinates */
export function clientToSvg(
  clientX: number,
  clientY: number,
  svg: SVGSVGElement,
  panX: number,
  panY: number,
  zoom: number,
): { x: number; y: number } {
  const rect = svg.getBoundingClientRect();
  return {
    x: (clientX - rect.left - panX) / zoom,
    y: (clientY - rect.top - panY) / zoom,
  };
}

/** Clamp a value between min and max */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Compute a cubic bezier path between two points (used for wire routing).
 * The curve bends horizontally first, giving an "elbow" effect.
 */
export function wirePath(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

/**
 * Compute a right-angle wire path (Manhattan routing).
 * Goes horizontally from start then vertically to end.
 */
export function wirePathManhattan(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
): string {
  return `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
}

/** Generate a simple unique ID */
export function uid(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Zoom limits */
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 4;

/** Adjust zoom, clamped to limits */
export function adjustZoom(current: number, delta: number): number {
  return clamp(current * (delta > 0 ? 0.9 : 1.1), MIN_ZOOM, MAX_ZOOM);
}
