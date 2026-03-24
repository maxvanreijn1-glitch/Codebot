import axios from 'axios';

const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;

// ─── Stripe helpers ───────────────────────────────────────────────────────────

/** Redirect the user to a Stripe Checkout session for the given priceId. */
export async function startCheckout(priceId: string): Promise<void> {
  const res = await apiClient.post<{ url: string }>('/stripe/create-checkout-session', { priceId });
  if (res.data.url) {
    window.location.href = res.data.url;
  }
}

/** Redirect the user to the Stripe Customer Portal. */
export async function openBillingPortal(): Promise<void> {
  const res = await apiClient.get<{ url: string }>('/stripe/portal');
  if (res.data.url) {
    window.location.href = res.data.url;
  }
}

// ─── Generation helpers ───────────────────────────────────────────────────────

/** Stream code generation. Calls onChunk for each text delta, resolves when done. */
export async function streamCodeGeneration(
  prompt: string,
  onChunk: (text: string) => void,
): Promise<void> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/generate/code', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Code generation failed');
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body');

  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6)) as { text?: string; done?: boolean; error?: string };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) onChunk(parsed.text);
      } catch {
        /* ignore parse errors */
      }
    }
  }
}

/** Stream circuit generation. Resolves with the parsed circuit JSON when done. */
export async function streamCircuitGeneration(
  prompt: string,
  onChunk: (text: string) => void,
): Promise<unknown> {
  const token = localStorage.getItem('token');
  const res = await fetch('/api/generate/circuit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ prompt }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error((data as { error?: string }).error ?? 'Circuit generation failed');
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  if (!reader) throw new Error('No response body');

  let buf = '';
  let circuit: unknown = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split('\n');
    buf = lines.pop() ?? '';
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      try {
        const parsed = JSON.parse(line.slice(6)) as {
          text?: string;
          done?: boolean;
          circuit?: unknown;
          error?: string;
        };
        if (parsed.error) throw new Error(parsed.error);
        if (parsed.text) onChunk(parsed.text);
        if (parsed.done && parsed.circuit) circuit = parsed.circuit;
      } catch {
        /* ignore parse errors */
      }
    }
  }

  return circuit;
}

