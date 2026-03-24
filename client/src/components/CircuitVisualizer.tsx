import { useState, useRef, useCallback, useEffect } from "react";
import { Trash2, ZoomIn, ZoomOut, RotateCcw, ChevronDown, ChevronRight, Search, X, RotateCw, Copy } from "lucide-react";
import {
  COMPONENT_LIBRARY,
  CATEGORY_ORDER,
  getComponentsByCategory,
} from "../lib/componentLibrary";
import {
  PI_COMPONENT_LIBRARY,
  PI_CATEGORY_ORDER,
  getPiComponentsByCategory,
} from "../lib/raspberryPiComponents";
import type { ComponentType, ComponentDef, PinDef } from "../lib/componentLibrary";
import type { PiComponentType } from "../lib/raspberryPiComponents";

export type AnyComponentType = ComponentType | PiComponentType;

export interface CircuitComponent {
  id: string;
  type: AnyComponentType;
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

const WIRE_COLORS = ["red", "black", "yellow", "green", "blue", "white", "orange"];
const GRID_SIZE = 10;

function getAnyComponentDef(type: AnyComponentType): ComponentDef | null {
  const a = COMPONENT_LIBRARY.find((c) => c.type === type);
  if (a) return a;
  const p = PI_COMPONENT_LIBRARY.find((c) => c.type === type);
  if (p) return p as unknown as ComponentDef;
  return null;
}

function ComponentShape({ type, def }: { type: AnyComponentType; def: ComponentDef }) {
  const w = def.width;
  const h = def.height;
  const color = def.color;

  if (type.startsWith("arduino-")) {
    const bc: Record<string, string> = {
      "arduino-uno": "#1a6b3c", "arduino-nano": "#1a5c8a", "arduino-mega": "#1a6b3c",
      "arduino-leonardo": "#0d4a8c", "arduino-pro-mini": "#4a1a6b", "arduino-due": "#5c3a1a",
    };
    const nm: Record<string, string> = {
      "arduino-uno": "Uno", "arduino-nano": "Nano", "arduino-mega": "Mega 2560",
      "arduino-leonardo": "Leonardo", "arduino-pro-mini": "Pro Mini", "arduino-due": "Due",
    };
    return (
      <g>
        <rect width={w} height={h} rx={4} fill={bc[type] ?? "#1a6b3c"} stroke="#0d4a28" strokeWidth={1.5} />
        <text x={w/2} y={h/2-8} textAnchor="middle" fill="white" fontSize={9} fontWeight="bold">Arduino</text>
        <text x={w/2} y={h/2+6} textAnchor="middle" fill="#86efac" fontSize={8}>{nm[type] ?? def.label}</text>
        <rect x={w/2-20} y={h-22} width={18} height={12} rx={2} fill="#0d4a28" />
        <rect x={w/2+4} y={h-22} width={18} height={12} rx={2} fill="#0d4a28" />
      </g>
    );
  }

  if (type.startsWith("rpi") || ["gpio-breakout","gpio-hat","sense-hat","rtc-ds3231","mcp3008","pi-camera-v1","pi-camera-v2","pi-camera-hq","pi-touchscreen"].includes(type)) {
    const isPico = type === "rpi-pico" || type === "rpi-pico-w";
    const isAcc = !type.startsWith("rpi");
    return (
      <g>
        <rect width={w} height={h} rx={4} fill={isAcc ? "#374151" : color} stroke={isAcc ? "#4b5563" : "#922b21"} strokeWidth={1.5} />
        <text x={w/2} y={14} textAnchor="middle" fill="white" fontSize={isPico ? 7 : 8} fontWeight="bold">
          {isAcc ? def.label.slice(0,18) : isPico ? "Pico" : "Raspberry Pi"}
        </text>
        {!isAcc && <text x={w/2} y={26} textAnchor="middle" fill={isPico ? "#6ee7b7" : "#fadbd8"} fontSize={6}>{def.label.replace("Raspberry Pi ","").replace("Pico ","").trim()}</text>}
      </g>
    );
  }

  if (type.startsWith("led-")) {
    const cm: Record<string, {fill:string;glow:string}> = {
      "led-red": {fill:"#ef4444",glow:"#fca5a5"}, "led-green": {fill:"#22c55e",glow:"#86efac"},
      "led-blue": {fill:"#3b82f6",glow:"#93c5fd"}, "led-yellow": {fill:"#eab308",glow:"#fde047"},
      "led-white": {fill:"#e5e7eb",glow:"#f9fafb"}, "led-rgb": {fill:"#a855f7",glow:"#d8b4fe"},
    };
    const c = cm[type] ?? cm["led-red"];
    if (type === "led-rgb") return (
      <g>
        <line x1={5} y1={0} x2={5} y2={8} stroke="#d1d5db" strokeWidth={2} />
        <line x1={20} y1={0} x2={20} y2={8} stroke="#d1d5db" strokeWidth={2} />
        <line x1={30} y1={0} x2={30} y2={8} stroke="#d1d5db" strokeWidth={2} />
        <line x1={38} y1={0} x2={38} y2={8} stroke="#d1d5db" strokeWidth={2} />
        <circle cx={20} cy={28} r={16} fill={c.fill} stroke={c.glow} strokeWidth={1.5} />
        <text x={20} y={52} textAnchor="middle" fill={c.glow} fontSize={7}>RGB</text>
      </g>
    );
    return (
      <g>
        <line x1={15} y1={0} x2={15} y2={8} stroke="#d1d5db" strokeWidth={2} />
        <polygon points="5,8 25,8 15,28" fill={c.fill} stroke={c.glow} strokeWidth={1} />
        <line x1={5} y1={28} x2={25} y2={28} stroke={c.glow} strokeWidth={2} />
        <line x1={15} y1={28} x2={15} y2={50} stroke="#d1d5db" strokeWidth={2} />
      </g>
    );
  }

  if (type.startsWith("resistor-")) {
    const bm: Record<string,string[]> = {
      "resistor-220":["#ef4444","#ef4444","#92400e"], "resistor-470":["#eab308","#7c3aed","#92400e"],
      "resistor-1k":["#92400e","#1f2937","#ef4444"], "resistor-10k":["#92400e","#1f2937","#f97316"],
      "resistor-100k":["#92400e","#1f2937","#eab308"],
    };
    const b = bm[type] ?? ["#92400e","#1f2937","#ef4444"];
    return (
      <g>
        <line x1={0} y1={10} x2={12} y2={10} stroke="#d1d5db" strokeWidth={2} />
        <rect x={12} y={4} width={36} height={12} rx={3} fill="#d97706" stroke="#92400e" strokeWidth={1.5} />
        <line x1={48} y1={10} x2={60} y2={10} stroke="#d1d5db" strokeWidth={2} />
        <line x1={22} y1={4} x2={22} y2={16} stroke={b[0]} strokeWidth={3} />
        <line x1={30} y1={4} x2={30} y2={16} stroke={b[1]} strokeWidth={3} />
        <line x1={38} y1={4} x2={38} y2={16} stroke={b[2]} strokeWidth={3} />
      </g>
    );
  }

  if (type === "button") return (
    <g>
      <rect width={40} height={40} rx={4} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
      <circle cx={20} cy={20} r={10} fill="#6b7280" stroke="#9ca3af" strokeWidth={1.5} />
      <circle cx={20} cy={20} r={6} fill="#e5e7eb" />
    </g>
  );

  if (type === "potentiometer") return (
    <g>
      <rect width={50} height={50} rx={4} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
      <circle cx={25} cy={22} r={14} fill="#4b5563" stroke="#9ca3af" strokeWidth={1.5} />
      <circle cx={25} cy={22} r={8} fill="#1f2937" />
      <line x1={25} y1={14} x2={25} y2={22} stroke="#e5e7eb" strokeWidth={2} />
    </g>
  );

  if (type === "servo-sg90" || type === "servo-mg996r") return (
    <g>
      <rect width={w} height={h-10} rx={4} fill="#1d4ed8" stroke="#1e40af" strokeWidth={1.5} />
      <rect x={10} y={5} width={w-20} height={h-25} rx={3} fill="#1e40af" />
      <circle cx={w/2} cy={(h-10)/2} r={7} fill="#93c5fd" />
    </g>
  );

  if (type === "dc-motor") return (
    <g>
      <circle cx={25} cy={25} r={22} fill="#6b7280" stroke="#4b5563" strokeWidth={1.5} />
      <circle cx={25} cy={25} r={12} fill="#374151" />
      <text x={25} y={29} textAnchor="middle" fill="#d1d5db" fontSize={7} fontWeight="bold">M</text>
    </g>
  );

  if (type === "buzzer-active" || type === "buzzer-passive") return (
    <g>
      <circle cx={17} cy={17} r={15} fill="#1f2937" stroke="#374151" strokeWidth={1.5} />
      <circle cx={17} cy={17} r={8} fill="#374151" />
      <text x={17} y={21} textAnchor="middle" fill="#9ca3af" fontSize={6}>BZR</text>
    </g>
  );

  if (type === "relay-module") return (
    <g>
      <rect width={w} height={h} rx={4} fill="#0d4a28" stroke="#064e3b" strokeWidth={1.5} />
      <rect x={10} y={10} width={30} height={20} rx={2} fill="#064e3b" />
      <circle cx={w-15} cy={15} r={8} fill="#059669" />
      <text x={w/2} y={h-5} textAnchor="middle" fill="#6ee7b7" fontSize={6}>RELAY</text>
    </g>
  );

  if (type === "transistor-npn" || type === "transistor-pnp") return (
    <g>
      <rect width={w} height={h} rx={3} fill="#374151" stroke="#6b7280" strokeWidth={1.5} />
      <text x={w/2} y={h/2+3} textAnchor="middle" fill="#9ca3af" fontSize={7}>{type==="transistor-npn"?"NPN":"PNP"}</text>
    </g>
  );

  if (type === "diode-1n4007" || type === "diode-zener") return (
    <g>
      <line x1={0} y1={10} x2={15} y2={10} stroke="#d1d5db" strokeWidth={2} />
      <polygon points="15,4 15,16 30,10" fill="#374151" stroke="#6b7280" strokeWidth={1} />
      <line x1={30} y1={4} x2={30} y2={16} stroke="#6b7280" strokeWidth={2} />
      <line x1={30} y1={10} x2={50} y2={10} stroke="#d1d5db" strokeWidth={2} />
    </g>
  );

  if (type === "dht11" || type === "dht22") return (
    <g>
      <rect width={w} height={h-10} rx={4} fill="#1d4ed8" stroke="#1e40af" strokeWidth={1.5} />
      <text x={w/2} y={h-18} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">{type==="dht11"?"DHT11":"DHT22"}</text>
      <text x={w/2} y={h-7} textAnchor="middle" fill="#93c5fd" fontSize={6}>TEMP/HUM</text>
    </g>
  );

  if (type === "ultrasonic-hcsr04") return (
    <g>
      <rect width={w} height={h} rx={4} fill="#6b7280" stroke="#4b5563" strokeWidth={1.5} />
      <circle cx={15} cy={h/2} r={10} fill="#374151" stroke="#9ca3af" strokeWidth={1} />
      <circle cx={15} cy={h/2} r={5} fill="#9ca3af" />
      <circle cx={w-15} cy={h/2} r={10} fill="#374151" stroke="#9ca3af" strokeWidth={1} />
      <circle cx={w-15} cy={h/2} r={5} fill="#9ca3af" />
      <text x={w/2} y={h-4} textAnchor="middle" fill="#d1d5db" fontSize={5}>HC-SR04</text>
    </g>
  );

  if (type.startsWith("lcd-")) {
    const rows = type === "lcd-20x4" ? 4 : 2;
    return (
      <g>
        <rect width={w} height={h-10} rx={4} fill="#065f46" stroke="#064e3b" strokeWidth={1.5} />
        {Array.from({length:rows},(_,i) => <rect key={i} x={5} y={5+i*((h-20)/rows)} width={w-10} height={(h-20)/rows-2} rx={2} fill="#064e3b" />)}
        <text x={w/2} y={h-2} textAnchor="middle" fill="#34d399" fontSize={6}>{type==="lcd-16x2-i2c"?"LCD 16x2 I2C":type==="lcd-16x2-parallel"?"LCD 16x2":"LCD 20x4"}</text>
      </g>
    );
  }

  if (type === "oled-ssd1306") return (
    <g>
      <rect width={w} height={h-10} rx={4} fill="#0a0a1a" stroke="#1e293b" strokeWidth={1.5} />
      <rect x={5} y={5} width={w-10} height={h-25} rx={2} fill="#020617" />
      <text x={w/2} y={h-2} textAnchor="middle" fill="#38bdf8" fontSize={6}>SSD1306 OLED</text>
    </g>
  );

  if (type === "hc05-bluetooth" || type === "hc06-bluetooth") return (
    <g>
      <rect width={w} height={h} rx={4} fill="#1d4ed8" stroke="#1e40af" strokeWidth={1.5} />
      <text x={w/2} y={h/2} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">{type==="hc05-bluetooth"?"HC-05":"HC-06"}</text>
      <text x={w/2} y={h/2+12} textAnchor="middle" fill="#93c5fd" fontSize={6}>Bluetooth</text>
    </g>
  );

  if (type === "esp8266-wifi") return (
    <g>
      <rect width={w} height={h} rx={4} fill="#0d4a8c" stroke="#0c4a6e" strokeWidth={1.5} />
      <text x={w/2} y={h/2} textAnchor="middle" fill="white" fontSize={8} fontWeight="bold">ESP8266</text>
      <text x={w/2} y={h/2+12} textAnchor="middle" fill="#7dd3fc" fontSize={6}>WiFi</text>
    </g>
  );

  if (type === "nrf24l01") return (
    <g>
      <rect width={w} height={h} rx={4} fill="#065f46" stroke="#064e3b" strokeWidth={1.5} />
      <text x={w/2} y={h/2} textAnchor="middle" fill="white" fontSize={7} fontWeight="bold">NRF24L01</text>
      <text x={w/2} y={h/2+12} textAnchor="middle" fill="#6ee7b7" fontSize={6}>2.4GHz</text>
    </g>
  );

  if (type === "l298n" || type === "l293d") return (
    <g>
      <rect width={w} height={h} rx={4} fill="#374151" stroke="#4b5563" strokeWidth={1.5} />
      <rect x={10} y={10} width={w-20} height={30} rx={2} fill="#1f2937" />
      <text x={w/2} y={30} textAnchor="middle" fill="#9ca3af" fontSize={8} fontWeight="bold">{type==="l298n"?"L298N":"L293D"}</text>
      <text x={w/2} y={h-5} textAnchor="middle" fill="#6b7280" fontSize={6}>Motor Driver</text>
    </g>
  );

  if (type.startsWith("breadboard-")) return (
    <g>
      <rect width={w} height={h} rx={4} fill="#f5f5f0" stroke="#d1d5db" strokeWidth={1.5} />
      <rect x={0} y={5} width={w} height={12} fill="#fee2e2" opacity={0.6} />
      <rect x={0} y={h-17} width={w} height={12} fill="#fee2e2" opacity={0.6} />
      {Array.from({length:Math.floor(w/8)},(_,i) => <circle key={"t"+i} cx={6+i*8} cy={11} r={2} fill="#94a3b8" />)}
      {Array.from({length:Math.floor(w/8)},(_,i) => <circle key={"b"+i} cx={6+i*8} cy={h-11} r={2} fill="#94a3b8" />)}
    </g>
  );

  if (type === "battery-9v") return (
    <g>
      <rect width={w} height={h} rx={4} fill="#1f2937" stroke="#374151" strokeWidth={1.5} />
      <rect x={5} y={5} width={10} height={8} rx={2} fill="#374151" />
      <rect x={20} y={5} width={10} height={8} rx={2} fill="#374151" />
      <text x={w/2} y={h-4} textAnchor="middle" fill="#9ca3af" fontSize={7}>9V</text>
    </g>
  );

  return (
    <g>
      <rect width={w} height={h} rx={4} fill={color} stroke="#4b5563" strokeWidth={1.5} />
      <text x={w/2} y={h/2+4} textAnchor="middle" fill="white" fontSize={7}>{def.label.slice(0,14)}</text>
    </g>
  );
}

interface AbsPin extends PinDef { absX: number; absY: number; }

function PinDot({ pin, isSelected, onClick, showLabel }: { pin: AbsPin; isSelected: boolean; onClick: () => void; showLabel: boolean; }) {
  return (
    <g>
      <circle
        cx={pin.absX} cy={pin.absY} r={5}
        fill={isSelected ? "#f59e0b" : "#0ea5e9"}
        stroke={isSelected ? "#fbbf24" : "#0369a1"}
        strokeWidth={1.5}
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onClick(); }}
      />
      {showLabel && (
        <text x={pin.absX + (pin.x < 10 ? -8 : 8)} y={pin.absY + 4} fontSize={7} fill="#cbd5e1"
          textAnchor={pin.x < 10 ? "end" : "start"} style={{ pointerEvents:"none", userSelect:"none" }}>
          {pin.name}
        </text>
      )}
    </g>
  );
}

