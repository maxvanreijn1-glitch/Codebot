/**
 * CircuitBuilder – Interactive Tinkercad-style circuit builder
 *
 * Features:
 *  • Code → Circuit: paste / type Arduino code, auto-generate circuit diagram
 *  • Circuit → Code: build visually, generate Arduino sketch
 *  • Validation: real-time warnings / errors
 *  • Save / load named circuits
 *  • Live sync between editor and canvas
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Zap,
  Code2,
  AlertTriangle,
  CheckCircle,
  Save,
  FolderOpen,
  RefreshCw,
  Play,
  Trash2,
  Info,
  XCircle,
} from 'lucide-react';
import apiClient from '../../api/client';

// ── types (mirroring server module types) ────────────────────────────────────

interface CircuitNode {
  id: string;
  type: string;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fillColor: string;
  strokeColor: string;
  textColor: string;
}

interface CircuitEdge {
  id: string;
  from: string;
  to: string;
  color: string;
  points: [number, number][];
  strokeWidth: number;
}

interface RenderGraph {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  canvasWidth: number;
  canvasHeight: number;
}

interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  components?: string[];
  fix?: string;
}

interface SavedCircuit {
  id: string;
  name: string;
  description?: string;
  created_at: string;
}

// ── helpers ───────────────────────────────────────────────────────────────────

const WIRE_COLORS: Record<string, string> = {
  red: '#ef4444',
  black: '#374151',
  yellow: '#eab308',
  green: '#22c55e',
  blue: '#3b82f6',
  white: '#e5e7eb',
  orange: '#f97316',
};

function wireStroke(color: string): string {
  return WIRE_COLORS[color] ?? color;
}

const ISSUE_ICONS = {
  error: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  warning: <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />,
  info: <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />,
};

const SAMPLE_CODE = `// LED blink example
const int LED_PIN = 13;

void setup() {
  pinMode(LED_PIN, OUTPUT);
}

void loop() {
  digitalWrite(LED_PIN, HIGH);
  delay(500);
  digitalWrite(LED_PIN, LOW);
  delay(500);
}`;

// ── canvas renderer ───────────────────────────────────────────────────────────

function CircuitCanvas({ graph, width, height }: { graph: RenderGraph; width: number; height: number }) {
  const viewBox = `0 0 ${graph.canvasWidth} ${graph.canvasHeight}`;

  return (
    <svg
      width={width}
      height={height}
      viewBox={viewBox}
      className="bg-gray-950 rounded-lg border border-gray-700"
      style={{ maxWidth: '100%' }}
    >
      {/* Render wires first (under components) */}
      {graph.edges.map((edge) => {
        if (edge.points.length < 2) return null;
        const d = edge.points
          .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`)
          .join(' ');
        return (
          <path
            key={edge.id}
            d={d}
            stroke={wireStroke(edge.color)}
            strokeWidth={edge.strokeWidth ?? 1.5}
            fill="none"
            strokeLinejoin="round"
            strokeLinecap="round"
            opacity={0.85}
          />
        );
      })}

      {/* Render components */}
      {graph.nodes.map((node) => (
        <g key={node.id} transform={`translate(${node.x}, ${node.y})`}>
          <rect
            width={node.width}
            height={node.height}
            rx={4}
            fill={node.fillColor}
            stroke={node.strokeColor}
            strokeWidth={1.5}
          />
          <text
            x={node.width / 2}
            y={node.height / 2 - 5}
            textAnchor="middle"
            fill={node.textColor ?? '#f9fafb'}
            fontSize={10}
            fontWeight="600"
            fontFamily="monospace"
          >
            {node.label.length > 14 ? node.label.slice(0, 13) + '…' : node.label}
          </text>
          <text
            x={node.width / 2}
            y={node.height / 2 + 9}
            textAnchor="middle"
            fill={node.textColor ?? '#9ca3af'}
            fontSize={8}
            fontFamily="monospace"
            opacity={0.7}
          >
            {node.type}
          </text>
        </g>
      ))}
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export default function CircuitBuilder() {
  const [code, setCode] = useState(SAMPLE_CODE);
  const [renderGraph, setRenderGraph] = useState<RenderGraph | null>(null);
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [generatedCode, setGeneratedCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'editor' | 'circuit' | 'generated' | 'validation'>('editor');
  const [savedCircuits, setSavedCircuits] = useState<SavedCircuit[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');
  const [lastGraph, setLastGraph] = useState<unknown>(null);
  const [error, setError] = useState('');
  const syncTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const parseCode = useCallback(async () => {
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post<{ graph: unknown; renderGraph: RenderGraph }>(
        '/circuit/parse-code',
        { code },
      );
      setRenderGraph(res.data.renderGraph);
      setLastGraph(res.data.graph);

      // Validate automatically
      const vRes = await apiClient.post<{ valid: boolean; issues: ValidationIssue[] }>(
        '/circuit/validate',
        { graph: res.data.graph },
      );
      setIssues(vRes.data.issues);
      setActiveTab('circuit');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to parse code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [code]);

  // Live sync: re-parse after typing stops for 1.5 s
  useEffect(() => {
    if (!code.trim()) return;
    if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    syncTimerRef.current = setTimeout(() => {
      void parseCode();
    }, 1500);
    return () => {
      if (syncTimerRef.current) clearTimeout(syncTimerRef.current);
    };
  }, [code, parseCode]);

  const generateCode = useCallback(async () => {
    if (!lastGraph) return;
    setLoading(true);
    setError('');
    try {
      const res = await apiClient.post<{ sketch: string; summary: string }>(
        '/circuit/generate-code',
        { graph: lastGraph },
      );
      setGeneratedCode(res.data.sketch);
      setActiveTab('generated');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { error?: string } } })?.response?.data?.error ?? 'Failed to generate code';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [lastGraph]);

  const handleSave = useCallback(async () => {
    if (!saveName.trim() || !lastGraph) return;
    setLoading(true);
    try {
      await apiClient.post('/circuit/save', {
        name: saveName,
        description: saveDesc,
        graph: lastGraph,
        code,
      });
      setShowSaveModal(false);
      setSaveName('');
      setSaveDesc('');
    } catch {
      setError('Failed to save circuit');
    } finally {
      setLoading(false);
    }
  }, [saveName, saveDesc, lastGraph, code]);

  const loadSavedCircuits = useCallback(async () => {
    try {
      const res = await apiClient.get<SavedCircuit[]>('/circuit/saved');
      setSavedCircuits(res.data);
      setShowLoadModal(true);
    } catch {
      setError('Failed to load saved circuits');
    }
  }, []);

  const loadCircuit = useCallback(async (id: string) => {
    try {
      const res = await apiClient.get<{ graph_data: unknown; arduino_code?: string }>(
        `/circuit/saved/${id}`,
      );
      setLastGraph(res.data.graph_data);
      if (res.data.arduino_code) setCode(res.data.arduino_code);

      // Re-render
      const rRes = await apiClient.post<RenderGraph>('/circuit/render', {
        graph: res.data.graph_data,
      });
      setRenderGraph(rRes.data);

      const vRes = await apiClient.post<{ valid: boolean; issues: ValidationIssue[] }>(
        '/circuit/validate',
        { graph: res.data.graph_data },
      );
      setIssues(vRes.data.issues);

      setShowLoadModal(false);
      setActiveTab('circuit');
    } catch {
      setError('Failed to load circuit');
    }
  }, []);

  const deleteCircuit = useCallback(async (id: string) => {
    try {
      await apiClient.delete(`/circuit/saved/${id}`);
      setSavedCircuits((prev) => prev.filter((c) => c.id !== id));
    } catch {
      setError('Failed to delete circuit');
    }
  }, []);

  const errorCount = issues.filter((i) => i.severity === 'error').length;
  const warnCount = issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Zap className="w-6 h-6 text-yellow-400" />
          <h1 className="text-xl font-bold text-white">Circuit Builder</h1>
          <span className="text-sm text-gray-400">Arduino / Tinkercad-style</span>
        </div>
        <div className="flex items-center gap-2">
          {error && (
            <span className="text-sm text-red-400 bg-red-900/30 px-3 py-1 rounded-full">
              {error}
            </span>
          )}
          <button
            onClick={() => { setSaveName(''); setSaveDesc(''); setShowSaveModal(true); }}
            disabled={!lastGraph || loading}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" /> Save
          </button>
          <button
            onClick={loadSavedCircuits}
            className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
          >
            <FolderOpen className="w-4 h-4" /> Load
          </button>
          <button
            onClick={parseCode}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            Generate Circuit
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="bg-gray-900 border-b border-gray-800 px-6 flex gap-1">
        {(
          [
            { id: 'editor', label: 'Arduino Code', icon: <Code2 className="w-4 h-4" /> },
            { id: 'circuit', label: 'Circuit Diagram', icon: <Zap className="w-4 h-4" /> },
            {
              id: 'validation',
              label: `Validation${errorCount + warnCount > 0 ? ` (${errorCount + warnCount})` : ''}`,
              icon: errorCount > 0 ? (
                <XCircle className="w-4 h-4 text-red-400" />
              ) : warnCount > 0 ? (
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-400" />
              ),
            },
            { id: 'generated', label: 'Generated Code', icon: <Code2 className="w-4 h-4" /> },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm border-b-2 transition-colors ${
              activeTab === tab.id
                ? 'border-blue-500 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-6">
        {activeTab === 'editor' && (
          <div className="flex flex-col gap-4 h-full">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Write or paste your Arduino code. The circuit will auto-generate after you stop typing.
              </p>
            </div>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="flex-1 w-full bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={24}
              spellCheck={false}
              placeholder="// Paste your Arduino code here…"
            />
          </div>
        )}

        {activeTab === 'circuit' && (
          <div className="flex flex-col gap-4">
            {renderGraph ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">
                    {renderGraph.nodes.length} component(s) · {renderGraph.edges.length} wire(s)
                  </p>
                  <button
                    onClick={generateCode}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-green-700 hover:bg-green-600 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
                  >
                    <Code2 className="w-4 h-4" />
                    Generate Arduino Code
                  </button>
                </div>
                <div className="overflow-auto rounded-lg border border-gray-700">
                  <CircuitCanvas
                    graph={renderGraph}
                    width={Math.min(renderGraph.canvasWidth, 1200)}
                    height={Math.min(renderGraph.canvasHeight, 700)}
                  />
                </div>
                {/* Wire legend */}
                <div className="flex gap-4 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="inline-block w-4 h-1 bg-red-500 rounded" /> VCC / 5V</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-4 h-1 bg-gray-600 rounded" /> GND</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-4 h-1 bg-yellow-500 rounded" /> Signal</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-4 h-1 bg-green-500 rounded" /> Input</span>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Zap className="w-12 h-12 mb-3 opacity-30" />
                <p>No circuit generated yet. Click "Generate Circuit" or write some code.</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'validation' && (
          <div className="max-w-2xl flex flex-col gap-3">
            {issues.length === 0 ? (
              <p className="text-gray-500">No validation results yet. Generate a circuit first.</p>
            ) : (
              issues.map((issue, i) => (
                <div
                  key={i}
                  className={`rounded-lg border p-4 flex gap-3 ${
                    issue.severity === 'error'
                      ? 'border-red-700 bg-red-900/20'
                      : issue.severity === 'warning'
                      ? 'border-yellow-700 bg-yellow-900/20'
                      : 'border-green-700 bg-green-900/20'
                  }`}
                >
                  {ISSUE_ICONS[issue.severity]}
                  <div>
                    <p className="text-sm font-medium text-gray-100">{issue.message}</p>
                    {issue.fix && (
                      <p className="text-xs text-gray-400 mt-1">
                        <Info className="w-3 h-3 inline mr-1" />
                        {issue.fix}
                      </p>
                    )}
                    {issue.code && (
                      <span className="inline-block mt-1 text-xs font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded">
                        {issue.code}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'generated' && (
          <div className="flex flex-col gap-4 h-full">
            {generatedCode ? (
              <>
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-400">Arduino sketch generated from your circuit</p>
                  <button
                    onClick={() => { setCode(generatedCode); setActiveTab('editor'); }}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    <Code2 className="w-4 h-4" /> Use in Editor
                  </button>
                </div>
                <pre className="flex-1 bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-sm text-green-300 overflow-auto whitespace-pre-wrap">
                  {generatedCode}
                </pre>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Code2 className="w-12 h-12 mb-3 opacity-30" />
                <p>No code generated yet. Switch to the Circuit tab and click "Generate Arduino Code".</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Save Circuit</h2>
            <input
              type="text"
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="Circuit name *"
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <textarea
              value={saveDesc}
              onChange={(e) => setSaveDesc(e.target.value)}
              placeholder="Description (optional)"
              rows={3}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-sm mb-4 resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowSaveModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={!saveName.trim() || loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Load modal */}
      {showLoadModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-6 w-full max-w-lg shadow-2xl">
            <h2 className="text-lg font-semibold mb-4">Load Circuit</h2>
            {savedCircuits.length === 0 ? (
              <p className="text-gray-400 text-sm mb-4">No saved circuits yet.</p>
            ) : (
              <ul className="divide-y divide-gray-700 mb-4 max-h-72 overflow-y-auto">
                {savedCircuits.map((c) => (
                  <li key={c.id} className="flex items-center justify-between py-3">
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
                      <p className="text-xs text-gray-500">
                        {new Date(c.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => loadCircuit(c.id)}
                        className="px-3 py-1 bg-blue-600 hover:bg-blue-500 rounded text-xs transition-colors"
                      >
                        Load
                      </button>
                      <button
                        onClick={() => deleteCircuit(c.id)}
                        className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex justify-end">
              <button
                onClick={() => setShowLoadModal(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
