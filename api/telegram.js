
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true });
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;
  const rockKey = process.env.ROCKAPI_KEY;
  const baseUrl = process.env.ROCKAPI_BASE_URL || 'https://api.rockapi.ru/openai/v1';

  try {
    const message = req.body?.message;
    if (!message?.text) return res.status(200).json({ ok: true });

    const chatId = message.chat.id;

    const ai = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${rockKey}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: message.text }]
      })
    });

    const data = await ai.json();
    const reply = data?.choices?.[0]?.message?.content || 'Ошибка получения ответа.';

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: reply
      })
    });

    return res.status(200).json({ ok: true });
  } catch (e) {
    return res.status(200).json({ ok: false, error: String(e) });
  }
}
