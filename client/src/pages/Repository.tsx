import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { Upload, X, FolderOpen, CheckCircle, AlertCircle } from 'lucide-react';

export default function Repository() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const arr = Array.from(newFiles);
    setFiles(prev => {
      const existing = new Set(prev.map(f => f.name));
      return [...prev, ...arr.filter(f => !existing.has(f.name))];
    });
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    addFiles(e.dataTransfer.files);
  }, [addFiles]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError('Repository name is required'); return; }
    if (files.length === 0) { setError('Please add at least one file'); return; }
    setError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      files.forEach(f => formData.append('files', f));
      await apiClient.post('/repositories', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setSuccess(true);
      setTimeout(() => navigate('/dashboard'), 2000);
    } catch (err: unknown) {
      const axiosErr = err as { response?: { data?: { error?: string } } };
      setError(axiosErr.response?.data?.error || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-white mb-2">Repository Created!</h2>
          <p className="text-gray-400">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white">New Repository</h1>
        <p className="text-gray-400 mt-1">Upload your code files for AI analysis</p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-800 rounded-lg text-red-400 text-sm">
            <AlertCircle className="w-4 h-4" />{error}
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Repository Name *</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} required
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors"
            placeholder="my-project" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-sky-500 transition-colors resize-none"
            placeholder="Brief description of your project..." />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-1.5">Files *</label>
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onClick={() => document.getElementById('file-input')?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${dragging ? 'border-sky-500 bg-sky-500/10' : 'border-gray-700 hover:border-gray-600'}`}
          >
            <input id="file-input" type="file" multiple className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <Upload className="w-8 h-8 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">Drop files here or click to browse</p>
            <p className="text-gray-600 text-sm mt-1">Max 50 files, 10MB each</p>
          </div>
          {files.length > 0 && (
            <div className="mt-3 bg-gray-800/50 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FolderOpen className="w-4 h-4 text-sky-400 flex-shrink-0" />
                    <span className="text-gray-300 text-sm truncate">{f.name}</span>
                    <span className="text-gray-600 text-xs flex-shrink-0">{(f.size / 1024).toFixed(1)}KB</span>
                  </div>
                  <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                    className="text-gray-600 hover:text-red-400 transition-colors flex-shrink-0">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <button type="submit" disabled={loading}
          className="w-full bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white py-3 rounded-lg font-semibold transition-colors">
          {loading ? 'Uploading...' : `Upload ${files.length > 0 ? `${files.length} file${files.length > 1 ? 's' : ''}` : 'Repository'}`}
        </button>
      </form>
    </div>
  );
}
