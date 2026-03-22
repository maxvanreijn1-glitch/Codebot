import { parseJsonResponse } from './json';
import { getClaudeClient, DEFAULT_MODEL, MAX_TOKENS } from '../services/claude/client';
import { CODE_ANALYSIS_SYSTEM_PROMPT } from '../services/claude/prompts';

// Re-exported types for backwards compatibility with existing routes
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

export async function analyzeCode(codeContent: string, prompt: string): Promise<AnalysisResult> {
  const client = getClaudeClient();

  const userMessage = codeContent
    ? `Here is the code to analyze:\n\n${codeContent}\n\nUser request: ${prompt}`
    : `User request: ${prompt}`;

  const response = await client.messages.create({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: CODE_ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const content = response.content[0].type === 'text' ? response.content[0].text : null;
  if (!content) {
    throw new Error('No response from Claude');
  }

  let parsed: Partial<AnalysisResult>;
  try {
    parsed = parseJsonResponse<Partial<AnalysisResult>>(content) ?? {
      summary: 'Analysis complete',
      overallExplanation: content,
      fileChanges: [],
      suggestions: [],
    };
  } catch {
    parsed = {
      summary: 'Analysis complete',
      overallExplanation: content,
      fileChanges: [],
      suggestions: [],
    };
  }

  return {
    summary: parsed.summary || 'Analysis complete',
    fileChanges: parsed.fileChanges || [],
    overallExplanation: parsed.overallExplanation || '',
    suggestions: parsed.suggestions || [],
  };
}
