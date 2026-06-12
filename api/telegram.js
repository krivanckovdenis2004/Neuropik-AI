const TELEGRAM_API = 'https://api.telegram.org/bot';
const DEFAULT_MODEL = process.env.ROCKAPI_CHAT_MODEL || 'gpt-4o-mini';
const FREE_CREDITS = Number(process.env.TELEGRAM_FREE_CREDITS || 20);

function tgUrl(method) {
  return `${TELEGRAM_API}${process.env.TELEGRAM_BOT_TOKEN}/${method}`;
}

async function sendMessage(chatId, text, extra = {}) {
  await fetch(tgUrl('sendMessage'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
      ...extra
    })
  });
}

async function answerCallbackQuery(callbackQueryId, text = '') {
  await fetch(tgUrl('answerCallbackQuery'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text })
  });
}

function menuKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🤖 AI Чат', callback_data: 'chat' },
          { text: '🎨 Картинки', callback_data: 'image' }
        ],
        [
          { text: '💎 Баланс', callback_data: 'balance' },
          { text: '👤 Профиль', callback_data: 'profile' }
        ],
        [
          { text: '🧹 Очистить память', callback_data: 'clear' },
          { text: '🌐 Сайт', url: 'https://neuropik-ai.vercel.app' }
        ]
      ]
    }
  };
}

function firebaseConfig() {
  const projectId = process.env.VITE_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;
  const apiKey = process.env.VITE_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY;
  if (!projectId || !apiKey) return null;
  return { projectId, apiKey };
}

function tgUserDocUrl(id) {
  const cfg = firebaseConfig();
  if (!cfg) return null;
  return `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/(default)/documents/tgUsers/${id}?key=${cfg.apiKey}`;
}

function toFirestoreValue(value) {
  if (typeof value === 'number') return { integerValue: String(value) };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(toFirestoreValue) } };
  if (value && typeof value === 'object') {
    const fields = {};
    for (const [k, v] of Object.entries(value)) fields[k] = toFirestoreValue(v);
    return { mapValue: { fields } };
  }
  return { stringValue: String(value ?? '') };
}

function fromFirestoreValue(v) {
  if (!v) return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('booleanValue' in v) return Boolean(v.booleanValue);
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromFirestoreValue);
  if ('mapValue' in v) {
    const obj = {};
    for (const [k, val] of Object.entries(v.mapValue.fields || {})) obj[k] = fromFirestoreValue(val);
    return obj;
  }
  return null;
}

function docToUser(doc) {
  const fields = doc?.fields || {};
  const user = {};
  for (const [k, v] of Object.entries(fields)) user[k] = fromFirestoreValue(v);
  return user;
}

async function getTelegramUser(from) {
  const url = tgUserDocUrl(from.id);
  if (!url) {
    return {
      telegramId: String(from.id),
      name: from.first_name || 'User',
      username: from.username || '',
      credits: FREE_CREDITS,
      history: []
    };
  }

  const res = await fetch(url);
  if (res.ok) return docToUser(await res.json());

  const user = {
    telegramId: String(from.id),
    name: from.first_name || 'User',
    username: from.username || '',
    credits: FREE_CREDITS,
    history: [],
    createdAt: new Date().toISOString()
  };
  await saveTelegramUser(user);
  return user;
}

async function saveTelegramUser(user) {
  const url = tgUserDocUrl(user.telegramId);
  if (!url) return;
  const fields = {};
  for (const [k, v] of Object.entries(user)) fields[k] = toFirestoreValue(v);
  await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields })
  });
}

