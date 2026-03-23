import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Cpu, Trash2, Download, Wrench, Eye, Code2, RefreshCw } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import CircuitVisualizer, { CircuitLayout } from '../components/CircuitVisualizer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

type Tab = 'chat' | 'circuit' | 'troubleshoot';

// ─── Message renderer ─────────────────────────────────────────────────────────

function MessageContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  const codeBlockRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={lastIndex} className="whitespace-pre-wrap">
          {content.slice(lastIndex, match.index)}
        </span>,
      );
    }
    const lang = match[1] || 'cpp';
    const code = match[2];
    parts.push(
      <div key={match.index} className="my-3 rounded-lg overflow-hidden text-sm">
        <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-gray-400 text-xs">{lang}</span>
          </div>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
          >
            copy
          </button>
        </div>
        <SyntaxHighlighter
          language={lang === 'ino' ? 'cpp' : lang}
          style={vscDarkPlus}
          customStyle={{ margin: 0, borderRadius: 0, fontSize: '0.8rem' }}
        >
          {code}
        </SyntaxHighlighter>
      </div>,
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < content.length) {
    parts.push(
      <span key={lastIndex} className="whitespace-pre-wrap">
        {content.slice(lastIndex)}
      </span>,
    );
  }

  return <div className="text-sm leading-relaxed">{parts}</div>;
}

// ─── Streaming helper ─────────────────────────────────────────────────────────

async function streamPost(
  endpoint: string,
  body: Record<string, unknown>,
  onChunk: (text: string) => void,
): Promise<void> {
  const token = localStorage.getItem('token');
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error || 'Request failed');
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body');

  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6)) as { text?: string; done?: boolean };
        if (parsed.text) onChunk(parsed.text);
      } catch {
        // ignore parse errors
      }
    }
  }
}

// ─── Main component ───────────────────────────────────────────────────────────

const CHAT_SUGGESTIONS = [
  'Blink an LED on pin 13 every 500 ms',
  'Read a button on pin 2 and turn on an LED when pressed',
  'Control a servo motor with a potentiometer',
  'Display a counter on a 16×2 LCD display',
];

const TROUBLE_EXAMPLES = [
  'My LED never turns on even though the code compiles fine',
  "'was not declared in this scope' error for a variable",
  'Serial monitor shows garbage characters',
  'Servo jitters or moves erratically',
];

