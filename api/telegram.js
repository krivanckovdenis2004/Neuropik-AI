
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function initAdmin() {
  if (getApps().length) return;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey })
    });
  } else {
    initializeApp({ projectId });
  }
}

async function sendTelegram(chatId, text, keyboard = true) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const body = {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true
  };

  if (keyboard) {
    body.reply_markup = {
      keyboard: [
        [{ text: '🤖 AI Чат' }, { text: '🎨 Картинки' }],
        [{ text: '💎 Баланс' }, { text: '👤 Профиль' }],
        [{ text: '🧹 Очистить память' }, { text: '🌐 Сайт' }]
      ],
      resize_keyboard: true
    };
  }

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function askAI(messages) {
  const rockKey = process.env.ROCKAPI_KEY;
  const baseUrl = process.env.ROCKAPI_BASE_URL || 'https://api.rockapi.ru/openai/v1';

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${rockKey}`
    },
    body: JSON.stringify({
      model: process.env.ROCKAPI_CHAT_MODEL || 'gpt-4o-mini',
      messages,
      temperature: 0.7
    })
  });

  const data = await res.json();

  if (!res.ok) {
    console.error('RockAPI error:', JSON.stringify(data));
    throw new Error(data?.error?.message || data?.message || 'Ошибка AI API');
  }

  return data?.choices?.[0]?.message?.content || 'Не получилось получить ответ.';
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(200).json({ ok: true });

  try {
    initAdmin();
    const db = getFirestore();

    const msg = req.body?.message;
    if (!msg || !msg.chat || !msg.text) return res.status(200).json({ ok: true });

    const chatId = msg.chat.id;
    const telegramId = String(msg.from?.id || chatId);
    const text = String(msg.text || '').trim();

    const userRef = db.collection('telegramUsers').doc(telegramId);
    const userSnap = await userRef.get();

    if (!userSnap.exists) {
      await userRef.set({
        telegramId,
        chatId,
        firstName: msg.from?.first_name || '',
        username: msg.from?.username || '',
        requestsLeft: 20,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
      });
    } else {
      await userRef.set({
        chatId,
        firstName: msg.from?.first_name || '',
        username: msg.from?.username || '',
        updatedAt: FieldValue.serverTimestamp()
      }, { merge: true });
    }

    const freshSnap = await userRef.get();
    const user = freshSnap.data() || {};
    const left = Number(user.requestsLeft ?? 20);

    if (text === '/start' || text === 'start') {
      await sendTelegram(chatId,
`👋 <b>Привет! Я NeuroPic AI.</b>

Могу отвечать на вопросы, помогать с текстами, идеями, кодом и контентом.

Просто напишите обычное сообщение — и я отвечу.

Бесплатный лимит: <b>${left}</b> запросов.`
      );
      return res.status(200).json({ ok: true });
    }

    if (text === '🤖 AI Чат' || text.toLowerCase() === 'ai chat') {
      await sendTelegram(chatId, '🤖 Напишите любой вопрос обычным сообщением, и я отвечу.');
      return res.status(200).json({ ok: true });
    }

    if (text === '🎨 Картинки') {
      await sendTelegram(chatId,
`🎨 Генерация картинок скоро будет подключена.

Позже можно будет писать так:
/image собака на велосипеде`
      );
      return res.status(200).json({ ok: true });
    }

    if (text === '💎 Баланс') {
      await sendTelegram(chatId, `💎 Ваш баланс: <b>${left}</b> AI-запросов.`);
      return res.status(200).json({ ok: true });
    }

    if (text === '👤 Профиль') {
      await sendTelegram(chatId,
`👤 <b>Профиль</b>

ID: <code>${telegramId}</code>
Имя: ${msg.from?.first_name || 'не указано'}
Username: ${msg.from?.username ? '@' + msg.from.username : 'не указан'}
Баланс: <b>${left}</b> запросов`
      );
      return res.status(200).json({ ok: true });
    }

    if (text === '🧹 Очистить память') {
      const historySnap = await userRef.collection('messages').get();
      const batch = db.batch();
      historySnap.forEach(doc => batch.delete(doc.ref));
      await batch.commit();
      await sendTelegram(chatId, '🧹 Память диалога очищена.');
      return res.status(200).json({ ok: true });
    }

    if (text === '🌐 Сайт') {
      await sendTelegram(chatId, '🌐 Сайт NeuroPic AI:\nhttps://neuropik-ai.vercel.app');
      return res.status(200).json({ ok: true });
    }

    if (left <= 0) {
      await sendTelegram(chatId, '💎 Бесплатные запросы закончились. Скоро добавим пополнение баланса.');
      return res.status(200).json({ ok: true });
    }

    // Save user message
    await userRef.collection('messages').add({
      role: 'user',
      content: text,
      createdAt: FieldValue.serverTimestamp()
    });

    // Load last 12 messages for memory
    const histSnap = await userRef.collection('messages')
      .orderBy('createdAt', 'desc')
      .limit(12)
      .get();

    const history = [];
    histSnap.docs.reverse().forEach(doc => {
      const d = doc.data();
      if (d.role && d.content) history.push({ role: d.role, content: d.content });
    });

    const messages = [
      {
        role: 'system',
        content: 'Ты NeuroPic AI — дружелюбный русскоязычный AI-помощник. Отвечай полезно, понятно и не слишком длинно.'
      },
      ...history
    ];

    const reply = await askAI(messages);

    await userRef.collection('messages').add({
      role: 'assistant',
      content: reply,
      createdAt: FieldValue.serverTimestamp()
    });

    await userRef.set({
      requestsLeft: FieldValue.increment(-1),
      updatedAt: FieldValue.serverTimestamp()
    }, { merge: true });

    await sendTelegram(chatId, reply);
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Telegram handler error:', e);
    const chatId = req.body?.message?.chat?.id;
    if (chatId) {
      try {
        await sendTelegram(chatId, '⚠️ Ошибка обработки сообщения. Попробуйте ещё раз чуть позже.');
      } catch {}
    }
    return res.status(200).json({ ok: false, error: String(e) });
  }
}
