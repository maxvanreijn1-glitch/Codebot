import { useState, useRef, useCallback, useEffect } from 'react';
import { Trash2, ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ComponentType =
  | 'arduino'
  | 'led'
  | 'resistor'
  | 'button'
  | 'potentiometer'
  | 'servo'
  | 'lcd'
  | 'breadboard'
  | 'wire';

export interface PinDef {
  name: string;
  x: number; // relative to component top-left
  y: number;
}

export interface CircuitComponent {
  id: string;
  type: ComponentType;
  label: string;
  x: number;
  y: number;
  color?: string; // for LEDs
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

// ─── Component dimensions & pin definitions ──────────────────────────────────

const COMPONENT_DEFS: Record<
  ComponentType,
  { width: number; height: number; pins: PinDef[]; label: string }
> = {
  arduino: {
    width: 120,
    height: 160,
    label: 'Arduino Uno',
    pins: [
      { name: 'D2', x: 0, y: 30 },
      { name: 'D3', x: 0, y: 45 },
      { name: 'D4', x: 0, y: 60 },
      { name: 'D5', x: 0, y: 75 },
      { name: 'D6', x: 0, y: 90 },
      { name: 'D7', x: 0, y: 105 },
      { name: 'D8', x: 0, y: 120 },
      { name: 'D9~', x: 120, y: 30 },
      { name: 'D10~', x: 120, y: 45 },
      { name: 'D11~', x: 120, y: 60 },
      { name: 'D12', x: 120, y: 75 },
      { name: 'D13', x: 120, y: 90 },
      { name: 'A0', x: 120, y: 105 },
      { name: 'A1', x: 120, y: 120 },
      { name: '5V', x: 30, y: 0 },
      { name: '3.3V', x: 50, y: 0 },
      { name: 'GND', x: 70, y: 0 },
      { name: 'GND2', x: 90, y: 0 },
    ],
  },
  led: {
    width: 30,
    height: 50,
    label: 'LED',
    pins: [
      { name: '+', x: 15, y: 0 },
      { name: '-', x: 15, y: 50 },
    ],
  },
  resistor: {
    width: 60,
    height: 20,
    label: 'Resistor',
    pins: [
      { name: 'a', x: 0, y: 10 },
      { name: 'b', x: 60, y: 10 },
    ],
  },
  button: {
    width: 40,
    height: 40,
    label: 'Button',
    pins: [
      { name: 'a1', x: 0, y: 15 },
      { name: 'a2', x: 0, y: 25 },
      { name: 'b1', x: 40, y: 15 },
      { name: 'b2', x: 40, y: 25 },
    ],
  },
  potentiometer: {
    width: 50,
    height: 60,
    label: 'Potentiometer',
    pins: [
      { name: 'VCC', x: 10, y: 60 },
      { name: 'OUT', x: 25, y: 60 },
      { name: 'GND', x: 40, y: 60 },
    ],
  },
  servo: {
    width: 60,
    height: 40,
    label: 'Servo',
    pins: [
      { name: 'GND', x: 0, y: 40 },
      { name: 'VCC', x: 20, y: 40 },
      { name: 'SIG', x: 40, y: 40 },
    ],
  },
  lcd: {
    width: 100,
    height: 50,
    label: 'LCD 16×2',
    pins: [
      { name: 'VSS', x: 10, y: 50 },
      { name: 'VDD', x: 20, y: 50 },
      { name: 'V0', x: 30, y: 50 },
      { name: 'RS', x: 40, y: 50 },
      { name: 'EN', x: 50, y: 50 },
      { name: 'D4', x: 60, y: 50 },
      { name: 'D5', x: 70, y: 50 },
      { name: 'D6', x: 80, y: 50 },
      { name: 'D7', x: 90, y: 50 },
    ],
  },
  breadboard: {
    width: 200,
    height: 80,
    label: 'Breadboard',
    pins: [
      { name: '+5V-top', x: 0, y: 10 },
      { name: 'GND-top', x: 0, y: 20 },
      { name: '+5V-bot', x: 0, y: 60 },
      { name: 'GND-bot', x: 0, y: 70 },
    ],
  },
  wire: { width: 0, height: 0, label: 'Wire', pins: [] },
};

const LED_COLORS = ['red', 'green', 'blue', 'yellow', 'white', 'orange'];
const WIRE_COLORS = ['red', 'black', 'yellow', 'green', 'blue', 'white', 'orange'];

// ─── SVG Shapes ──────────────────────────────────────────────────────────────

function ComponentShape({ type, color }: { type: ComponentType; color?: string }) {
  const def = COMPONENT_DEFS[type];
  const w = def.width;
  const h = def.height;

  switch (type) {
    case 'arduino':
      return (
        <g>
          <rect width={w} height={h} rx={4} fill="#1a6b3c" stroke="#0d4a28" strokeWidth={1.5} />
          <text x={w / 2} y={h / 2 - 8} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">
            Arduino
          </text>
          <text x={w / 2} y={h / 2 + 6} textAnchor="middle" fill="#86efac" fontSize={8}>
            Uno
          </text>
          <rect x={20} y={h - 25} width={20} height={15} rx={2} fill="#0d4a28" />
          <rect x={55} y={h - 25} width={20} height={15} rx={2} fill="#0d4a28" />
        </g>
      );
    case 'led': {
      const ledColor = color ?? 'red';
      const ledColors: Record<string, { fill: string; glow: string }> = {
        red: { fill: '#ef4444', glow: '#fca5a5' },
        green: { fill: '#22c55e', glow: '#86efac' },
        blue: { fill: '#3b82f6', glow: '#93c5fd' },
        yellow: { fill: '#eab308', glow: '#fde047' },
        white: { fill: '#e5e7eb', glow: '#f9fafb' },
        orange: { fill: '#f97316', glow: '#fdba74' },
      };
      const c = ledColors[ledColor] ?? ledColors.red;
      return (
        <g>
          <line x1={15} y1={0} x2={15} y2={8} stroke="#d1d5db" strokeWidth={2} />
          <polygon points={`5,8 25,8 15,28`} fill={c.fill} stroke={c.glow} strokeWidth={1} />
          <line x1={5} y1={28} x2={25} y2={28} stroke={c.glow} strokeWidth={2} />
          <line x1={15} y1={28} x2={15} y2={50} stroke="#d1d5db" strokeWidth={2} />
          <text x={15} y={44} textAnchor="middle" fill={c.glow} fontSize={8}>
            {ledColor}
          </text>
        </g>
      );
    }
    case 'resistor':
      return (
        <g>
          <line x1={0} y1={10} x2={12} y2={10} stroke="#d1d5db" strokeWidth={2} />
          <rect x={12} y={4} width={36} height={12} rx={3} fill="#d97706" stroke="#92400e" strokeWidth={1.5} />
          <line x1={48} y1={10} x2={60} y2={10} stroke="#d1d5db" strokeWidth={2} />
          <line x1={22} y1={4} x2={22} y2={16} stroke="#b45309" strokeWidth={3} />
          <line x1={30} y1={4} x2={30} y2={16} stroke="#92400e" strokeWidth={3} />
          <line x1={38} y1={4} x2={38} y2={16} stroke="#78350f" strokeWidth={3} />
        </g>
      );
    case 'button':
      return (
        <g>
          <rect width={40} height={40} rx={4} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
          <circle cx={20} cy={20} r={10} fill="#6b7280" stroke="#9ca3af" strokeWidth={1.5} />
          <circle cx={20} cy={20} r={6} fill="#e5e7eb" />
        </g>
      );
    case 'potentiometer':
      return (
        <g>
          <rect width={50} height={50} rx={4} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
          <circle cx={25} cy={22} r={14} fill="#4b5563" stroke="#9ca3af" strokeWidth={1.5} />
          <circle cx={25} cy={22} r={8} fill="#1f2937" />
          <line x1={25} y1={14} x2={25} y2={22} stroke="#e5e7eb" strokeWidth={2} />
          <text x={25} y={62} textAnchor="middle" fill="#9ca3af" fontSize={7}>
            POT
          </text>
        </g>
      );
    case 'servo':
      return (
        <g>
          <rect width={60} height={35} rx={4} fill="#1d4ed8" stroke="#1e40af" strokeWidth={1.5} />
          <rect x={10} y={5} width={40} height={20} rx={3} fill="#1e40af" />
          <circle cx={30} cy={15} r={6} fill="#93c5fd" />
          <rect x={25} y={30} width={10} height={10} rx={2} fill="#93c5fd" />
          <text x={30} y={52} textAnchor="middle" fill="#93c5fd" fontSize={7}>
            SERVO
          </text>
        </g>
      );
    case 'lcd':
      return (
        <g>
          <rect width={100} height={45} rx={4} fill="#065f46" stroke="#064e3b" strokeWidth={1.5} />
          <rect x={5} y={5} width={90} height={15} rx={2} fill="#064e3b" />
          <rect x={5} y={23} width={90} height={15} rx={2} fill="#064e3b" />
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <rect key={i} x={8 + i * 11} y={8} width={8} height={9} rx={1} fill="#34d399" opacity={0.3 + i * 0.09} />
          ))}
          <text x={50} y={56} textAnchor="middle" fill="#34d399" fontSize={7}>
            LCD 16×2
          </text>
        </g>
      );
    case 'breadboard':
      return (
        <g>
          <rect width={200} height={80} rx={4} fill="#f5f5f0" stroke="#d1d5db" strokeWidth={1.5} />
          <rect x={0} y={5} width={200} height={15} rx={2} fill="#fee2e2" opacity={0.6} />
          <rect x={0} y={60} width={200} height={15} rx={2} fill="#fee2e2" opacity={0.6} />
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={8 + i * 6.4} cy={12} r={2} fill="#94a3b8" />
          ))}
          {Array.from({ length: 30 }, (_, i) => (
            <circle key={i} cx={8 + i * 6.4} cy={68} r={2} fill="#94a3b8" />
          ))}
          {Array.from({ length: 5 }, (_, row) =>
            Array.from({ length: 30 }, (_, col) => (
              <circle key={`${row}-${col}`} cx={8 + col * 6.4} cy={28 + row * 6} r={1.5} fill="#94a3b8" opacity={0.7} />
            )),
          )}
          <text x={100} y={90} textAnchor="middle" fill="#6b7280" fontSize={7}>
            BREADBOARD
          </text>
        </g>
      );
    default:
      return <rect width={w} height={h} rx={4} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />;
  }
}