export default function ArduinoAssistant() {
  const [activeTab, setActiveTab] = useState<Tab>('chat');

  // ── Chat state ──────────────────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatError, setChatError] = useState('');
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // ── Circuit state ───────────────────────────────────────────────────────────
  const [circuitLayout, setCircuitLayout] = useState<CircuitLayout>({ components: [], wires: [] });
  const [circuitCode, setCircuitCode] = useState('');
  const [circuitLoading, setCircuitLoading] = useState(false);
  const [circuitError, setCircuitError] = useState('');
  const [generatedCode, setGeneratedCode] = useState('');

  // ── Troubleshoot state ──────────────────────────────────────────────────────
  const [troubleInput, setTroubleInput] = useState('');
  const [troubleResult, setTroubleResult] = useState('');
  const [troubleStreaming, setTroubleStreaming] = useState(false);
  const [troubleError, setTroubleError] = useState('');
  const troubleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatStreaming]);

  useEffect(() => {
    troubleBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [troubleResult, troubleStreaming]);

  // ── Chat handlers ────────────────────────────────────────────────────────────

  const sendChat = async (text: string) => {
    if (!text.trim() || chatStreaming) return;
    setChatError('');
    const history = chatMessages.map((m) => ({ role: m.role, content: m.content }));
    setChatMessages((prev) => [...prev, { role: 'user', content: text.trim() }]);
    setChatInput('');
    setChatStreaming(true);
    setChatMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      await streamPost('/api/arduino/chat', { message: text.trim(), history }, (chunk) => {
        setChatMessages((prev) => {
          const updated = [...prev];
          const last = updated[updated.length - 1];
          if (last.role === 'assistant') {
            updated[updated.length - 1] = { ...last, content: last.content + chunk };
          }
          return updated;
        });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat failed';
      setChatError(msg);
      setChatMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.content === '') updated.pop();
        return updated;
      });
    } finally {
      setChatStreaming(false);
    }
  };

  // ── Circuit handlers ─────────────────────────────────────────────────────────

  const generateCodeFromCircuit = async () => {
    if (circuitLayout.components.length === 0) {
      setCircuitError('Add some components to the circuit first');
      return;
    }
    setCircuitError('');
    setGeneratedCode('');
    setCircuitLoading(true);

    const desc =
      `Components: ${circuitLayout.components.map((c) => `${c.label} (${c.type})`).join(', ')}. ` +
      `Connections: ${
        circuitLayout.wires.length > 0
          ? circuitLayout.wires
              .map((w) => {
                const from = circuitLayout.components.find((c) => c.id === w.fromComponentId);
                const to = circuitLayout.components.find((c) => c.id === w.toComponentId);
                return `${from?.label ?? w.fromComponentId}:${w.fromPin} → ${to?.label ?? w.toComponentId}:${w.toPin}`;
              })
              .join('; ')
          : 'none specified'
      }.`;

    try {
      await streamPost('/api/arduino/generate-code', { circuitDescription: desc }, (chunk) => {
        setGeneratedCode((prev) => prev + chunk);
      });
    } catch (err: unknown) {
      setCircuitError(err instanceof Error ? err.message : 'Code generation failed');
    } finally {
      setCircuitLoading(false);
    }
  };

  const generateCircuitFromCode = async () => {
    if (!circuitCode.trim()) {
      setCircuitError('Paste your Arduino code first');
      return;
    }
    setCircuitError('');
    setCircuitLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/arduino/generate-circuit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ code: circuitCode }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Circuit generation failed');
      }
      const data = await response.json() as { circuit: { components: unknown[]; wires: unknown[] } };
      // Map AI response to CircuitLayout (best-effort)
      const aiComponents = data.circuit?.components ?? [];
      const mapped: CircuitLayout = {
        components: aiComponents.map((c: unknown, i: number) => {
          const comp = c as { id?: string; type?: string; label?: string };
          return {
            id: comp.id ?? `comp-${i}`,
            type: (comp.type ?? 'arduino') as import('../components/CircuitVisualizer').ComponentType,
            label: comp.label ?? String(comp.type ?? 'Component'),
            x: 40 + (i % 4) * 180,
            y: 40 + Math.floor(i / 4) * 220,
          };
        }),
        wires: [],
      };
      setCircuitLayout(mapped);
    } catch (err: unknown) {
      setCircuitError(err instanceof Error ? err.message : 'Circuit generation failed');
    } finally {
      setCircuitLoading(false);
    }
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sketch.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Troubleshoot handlers ────────────────────────────────────────────────────

  const runTroubleshoot = async (problem: string) => {
    if (!problem.trim() || troubleStreaming) return;
    setTroubleError('');
    setTroubleResult('');
    setTroubleStreaming(true);
    try {
      await streamPost('/api/arduino/troubleshoot', { problem: problem.trim() }, (chunk) => {
        setTroubleResult((prev) => prev + chunk);
      });
    } catch (err: unknown) {
      setTroubleError(err instanceof Error ? err.message : 'Troubleshoot failed');
    } finally {
      setTroubleStreaming(false);
    }
  };

  // ── Tabs ─────────────────────────────────────────────────────────────────────

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'chat', label: 'Chat & Code', icon: <Cpu className="w-4 h-4" /> },
    { id: 'circuit', label: 'Circuit Visualizer', icon: <Eye className="w-4 h-4" /> },
    { id: 'troubleshoot', label: 'Troubleshooter', icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Cpu className="w-6 h-6 text-sky-400" />
          Arduino Circuit Assistant
        </h1>
        <p className="text-gray-400 text-sm mt-1">
          Chat with AI, build circuits visually, generate code, and troubleshoot your Arduino projects
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-xl p-1 mb-6 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'bg-sky-600 text-white'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Chat Tab ─────────────────────────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[calc(100vh-18rem)]">
          <div className="flex items-center justify-between mb-3">
            {chatMessages.length > 0 && (
              <button
                onClick={() => setChatMessages([])}
                className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors ml-auto"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear chat
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0 bg-gray-900 border border-gray-800 rounded-xl p-4">
            {chatMessages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Cpu className="w-14 h-14 text-gray-700 mb-4" />
                <p className="text-gray-500 mb-6">Describe what you want your Arduino to do</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                  {CHAT_SUGGESTIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => sendChat(p)}
                      className="text-left text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-sky-600 text-white rounded-tr-sm'
                      : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    <MessageContent
                      content={msg.content || (chatStreaming && i === chatMessages.length - 1 ? '▍' : '')}
                    />
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {chatError && <p className="text-center text-red-400 text-sm">{chatError}</p>}
            <div ref={chatBottomRef} />
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); sendChat(chatInput); }}
            className="flex gap-2"
          >
            <textarea
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); }
              }}
              rows={1}
              placeholder="Describe your Arduino project…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none text-sm transition-colors"
              disabled={chatStreaming}
            />
            <button
              type="submit"
              disabled={chatStreaming || !chatInput.trim()}
              className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 rounded-xl transition-colors"
            >
              {chatStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </button>
          </form>
        </div>
      )}

      {/* ── Circuit Tab ───────────────────────────────────────────────────────── */}
      {activeTab === 'circuit' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: canvas */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col" style={{ height: '60vh' }}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-white">Circuit Canvas</h2>
              <div className="flex gap-2">
                <button
                  onClick={generateCodeFromCircuit}
                  disabled={circuitLoading}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg transition-colors"
                >
                  {circuitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code2 className="w-3.5 h-3.5" />}
                  Generate Code
                </button>
              </div>
            </div>
            <div className="flex-1 min-h-0">
              <CircuitVisualizer layout={circuitLayout} onChange={setCircuitLayout} />
            </div>
          </div>

          {/* Right: Code area */}
          <div className="flex flex-col gap-4">
            {/* Paste code → generate circuit */}
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <h2 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                <RefreshCw className="w-4 h-4 text-sky-400" />
                Generate Circuit from Code
              </h2>
              <textarea
                value={circuitCode}
                onChange={(e) => setCircuitCode(e.target.value)}
                rows={6}
                placeholder="Paste your Arduino .ino code here…"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono text-xs resize-none transition-colors mb-3"
              />
              <button
                onClick={generateCircuitFromCode}
                disabled={circuitLoading || !circuitCode.trim()}
                className="flex items-center gap-1.5 text-xs px-3 py-2 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {circuitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                Visualise Circuit
              </button>
            </div>

            {/* Generated code */}
            {generatedCode && (
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex-1 overflow-y-auto">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-semibold text-white">Generated Sketch</h2>
                  <button
                    onClick={downloadCode}
                    className="flex items-center gap-1 text-xs text-sky-400 hover:text-sky-300 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download .ino
                  </button>
                </div>
                <MessageContent content={generatedCode} />
              </div>
            )}

            {circuitError && (
              <p className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
                {circuitError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Troubleshoot Tab ──────────────────────────────────────────────────── */}
      {activeTab === 'troubleshoot' && (
        <div className="max-w-3xl">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h2 className="text-sm font-semibold text-white mb-1">Describe your problem</h2>
            <p className="text-gray-400 text-xs mb-4">
              Paste compiler errors, describe unexpected behaviour, or upload your code.
            </p>

            {/* Quick examples */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
              {TROUBLE_EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => setTroubleInput(ex)}
                  className="text-left text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>

            <textarea
              value={troubleInput}
              onChange={(e) => setTroubleInput(e.target.value)}
              rows={5}
              placeholder="e.g. error: 'pinNumber' was not declared in this scope&#10;&#10;Or: My servo jitters even though the code looks correct..."
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono text-sm resize-none transition-colors mb-4"
            />
            <button
              onClick={() => runTroubleshoot(troubleInput)}
              disabled={troubleStreaming || !troubleInput.trim()}
              className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              {troubleStreaming ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Diagnosing…</>
              ) : (
                <><Wrench className="w-4 h-4" /> Diagnose</>
              )}
            </button>
          </div>

          {(troubleResult || troubleStreaming) && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-4">
              <h2 className="text-sm font-semibold text-white mb-3">Diagnosis</h2>
              <MessageContent content={troubleResult || (troubleStreaming ? '▍' : '')} />
              {troubleStreaming && (
                <span className="inline-block w-2 h-4 bg-gray-400 animate-pulse ml-1" />
              )}
              <div ref={troubleBottomRef} />
            </div>
          )}

          {troubleError && (
            <p className="mt-4 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">
              {troubleError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
