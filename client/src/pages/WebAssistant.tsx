import { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Code2, Trash2 } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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
    const lang = match[1] || 'text';
    const code = match[2];
    parts.push(
      <div key={match.index} className="my-3 rounded-lg overflow-hidden text-sm">
        <div className="flex items-center gap-2 px-3 py-1 bg-gray-800 border-b border-gray-700">
          <Code2 className="w-3.5 h-3.5 text-sky-400" />
          <span className="text-gray-400 text-xs">{lang}</span>
        </div>
        <pre className="bg-gray-950 rounded-b-lg p-4 overflow-x-auto text-sm text-green-400 font-mono whitespace-pre-wrap">
          <code>{code}</code>
        </pre>
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

const SUGGESTED_PROMPTS = [
  'How do I create a React hook for debouncing?',
  'Write a TypeScript utility to deep-clone an object',
  'Explain the difference between Promise.all and Promise.allSettled',
  'How do I optimise a slow SQL query with large tables?',
];

export default function WebAssistant() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || streaming) return;
    setError('');

    const userMsg: Message = { role: 'user', content: text.trim() };
    const history = messages.map((m) => ({ role: m.role, content: m.content }));
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setStreaming(true);
    setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/arduino/web-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ message: text.trim(), history }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error((data as { error?: string }).error || 'Request failed');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (!reader) throw new Error('No response body');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const parsed = JSON.parse(line.slice(6)) as { text?: string };
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last.role === 'assistant') {
                  updated[updated.length - 1] = { ...last, content: last.content + parsed.text };
                }
                return updated;
              });
            }
          } catch {
            // ignore parse errors
          }
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Request failed';
      setError(msg);
      setMessages((prev) => {
        const updated = [...prev];
        if (updated[updated.length - 1]?.content === '') updated.pop();
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Code2 className="w-6 h-6 text-sky-400" />
            Web &amp; App Assistant
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Ask anything about web or app development - HTML, CSS, JS, React, Node, SQL, and more
          </p>
        </div>
        {messages.length > 0 && (
          <button
            onClick={() => setMessages([])}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 mb-4 min-h-0">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <Code2 className="w-14 h-14 text-gray-700 mb-4" />
            <p className="text-gray-500 mb-6">Start a conversation about web or app development</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-lg w-full">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  onClick={() => sendMessage(p)}
                  className="text-left text-xs px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-gray-300 hover:text-white transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                msg.role === 'user'
                  ? 'bg-sky-600 text-white rounded-tr-sm'
                  : 'bg-gray-800 border border-gray-700 text-gray-200 rounded-tl-sm'
              }`}
            >
              {msg.role === 'assistant' ? (
                <MessageContent content={msg.content || (streaming && i === messages.length - 1 ? 'thinking...' : '')} />
              ) : (
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
              )}
            </div>
          </div>
        ))}

        {error && <p className="text-center text-red-400 text-sm">{error}</p>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2 flex-shrink-0">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          rows={1}
          placeholder="Ask about HTML, CSS, JavaScript, React, Node.js, SQL..."
          className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 resize-none text-sm transition-colors"
          disabled={streaming}
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white px-4 rounded-xl transition-colors flex-shrink-0"
        >
          {streaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>
    </div>
  );
}
