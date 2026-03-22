import { Response } from 'express';
import { getClaudeClient, DEFAULT_MODEL, MAX_TOKENS } from './client';

export async function streamAnalysis(
  systemPrompt: string,
  userMessage: string,
  res: Response
): Promise<void> {
  const client = getClaudeClient();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const stream = await client.messages.stream({
    model: DEFAULT_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: userMessage }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      res.write(`data: ${JSON.stringify({ text: chunk.delta.text })}\n\n`);
    }
  }

  const finalMessage = await stream.finalMessage();
  res.write(
    `data: ${JSON.stringify({
      done: true,
      usage: {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
      },
    })}\n\n`
  );
  res.end();
}