function DraggableItem({ comp, onDragStart }: { comp: { type: AnyComponentType; label: string; color: string; description: string }; onDragStart: (t: AnyComponentType, e: React.DragEvent) => void; }) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(comp.type, e)}
      className="flex items-center gap-2 px-3 py-1.5 mx-1 rounded-md cursor-grab hover:bg-gray-800 transition-colors group"
      title={comp.description}
    >
      <div className="w-3 h-3 rounded-sm flex-shrink-0" style={{ backgroundColor: comp.color, border: "1px solid rgba(255,255,255,0.2)" }} />
      <span className="text-xs text-gray-300 group-hover:text-white truncate">{comp.label}</span>
    </div>
  );
}

function ComponentPalette({ onDragStart }: { onDragStart: (t: AnyComponentType, e: React.DragEvent) => void; }) {
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState<Record<string,boolean>>({});
  const [showPi, setShowPi] = useState(false);
  const byArd = getComponentsByCategory();
  const byPi = getPiComponentsByCategory();
  const cats = showPi ? PI_CATEGORY_ORDER : CATEGORY_ORDER;
  const all = showPi ? PI_COMPONENT_LIBRARY : COMPONENT_LIBRARY;
  const filtered = search.trim() ? all.filter(c => c.label.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())) : null;
  return (
    <div className="flex flex-col bg-gray-900 border-r border-gray-800 overflow-hidden" style={{ width: 220, minWidth: 220, flexShrink: 0 }}>
      <div className="p-2 border-b border-gray-800 flex-shrink-0">
        <div className="flex gap-1 mb-2">
          <button onClick={() => setShowPi(false)} className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${!showPi?"bg-sky-600 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>Arduino</button>
          <button onClick={() => setShowPi(true)} className={`flex-1 text-xs py-1 rounded-md font-medium transition-colors ${showPi?"bg-red-700 text-white":"bg-gray-800 text-gray-400 hover:bg-gray-700"}`}>Pi</button>
        </div>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
          <input type="text" placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-md pl-7 pr-6 py-1 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-sky-500" />
          {search && <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2"><X className="w-3 h-3 text-gray-500" /></button>}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {filtered ? (
          <div className="p-1">
            {filtered.length === 0 ? <p className="text-xs text-gray-500 text-center py-4">No components found</p>
              : filtered.map(c => <DraggableItem key={c.type} comp={c} onDragStart={onDragStart} />)}
          </div>
        ) : cats.map(cat => {
          const comps = (showPi ? byPi[cat] : byArd[cat]) ?? [];
          if (!comps.length) return null;
          const isCol = collapsed[cat];
          return (
            <div key={cat}>
              <button onClick={() => setCollapsed(p => ({ ...p, [cat]: !p[cat] }))}
                className="w-full flex items-center justify-between px-3 py-1.5 text-xs font-semibold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors">
                <span>{cat}</span>
                {isCol ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {!isCol && comps.map(c => <DraggableItem key={c.type} comp={c} onDragStart={onDragStart} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface Props { layout: CircuitLayout; onChange: (l: CircuitLayout) => void; }

export default function CircuitVisualizer({ layout, onChange }: Props) {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 40, y: 40 });
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [wireStart, setWireStart] = useState<{ componentId: string; pin: PinDef } | null>(null);
  const [selectedWireColor, setSelectedWireColor] = useState("red");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [, setHistory] = useState<CircuitLayout[]>([]);
  const [, setRedoStack] = useState<CircuitLayout[]>([]);
  const [dragType, setDragType] = useState<AnyComponentType | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; componentId: string } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const pushHistory = useCallback((prev: CircuitLayout) => { setHistory(h => [...h.slice(-30), prev]); setRedoStack([]); }, []);
  const changeLayout = useCallback((next: CircuitLayout) => { pushHistory(layout); onChange(next); }, [layout, onChange, pushHistory]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        setHistory(h => { if (!h.length) return h; const prev = h[h.length-1]; setRedoStack(r => [...r, layout]); onChange(prev); return h.slice(0,-1); });
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        setRedoStack(r => { if (!r.length) return r; const next = r[r.length-1]; setHistory(h => [...h, layout]); onChange(next); return r.slice(0,-1); });
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedId) {
        pushHistory(layout);
        onChange({ components: layout.components.filter(c => c.id !== selectedId), wires: layout.wires.filter(w => w.fromComponentId !== selectedId && w.toComponentId !== selectedId) });
        setSelectedId(null);
      }
      if (e.key === "Escape") { setWireStart(null); setContextMenu(null); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedId, layout, onChange, pushHistory]);

  const svgPoint = useCallback((cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const r = svg.getBoundingClientRect();
    return { x: (cx - r.left - pan.x) / zoom, y: (cy - r.top - pan.y) / zoom };
  }, [pan, zoom]);

  const snap = (v: number) => Math.round(v / GRID_SIZE) * GRID_SIZE;

  const getPinAbs = useCallback((comp: CircuitComponent, pinName: string) => {
    const def = getAnyComponentDef(comp.type);
    if (!def) return { x: comp.x, y: comp.y };
    const pin = def.pins.find(p => p.name === pinName);
    if (!pin) return { x: comp.x, y: comp.y };
    return { x: comp.x + pin.x, y: comp.y + pin.y };
  }, []);

  const onPaletteDragStart = (type: AnyComponentType, e: React.DragEvent) => { setDragType(type); e.dataTransfer.effectAllowed = "copy"; };
  const onCanvasDragOver = (e: React.DragEvent) => e.preventDefault();
  const onCanvasDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!dragType) return;
    const svg = svgRef.current; if (!svg) return;
    const r = svg.getBoundingClientRect();
    const x = snap((e.clientX - r.left - pan.x) / zoom);
    const y = snap((e.clientY - r.top - pan.y) / zoom);
    const def = getAnyComponentDef(dragType);
    changeLayout({ ...layout, components: [...layout.components, { id: `comp-${Date.now()}`, type: dragType, label: def?.label ?? dragType, x: Math.max(0,x), y: Math.max(0,y), rotation: 0 }] });
    setDragType(null);
  };

  const onMouseDownComponent = (e: React.MouseEvent, id: string) => {
    if (wireStart) return;
    e.stopPropagation();
    const comp = layout.components.find(c => c.id === id); if (!comp) return;
    const pt = svgPoint(e.clientX, e.clientY);
    setDraggingId(id); setDragOffset({ x: pt.x - comp.x, y: pt.y - comp.y }); setSelectedId(id); setContextMenu(null);
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (draggingId) {
      const pt = svgPoint(e.clientX, e.clientY);
      onChange({ ...layout, components: layout.components.map(c => c.id === draggingId ? { ...c, x: snap(Math.max(0, pt.x - dragOffset.x)), y: snap(Math.max(0, pt.y - dragOffset.y)) } : c) });
    } else if (isPanning) {
      setPan({ x: pan.x + (e.clientX - panStart.x), y: pan.y + (e.clientY - panStart.y) });
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const onMouseUp = () => { if (draggingId) pushHistory(layout); setDraggingId(null); setIsPanning(false); };

  const onMouseDownCanvas = (e: React.MouseEvent) => {
    if (wireStart) { setWireStart(null); return; }
    if (e.button === 1 || (e.button === 0 && e.altKey)) { setIsPanning(true); setPanStart({ x: e.clientX, y: e.clientY }); e.preventDefault(); }
    else if (e.button === 0) { setSelectedId(null); setContextMenu(null); }
  };

  const onWheel = useCallback((e: React.WheelEvent) => { e.preventDefault(); setZoom(z => Math.min(4, Math.max(0.2, z * (e.deltaY > 0 ? 0.9 : 1.1)))); }, []);

  const onPinClick = (comp: CircuitComponent, pin: PinDef) => {
    if (!wireStart) { setWireStart({ componentId: comp.id, pin }); }
    else {
      if (wireStart.componentId !== comp.id) {
        changeLayout({ ...layout, wires: [...layout.wires, { id: `wire-${Date.now()}`, fromComponentId: wireStart.componentId, fromPin: wireStart.pin.name, toComponentId: comp.id, toPin: pin.name, color: selectedWireColor }] });
      }
      setWireStart(null);
    }
  };

  const onRightClick = (e: React.MouseEvent, id: string) => { e.preventDefault(); setSelectedId(id); setContextMenu({ x: e.clientX, y: e.clientY, componentId: id }); };

  const deleteComponent = (id: string) => {
    changeLayout({ components: layout.components.filter(c => c.id !== id), wires: layout.wires.filter(w => w.fromComponentId !== id && w.toComponentId !== id) });
    setSelectedId(null); setContextMenu(null);
  };

  const duplicateComponent = (id: string) => {
    const comp = layout.components.find(c => c.id === id); if (!comp) return;
    changeLayout({ ...layout, components: [...layout.components, { ...comp, id: `comp-${Date.now()}`, x: comp.x + 20, y: comp.y + 20 }] });
    setContextMenu(null);
  };

  const rotateComponent = (id: string) => {
    changeLayout({ ...layout, components: layout.components.map(c => c.id === id ? { ...c, rotation: ((c.rotation ?? 0) + 90) % 360 } : c) });
    setContextMenu(null);
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-gray-950">
      <ComponentPalette onDragStart={onPaletteDragStart} />

      <div className="flex flex-col flex-1 min-w-0">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0 flex-wrap">
          <div className="flex items-center gap-1">
            <button onClick={() => setZoom(z => Math.max(0.2, z*0.8))} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white" title="Zoom out"><ZoomOut className="w-3.5 h-3.5" /></button>
            <span className="text-xs text-gray-400 w-10 text-center">{Math.round(zoom*100)}%</span>
            <button onClick={() => setZoom(z => Math.min(4, z*1.2))} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white" title="Zoom in"><ZoomIn className="w-3.5 h-3.5" /></button>
            <button onClick={() => { setZoom(1); setPan({x:40,y:40}); }} className="p-1 rounded bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white" title="Reset view"><RotateCcw className="w-3.5 h-3.5" /></button>
          </div>
          <div className="w-px h-4 bg-gray-700" />
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500">Wire:</span>
            {WIRE_COLORS.map(c => (
              <button key={c} onClick={() => setSelectedWireColor(c)} title={c} style={{ width:14, height:14, borderRadius:"50%", backgroundColor: c==="white"?"#e5e7eb":c, border: selectedWireColor===c?"2px solid white":"2px solid transparent", transform: selectedWireColor===c?"scale(1.3)":"scale(1)", transition:"transform 0.1s" }} />
            ))}
          </div>
          {selectedId && (
            <>
              <div className="w-px h-4 bg-gray-700" />
              <button onClick={() => deleteComponent(selectedId)} className="flex items-center gap-1 text-xs px-2 py-0.5 bg-red-900/40 hover:bg-red-900/60 text-red-400 rounded">
                <Trash2 className="w-3 h-3" /> Del
              </button>
            </>
          )}
          {wireStart && <span className="text-xs text-amber-400 bg-amber-900/30 px-2 py-0.5 rounded">Click pin to complete wire (Esc to cancel)</span>}
          <div className="ml-auto text-xs text-gray-600">{layout.components.length} comp · {layout.wires.length} wire</div>
        </div>

        <div className="flex-1 overflow-hidden relative" onDragOver={onCanvasDragOver} onDrop={onCanvasDrop}
          style={{ cursor: isPanning ? "grabbing" : wireStart ? "crosshair" : "default" }}>
          <svg ref={svgRef} className="w-full h-full" onMouseMove={onMouseMove} onMouseUp={onMouseUp} onMouseDown={onMouseDownCanvas} onWheel={onWheel}>
            <defs>
              <pattern id="cv-gs" width={GRID_SIZE*zoom} height={GRID_SIZE*zoom} patternUnits="userSpaceOnUse" x={pan.x%(GRID_SIZE*zoom)} y={pan.y%(GRID_SIZE*zoom)}>
                <circle cx={0} cy={0} r={0.5} fill="#374151" />
              </pattern>
              <pattern id="cv-gl" width={GRID_SIZE*5*zoom} height={GRID_SIZE*5*zoom} patternUnits="userSpaceOnUse" x={pan.x%(GRID_SIZE*5*zoom)} y={pan.y%(GRID_SIZE*5*zoom)}>
                <circle cx={0} cy={0} r={1} fill="#4b5563" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="#111827" />
            <rect width="100%" height="100%" fill="url(#cv-gs)" />
            <rect width="100%" height="100%" fill="url(#cv-gl)" />

            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              {layout.wires.map(wire => {
                const fc = layout.components.find(c => c.id === wire.fromComponentId);
                const tc = layout.components.find(c => c.id === wire.toComponentId);
                if (!fc || !tc) return null;
                const f = getPinAbs(fc, wire.fromPin); const t = getPinAbs(tc, wire.toPin);
                const mx = (f.x+t.x)/2;
                return <path key={wire.id} d={`M ${f.x} ${f.y} C ${mx} ${f.y}, ${mx} ${t.y}, ${t.x} ${t.y}`} fill="none" stroke={wire.color==="white"?"#e5e7eb":wire.color} strokeWidth={2} strokeLinecap="round" />;
              })}

              {layout.components.map(comp => {
                const def = getAnyComponentDef(comp.type); if (!def) return null;
                const isSel = comp.id === selectedId; const isHov = comp.id === hoveredId;
                const rot = comp.rotation ?? 0;
                return (
                  <g key={comp.id}
                    transform={rot ? `rotate(${rot},${comp.x+def.width/2},${comp.y+def.height/2})` : undefined}
                    onMouseDown={e => onMouseDownComponent(e, comp.id)}
                    onMouseEnter={() => setHoveredId(comp.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onContextMenu={e => onRightClick(e as unknown as React.MouseEvent, comp.id)}
                    style={{ cursor: draggingId===comp.id?"grabbing":"grab" }}
                  >
                    {(isSel||isHov) && <rect x={comp.x-4} y={comp.y-4} width={def.width+8} height={def.height+8} rx={6} fill="none" stroke={isSel?"#f59e0b":"#0ea5e9"} strokeWidth={1.5} strokeDasharray={isSel?"none":"4 2"} />}
                    <g transform={`translate(${comp.x},${comp.y})`}><ComponentShape type={comp.type} def={def} /></g>
                    <text x={comp.x+def.width/2} y={comp.y+def.height+13} textAnchor="middle" fill="#9ca3af" fontSize={8} style={{ pointerEvents:"none", userSelect:"none" }}>{comp.label}</text>
                    {def.pins.map(pin => (
                      <PinDot key={pin.name}
                        pin={{ ...pin, absX: comp.x+pin.x, absY: comp.y+pin.y }}
                        isSelected={wireStart?.componentId===comp.id && wireStart.pin.name===pin.name}
                        onClick={() => onPinClick(comp, pin)}
                        showLabel={isHov||isSel}
                      />
                    ))}
                  </g>
                );
              })}
            </g>
          </svg>

          {layout.components.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center opacity-40">
                <p className="text-gray-400 text-sm font-medium">Drag components from the sidebar to get started</p>
                <p className="text-gray-600 text-xs mt-1">Scroll to zoom · Alt+drag to pan · Right-click for options</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {contextMenu && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setContextMenu(null)} />
          <div className="fixed z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[140px]" style={{ left: contextMenu.x, top: contextMenu.y }}>
            <button onClick={() => rotateComponent(contextMenu.componentId)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
              <RotateCw className="w-4 h-4" /> Rotate 90deg
            </button>
            <button onClick={() => duplicateComponent(contextMenu.componentId)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
              <Copy className="w-4 h-4" /> Duplicate
            </button>
            <div className="border-t border-gray-700 my-0.5" />
            <button onClick={() => deleteComponent(contextMenu.componentId)} className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-gray-700 hover:text-red-300">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}
