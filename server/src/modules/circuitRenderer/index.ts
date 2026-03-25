/**
 * Circuit Renderer Module
 *
 * Provides auto-layout helpers that translate a raw CircuitGraph into a
 * RenderGraph: the same nodes/edges but with finalized (x, y) coordinates
 * and rendering metadata (colors, sizes) suitable for a canvas or SVG renderer.
 *
 * No external dependencies — pure TypeScript geometry helpers.
 */

import { CircuitGraph, CircuitNode, CircuitEdge } from '../circuitParser';

// ── types ─────────────────────────────────────────────────────────────────────

export interface RenderNode extends CircuitNode {
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  textColor: string;
}

export interface RenderEdge extends CircuitEdge {
  /** Absolute waypoints [[x1,y1],[x2,y2],…] for the wire path */
  points: [number, number][];
  strokeWidth: number;
}

export interface RenderGraph {
  nodes: RenderNode[];
  edges: RenderEdge[];
  canvasWidth: number;
  canvasHeight: number;
}

// ── component visual metadata ─────────────────────────────────────────────────

interface ComponentVisuals {
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  textColor: string;
}

const DEFAULT_VISUALS: ComponentVisuals = {
  width: 80,
  height: 50,
  fillColor: '#374151',
  strokeColor: '#6b7280',
  textColor: '#f9fafb',
};

const COMPONENT_VISUALS: Record<string, Partial<ComponentVisuals>> = {
  'arduino-uno': {
    width: 140,
    height: 90,
    fillColor: '#1a6b3c',
    strokeColor: '#0d4a28',
    textColor: '#86efac',
  },
  'arduino-nano': { width: 100, height: 70, fillColor: '#1a5c8a', strokeColor: '#0d3d5e' },
  'arduino-mega': { width: 180, height: 110, fillColor: '#1a6b3c', strokeColor: '#0d4a28' },
  power_vcc: {
    width: 50,
    height: 30,
    fillColor: '#dc2626',
    strokeColor: '#991b1b',
    textColor: '#ffffff',
  },
  power_gnd: {
    width: 50,
    height: 30,
    fillColor: '#1f2937',
    strokeColor: '#374151',
    textColor: '#d1d5db',
  },
  'resistor-220': { width: 70, height: 28, fillColor: '#d97706', strokeColor: '#92400e', textColor: '#fff' },
  'resistor-470': { width: 70, height: 28, fillColor: '#d97706', strokeColor: '#92400e', textColor: '#fff' },
  'resistor-1k': { width: 70, height: 28, fillColor: '#d97706', strokeColor: '#92400e', textColor: '#fff' },
  'resistor-10k': { width: 70, height: 28, fillColor: '#d97706', strokeColor: '#92400e', textColor: '#fff' },
  'led-red': { width: 40, height: 50, fillColor: '#ef4444', strokeColor: '#991b1b', textColor: '#fff' },
  'led-green': { width: 40, height: 50, fillColor: '#22c55e', strokeColor: '#15803d', textColor: '#fff' },
  'led-blue': { width: 40, height: 50, fillColor: '#3b82f6', strokeColor: '#1d4ed8', textColor: '#fff' },
  'led-yellow': { width: 40, height: 50, fillColor: '#eab308', strokeColor: '#a16207', textColor: '#fff' },
  'led-white': { width: 40, height: 50, fillColor: '#e5e7eb', strokeColor: '#9ca3af', textColor: '#111' },
  'led-rgb': { width: 40, height: 50, fillColor: '#a855f7', strokeColor: '#7e22ce', textColor: '#fff' },
  button: { width: 50, height: 50, fillColor: '#4b5563', strokeColor: '#374151' },
  'lcd-16x2-i2c': { width: 160, height: 60, fillColor: '#1e3a5f', strokeColor: '#1e3a5f', textColor: '#7dd3fc' },
  'oled-ssd1306': { width: 80, height: 60, fillColor: '#1f2937', strokeColor: '#6b7280', textColor: '#4ade80' },
  dht11: { width: 60, height: 50, fillColor: '#0369a1', strokeColor: '#0284c7', textColor: '#bae6fd' },
  'servo-sg90': { width: 80, height: 55, fillColor: '#7c3aed', strokeColor: '#5b21b6', textColor: '#ddd6fe' },
  potentiometer: { width: 55, height: 55, fillColor: '#0f766e', strokeColor: '#134e4a', textColor: '#99f6e4' },
  'buzzer-active': { width: 45, height: 45, fillColor: '#9f1239', strokeColor: '#881337', textColor: '#fda4af' },
};

function getVisuals(type: string): ComponentVisuals {
  const override = COMPONENT_VISUALS[type] ?? {};
  return { ...DEFAULT_VISUALS, ...override };
}

// ── wire colour helpers ───────────────────────────────────────────────────────

function wireColor(edge: CircuitEdge): string {
  if (edge.color) return edge.color;
  const f = edge.from.toLowerCase();
  const t = edge.to.toLowerCase();
  if (f.includes('vcc') || t.includes('vcc') || f.includes('5v') || t.includes('5v'))
    return 'red';
  if (f.includes('gnd') || t.includes('gnd')) return 'black';
  return 'yellow';
}