// ─── Pin dot ─────────────────────────────────────────────────────────────────

function PinDot({
  pin,
  isSelected,
  onClick,
}: {
  pin: PinDef;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <circle
      cx={pin.x}
      cy={pin.y}
      r={5}
      fill={isSelected ? '#f59e0b' : '#0ea5e9'}
      stroke={isSelected ? '#fbbf24' : '#0369a1'}
      strokeWidth={1.5}
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
    />
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  layout: CircuitLayout;
  onChange: (layout: CircuitLayout) => void;
}

export default function CircuitVisualizer({ layout, onChange }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [wireStart, setWireStart] = useState<{ componentId: string; pin: PinDef } | null>(null);
  const [selectedWireColor, setSelectedWireColor] = useState('red');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgRef = useRef<SVGSVGElement>(null);

  // ── helpers ──────────────────────────────────────────────────────────────

  const svgPoint = useCallback(
    (clientX: number, clientY: number) => {
      const svg = svgRef.current;
      if (!svg) return { x: 0, y: 0 };
      const rect = svg.getBoundingClientRect();
      return {
        x: (clientX - rect.left - pan.x) / zoom,
        y: (clientY - rect.top - pan.y) / zoom,
      };
    },
    [pan, zoom],
  );

  const getPinAbsPos = useCallback(
    (comp: CircuitComponent, pinName: string) => {
      const def = COMPONENT_DEFS[comp.type];
      const pin = def.pins.find((p) => p.name === pinName);
      if (!pin) return { x: comp.x, y: comp.y };
      return { x: comp.x + pin.x, y: comp.y + pin.y };
    },
    [],
  );

  // ── event handlers ────────────────────────────────────────────────────────

  const onMouseDownComponent = (e: React.MouseEvent, id: string) => {
    if (wireStart) return; // in wire-drawing mode – ignore
    e.stopPropagation();
    const comp = layout.components.find((c) => c.id === id);
    if (!comp) return;
    const pt = svgPoint(e.clientX, e.clientY);
    setDraggingId(id);
    setDragOffset({ x: pt.x - comp.x, y: pt.y - comp.y });
    setSelectedId(id);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingId) {
      const pt = svgPoint(e.clientX, e.clientY);
      onChange({
        ...layout,
        components: layout.components.map((c) =>
          c.id === draggingId
            ? { ...c, x: Math.max(0, pt.x - dragOffset.x), y: Math.max(0, pt.y - dragOffset.y) }
            : c,
        ),
      });
    } else if (isPanning) {
      setPan({
        x: pan.x + (e.clientX - panStart.x),
        y: pan.y + (e.clientY - panStart.y),
      });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const onMouseUp = () => {
    setDraggingId(null);
    setIsPanning(false);
  };

  const onMouseDownCanvas = (e: React.MouseEvent) => {
    if (wireStart) {
      setWireStart(null); // cancel wire drawing
      return;
    }
    setSelectedId(null);
    setIsPanning(true);
    setPanStart({ x: e.clientX, y: e.clientY });
  };

  const onPinClick = (comp: CircuitComponent, pin: PinDef) => {
    if (!wireStart) {
      setWireStart({ componentId: comp.id, pin });
    } else {
      // complete the wire
      if (wireStart.componentId === comp.id && wireStart.pin.name === pin.name) {
        setWireStart(null);
        return;
      }
      const newWire: CircuitWire = {
        id: `wire-${Date.now()}`,
        fromComponentId: wireStart.componentId,
        fromPin: wireStart.pin.name,
        toComponentId: comp.id,
        toPin: pin.name,
        color: selectedWireColor,
      };
      onChange({ ...layout, wires: [...layout.wires, newWire] });
      setWireStart(null);
    }
  };

  const addComponent = (type: ComponentType, color?: string) => {
    const def = COMPONENT_DEFS[type];
    const newComp: CircuitComponent = {
      id: `${type}-${Date.now()}`,
      type,
      label: def.label,
      x: 40 + Math.random() * 100,
      y: 40 + Math.random() * 100,
      color,
    };
    onChange({ ...layout, components: [...layout.components, newComp] });
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    onChange({
      components: layout.components.filter((c) => c.id !== selectedId),
      wires: layout.wires.filter(
        (w) => w.fromComponentId !== selectedId && w.toComponentId !== selectedId,
      ),
    });
    setSelectedId(null);
  };

  const reset = () => {
    onChange({ components: [], wires: [] });
    setSelectedId(null);
    setWireStart(null);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // keyboard shortcut: Delete
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ── render ────────────────────────────────────────────────────────────────

  const palette: { type: ComponentType; label: string; color?: string }[] = [
    { type: 'arduino', label: 'Arduino Uno' },
    { type: 'breadboard', label: 'Breadboard' },
    ...LED_COLORS.map((c) => ({ type: 'led' as ComponentType, label: `LED (${c})`, color: c })),
    { type: 'resistor', label: 'Resistor' },
    { type: 'button', label: 'Button' },
    { type: 'potentiometer', label: 'Potentiometer' },
    { type: 'servo', label: 'Servo Motor' },
    { type: 'lcd', label: 'LCD 16×2' },
  ];

  return (
    <div className="flex flex-col gap-3 h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-gray-400 font-medium">Wire colour:</span>
        {WIRE_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setSelectedWireColor(c)}
            title={c}
            className={`w-5 h-5 rounded-full border-2 transition-transform ${selectedWireColor === c ? 'border-white scale-125' : 'border-transparent'}`}
            style={{ backgroundColor: c === 'black' ? '#374151' : c === 'white' ? '#e5e7eb' : c }}
          />
        ))}
        <span className="ml-auto flex items-center gap-1">
          <button
            onClick={() => setZoom((z) => Math.min(z + 0.2, 3))}
            className="p-1 text-gray-400 hover:text-white"
            title="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(z - 0.2, 0.3))}
            className="p-1 text-gray-400 hover:text-white"
            title="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={deleteSelected}
            disabled={!selectedId}
            className="p-1 text-gray-400 hover:text-red-400 disabled:opacity-30"
            title="Delete selected (Del)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button onClick={reset} className="p-1 text-gray-400 hover:text-yellow-400" title="Clear canvas">
            <RotateCcw className="w-4 h-4" />
          </button>
        </span>
      </div>

      {wireStart && (
        <p className="text-xs text-yellow-400 animate-pulse">
          Click a pin to complete the wire, or click the canvas to cancel.
        </p>
      )}

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Component palette */}
        <div className="w-36 flex-shrink-0 overflow-y-auto space-y-1">
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide mb-2">Components</p>
          {palette.map((item, i) => (
            <button
              key={i}
              onClick={() => addComponent(item.type, item.color)}
              className="w-full text-left text-xs px-2 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded transition-colors truncate"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* SVG canvas */}
        <div className="flex-1 bg-gray-950 rounded-lg border border-gray-700 overflow-hidden relative">
          <svg
            ref={svgRef}
            className="w-full h-full select-none"
            style={{ cursor: isPanning ? 'grabbing' : wireStart ? 'crosshair' : 'grab' }}
            onMouseDown={onMouseDownCanvas}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
          >
            {/* Grid dots */}
            <defs>
              <pattern id="grid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse"
                patternTransform={`translate(${pan.x},${pan.y})`}>
                <circle cx={0} cy={0} r={0.8} fill="#374151" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />

            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {/* Wires */}
              {layout.wires.map((wire) => {
                const fromComp = layout.components.find((c) => c.id === wire.fromComponentId);
                const toComp = layout.components.find((c) => c.id === wire.toComponentId);
                if (!fromComp || !toComp) return null;
                const from = getPinAbsPos(fromComp, wire.fromPin);
                const to = getPinAbsPos(toComp, wire.toPin);
                const mx = (from.x + to.x) / 2;
                return (
                  <path
                    key={wire.id}
                    d={`M ${from.x} ${from.y} C ${mx} ${from.y}, ${mx} ${to.y}, ${to.x} ${to.y}`}
                    stroke={wire.color === 'black' ? '#6b7280' : wire.color === 'white' ? '#e5e7eb' : wire.color}
                    strokeWidth={2}
                    fill="none"
                    strokeLinecap="round"
                    opacity={0.85}
                  />
                );
              })}

              {/* Components */}
              {layout.components.map((comp) => {
                const def = COMPONENT_DEFS[comp.type];
                const isSelected = comp.id === selectedId;
                return (
                  <g
                    key={comp.id}
                    transform={`translate(${comp.x},${comp.y})`}
                    style={{ cursor: draggingId === comp.id ? 'grabbing' : 'grab' }}
                    onMouseDown={(e) => onMouseDownComponent(e, comp.id)}
                  >
                    {isSelected && (
                      <rect
                        x={-4}
                        y={-4}
                        width={def.width + 8}
                        height={def.height + 8}
                        rx={6}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth={1.5}
                        strokeDasharray="4 2"
                      />
                    )}
                    <ComponentShape type={comp.type} color={comp.color} />
                    {/* Pin dots */}
                    {def.pins.map((pin) => {
                      const isWireStart =
                        wireStart?.componentId === comp.id && wireStart.pin.name === pin.name;
                      return (
                        <PinDot
                          key={pin.name}
                          pin={pin}
                          isSelected={isWireStart}
                          onClick={() => onPinClick(comp, pin)}
                        />
                      );
                    })}
                    {/* Label */}
                    <text
                      x={def.width / 2}
                      y={def.height + 12}
                      textAnchor="middle"
                      fill="#9ca3af"
                      fontSize={9}
                    >
                      {comp.label}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>

          {layout.components.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <p className="text-gray-600 text-sm">Add components from the palette →</p>
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-600">
        Click a blue pin to start a wire, then click another pin to connect. Drag components to
        reposition. Click to select, then Delete to remove.
      </p>
    </div>
  );
}
