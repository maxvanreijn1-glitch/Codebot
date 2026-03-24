import { useState, useRef, useEffect } from "react";
import { Send, Loader2, Cpu, Trash2, Download, Wrench, Eye, Code2, RefreshCw } from "lucide-react";
import CircuitVisualizer from "../components/CircuitVisualizer";
import type { CircuitLayout } from "../components/CircuitVisualizer";

interface Message { role: "user" | "assistant"; content: string; }
type Tab = "chat" | "circuit" | "troubleshoot";

function MessageContent({ content }: { content: string }) {
  const parts: React.ReactNode[] = [];
  const re = /```(\w*)\n?([\s\S]*?)```/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = re.exec(content)) !== null) {
    if (m.index > last) parts.push(<span key={last} className="whitespace-pre-wrap">{content.slice(last, m.index)}</span>);
    const lang = m[1] || "cpp";
    const code = m[2];
    parts.push(
      <div key={m.index} className="my-3 rounded-lg overflow-hidden text-sm">
        <div className="flex items-center justify-between px-3 py-1 bg-gray-800 border-b border-gray-700">
          <div className="flex items-center gap-2">
            <Code2 className="w-3.5 h-3.5 text-sky-400" />
            <span className="text-gray-400 text-xs">{lang}</span>
          </div>
          <button onClick={() => navigator.clipboard.writeText(code)} className="text-xs text-gray-500 hover:text-gray-300">copy</button>
        </div>
        <pre className="bg-gray-950 rounded-b-lg p-4 overflow-x-auto text-sm text-green-400 font-mono whitespace-pre-wrap"><code>{code}</code></pre>
      </div>
    );
    last = m.index + m[0].length;
  }
  if (last < content.length) parts.push(<span key={last} className="whitespace-pre-wrap">{content.slice(last)}</span>);
  return <div className="text-sm leading-relaxed">{parts}</div>;
}

async function streamPost(endpoint: string, body: Record<string, unknown>, onChunk: (t: string) => void): Promise<void> {
  const token = localStorage.getItem("token");
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as { error?: string }).error || "Request failed"); }
  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error("No response body");
  let buf = "";
  while (true) {
    const { done, value } = await reader.read(); if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n"); buf = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      try { const p = JSON.parse(line.slice(6)) as { text?: string; done?: boolean }; if (p.text) onChunk(p.text); } catch { /**/ }
    }
  }
}

const CHAT_SUGGESTIONS = [
  "Blink an LED on pin 13 every 500ms", "Read a button on pin 2 and turn on an LED when pressed",
  "Control a servo motor with a potentiometer", "Display a counter on a 16x2 I2C LCD",
];
const TROUBLE_EXAMPLES = [
  "My LED never turns on even though the code compiles fine", "'was not declared in this scope' error for a variable",
  "Serial monitor shows garbage characters", "Servo jitters or moves erratically",
];

