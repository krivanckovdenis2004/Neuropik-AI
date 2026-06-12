function translateRockApiError(message) {
  const text = String(message || '');
  if (text.includes('上游负载已饱和')) return 'Модель изображений сейчас перегружена. Попробуйте позже или смените модель.';
  if (text.toLowerCase().includes('insufficient') || text.includes('余额') || text.includes('balance')) return 'Недостаточно баланса RockAPI для генерации изображения.';
  return text;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.ROCKAPI_KEY;
    const baseUrl = (process.env.ROCKAPI_BASE_URL || 'https://api.rockapi.ru/openai/v1').replace(/\/$/, '');
    const model = process.env.ROCKAPI_IMAGE_MODEL || 'dall-e-3';

    if (!apiKey) {
      return res.status(500).json({ error: 'ROCKAPI_KEY is not set in Vercel Environment Variables' });
    }

    const { prompt, size = '1024x1024' } = req.body || {};
    const text = String(prompt || '').trim();

    if (!text) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        prompt: text,
        n: 1,
        size,
        ...(model === 'dall-e-3' ? { quality: 'standard' } : {}),
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(response.status).json({
        error: translateRockApiError(data?.error?.message || data?.message || 'RockAPI image request failed'),
        details: data,
      });
    }

    const first = data?.data?.[0] || {};
    let imageUrl = first.url || first.image_url || null;

    if (!imageUrl && first.b64_json) {
      imageUrl = `data:image/png;base64,${first.b64_json}`;
    }

    if (!imageUrl) {
      return res.status(500).json({ error: 'Image URL was not returned by API', details: data });
    }

    return res.status(200).json({
      imageUrl,
      model,
      raw: { created: data?.created || null },
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || 'Server error' });
  }
};