async function askAI(messages) {
  const baseUrl = process.env.ROCKAPI_BASE_URL || 'https://api.rockapi.ru/openai/v1';
  const rockKey = process.env.ROCKAPI_KEY;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${rockKey}`
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      messages,
      temperature: 0.7
    })
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || data?.message || 'AI API error');
  return data?.choices?.[0]?.message?.content || 'Не получилось получить ответ.';
}

async function handleStart(chatId, from) {
  await getTelegramUser(from);
  await sendMessage(
    chatId,
    '👋 <b>Привет! Я NeuroPic AI.</b>\n\nМогу отвечать на вопросы, помогать с текстами, идеями, кодом и контентом.\n\nПросто напиши сообщение — я отвечу.',
    menuKeyboard()
  );
}

async function handleCallback(callback) {
  const chatId = callback.message.chat.id;
  const from = callback.from;
  const data = callback.data;
  const user = await getTelegramUser(from);

  await answerCallbackQuery(callback.id);

  if (data === 'chat') {
    return sendMessage(chatId, '🤖 <b>AI Чат</b>\n\nНапиши любой вопрос обычным сообщением, и я отвечу.', menuKeyboard());
  }

  if (data === 'image') {
    return sendMessage(chatId, '🎨 <b>Генерация картинок</b>\n\nСкоро подключим команду:\n<code>/image собака на велосипеде</code>\n\nПока доступен AI-чат.', menuKeyboard());
  }

  if (data === 'balance') {
    return sendMessage(chatId, `💎 <b>Баланс</b>\n\nУ вас осталось запросов: <b>${user.credits ?? 0}</b>`, menuKeyboard());
  }

  if (data === 'profile') {
    const username = user.username ? '@' + user.username : 'не указан';
    return sendMessage(chatId, `👤 <b>Профиль</b>\n\nИмя: <b>${user.name || 'User'}</b>\nUsername: <b>${username}</b>\nID: <code>${user.telegramId}</code>\nБаланс: <b>${user.credits ?? 0}</b>`, menuKeyboard());
  }

  if (data === 'clear') {
    user.history = [];
    await saveTelegramUser(user);
    return sendMessage(chatId, '🧹 Память диалога очищена.', menuKeyboard());
  }
}

async function handleText(message) {
  const chatId = message.chat.id;
  const from = message.from;
  const text = (message.text || '').trim();

  if (text === '/start') return handleStart(chatId, from);
  if (text === '/menu') return handleStart(chatId, from);
  if (text === '/clear') {
    const user = await getTelegramUser(from);
    user.history = [];
    await saveTelegramUser(user);
    return sendMessage(chatId, '🧹 Память диалога очищена.', menuKeyboard());
  }

  const user = await getTelegramUser(from);
  if ((user.credits ?? 0) <= 0) {
    return sendMessage(chatId, '💎 Бесплатные запросы закончились. Скоро добавим пополнение баланса.', menuKeyboard());
  }

  const history = Array.isArray(user.history) ? user.history.slice(-12) : [];
  const messages = [
    {
      role: 'system',
      content: 'Ты NeuroPic AI — дружелюбный ИИ-помощник. Отвечай на русском, если пользователь пишет на русском. Отвечай понятно, кратко и полезно.'
    },
    ...history,
    { role: 'user', content: text }
  ];

  const reply = await askAI(messages);
  const updatedHistory = [...history, { role: 'user', content: text }, { role: 'assistant', content: reply }].slice(-16);

  user.history = updatedHistory;
  user.credits = Math.max(0, Number(user.credits ?? FREE_CREDITS) - 1);
  user.updatedAt = new Date().toISOString();
  await saveTelegramUser(user);

  await sendMessage(chatId, reply, menuKeyboard());
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true, message: 'NeuroPic Telegram webhook is active' });

  try {
    const update = req.body;

    if (update.callback_query) {
      await handleCallback(update.callback_query);
      return res.status(200).json({ ok: true });
    }

    if (update.message?.text) {
      await handleText(update.message);
      return res.status(200).json({ ok: true });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Telegram webhook error:', error);
    try {
      const chatId = req.body?.message?.chat?.id || req.body?.callback_query?.message?.chat?.id;
      if (chatId) await sendMessage(chatId, 'Ошибка на сервере. Попробуйте ещё раз чуть позже.');
    } catch (_) {}
    return res.status(200).json({ ok: false, error: String(error?.message || error) });
  }
}
