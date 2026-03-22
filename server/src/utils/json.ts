/**
 * Extracts and parses JSON from a string that may contain markdown code blocks.
 * Uses non-greedy matching to avoid capturing non-JSON content between braces.
 */
export function parseJsonResponse<T>(text: string): T | null {
  try {
    // First try to extract JSON from a markdown code block
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      return JSON.parse(codeBlockMatch[1].trim()) as T;
    }
    // Fall back to finding the first balanced JSON object
    const start = text.indexOf('{');
    if (start === -1) return null;
    let depth = 0;
    for (let i = start; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}') {
        depth--;
        if (depth === 0) {
          return JSON.parse(text.slice(start, i + 1)) as T;
        }
      }
    }
    return null;
  } catch {
    return null;
  }
}
