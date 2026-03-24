// Circuit builder TypeScript interfaces

export interface Pin {
  name: string;
  /** x offset from component origin */
  x: number;
  /** y offset from component origin */
  y: number;
}

export interface CircuitComponent {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  rotation?: number;
}

export interface CircuitWire {
  id: string;
  fromComponentId: string;
  fromPin: string;
  toComponentId: string;
  toPin: string;
  color: string;
}

export interface CircuitLayout {
  components: CircuitComponent[];
  wires: CircuitWire[];
}

// Breadboard hole address
export interface BreadboardHole {
  row: string;   // 'a'–'j' or '+'/'-' for power rails
  col: number;   // 1–30 (or 1–63 for full board)
  x: number;     // canvas x
  y: number;     // canvas y
  occupied: boolean;
  componentId?: string;
  pinName?: string;
}

// Breadboard electrical node groups
export interface BreadboardNet {
  id: string;
  holes: BreadboardHole[];
}

export interface BreadboardLayout {
  holes: BreadboardHole[];
  nets: BreadboardNet[];
}

// Dragging state for wiring
export interface WireStart {
  componentId: string;
  pinName: string;
  absX: number;
  absY: number;
}

// Canvas viewport state
export interface Viewport {
  zoom: number;
  panX: number;
  panY: number;
}
