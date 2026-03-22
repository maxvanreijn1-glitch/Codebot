import { getClaudeClient, DEFAULT_MODEL, MAX_TOKENS } from '../claude/client';
import { COPILOT_SYSTEM_PROMPT } from '../claude/prompts';
import { parseJsonResponse } from '../../utils/json';

export interface CodeSuggestion {
  type: 'improvement' | 'bug' | 'performance' | 'security' | 'style';
  line?: number;
  message: string;
  code?: string;
}

export interface AnalysisResult {
  suggestions: CodeSuggestion[];
  summary: string;
  tokensUsed: number;
}

export class CopilotAnalyzer {
  async analyzeFile(
    filename: string,
    content: string,
    language: string
  ): Promise<AnalysisResult> {
    const client = getClaudeClient();

    const userMessage = `Analyze this ${language} file named "${filename}":\n\n\`\`\`${language.toLowerCase()}\n${content}\n\`\`\``;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: COPILOT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = this.parseResponse(text);

    return {
      ...parsed,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  async analyzeCodeSnippet(code: string, context?: string): Promise<AnalysisResult> {
    const client = getClaudeClient();

    const userMessage = context
      ? `Context: ${context}\n\nAnalyze this code:\n\`\`\`\n${code}\n\`\`\``
      : `Analyze this code:\n\`\`\`\n${code}\n\`\`\``;

    const response = await client.messages.create({
      model: DEFAULT_MODEL,
      max_tokens: MAX_TOKENS,
      system: COPILOT_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const parsed = this.parseResponse(text);

    return {
      ...parsed,
      tokensUsed: response.usage.input_tokens + response.usage.output_tokens,
    };
  }

  private parseResponse(text: string): Omit<AnalysisResult, 'tokensUsed'> {
    const parsed = parseJsonResponse<{ suggestions?: CodeSuggestion[]; summary?: string }>(text);
    if (parsed) {
      return {
        suggestions: parsed.suggestions || [],
        summary: parsed.summary || 'Analysis complete',
      };
    }
    return {
      suggestions: [],
      summary: text.slice(0, 200),
    };
  }
}

export const copilotAnalyzer = new CopilotAnalyzer();
