import { getClaudeClient, DEFAULT_MODEL, MAX_TOKENS } from '../claude/client';
import { CODE_ANALYSIS_SYSTEM_PROMPT } from '../claude/prompts';
import { AnalysisResult } from '../../utils/openai';
import { parseJsonResponse } from '../../utils/json';

export interface SuggestionRequest {
  code: string;
  filename?: string;
  language?: string;
  context?: string;
}

export class CopilotSuggester {
  async generateSuggestions(request: SuggestionRequest): Promise<AnalysisResult> {
    const client = getClaudeClient();

    const filePart = request.filename ? ` in file "${request.filename}"` : '';
    const langPart = request.language ? ` (${request.language})` : '';
    const contextPart = request.context ? `\nContext: ${request.context}` : '';

    const userMessage = `Generate improvement suggestions for this code${filePart}${langPart}:${contextPart}\n\n\`\`\`\n${request.code}\n\`\`\`\n\nProvide specific, actionable suggestions.`;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: CODE_ANALYSIS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '{}';
    return this.parseAnalysisResult(text);
  }

  private parseAnalysisResult(text: string): AnalysisResult {
    const parsed = parseJsonResponse<Partial<AnalysisResult>>(text);
    if (parsed) {
      return {
        summary: parsed.summary || 'Suggestions generated',
        fileChanges: parsed.fileChanges || [],
        overallExplanation: parsed.overallExplanation || '',
        suggestions: parsed.suggestions || [],
      };
    }
    return {
      summary: 'Analysis complete',
      fileChanges: [],
      overallExplanation: text,
      suggestions: [],
    };
  }
}

export const copilotSuggester = new CopilotSuggester();
