/**
 * Breadboard logic and rendering helpers.
 *
 * A standard half-size breadboard (400 tie) has:
 *   - 30 columns (1–30)
 *   - 10 rows per column split into two buses:
 *       top bus:  a–e  (rows 0–4, all connected per column)
 *       bottom bus: f–j (rows 5–9, all connected per column)
 *   - 2 power rails (top + and -, bottom + and -)
 *
 * A full-size board doubles the column count to 63.
 */

export const HOLE_PITCH = 10;   // px between adjacent holes
export const HOLE_RADIUS = 3;   // px

export type HoleRow = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j';
export type PowerRail = '+top' | '-top' | '+bot' | '-bot';
export type AnyRow = HoleRow | PowerRail;

export interface BoardHole {
  id: string;         // e.g. "a1", "+top5"
  row: AnyRow;
  col: number;        // 1-based
  x: number;         // local canvas x (relative to breadboard origin)
  y: number;         // local canvas y
  occupied: boolean;
  componentId?: string;
  pinName?: string;
}

export interface BreadboardConfig {
  cols: number;       // 30 for half, 63 for full
  originX: number;   // board top-left x on canvas
  originY: number;   // board top-left y on canvas
}

const ROW_ORDER: HoleRow[] = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

/** Build all holes for a breadboard */
export function buildBreadboard(cfg: BreadboardConfig): BoardHole[] {
  const holes: BoardHole[] = [];
  const { cols } = cfg;

  // Power rail offsets (relative to the breadboard's inner component area)
  // Top power rails sit above row a, bottom rails below row j
  const railTop_plus_y  = -3 * HOLE_PITCH;
  const railTop_minus_y = -2 * HOLE_PITCH;
  const mainTop_y       = 0; // row a starts here
  const mainBot_y       = mainTop_y + 6 * HOLE_PITCH; // row f (after a–e + gap)
  const railBot_plus_y  = mainBot_y + 11 * HOLE_PITCH;
  const railBot_minus_y = mainBot_y + 12 * HOLE_PITCH;

  for (let col = 1; col <= cols; col++) {
    const cx = (col - 1) * HOLE_PITCH;

    // Power rails
    holes.push({ id: `+top${col}`,  row: '+top', col, x: cx, y: railTop_plus_y,  occupied: false });
    holes.push({ id: `-top${col}`,  row: '-top', col, x: cx, y: railTop_minus_y, occupied: false });
    holes.push({ id: `+bot${col}`,  row: '+bot', col, x: cx, y: railBot_plus_y,  occupied: false });
    holes.push({ id: `-bot${col}`,  row: '-bot', col, x: cx, y: railBot_minus_y, occupied: false });

    // Main component rows a–j (with a gap between e and f)
    for (let ri = 0; ri < ROW_ORDER.length; ri++) {
      const row = ROW_ORDER[ri];
      // Gap of 1 HOLE_PITCH between rows e and f (the central divide)
      const gap = ri >= 5 ? HOLE_PITCH : 0;
      const y = mainTop_y + ri * HOLE_PITCH + gap;
      holes.push({ id: `${row}${col}`, row, col, x: cx, y, occupied: false });
    }
  }

  return holes;
}

/**
 * Returns which holes are electrically connected to the given hole.
 * - Rows a–e in the same column are connected.
 * - Rows f–j in the same column are connected.
 * - Each power rail row spans the full board.
 */
export function getConnectedHoles(hole: BoardHole, allHoles: BoardHole[]): BoardHole[] {
  const { row, col } = hole;
  const topBus: HoleRow[] = ['a', 'b', 'c', 'd', 'e'];
  const botBus: HoleRow[] = ['f', 'g', 'h', 'i', 'j'];
  const powerRails: PowerRail[] = ['+top', '-top', '+bot', '-bot'];

  if (powerRails.includes(row as PowerRail)) {
    // All holes on the same power rail row are connected
    return allHoles.filter(h => h.row === row);
  }

  const bus = topBus.includes(row as HoleRow) ? topBus : botBus;
  return allHoles.filter(h => h.col === col && bus.includes(h.row as HoleRow));
}

/** Find the nearest hole to a canvas point (in local breadboard coordinates) */
export function findNearestHole(
  localX: number,
  localY: number,
  holes: BoardHole[],
  snapRadius = HOLE_PITCH,
): BoardHole | null {
  let nearest: BoardHole | null = null;
  let minDist = snapRadius;
  for (const h of holes) {
    const dx = h.x - localX;
    const dy = h.y - localY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = h;
    }
  }
  return nearest;
}

/** Mark a hole as occupied */
export function occupyHole(
  holes: BoardHole[],
  holeId: string,
  componentId: string,
  pinName: string,
): BoardHole[] {
  return holes.map(h =>
    h.id === holeId ? { ...h, occupied: true, componentId, pinName } : h,
  );
}

/** Free a hole */
export function freeHole(holes: BoardHole[], holeId: string): BoardHole[] {
  return holes.map(h =>
    h.id === holeId ? { ...h, occupied: false, componentId: undefined, pinName: undefined } : h,
  );
}

/** Canvas dimensions for a breadboard given its config */
export function breadboardSize(cols: number): { width: number; height: number } {
  return {
    width: (cols - 1) * HOLE_PITCH + 2 * HOLE_PITCH,      // padding on each side
    height: 16 * HOLE_PITCH,  // rails + rows + gap
  };
}
