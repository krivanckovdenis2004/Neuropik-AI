# NeuroPic AI — первая версия сайта

## Что внутри
- React + Vite
- Черный фон + зеленый неон
- RU / EN переключатель
- Главная, AI чат, генератор изображений, история, тарифы, профиль
- Демо-регистрация через localStorage
- 5 кредитов после регистрации
- Демо-генерация SVG-заглушки без платного API

## Запуск локально
```bash
npm install
npm run dev
```

## Деплой на Vercel
1. Залей папку в GitHub
2. Подключи репозиторий в Vercel
3. Framework: Vite
4. Build command: npm run build
5. Output directory: dist

## Следующий этап
- Firebase Auth
- Firestore users/history/credits
- API route для OpenAI/другого AI API
- Настоящая генерация изображений
- YooKassa/CryptoBot для покупки кредитов

## v6 RockAPI Chat

Добавлено:
- Vercel API route: `/api/chat`
- AI-чат через RockAPI OpenAI-compatible API
- сохранение чат-запросов в историю Firestore

Переменные Vercel:
- `ROCKAPI_KEY` — ключ RockAPI, без VITE_
- `ROCKAPI_BASE_URL` — `https://api.rockapi.ru/openai/v1`
- `ROCKAPI_CHAT_MODEL` — опционально, по умолчанию `gpt-4o-mini`

После добавления переменных обязательно сделать Redeploy.


## v8 notes
- Firebase Auth persistence fixed with browserLocalPersistence.
- Image model switched to dall-e-3 by default.
- Optional Vercel env: ROCKAPI_IMAGE_MODEL=dall-e-3 or dall-e-2.
- DALL·E 3 standard 1024x1024 costs more than 10 RUB in RockAPI, so top up balance before testing images.
