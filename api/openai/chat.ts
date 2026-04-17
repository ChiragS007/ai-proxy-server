import type { VercelRequest, VercelResponse } from '@vercel/node';

type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const APP_PROXY_TOKEN = process.env.APP_PROXY_TOKEN;

    if (!OPENAI_API_KEY) {
      return res.status(500).json({ error: 'Server missing OPENAI_API_KEY' });
    }

    // Optional token check (recommended)
    if (APP_PROXY_TOKEN) {
      const incoming = req.headers['x-app-token'];
      if (incoming !== APP_PROXY_TOKEN) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const {
      model = 'gpt-4o-mini',
      temperature = 0.2,
      max_tokens = 256,
      response_format,
      messages,
    } = req.body ?? {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages[] is required' });
    }

    const safeMessages = messages as ChatMessage[];

    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model,
        temperature,
        max_tokens,
        ...(response_format ? { response_format } : {}),
        messages: safeMessages,
      }),
    });

    const data = await openaiRes.json();

    if (!openaiRes.ok) {
      return res.status(openaiRes.status).json({
        error: 'OpenAI request failed',
        details: data?.error?.message ?? 'Unknown OpenAI error',
      });
    }

    return res.status(200).json(data);
  } catch (err: any) {
    return res.status(500).json({
      error: 'Internal server error',
      details: err?.message ?? 'Unknown error',
    });
  }
}