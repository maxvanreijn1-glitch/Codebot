import OpenAI from 'openai';

let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }
  return openaiClient;
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

export async function analyzeCode(codeContent: string, prompt: string): Promise<AnalysisResult> {
  const client = getOpenAIClient();

  const systemPrompt = `You are an expert code analysis assistant. When given code and a prompt, analyze the code and provide structured feedback. 
Always respond with valid JSON in exactly this format:
{
  "summary": "Brief one-line summary of what was analyzed",
  "fileChanges": [
    {
      "filename": "example.ts",
      "original": "original code here",
      "modified": "modified/suggested code here",
      "explanation": "Why this change was made"
    }
  ],
  "overallExplanation": "Detailed explanation of the analysis and all recommendations",
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}

If no code changes are needed for a specific file, you can still include it in fileChanges with original == modified.
If no code was provided, analyze based on the prompt alone and provide general suggestions with empty fileChanges array.`;

  const userMessage = codeContent
    ? `Here is the code to analyze:\n\n${codeContent}\n\nUser request: ${prompt}`
    : `User request: ${prompt}`;

  const response = await client.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    max_tokens: 4096,
    temperature: 0.3,
    response_format: { type: 'json_object' },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No response from OpenAI');
  }

  const parsed = JSON.parse(content) as AnalysisResult;
  return {
    summary: parsed.summary || 'Analysis complete',
    fileChanges: parsed.fileChanges || [],
    overallExplanation: parsed.overallExplanation || '',
    suggestions: parsed.suggestions || [],
  };
}
