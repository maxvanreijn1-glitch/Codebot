export interface User {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'pro' | 'premium';
  usage_count: number;
  usage_limit: number;
  created_at: string;
}

export interface Repository {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  file_path: string;
  file_count: number;
  created_at: string;
}

export interface FileChange {
  filename: string;
  original: string;
  modified: string;
  explanation: string;
}

export interface AnalysisResult {
  summary: string;
  fileChanges: FileChange[];
  overallExplanation: string;
  suggestions: string[];
}

export interface Analysis {
  id: string;
  user_id: string;
  repository_id: string | null;
  repository_name?: string;
  prompt: string;
  result: AnalysisResult | null;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  currency: string;
  usageLimit: number;
  features: string[];
}