// ── auto-layout ───────────────────────────────────────────────────────────────

const H_GAP = 30;
const V_GAP = 40;
const MARGIN = 60;

/**
 * Assign (x, y) positions to all nodes using a simple tiered layout:
 *   row 0 → Arduino board
 *   row 1 → power rails
 *   row 2 → resistors
 *   row 3 → LEDs / output components
 *   row 4 → input components / sensors
 *   row 5 → special (LCD, OLED, …)
 */
function autoLayout(nodes: CircuitNode[]): Map<string, { x: number; y: number }> {
  const tier = (type: string): number => {
    if (type.startsWith('arduino')) return 0;
    if (type === 'power_vcc' || type === 'power_gnd') return 1;
    if (type.startsWith('resistor')) return 2;
    if (type.startsWith('led-')) return 3;
    if (type === 'button' || type === 'toggle-switch') return 4;
    return 5;
  };

  // Group by tier
  const tiers = new Map<number, CircuitNode[]>();
  nodes.forEach((n) => {
    const t = tier(n.type);
    if (!tiers.has(t)) tiers.set(t, []);
    tiers.get(t)!.push(n);
  });

  const positions = new Map<string, { x: number; y: number }>();
  const sortedTiers = [...tiers.keys()].sort((a, b) => a - b);
  const tierVisuals = sortedTiers.map((t) =>
    tiers.get(t)!.map((n) => getVisuals(n.type)),
  );

  let currentY = MARGIN;
  sortedTiers.forEach((t, rowIdx) => {
    const tierNodes = tiers.get(t)!;
    const visuals = tierVisuals[rowIdx];
    const rowHeight = Math.max(...visuals.map((v) => v.height));

    // Calculate total row width to centre-align
    const totalWidth =
      tierNodes.reduce((sum, n, i) => sum + visuals[i].width + (i > 0 ? H_GAP : 0), 0);

    let currentX = Math.max(MARGIN, (800 - totalWidth) / 2);

    tierNodes.forEach((node, i) => {
      positions.set(node.id, { x: currentX, y: currentY });
      currentX += visuals[i].width + H_GAP;
    });

    currentY += rowHeight + V_GAP;
  });

  return positions;
}

// ── edge routing ──────────────────────────────────────────────────────────────

function splitEndpoint(ep: string): { nodeId: string } {
  const idx = ep.indexOf(':');
  return { nodeId: idx === -1 ? ep : ep.slice(0, idx) };
}

function centreOf(
  nodeId: string,
  positions: Map<string, { x: number; y: number }>,
  visuals: Map<string, ComponentVisuals>,
): [number, number] {
  const pos = positions.get(nodeId) ?? { x: 0, y: 0 };
  const vis = visuals.get(nodeId) ?? DEFAULT_VISUALS;
  return [pos.x + vis.width / 2, pos.y + vis.height / 2];
}

/** Simple orthogonal route: start → bend → end */
function routeEdge(
  from: [number, number],
  to: [number, number],
): [number, number][] {
  const midY = (from[1] + to[1]) / 2;
  return [from, [from[0], midY], [to[0], midY], to];
}

// ── main export ───────────────────────────────────────────────────────────────

/**
 * Convert a raw CircuitGraph into a fully positioned, styled RenderGraph.
 *
 * If nodes already have non-zero (x, y) values they are preserved;
 * otherwise auto-layout is applied.
 */
export function buildRenderGraph(graph: CircuitGraph): RenderGraph {
  const { components, connections } = graph;

  const visualsMap = new Map<string, ComponentVisuals>();
  components.forEach((n) => {
    visualsMap.set(n.id, getVisuals(n.type));
  });

  // Use existing positions if set, otherwise auto-layout
  const hasPositions = components.some((n) => n.x !== 0 || n.y !== 0);
  const positions = hasPositions
    ? new Map(components.map((n) => [n.id, { x: n.x, y: n.y }]))
    : autoLayout(components);

  // Build RenderNodes
  const nodes: RenderNode[] = components.map((n) => {
    const pos = positions.get(n.id) ?? { x: n.x, y: n.y };
    const vis = visualsMap.get(n.id)!;
    return { ...n, ...pos, ...vis };
  });

  // Build RenderEdges
  const edges: RenderEdge[] = connections.map((e) => {
    const fromCentre = centreOf(splitEndpoint(e.from).nodeId, positions, visualsMap);
    const toCentre = centreOf(splitEndpoint(e.to).nodeId, positions, visualsMap);
    const color = wireColor(e);
    return {
      ...e,
      color,
      points: routeEdge(fromCentre, toCentre),
      strokeWidth: color === 'red' || color === 'black' ? 2 : 1.5,
    };
  });

  // Canvas bounds
  let maxX = 0;
  let maxY = 0;
  nodes.forEach((n) => {
    maxX = Math.max(maxX, n.x + n.width + MARGIN);
    maxY = Math.max(maxY, n.y + n.height + MARGIN);
  });

  return {
    nodes,
    edges,
    canvasWidth: Math.max(800, maxX),
    canvasHeight: Math.max(600, maxY),
  };
}
