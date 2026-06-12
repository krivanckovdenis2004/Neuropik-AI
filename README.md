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
