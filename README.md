# MTW SUBUU Pro Max

A professional and smart expense tracker designed to manage your daily finances seamlessly — built for Myanmar users with MMK (Kyat) as the default currency.

မြန်မာလို ရည်ရွယ်ချက် — နေ့စဉ် ဝင်ငွေ/ထွက်ငွေ စာရင်းများကို လွယ်ကူစွာ မှတ်တမ်းတင်နိုင်ပြီး ဘတ်ဂျက်၊ ငွေစုရည်မှန်းချက်၊ ပေါက်ဈေးနှင့် မိုးလေဝသ အချက်အလက်များကိုပါ SUBUU AI မှတဆင့် တစ်နေရာတည်းမှ စီမံနိုင်ပါသည်။

## Features

- **Expense & Income Tracking** — record transactions across multiple accounts, with transfer support
- **Budgets & Goals** — monthly budgets per category and savings goals with progress tracking
- **SUBUU AI Assistant** — chat-based assistant powered by Google Gemini
  - USD/MMK exchange rates
  - Weather forecasts
  - Monthly expense analysis and saving tips
  - Natural-language expense entry ("ထမင်း 5000 သုံးပြီး")
  - Burmese text-to-speech with native number pronunciation (e.g. 2,277,500 → "နှစ်ဆယ့်နှစ်သိန်း ခုနှစ်သောင်း ခုနှစ်ထောင် ငါးရာ")
- **Pro Subscription** — subscription workflow with admin approval
- **PWA / Offline Support** — installable app with Firestore offline persistence and service worker
- **Admin Panel** — user and subscription management (`admin.html`)

## Tech Stack

- Vanilla JavaScript (ES Modules), HTML5, CSS3
- Firebase — Authentication (Google), Firestore, Storage, Hosting
- Google Gemini API — AI chat & TTS
- PWA — manifest + service worker

## Project Structure

| File | Purpose |
|---|---|
| `index.html` | Main app entry |
| `admin.html` | Admin panel |
| `script.js` | Core app logic |
| `auth.js` | Firebase authentication |
| `database.js` | Firestore data layer |
| `features.js` | Budgets, goals, categories |
| `payment.js` | Pro subscription workflow |
| `ai-assistant.js` | SUBUU AI (chat, FX, weather, TTS, NL parsing) |
| `ui-handlers.js` | UI events and rendering |
| `firebase-config.js` | Firebase initialization |
| `sw.js` | Service worker |
| `firestore.rules` / `storage.rules` | Security rules |

## Setup

1. Create a Firebase project at https://console.firebase.google.com and enable **Google Auth**, **Firestore**, and **Storage**.
2. Update `firebase-config.js` with your Firebase web config.
3. Deploy security rules from `firestore.rules`, `storage.rules`, and `firestore.indexes.json`.
4. (Optional) Enable the AI assistant by entering your Gemini API key inside the app:
   - Type `/key YOUR_KEY` in the SUBUU AI chat, or
   - Set `localStorage.mtw_gemini_key`
5. Run locally:

```bash
npx http-server -p 8080
# or
firebase emulators:start
```

6. Deploy to Firebase Hosting:

```bash
firebase deploy
```

## Security Notes

- Never commit personal API keys. The Gemini key is entered at runtime and stored only in the browser's `localStorage`.
- The Firebase web config `apiKey` is public by design; access is protected by `firestore.rules` and `storage.rules`.

## License

All rights reserved © 2026 MTW SUBUU.
