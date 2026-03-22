import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import DiffViewer from '../components/DiffViewer';
import { Repository, Analysis as AnalysisType } from '../types';
import { Sparkles, AlertCircle, ChevronDown, Loader2, Lightbulb } from 'lucide-react';

export default function Analysis() {
  const { id } = useParams<{ id: string }>();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [selectedRepo, setSelectedRepo] = useState('');
  const [prompt, setPrompt] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [analysis, setAnalysis] = useState<AnalysisType | null>(null);

  useEffect(() => {
    apiClient.get('/repositories').then(r => setRepos(r.data)).catch(console.error);
    if (id) {
      apiClient.get(`/analysis/${id}`).then(r => setAnalysis(r.data)).catch(console.error);
    }
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) { setError('Please enter a prompt'); return; }
    if (!selectedRepo && !code.trim()) { setError('Please select a repository or paste some code'); return; }
    setError('');
    setLoading(true);
    try {
      const response = await apiClient.post('/analysis', {
        repositoryId: selectedRepo || undefined,
        prompt,
        code: code.trim() || undefined,
      });
      setAnalysis(response.data);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">Code Analysis</h1>
        <p className="text-gray-400 mt-1">Get AI-powered insights and suggestions for your code</p>
      </div>

      {!analysis && (
        <form onSubmit={handleSubmit} className="space-y-6 bg-gray-900 border border-gray-800 rounded-xl p-6 mb-8">
          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />{error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Repository (optional)</label>
            <div className="relative">
              <select value={selectedRepo} onChange={(e) => setSelectedRepo(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-sky-500 transition-colors appearance-none">
                <option value="">Select a repository...</option>
                {repos.map(r => <option key={r.id} value={r.id}>{r.name} ({r.file_count} files)</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Or paste code directly</label>
            <textarea value={code} onChange={(e) => setCode(e.target.value)} rows={10}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 font-mono text-sm resize-none transition-colors"
              placeholder="// Paste your code here..." />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">What would you like to analyze? *</label>
            <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={4} required
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
              placeholder="e.g., Find bugs and security vulnerabilities, Refactor for better performance, Add TypeScript types, Review for best practices..." />
          </div>
          <button type="submit" disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
            {loading ? <><Loader2 className="w-5 h-5 animate-spin" />Analyzing...</> : <><Sparkles className="w-5 h-5" />Analyze Code</>}
          </button>
        </form>
      )}

      {analysis && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Analysis Results</h2>
            <button onClick={() => setAnalysis(null)}
              className="text-sm text-sky-400 hover:text-sky-300 transition-colors">
              New Analysis
            </button>
          </div>

          {/* Summary */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
            <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Summary</h3>
            <p className="text-white text-lg font-medium">{analysis.result?.summary}</p>
          </div>

          {/* Diff Viewer */}
          {analysis.result?.fileChanges && analysis.result.fileChanges.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Suggested Changes</h3>
              <DiffViewer fileChanges={analysis.result.fileChanges} />
            </div>
          )}

          {/* Explanation */}
          {analysis.result?.overallExplanation && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-3">Explanation</h3>
              <p className="text-gray-300 leading-relaxed whitespace-pre-wrap">{analysis.result.overallExplanation}</p>
            </div>
          )}

          {/* Suggestions */}
          {analysis.result?.suggestions && analysis.result.suggestions.length > 0 && (
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
              <h3 className="text-sm font-medium text-gray-400 uppercase tracking-wider mb-4">Suggestions</h3>
              <ul className="space-y-3">
                {analysis.result.suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Lightbulb className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-300 text-sm">{s}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