export default function ArduinoAssistant() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");

  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatStreaming, setChatStreaming] = useState(false);
  const [chatError, setChatError] = useState("");
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const [circuitLayout, setCircuitLayout] = useState<CircuitLayout>({ components: [], wires: [] });
  const [circuitCode, setCircuitCode] = useState("");
  const [circuitLoading, setCircuitLoading] = useState(false);
  const [circuitError, setCircuitError] = useState("");
  const [generatedCode, setGeneratedCode] = useState("");

  const [troubleInput, setTroubleInput] = useState("");
  const [troubleResult, setTroubleResult] = useState("");
  const [troubleStreaming, setTroubleStreaming] = useState(false);
  const [troubleError, setTroubleError] = useState("");
  const troubleBottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { chatBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages, chatStreaming]);
  useEffect(() => { troubleBottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [troubleResult, troubleStreaming]);

  const sendChat = async (text: string) => {
    if (!text.trim() || chatStreaming) return;
    setChatError("");
    const history = chatMessages.map(m => ({ role: m.role, content: m.content }));
    setChatMessages(prev => [...prev, { role: "user", content: text.trim() }]);
    setChatInput("");
    setChatStreaming(true);
    setChatMessages(prev => [...prev, { role: "assistant", content: "" }]);
    try {
      await streamPost("/api/arduino/chat", { message: text.trim(), history }, chunk => {
        setChatMessages(prev => { const u = [...prev]; const l = u[u.length-1]; if (l.role==="assistant") u[u.length-1]={...l,content:l.content+chunk}; return u; });
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Chat failed";
      setChatError(msg);
      setChatMessages(prev => { const u=[...prev]; if (u[u.length-1]?.content==="") u.pop(); return u; });
    } finally { setChatStreaming(false); }
  };

  const generateCodeFromCircuit = async () => {
    if (circuitLayout.components.length === 0) { setCircuitError("Add some components to the circuit first"); return; }
    setCircuitError(""); setGeneratedCode(""); setCircuitLoading(true);
    const desc =
      `Components: ${circuitLayout.components.map(c => `${c.label} (${c.type})`).join(", ")}. ` +
      `Connections: ${circuitLayout.wires.length > 0
        ? circuitLayout.wires.map(w => {
            const f = circuitLayout.components.find(c=>c.id===w.fromComponentId);
            const t = circuitLayout.components.find(c=>c.id===w.toComponentId);
            return `${f?.label??w.fromComponentId}:${w.fromPin} -> ${t?.label??w.toComponentId}:${w.toPin}`;
          }).join("; ")
        : "none specified"}.`;
    try {
      await streamPost("/api/arduino/generate-code", { circuitDescription: desc }, chunk => setGeneratedCode(prev => prev + chunk));
    } catch (err: unknown) {
      setCircuitError(err instanceof Error ? err.message : "Code generation failed");
    } finally { setCircuitLoading(false); }
  };

  const generateCircuitFromCode = async () => {
    if (!circuitCode.trim()) { setCircuitError("Paste your Arduino code first"); return; }
    setCircuitError(""); setCircuitLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch("/api/arduino/generate-circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({ code: circuitCode }),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); throw new Error((d as {error?:string}).error || "Circuit generation failed"); }
      const data = await res.json() as { circuit: { components: unknown[]; wires: unknown[] } };
      const comps = data.circuit?.components ?? [];
      setCircuitLayout({
        components: comps.map((c: unknown, i: number) => {
          const comp = c as { id?: string; type?: string; label?: string };
          return { id: comp.id ?? `comp-${i}`, type: (comp.type ?? "arduino-uno") as import("../components/CircuitVisualizer").AnyComponentType, label: comp.label ?? String(comp.type ?? "Component"), x: 40 + (i%4)*180, y: 40 + Math.floor(i/4)*220 };
        }),
        wires: [],
      });
    } catch (err: unknown) {
      setCircuitError(err instanceof Error ? err.message : "Circuit generation failed");
    } finally { setCircuitLoading(false); }
  };

  const downloadCode = () => {
    const blob = new Blob([generatedCode], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "sketch.ino"; a.click(); URL.revokeObjectURL(url);
  };

  const runTroubleshoot = async (problem: string) => {
    if (!problem.trim() || troubleStreaming) return;
    setTroubleError(""); setTroubleResult(""); setTroubleStreaming(true);
    try {
      await streamPost("/api/arduino/troubleshoot", { problem: problem.trim() }, chunk => setTroubleResult(prev => prev + chunk));
    } catch (err: unknown) {
      setTroubleError(err instanceof Error ? err.message : "Troubleshoot failed");
    } finally { setTroubleStreaming(false); }
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "chat", label: "Chat & Code", icon: <Cpu className="w-4 h-4" /> },
    { id: "circuit", label: "Circuit Visualizer", icon: <Eye className="w-4 h-4" /> },
    { id: "troubleshoot", label: "Troubleshooter", icon: <Wrench className="w-4 h-4" /> },
  ];

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="px-4 pt-4 pb-0 bg-gray-950 flex-shrink-0">
        <div className="mb-3">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Cpu className="w-5 h-5 text-sky-400" />
            Arduino Circuit Assistant
          </h1>
          <p className="text-gray-500 text-xs mt-0.5">Chat with AI, build circuits, generate code, and troubleshoot</p>
        </div>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1 w-fit">
          {tabs.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${activeTab===tab.id?"bg-sky-600 text-white":"text-gray-400 hover:text-white hover:bg-gray-800"}`}>
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === "chat" && (
          <div className="flex flex-col h-full px-4 py-3">
            <div className="flex items-center justify-between mb-2 flex-shrink-0">
              {chatMessages.length > 0 && (
                <button onClick={() => setChatMessages([])} className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 ml-auto">
                  <Trash2 className="w-3.5 h-3.5" /> Clear
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 mb-3 min-h-0 bg-gray-900 border border-gray-800 rounded-xl p-4">
              {chatMessages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Cpu className="w-12 h-12 text-gray-700 mb-3" />
                  <p className="text-gray-500 mb-4 text-sm">Describe what you want your Arduino to do</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
                    {CHAT_SUGGESTIONS.map(p => (
                      <button key={p} onClick={() => sendChat(p)} className="text-left text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white">{p}</button>
                    ))}
                  </div>
                </div>
              )}
              {chatMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role==="user"?"justify-end":"justify-start"}`}>
                  <div className={`max-w-[80%] px-4 py-3 rounded-2xl ${msg.role==="user"?"bg-sky-600 text-white rounded-tr-sm":"bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm"}`}>
                    {msg.role === "assistant"
                      ? <MessageContent content={msg.content || (chatStreaming && i===chatMessages.length-1 ? "thinking..." : "")} />
                      : <p className="text-sm whitespace-pre-wrap">{msg.content}</p>}
                  </div>
                </div>
              ))}
              {chatError && <p className="text-center text-red-400 text-sm">{chatError}</p>}
              <div ref={chatBottomRef} />
            </div>
            <form onSubmit={e => { e.preventDefault(); sendChat(chatInput); }} className="flex gap-2 flex-shrink-0">
              <textarea value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => { if (e.key==="Enter" && !e.shiftKey) { e.preventDefault(); sendChat(chatInput); } }}
                rows={1} placeholder="Describe your Arduino project..." disabled={chatStreaming}
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none text-sm" />
              <button type="submit" disabled={chatStreaming || !chatInput.trim()} className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 rounded-xl">
                {chatStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </form>
          </div>
        )}

        {activeTab === "circuit" && (
          <div className="flex flex-col h-full">
            {/* Circuit toolbar */}
            <div className="flex items-center gap-3 px-4 py-2 bg-gray-900 border-b border-gray-800 flex-shrink-0">
              <button onClick={generateCodeFromCircuit} disabled={circuitLoading || circuitLayout.components.length === 0}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-lg">
                {circuitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Code2 className="w-3.5 h-3.5" />}
                Generate Code
              </button>
              {generatedCode && (
                <button onClick={downloadCode} className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white rounded-lg">
                  <Download className="w-3.5 h-3.5" /> Download .ino
                </button>
              )}
              {circuitError && <span className="text-xs text-red-400">{circuitError}</span>}
            </div>

            {/* Circuit canvas takes most space */}
            <div className="flex flex-1 min-h-0 overflow-hidden">
              <div className="flex-1 min-w-0 h-full">
                <CircuitVisualizer layout={circuitLayout} onChange={setCircuitLayout} />
              </div>

              {/* Right panel: generated code or code-to-circuit */}
              <div className="w-80 flex-shrink-0 flex flex-col bg-gray-900 border-l border-gray-800 overflow-hidden">
                <div className="p-3 border-b border-gray-800">
                  <h3 className="text-xs font-semibold text-white mb-2 flex items-center gap-1.5"><RefreshCw className="w-3.5 h-3.5 text-sky-400" /> Generate from Code</h3>
                  <textarea value={circuitCode} onChange={e => setCircuitCode(e.target.value)} rows={5} placeholder="Paste .ino code here..."
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono text-xs resize-none mb-2" />
                  <button onClick={generateCircuitFromCode} disabled={circuitLoading || !circuitCode.trim()}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white rounded-lg w-full justify-center">
                    {circuitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Eye className="w-3.5 h-3.5" />}
                    Visualise Circuit
                  </button>
                </div>
                {generatedCode && (
                  <div className="flex-1 overflow-y-auto p-3">
                    <h3 className="text-xs font-semibold text-white mb-2">Generated Sketch</h3>
                    <MessageContent content={generatedCode} />
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "troubleshoot" && (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-3xl mx-auto">
              <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
                <h2 className="text-sm font-semibold text-white mb-1">Describe your problem</h2>
                <p className="text-gray-400 text-xs mb-4">Paste compiler errors, describe unexpected behaviour, or describe your circuit.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
                  {TROUBLE_EXAMPLES.map(ex => (
                    <button key={ex} onClick={() => setTroubleInput(ex)} className="text-left text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-400 hover:text-white">{ex}</button>
                  ))}
                </div>
                <textarea value={troubleInput} onChange={e => setTroubleInput(e.target.value)} rows={5}
                  placeholder="e.g. error: pinNumber was not declared in this scope"
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono text-sm resize-none mb-4" />
                <button onClick={() => runTroubleshoot(troubleInput)} disabled={troubleStreaming || !troubleInput.trim()}
                  className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-lg text-sm font-medium">
                  {troubleStreaming ? <><Loader2 className="w-4 h-4 animate-spin" /> Diagnosing...</> : <><Wrench className="w-4 h-4" /> Diagnose</>}
                </button>
              </div>
              {(troubleResult || troubleStreaming) && (
                <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 mt-4">
                  <h2 className="text-sm font-semibold text-white mb-3">Diagnosis</h2>
                  <MessageContent content={troubleResult || (troubleStreaming ? "Diagnosing..." : "")} />
                  <div ref={troubleBottomRef} />
                </div>
              )}
              {troubleError && <p className="mt-4 text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-lg px-3 py-2">{troubleError}</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
