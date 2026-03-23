import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../api/client';
import UsageBar from '../components/UsageBar';
import { Repository, Analysis } from '../types';
import { FolderOpen, Activity, Plus, Clock, CheckCircle, XCircle, Loader2, Code2, Cpu } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const [repos, setRepos] = useState<Repository[]>([]);
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.get('/repositories'),
      apiClient.get('/analysis'),
    ]).then(([reposRes, analysesRes]) => {
      setRepos(reposRes.data);
      setAnalyses(analysesRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const statusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle className="w-4 h-4 text-green-400" />;
    if (status === 'failed') return <XCircle className="w-4 h-4 text-red-400" />;
    return <Loader2 className="w-4 h-4 text-yellow-400 animate-spin" />;
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back, {user?.name}</p>
        </div>
        <div className="flex gap-3">
          <Link to="/repository" className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Plus className="w-4 h-4" />New Repository
          </Link>
          <Link to="/analysis" className="flex items-center gap-2 bg-sky-600 hover:bg-sky-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors">
            <Activity className="w-4 h-4" />New Analysis
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <FolderOpen className="w-5 h-5 text-sky-400" />
            <span className="text-gray-400 text-sm">Repositories</span>
          </div>
          <p className="text-3xl font-bold text-white">{repos.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center gap-3 mb-2">
            <Activity className="w-5 h-5 text-purple-400" />
            <span className="text-gray-400 text-sm">Total Analyses</span>
          </div>
          <p className="text-3xl font-bold text-white">{analyses.length}</p>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
          {user && (
            <UsageBar current={user.usage_count} limit={user.usage_limit} tier={user.tier} />
          )}
        </div>
      </div>

      {/* AI Assistants */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Link
          to="/web-assistant"
          className="bg-gray-900 border border-gray-800 hover:border-sky-700 rounded-xl p-6 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-sky-900/40 rounded-lg group-hover:bg-sky-900/70 transition-colors">
              <Code2 className="w-5 h-5 text-sky-400" />
            </div>
            <h3 className="text-white font-semibold">Web &amp; App Assistant</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Get AI help with HTML, CSS, JavaScript, React, Node.js, SQL and more.
          </p>
          <span className="mt-4 inline-flex items-center text-sky-400 text-sm group-hover:text-sky-300 transition-colors">
            Open assistant →
          </span>
        </Link>

        <Link
          to="/arduino-assistant"
          className="bg-gray-900 border border-gray-800 hover:border-sky-700 rounded-xl p-6 transition-colors group"
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 bg-green-900/40 rounded-lg group-hover:bg-green-900/70 transition-colors">
              <Cpu className="w-5 h-5 text-green-400" />
            </div>
            <h3 className="text-white font-semibold">Arduino Circuit Assistant</h3>
          </div>
          <p className="text-gray-400 text-sm">
            Chat, generate Arduino sketches, build circuits visually, and troubleshoot hardware issues.
          </p>
          <span className="mt-4 inline-flex items-center text-sky-400 text-sm group-hover:text-sky-300 transition-colors">
            Open assistant →
          </span>
        </Link>
      </div>

      {/* Recent Analyses */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Recent Analyses</h2>
        {analyses.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="w-12 h-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500">No analyses yet.</p>
            <Link to="/analysis" className="text-sky-400 hover:text-sky-300 text-sm mt-2 inline-block">Run your first analysis →</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {analyses.slice(0, 10).map((a) => (
              <Link key={a.id} to={`/analysis/${a.id}`} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg hover:bg-gray-800 transition-colors">
                <div className="flex items-center gap-3 min-w-0">
                  {statusIcon(a.status)}
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{a.prompt}</p>
                    {a.repository_name && <p className="text-gray-500 text-xs">{a.repository_name}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                  <Clock className="w-3.5 h-3.5 text-gray-600" />
                  <span className="text-gray-500 text-xs">{new Date(a.created_at).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
