module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.ROCKAPI_KEY;
    const baseUrl = (process.env.ROCKAPI_BASE_URL || 'https://api.rockapi.ru/openai/v1').replace(/\/$/, '');
    const model = process.env.ROCKAPI_CHAT_MODEL || 'gpt-4o-mini';

    if (!apiKey) {
      return res.status(500).json({ error: 'ROCKAPI_KEY is not set in Vercel Environment Variables' });
    }

    const { message, messages = [], lang = 'ru' } = req.body || {};
    const text = String(message || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const safeMessages = Array.isArray(messages)
      ? messages
          .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
          .slice(-10)
      : [];

    const systemPrompt = lang === 'en'
      ? 'You are NeuroPic AI, a helpful assistant inside an AI chat and image generation website. Reply clearly, briefly, and helpfully.'
      : 'Ты NeuroPic AI, полезный помощник внутри сайта с AI-чатом и генерацией изображений. Отвечай понятно, по делу и на русском языке, если пользователь пишет по-русски.';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...safeMessages,
          { role: 'user', content: text },
        ],
        temperature: 0.7,
        max_tokens: 700,
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: data?.error?.message || data?.message || 'RockAPI request failed',
        details: data,
      });
    }

    const answer = data?.choices?.[0]?.message?.content || '';

    return res.status(200).json({
      answer,
      model: data?.model || model,
      usage: data?.usage || null,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};
