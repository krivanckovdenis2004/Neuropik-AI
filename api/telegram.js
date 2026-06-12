
async function sendTelegram(chatId, text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      reply_markup: {
        keyboard: [
          [{ text: '🤖 AI Чат' }, { text: '🎨 Картинки' }],
          [{ text: '💎 Баланс' }, { text: '👤 Профиль' }],
          [{ text: '🌐 Сайт' }]
        ],
        resize_keyboard: true
      }
    })
  });
}

async function askAI(userText) {
  const rockKey = process.env.ROCKAPI_KEY;
  const baseUrl = process.env.ROCKAPI_BASE_URL || 'https://api.rockapi.ru/openai/v1';

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rockKey}`
    },
    body: JSON.stringify({
      model: process.env.ROCKAPI_CHAT_MODEL || 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'Ты NeuroPic AI — дружелюбный русскоязычный AI-помощник. Отвечай понятно, полезно и не слишком длинно.'
        },
        {
          role: 'user',
          content: userText
        }
      ],
      temperature: 0.7
    })
  });

  const data = await response.json();

  if (!response.ok) {
    console.error('RockAPI error:', data);
    return '⚠️ Сейчас AI временно не отвечает. Попробуйте ещё раз через минуту.';
  }

  return data?.choices?.[0]?.message?.content || 'Не получилось получить ответ.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ ok: true, message: 'Telegram webhook is working' });
  }

  try {
    const msg = req.body?.message;
    if (!msg?.chat?.id || !msg?.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = msg.chat.id;
    const text = String(msg.text || '').trim();

    if (text === '/start' || text.toLowerCase() === 'start') {
      await sendTelegram(chatId,
`👋 <b>Привет! Я NeuroPic AI.</b>

Я могу отвечать на вопросы, помогать с текстами, идеями, кодом и контентом.

Просто напиши обычное сообщение — и я отвечу.`
      );
      return res.status(200).json({ ok: true });
    }

    if (text === '🤖 AI Чат') {
      await sendTelegram(chatId, '🤖 Напиши любой вопрос обычным сообщением, и я отвечу.');
      return res.status(200).json({ ok: true });
    }

    if (text === '🎨 Картинки') {
      await sendTelegram(chatId, '🎨 Генерацию картинок подключим следующим этапом. Пока работает AI-чат.');
      return res.status(200).json({ ok: true });
    }

    if (text === '💎 Баланс') {
      await sendTelegram(chatId, '💎 Баланс скоро подключим. Сейчас AI-чат работает в тестовом режиме.');
      return res.status(200).json({ ok: true });
    }

    if (text === '👤 Профиль') {
      const name = msg.from?.first_name || 'Пользователь';
      const username = msg.from?.username ? '@' + msg.from.username : 'не указан';
      await sendTelegram(chatId,
`👤 <b>Профиль</b>

Имя: ${name}
Username: ${username}
Telegram ID: <code>${msg.from?.id || chatId}</code>`
      );
      return res.status(200).json({ ok: true });
    }

    if (text === '🌐 Сайт') {
      await sendTelegram(chatId, '🌐 NeuroPic AI:\nhttps://neuropik-ai.vercel.app');
      return res.status(200).json({ ok: true });
    }

    const reply = await askAI(text);
    await sendTelegram(chatId, reply);

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    try {
      const chatId = req.body?.message?.chat?.id;
      if (chatId) {
        await sendTelegram(chatId, '⚠️ Ошибка на сервере. Попробуйте ещё раз.');
      }
    } catch {}
    return res.status(200).json({ ok: false, error: String(error) });
  }
}
