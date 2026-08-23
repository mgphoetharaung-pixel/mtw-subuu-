import { db } from './firebase-config.js';
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const isMM = () => localStorage.getItem('mtw_lang') === 'mm';

let replyLangMM = null;
const replyMM = () => (replyLangMM !== null ? replyLangMM : isMM());
const detectReplyLang = (text) => {
    replyLangMM = /[\u1000-\u109F]/.test(String(text || '')) ? true : isMM();
};
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const FX_URL = 'https://open.er-api.com/v6/latest/USD';
const FX_TTL = 6 * 60 * 60 * 1000;
const WX_TTL = 30 * 60 * 1000;
const YANGON = { lat: 16.8661, lon: 96.1951, label: 'Yangon' };

const WMO = {
    0: ['☀️', 'Clear sky', 'ကောင်းကင် ရှင်းလင်း'],
    1: ['🌤️', 'Mostly clear', 'အများအားဖြင့် ရှင်းလင်း'],
    2: ['⛅', 'Partly cloudy', 'တိမ်အနည်းငယ်'],
    3: ['☁️', 'Cloudy', 'တိမ်များ'],
    45: ['🌫️', 'Foggy', 'မြူထူ'],
    48: ['🌫️', 'Freezing fog', 'မြူထူ အအေး'],
    51: ['🌦️', 'Light drizzle', 'မိုးစွန်း'],
    53: ['🌦️', 'Drizzle', 'မိုးစွန်း'],
    55: ['🌧️', 'Heavy drizzle', 'မိုးစွန်းသန်'],
    61: ['🌦️', 'Light rain', 'မိုးညှို့'],
    63: ['🌧️', 'Rain', 'မိုးရွာ'],
    65: ['⛈️', 'Heavy rain', 'မိုးသည်းထန်'],
    71: ['🌨️', 'Light snow', 'နှင်းအနည်းငယ်'],
    73: ['🌨️', 'Snow', 'နှင်း'],
    75: ['❄️', 'Heavy snow', 'နှင်းသည်း'],
    80: ['🌦️', 'Rain showers', 'မိုးပြောင်းပြောင်းရွာ'],
    81: ['🌧️', 'Showers', 'မိုးရွာ'],
    82: ['⛈️', 'Violent showers', 'မိုးကြမ်း'],
    95: ['⛈️', 'Thunderstorm', 'မိုးကြိုးဂြိုဟ်'],
    96: ['⛈️', 'Thunderstorm + hail', 'မိုးကြိုးဂြိုဟ် + ခဲမိုး'],
    99: ['⛈️', 'Severe thunderstorm', 'မုန်တိုင်းမိုး']
};

const monthKey = () => {
    const t = window.getLocalToday ? window.getLocalToday() : new Date().toISOString().slice(0, 10);
    return String(t).substring(0, 7);
};

const prevMonthKey = () => {
    const k = monthKey();
    const [y, m] = k.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

// ---------------- Gemini (Phase 2) ----------------
// App owner: set your Gemini API key inside the app via "/key YOUR_KEY" in SUBUU AI chat,
// or localStorage.mtw_gemini_key. Leave empty to run fully offline (rule-based AI only).
const GEMINI_API_KEY = '';
const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-3.5-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
const GEMINI_DAILY_LIMIT = 40;

window.getGeminiKey = () => (localStorage.getItem('mtw_gemini_key') || GEMINI_API_KEY || '').trim();

const geminiUsage = () => {
    try {
        const u = JSON.parse(localStorage.getItem('mtw_gemini_usage') || 'null');
        const today = new Date().toISOString().slice(0, 10);
        if (u && u.date === today) return u.count;
    } catch (e) {}
    return 0;
};

const geminiCanUse = () => {
    const key = window.getGeminiKey();
    if (!key) return false;
    return geminiUsage() < GEMINI_DAILY_LIMIT;
};

const geminiRecordUse = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('mtw_gemini_usage', JSON.stringify({ date: today, count: geminiUsage() + 1 }));
};

const geminiPost = async (key, model, body) => {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = new Error(`Gemini ${res.status}`);
        err.status = res.status;
        throw err;
    }
    const data = await res.json();
    const parts = data?.candidates?.[0]?.content?.parts || [];
    const text = parts.map((p) => p.text || '').join('').trim();
    if (!text) throw new Error('Gemini empty response');
    return text;
};

window.callGemini = async (userParts, systemText, maxTokens = 1500) => {
    const key = window.getGeminiKey();
    if (!key) throw new Error('No Gemini key');
    const base = {
        system_instruction: { parts: [{ text: systemText }] },
        contents: [{ role: 'user', parts: userParts }]
    };
    const genConfigs = [
        { temperature: 0.6, maxOutputTokens: maxTokens, thinkingConfig: { thinkingLevel: 'low' } },
        { temperature: 0.6, maxOutputTokens: maxTokens }
    ];
    let lastErr = null;
    for (const model of GEMINI_MODELS) {
        for (const gc of genConfigs) {
            try {
                const text = await geminiPost(key, model, { ...base, generationConfig: gc });
                geminiRecordUse();
                return text;
            } catch (e) {
                lastErr = e;
                if (!e.status) throw e;
                if (e.status === 400) continue;
                if (e.status === 404) break;
                throw e;
            }
        }
    }
    throw lastErr || new Error('Gemini failed');
};

const buildFinanceContext = () => {
    const s = monthStats(monthKey());
    const lines = [];
    lines.push(`Today: ${window.getLocalToday ? window.getLocalToday() : new Date().toISOString().slice(0, 10)}`);
    try {
        const fx = JSON.parse(localStorage.getItem('mtw_ai_fx_cache') || 'null');
        if (fx?.data?.rates?.MMK) lines.push(`USD/MMK rate: ${Math.round(fx.data.rates.MMK)}`);
    } catch (e) {}
    try {
        const wx = JSON.parse(localStorage.getItem('mtw_ai_wx_cache') || 'null');
        if (wx?.data) lines.push(`Weather: ${wx.data.label} ${wx.data.temp}C, rain ${wx.data.rainToday}%`);
    } catch (e) {}
    lines.push(`This month: income ${s.income}, expense ${s.expense}`);
    const top = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (top.length) lines.push(`Top expenses: ${top.map(([c, v]) => `${c} ${v}`).join(', ')}`);
    lines.push(`Total balance: ${totalBalance()}`);
    if ((window.globalBudgets || []).length) {
        const spentByCat = {};
        (window.globalTransactions || []).filter((t) => t.type === 'Expense' && txInMonth(t, monthKey())).forEach((t) => {
            spentByCat[t.category] = (spentByCat[t.category] || 0) + (Number(String(t.amount).replace(/,/g, '')) || 0);
        });
        lines.push('Budgets: ' + window.globalBudgets.map((b) => `${b.category} ${spentByCat[b.category] || 0}/${b.amount}`).join(', '));
    }
    if ((window.globalGoals || []).length) {
        lines.push('Goals: ' + window.globalGoals.map((g) => `${g.name} ${(g.savedAmount || 0)}/${g.targetAmount}`).join(', '));
    }
    if ((window.globalDebts || []).length) {
        lines.push('Debts: ' + window.globalDebts.map((d) => `${d.name} ${d.amount}`).join(', '));
    }
    return lines.join('\n');
};

const GEMINI_CHAT_SYSTEM = (mm) => `You are "SUBUU AI", the friendly assistant inside MTW SUBUU, a personal finance tracker app used in Myanmar. Currency is MMK (Kyat, "Ks").
Rules:
- Reply in ${mm ? 'Burmese (Myanmar script), simple and natural' : 'English'}.
- Be warm, concise and practical. Maximum 120 words.
- Use ONLY the financial context provided below about the user. Never invent numbers that are not in the context.
- Amounts are in Ks. Give actionable, realistic advice for Myanmar daily life.
- You may answer general questions (money tips, weather-appropriate spending, currency questions) even if the context is limited.

USER FINANCIAL CONTEXT:
${buildFinanceContext()}`;

const geminiFormat = (text) => esc(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')
    .replace(/\n/g, '<br>');

// ---------------- FX ----------------
window.fetchLiveRates = async (force = false) => {
    try {
        const cached = JSON.parse(localStorage.getItem('mtw_ai_fx_cache') || 'null');
        if (!force && cached && (Date.now() - cached.at) < FX_TTL) return cached.data;
        const res = await fetch(FX_URL);
        if (!res.ok) throw new Error('FX fetch failed');
        const data = await res.json();
        if (data && data.rates) {
            localStorage.setItem('mtw_ai_fx_cache', JSON.stringify({ at: Date.now(), data }));
            return data;
        }
        throw new Error('Bad FX payload');
    } catch (e) {
        const cached = JSON.parse(localStorage.getItem('mtw_ai_fx_cache') || 'null');
        if (cached) return cached.data;
        throw e;
    }
};

const mmkPerUnit = (fxData, code) => {
    if (!fxData || !fxData.rates) return null;
    const mmk = fxData.rates['MMK'];
    const cur = fxData.rates[String(code).toUpperCase()];
    if (!mmk || !cur) return null;
    return mmk / cur;
};

const fmtNum = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: n < 100 ? 2 : 0 });

// ---------------- Weather ----------------
const getCoords = () => {
    return new Promise((resolve) => {
        const saved = JSON.parse(localStorage.getItem('mtw_ai_geo') || 'null');
        if (saved && saved.lat) return resolve(saved);
        if (!navigator.geolocation) {
            const fb = { ...YANGON, fallback: true };
            localStorage.setItem('mtw_ai_geo', JSON.stringify(fb));
            return resolve(fb);
        }
        let done = false;
        const finish = (p) => {
            if (done) return;
            done = true;
            const val = p ? { lat: p.coords.latitude, lon: p.coords.longitude } : { ...YANGON, denied: true };
            localStorage.setItem('mtw_ai_geo', JSON.stringify(val));
            resolve(val);
        };
        setTimeout(() => finish(null), 8000);
        navigator.geolocation.getCurrentPosition(
            (pos) => finish(pos),
            () => finish(null),
            { timeout: 7000, maximumAge: 600000 }
        );
    });
};

const getCityLabel = async (lat, lon) => {
    try {
        const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
        if (!res.ok) throw new Error();
        const d = await res.json();
        return d.city || d.locality || d.principalSubdivision || YANGON.label;
    } catch (e) {
        return null;
    }
};

window.fetchWeather = async (force = false, retryGeo = false) => {
    try {
        const cached = JSON.parse(localStorage.getItem('mtw_ai_wx_cache') || 'null');
        if (!force && !retryGeo && cached && (Date.now() - cached.at) < WX_TTL) return cached.data;
        if (retryGeo) localStorage.removeItem('mtw_ai_geo');
        const c = await getCoords();
        let label = c.label || JSON.parse(localStorage.getItem('mtw_ai_wx_label') || 'null');
        if (!label || retryGeo) {
            label = (await getCityLabel(c.lat, c.lon)) || YANGON.label;
            localStorage.setItem('mtw_ai_wx_label', JSON.stringify(label));
        }
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.lat}&longitude=${c.lon}&current=temperature_2m,relative_humidity_2m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&forecast_days=3&timezone=auto`;
        const res = await fetch(url);
        if (!res.ok) throw new Error('Weather fetch failed');
        const d = await res.json();
        const data = {
            label,
            temp: Math.round(d.current.temperature_2m),
            humidity: d.current.relative_humidity_2m,
            code: d.current.weather_code,
            todayMax: Math.round(d.daily.temperature_2m_max[0]),
            todayMin: Math.round(d.daily.temperature_2m_min[0]),
            rainToday: d.daily.precipitation_probability_max[0],
            rainTomorrow: d.daily.precipitation_probability_max[1],
            tomorrowCode: d.daily.weather_code[1]
        };
        localStorage.setItem('mtw_ai_wx_cache', JSON.stringify({ at: Date.now(), data }));
        return data;
    } catch (e) {
        const cached = JSON.parse(localStorage.getItem('mtw_ai_wx_cache') || 'null');
        if (cached) return cached.data;
        return null;
    }
};

const weatherAdvice = (wx) => {
    if (!wx) return '';
    if ((wx.rainToday ?? 0) >= 50) return isMM()
        ? '☔ မိုးရွာနိုင်ခြေ များပါသည် — ထွက်ခါနီး မိုးအုံးနှင့် Taxi/Grab ကုန်ကျစရိတ် ကြိုတွက်ထားပါ။'
        : '☔ High chance of rain — bring an umbrella and budget extra for taxi rides.';
    if (wx.temp >= 35) return isMM()
        ? '🥵 ပူပြင်းပါသည် — ရေအေးဝယ်ခြင်း၊ အအေးသောက်ခြင်း ကုန်ကျစရိတ် ပေါ့ပေါ့ပါးပါး စဉ်းစားပါ။'
        : '🥵 Very hot day — small drinks/snack expenses may add up, plan ahead.';
    if (wx.temp <= 18) return isMM()
        ? '🧥 အအေးဒဏ် ရှိပါသည် — အနွေးထည် ဝယ်ယူမှု လိုအပ်နိုင်ပါသည်။'
        : '🧥 Cool day — you might need warm clothing.';
    return isMM()
        ? `😊 ရာသီဥတု ကောင်းမွန်ပါသည် (${wx.todayMin}°–${wx.todayMax}°) — နေ့စဉ်ခရီးသွားလာရန် သင့်တော်ပါသည်။`
        : `😊 Pleasant weather (${wx.todayMin}°–${wx.todayMax}°) — good day to be out.`;
};

// ---------------- Smart Cards (Home tab, FREE) ----------------
let lastRenderedLang = null;

window.renderSmartCards = () => {
    const box = document.getElementById('ai-smart-cards');
    if (!box) return;
    const mm = replyMM();
    lastRenderedLang = mm ? 'mm' : 'en';
    box.innerHTML = `
        <div class="smart-grid">
            <div class="smart-card glass-panel" onclick="refreshSmartCards(true)">
                <div class="sc-head"><i class="fa-solid fa-coins" style="color:#ffd60a;"></i><span>${mm ? 'ငွေလဲလှယ်နှုန်း' : 'Exchange'}</span></div>
                <div class="sc-main" id="sc-fx-main"><span class="sc-loading"></span></div>
                <div class="sc-sub" id="sc-fx-sub">${mm ? 'ဆွဲယူနေသည်...' : 'Loading...'}</div>
                <div class="sc-refresh-hint"><i class="fa-solid fa-rotate"></i> ${mm ? 'နှိပ်၍ ပြန်ဆွဲ' : 'Tap to refresh'}</div>
            </div>
            <div class="smart-card glass-panel" onclick="refreshSmartCards(false, true)">
                <div class="sc-head"><i class="fa-solid fa-cloud-sun" style="color:#32ade6;"></i><span id="sc-wx-city">...</span></div>
                <div class="sc-main" id="sc-wx-main"><span class="sc-loading"></span></div>
                <div class="sc-sub" id="sc-wx-advice">${mm ? 'ဆွဲယူနေသည်...' : 'Loading...'}</div>
                <div class="sc-refresh-hint"><i class="fa-solid fa-location-crosshairs"></i> ${mm ? 'နှိပ်၍ ပြန်ရှာ' : 'Tap to relocate'}</div>
            </div>
        </div>
        <button class="ai-ask-bar glass-panel" onclick="handleAIAssistantTap()">
            <span class="ai-ask-spark"><i class="fa-solid fa-wand-magic-sparkles"></i></span>
            <span id="ai-ask-text">${mm ? 'SUBUU AI ကို မေးမြန်းမည်' : 'Ask SUBUU AI'}</span>
            <span class="pro-badge-small">PRO</span>
        </button>`;
    window.paintSmartCardValues();
    window.applyAITexts();
};

window.paintSmartCardValues = () => {
    const mm = isMM();
    const fxAllowed = !!window.currentUser || !!localStorage.getItem('mtw_ai_fx_cache');
    const wxAllowed = !!window.currentUser || !!localStorage.getItem('mtw_ai_wx_cache');
    if (!fxAllowed && !wxAllowed) return;
    if (fxAllowed) window.fetchLiveRates().then((fx) => {
        const elM = document.getElementById('sc-fx-main');
        const elS = document.getElementById('sc-fx-sub');
        if (!elM || !elS || !fx) return;
        const mmk = fx.rates['MMK'];
        elM.innerHTML = mmk ? `<b>USD</b> ${fmtNum(mmk)} <small>Ks</small>` : '—';
        const userCurs = (window.globalCurrencies || []).filter((c) => c.code && c.code.toUpperCase() !== 'MMK').slice(0, 3);
        const parts = [];
        userCurs.forEach((c) => {
            const v = mmkPerUnit(fx, c.code);
            if (v) parts.push(`${esc(String(c.code).toUpperCase())} ${fmtNum(v)}`);
        });
        parts.length ? elS.textContent = parts.join(' · ') : elS.textContent = 'Reference · open.er-api.com';
    }).catch(() => {
        const elM = document.getElementById('sc-fx-main');
        const elS = document.getElementById('sc-fx-sub');
        if (elM) elM.textContent = '—';
        if (elS) elS.textContent = isMM() ? 'ချိတ်ဆက်မှု မရှိပါ' : 'Offline';
    });

    if (wxAllowed) window.fetchWeather(false, false).then((wx) => {
        const elM = document.getElementById('sc-wx-main');
        const elA = document.getElementById('sc-wx-advice');
        const elC = document.getElementById('sc-wx-city');
        if (!elM) return;
        if (!wx) {
            elM.textContent = '—';
            elA.textContent = mm ? 'ရာသီဥတု မရရှိပါ' : 'Weather unavailable';
            return;
        }
        const w = WMO[wx.code] || ['🌡️', '', ''];
        if (elC) elC.textContent = wx.label || '...';
        elM.innerHTML = `${w[0]} <b>${wx.temp}°C</b>`;
        elA.textContent = weatherAdvice(wx);
    });
};

window.refreshSmartCards = async (forceFx = false, retryGeo = false) => {
    window.haptic && window.haptic();
    if (forceFx) {
        try {
            await window.fetchLiveRates(true);
        } catch (e) { /* keep cache */ }
    }
    if (retryGeo) localStorage.removeItem('mtw_ai_wx_cache');
    window.paintSmartCardValues();
};

window.initSmartCardsData = (() => {
    let started = false;
    return () => {
        if (started || !window.currentUser) return;
        started = true;
        window.paintSmartCardValues();
        setInterval(() => window.paintSmartCardValues(), WX_TTL);
    };
})();

// ---------------- AI Chat (PRO) ----------------
let chatHistory = [];

const aiVoiceOn = () => localStorage.getItem('mtw_ai_voice') !== '0';

const extractSpeakText = (html, max = 320) => {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    let text = (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    if (text.length > max) text = text.slice(0, max) + '...';
    return text;
};

let aiAudioEl = null;

const stopAIAudio = () => {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    if (aiAudioEl) { try { aiAudioEl.pause(); } catch (e) {} aiAudioEl = null; }
};

const pickVoice = (mm) => {
    if (!('speechSynthesis' in window)) return null;
    const voices = speechSynthesis.getVoices() || [];
    return voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(mm ? 'my' : 'en-us'))
        || voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(mm ? 'mm' : 'en'))
        || null;
};

const nativeSpeak = (text) => {
    if (!('speechSynthesis' in window) || !text) return;
    const spoken = speakNumberToBurmese(String(text));
    speechSynthesis.cancel();
    const mm = isMM() || /[\u1000-\u109F]/.test(spoken);
    const u = new SpeechSynthesisUtterance(spoken);
    u.lang = mm ? 'my-MM' : 'en-US';
    const v = pickVoice(mm);
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    speechSynthesis.speak(u);
};

const ttsUsage = () => {
    try {
        const u = JSON.parse(localStorage.getItem('mtw_ai_tts_usage') || 'null');
        const today = new Date().toISOString().slice(0, 10);
        if (u && u.date === today) return u.count;
    } catch (e) {}
    return 0;
};

const TTS_DAILY_LIMIT = 30;

const MM_DIGIT_WORDS = ['သုံည', 'တစ်', 'နှစ်', 'သုံး', 'လေး', 'ငါး', 'ခြောက်', 'ခုနှစ်', 'ရှစ်', 'ကိုး'];
const MM_UNITS = [[100000, 'သိန်း'], [10000, 'သောင်း'], [1000, 'ထောင်'], [100, 'ရာ'], [10, 'ဆယ်']];

const compoundTens = (q) => {
    const tens = Math.floor(q / 10);
    const ones = q % 10;
    return ones > 0 ? (MM_DIGIT_WORDS[tens] + 'ဆယ့်' + MM_DIGIT_WORDS[ones]) : (MM_DIGIT_WORDS[tens] + 'ဆယ်');
};

const numberToBurmese = (n) => {
    n = Math.round(Number(n) || 0);
    if (n < 0) return 'အနုတ် ' + numberToBurmese(-n);
    if (n === 0) return MM_DIGIT_WORDS[0];
    let out = '';
    for (const [val, word] of MM_UNITS) {
        const q = Math.floor(n / val);
        if (q > 0) {
            out += (q >= 100 ? numberToBurmese(q) : (q >= 10 ? compoundTens(q) : MM_DIGIT_WORDS[q])) + word + ' ';
            n -= q * val;
        }
    }
    if (n > 0) out += n >= 10 ? compoundTens(n) : MM_DIGIT_WORDS[n];
    return out.trim();
};

const speakNumberToBurmese = (text) => {
    if (!/[\u1000-\u109F]/.test(text)) return text;
    let t = String(text)
        .replace(/\bAI\b/g, ' အေအိုင် ')
        .replace(/Ks\b/gi, ' ကျပ် ')
        .replace(/MMK\b/gi, ' ကျပ် ')
        .replace(/%/g, ' ရာခိုင်နှုန်း ')
        .replace(/°C/g, ' ဒီဂရီ ');
    t = t.replace(/\d{1,3}(?:[,.\u00A0\u202F\u2009\u2007' ]\d{3})+|\d+(?:\.\d+)?|\d/g, (m) => {
        if (/[,.\u00A0\u202F\u2009\u2007' ]\d{3}/.test(m)) {
            const n = parseInt(m.replace(/[^\d]/g, ''), 10);
            return isNaN(n) ? m : ' ' + numberToBurmese(n) + ' ';
        }
        if (m.indexOf('.') > -1) {
            const parts = m.split('.');
            const ip = parseInt(parts[0] || '0', 10);
            if (isNaN(ip)) return m;
            let spoken = ' ' + numberToBurmese(ip);
            if (parts[1]) spoken += ' ဒဿမ ' + parts[1].split('').map((d) => MM_DIGIT_WORDS[Number(d)] || d).join(' ');
            return spoken + ' ';
        }
        const n = parseInt(m, 10);
        return isNaN(n) ? m : ' ' + numberToBurmese(n) + ' ';
    });
    return t.replace(/\s+/g, ' ').trim();
};

const ttsCanUse = () => !!window.getGeminiKey() && ttsUsage() < TTS_DAILY_LIMIT;

const ttsRecord = () => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('mtw_ai_tts_usage', JSON.stringify({ date: today, count: ttsUsage() + 1 }));
};

const geminiTTS = async (text) => {
    const key = window.getGeminiKey();
    if (!key) throw new Error('No key');
    const spoken = speakNumberToBurmese(text);
    const burmese = /[\u1000-\u109F]/.test(spoken);
    const prompt = burmese
        ? `နှုတ်ဖြင့် သဘာဝကျကျ မြန်မာလို ဖတ်ပြပါ: ${spoken}`
        : `Read this aloud naturally in English: ${text}`;
    const body = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
            responseModalities: ['AUDIO'],
            speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: localStorage.getItem('mtw_ai_tts_voice') || 'Kore' } } }
        }
    };
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`TTS ${res.status}`);
    const data = await res.json();
    const part = data?.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
    if (!part || !part.inlineData || !part.inlineData.data) throw new Error('No audio');
    ttsRecord();
    const rateMatch = /rate=(\d+)/.exec(part.inlineData.mimeType || '');
    return { b64: part.inlineData.data, rate: rateMatch ? parseInt(rateMatch[1], 10) : 24000 };
};

const pcmToWavUrl = (b64, sampleRate) => {
    const bin = atob(b64);
    const len = bin.length;
    const buffer = new ArrayBuffer(44 + len);
    const view = new DataView(buffer);
    const writeStr = (offset, s) => { for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i)); };
    writeStr(0, 'RIFF');
    view.setUint32(4, 36 + len, true);
    writeStr(8, 'WAVE');
    writeStr(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeStr(36, 'data');
    view.setUint32(40, len, true);
    for (let i = 0; i < len; i++) view.setUint8(44 + i, bin.charCodeAt(i));
    return URL.createObjectURL(new Blob([buffer], { type: 'audio/wav' }));
};

const speakWithGemini = async (text) => {
    try {
        const { b64, rate } = await geminiTTS(text);
        const url = pcmToWavUrl(b64, rate);
        if (aiAudioEl) { try { aiAudioEl.pause(); } catch (e) {} }
        aiAudioEl = new Audio(url);
        await aiAudioEl.play();
    } catch (e) {
        nativeSpeak(text);
    }
};

const speakBot = (html) => {
    if (!aiVoiceOn()) return;
    const text = extractSpeakText(html);
    if (!text) return;
    if (ttsCanUse()) speakWithGemini(text);
    else nativeSpeak(text);
};

const updateVoiceBtn = () => {
    const btn = document.getElementById('ai-voice-btn');
    if (!btn) return;
    const on = aiVoiceOn();
    btn.classList.toggle('active', on);
    btn.innerHTML = on ? '<i class="fa-solid fa-volume-high"></i>' : '<i class="fa-solid fa-volume-xmark"></i>';
};

window.toggleAIVoice = () => {
    window.haptic && window.haptic();
    const on = !aiVoiceOn();
    localStorage.setItem('mtw_ai_voice', on ? '1' : '0');
    updateVoiceBtn();
    if ('speechSynthesis' in window) {
        if (!on) speechSynthesis.cancel();
        else speakBot(isMM() ? '🔊 အသံဖြေရှင်းချက် ဖွင့်လိုက်ပါပြီ' : '🔊 Voice replies turned on');
    }
};

window.handleAIAssistantTap = () => {
    window.haptic && window.haptic();
    window.openAIChat();
};

window.openAIChat = () => {
    if (!window.isProUser()) return window.showProPaymentDialog();
    const sheet = document.getElementById('ai-chat-sheet');
    const ov = document.getElementById('ai-chat-overlay');
    if (!sheet) return;
    sheet.classList.add('active');
    ov && ov.classList.add('active');
    if (!chatHistory.length) {
        botSay('မင်္ဂလာပါ 🌷 ကျွန်တော်က စုဗူး AI ပါ 🐷 ကုန်ကျစရိတ်၊ ပေါက်ဈေး၊ ရာသီဥတု — ဘာမဆို လွတ်လပ်စွာ မေးနိုင်ပါတယ်နော် 💛');
    }
    renderChips();
    setTimeout(() => {
        const inp = document.getElementById('ai-chat-input');
        inp && inp.focus();
    }, 350);
};

window.closeAIChat = () => {
    const sheet = document.getElementById('ai-chat-sheet');
    const ov = document.getElementById('ai-chat-overlay');
    sheet && sheet.classList.remove('active');
    ov && ov.classList.remove('active');
    stopAIAudio();
};

const pushMsg = (role, html) => {
    chatHistory.push({ role, html });
    const box = document.getElementById('ai-chat-messages');
    if (!box) return;
    const div = document.createElement('div');
    div.className = `msg ${role}`;
    div.innerHTML = html;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
};

const botSay = (html) => {
    pushMsg('bot', html);
    speakBot(html);
};

const showTyping = () => {
    const box = document.getElementById('ai-chat-messages');
    if (!box) return null;
    const t = document.createElement('div');
    t.className = 'msg bot typing';
    t.id = 'ai-typing';
    t.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(t);
    box.scrollTop = box.scrollHeight;
    return t;
};

const hideTyping = (el) => el && el.remove();

window.sendQuick = (text, query) => {
    window.haptic && window.haptic();
    pushMsg('user', esc(text));
    answerQuery(query || text);
};

const renderChips = () => {
    const box = document.getElementById('ai-chat-chips');
    if (!box) return;
    const mm = replyMM();
    const chips = mm
        ? [['💱 ပေါက်ဈေး', 'USD ပေါက်ဈေး ဘယ်လောက်လဲ'], ['🌦️ မိုးလေဝသ', 'ဒီနေ့ မိုးလေဝသ ဘယ်လိုလဲ'], ['📊 ဒီလစာရင်း', 'ဒီလ ကုန်ကျစရိတ် ဘယ်လောက်ရှိလဲ'], ['💡 အကြံပြုချက်', 'ငွေစုဖို့ အကြံပြုချက် ပေးပါ']]
        : [['💱 Rates', 'What is the USD rate today'], ['🌦️ Weather', 'How is the weather today'], ['📊 This Month', 'My spending this month'], ['💡 Tips', 'Give me saving tips']];
    box.innerHTML = chips.map(([label, q], i) => `<button class="ai-chip glass-panel" onclick='sendQuick(${JSON.stringify(label)}, ${JSON.stringify(q)})'>${esc(label)}</button>`).join('');
};

// ---- Finance computations ----
const txInMonth = (t, key) => (t.month || String(t.timestamp || '').substring(0, 7)) === key;

const monthStats = (key) => {
    const txs = (window.globalTransactions || []).filter((t) => txInMonth(t, key));
    let income = 0, expense = 0;
    const byCat = {};
    txs.forEach((t) => {
        const a = Number(String(t.amount).replace(/,/g, '')) || 0;
        if (t.type === 'Income') income += a;
        if (t.type === 'Expense') {
            expense += a;
            const c = t.category || 'Other';
            byCat[c] = (byCat[c] || 0) + a;
        }
    });
    return { income, expense, byCat, count: txs.length };
};

const totalBalance = () => {
    let bal = 0;
    (window.globalTransactions || []).forEach((t) => {
        const a = Number(String(t.amount).replace(/,/g, '')) || 0;
        if (t.type === 'Income') bal += a;
        if (t.type === 'Expense') bal -= a;
    });
    return bal;
};

const topCategoriesHtml = (byCat, expenseTotal) => {
    const top = Object.entries(byCat).sort((a, b) => b[1] - a[1]).slice(0, 3);
    if (!top.length) return '';
    const rows = top.map(([cat, amt]) => {
        const pct = expenseTotal > 0 ? Math.round((amt / expenseTotal) * 100) : 0;
        return `<div class="ai-mini-row"><span>${esc(cat)}</span><div class="ai-mini-bar"><i style="width:${Math.min(pct, 100)}%"></i></div><b>${amt.toLocaleString()}</b></div>`;
    }).join('');
    return `<div class="ai-block">${rows}</div>`;
};

// ---- Intent answers ----
const answerCurrency = async () => {
    const mm = replyMM();
    const t = showTyping();
    try {
        const fx = await window.fetchLiveRates();
        hideTyping(t);
        const mmk = fx?.rates?.['MMK'];
        if (!mmk) return botSay(mm ? '😔 ပေါက်ဈေး မရရှိပါ။ အင်တာနက် ချိတ်ဆက်မှု စစ်ဆေးပါ။' : '😔 Could not fetch rates. Check your connection.');
        let html = mm
            ? `💱 <b>လက်ရှိ ပေါက်ဈေး</b> (Reference)<br>💵 1 USD ≈ <b>${fmtNum(mmk)} Ks</b>`
            : `💱 <b>Live rates</b> (Reference)<br>💵 1 USD ≈ <b>${fmtNum(mmk)} Ks</b>`;
        const rows = [];
        (window.globalCurrencies || []).filter((c) => c.code && c.code.toUpperCase() !== 'MMK').slice(0, 6).forEach((c) => {
            const v = mmkPerUnit(fx, c.code);
            if (v) rows.push(`<div class="ai-mini-row"><span>${esc(String(c.code).toUpperCase())}</span><div class="ai-mini-bar"><i style="width:70%"></i></div><b>${fmtNum(v)} Ks</b></div>`);
        });
        if (rows.length) html += `<div class="ai-block">${rows.join('')}</div>`;
        html += `<small style="opacity:.6">${mm ? 'open.er-api.com မှ reference နှုန်းဖြစ်ပါသည်' : 'Reference rates from open.er-api.com'}</small>`;
        botSay(html);
    } catch (e) {
        hideTyping(t);
        botSay(isMM() ? '😔 ပေါက်ဈေး ဆွဲယူမရပါ။' : '😔 Rate service unreachable.');
    }
};

const answerWeather = async () => {
    const mm = replyMM();
    const t = showTyping();
    const wx = await window.fetchWeather(false);
    hideTyping(t);
    if (!wx) return botSay(mm ? '😔 ရာသီဥတု မရရှိပါ။ အင်တာနက် စစ်ဆေးပါ။' : '😔 Weather unavailable. Check connection.');
    const w = WMO[wx.code] || ['🌡️', '', ''];
    const wt = WMO[wx.tomorrowCode] || ['🌡️', '', ''];
    botSay(`${w[0]} <b>${esc(wx.label)}</b> — ${mm ? esc(w[2]) : esc(w[1])}, <b>${wx.temp}°C</b> (${wx.todayMin}°–${wx.todayMax}°)
        <br>🌧️ ${mm ? 'မိုးရွာနိုင်ခြေ' : 'Rain chance'}: <b>${wx.rainToday ?? '-'}%</b>
        <br><br>${weatherAdvice(wx)}
        <br><br><small>${mm ? 'မနက်ဖြန်' : 'Tomorrow'}: ${wt[0]} ${mm ? esc(wt[2]) : esc(wt[1])} · 🌧️ ${wx.rainTomorrow ?? '-'}%</small>`);
};

const answerMonthReport = () => {
    const mm = replyMM();
    const s = monthStats(monthKey());
    const net = s.income - s.expense;
    let html = mm
        ? `📊 <b>ဒီလ (${monthKey()}) အနှစ်ချုပ်</b>`
        : `📊 <b>This month (${monthKey()})</b>`;
    html += `<div class="ai-block">
        <div class="ai-mini-row"><span style="color:#32d74b;">${mm ? 'ဝင်ငွေ' : 'Income'}</span><div class="ai-mini-bar"><i style="width:${s.income + s.expense > 0 ? Math.round(s.income / (s.income + s.expense) * 100) : 0}%;background:#32d74b;"></i></div><b>+${s.income.toLocaleString()}</b></div>
        <div class="ai-mini-row"><span style="color:#ff453a;">${mm ? 'ကုန်ကျစရိတ်' : 'Expense'}</span><div class="ai-mini-bar"><i style="width:${s.income + s.expense > 0 ? Math.round(s.expense / (s.income + s.expense) * 100) : 0}%;background:#ff453a;"></i></div><b>-${s.expense.toLocaleString()}</b></div>
        <div class="ai-mini-row"><span>${mm ? 'ကွာခြားချက်' : 'Net'}</span><div class="ai-mini-bar"></div><b class="${net >= 0 ? 'text-green' : 'text-red'}">${net >= 0 ? '+' : ''}${net.toLocaleString()}</b></div>
    </div>`;
    if (Object.keys(s.byCat).length) {
        html += `<br>${mm ? '🏆 အများဆုံး သုံးစွဲမှုများ' : 'Top categories'}:` + topCategoriesHtml(s.byCat, s.expense);
    } else {
        html += `<br><small>${mm ? 'ဒီလမှာ စာရင်း မရှိသေးပါ။' : 'No transactions recorded this month yet.'}</small>`;
    }
    botSay(html);
};

const answerBalance = () => {
    const mm = replyMM();
    const b = totalBalance();
    botSay(mm
        ? `💰 <b>စုစုပေါင်း လက်ကျန် (အကောင့်အားလုံး)</b><br><span style="font-size:22px;" class="${b >= 0 ? 'text-green' : 'text-red'}"><b>${b.toLocaleString()} Ks</b></span><br><small>${mm ? 'ဝင်ငွေ − ကုန်ကျစရိတ် (Transfer များ ပေါင်းထည့်မထားပါ)' : 'Income − Expense across all time (transfers excluded)'}</small>`
        : `💰 <b>Total balance (all accounts)</b><br><span style="font-size:22px;" class="${b >= 0 ? 'text-green' : 'text-red'}"><b>${b.toLocaleString()} Ks</b></span><br><small>Income − Expense across all time (transfers excluded)</small>`);
};

const answerBudgets = () => {
    const mm = replyMM();
    if (!(window.globalBudgets || []).length) return botSay(mm ? '🎯 ဘတ်ဂျက် မသတ်မှတ်ထားပါ။ Setting → Manage Budgets မှ စတင်ပါ။' : '🎯 No budgets set. Start in Settings → Manage Budgets.');
    const key = monthKey();
    const spentByCat = {};
    (window.globalTransactions || []).filter((t) => t.type === 'Expense' && txInMonth(t, key)).forEach((t) => {
        spentByCat[t.category] = (spentByCat[t.category] || 0) + (Number(String(t.amount).replace(/,/g, '')) || 0);
    });
    const rows = window.globalBudgets.map((b) => {
        const spent = spentByCat[b.category] || 0;
        const pct = b.amount > 0 ? Math.round(spent / b.amount * 100) : 0;
        const emoji = pct >= 100 ? '🔴' : pct >= 80 ? '🟠' : '🟢';
        return `<div class="ai-mini-row"><span>${emoji} ${esc(b.category)}</span><div class="ai-mini-bar"><i style="width:${Math.min(pct, 100)}%;background:${pct >= 100 ? '#ff453a' : pct >= 80 ? '#ff9f0a' : '#32d74b'};"></i></div><b>${pct}%</b></div>`;
    }).join('');
    botSay(`${mm ? '🎯 <b>ဘတ်ဂျက် အခြေအနေ (ဒီလ)</b>' : '🎯 <b>Budget usage (this month)</b>'}<div class="ai-block">${rows}</div>`);
};

const answerGoals = () => {
    const mm = replyMM();
    if (!(window.globalGoals || []).length) return botSay(mm ? '🐷 ရည်မှန်းချက် မရှိသေးပါ။ Setting → Manage Goals မှ ထည့်ပါ။' : '🐷 No goals yet. Add one in Settings → Manage Goals.');
    const rows = window.globalGoals.map((g) => {
        const pct = g.targetAmount > 0 ? Math.min(100, Math.round((g.savedAmount || 0) / g.targetAmount * 100)) : 0;
        return `<div class="ai-mini-row"><span>🎯 ${esc(g.name)}</span><div class="ai-mini-bar"><i style="width:${pct}%;background:var(--primary-color);"></i></div><b>${pct}%</b></div>`;
    }).join('');
    botSay(`${mm ? '🐷 <b>ရည်မှန်းချက် တိုးတက်မှု</b>' : '🐷 <b>Goal progress</b>'}<div class="ai-block">${rows}</div>`);
};

const answerTips = () => {
    const mm = replyMM();
    const cur = monthStats(monthKey());
    const prev = monthStats(prevMonthKey());
    const tips = [];
    if (cur.expense === 0) {
        tips.push(mm ? '📥 ဒီလ ကုန်ကျစရိတ် မှတ်တမ်း မရှိသေးပါ — စာရင်း စတင်မှတ်ပါ၊ ကျွန်တော် วิเคราะห์ပေးပါမယ်!' : '📥 No expenses logged this month yet — start tracking and I will analyze!');
    } else {
        const top = Object.entries(cur.byCat).sort((a, b) => b[1] - a[1])[0];
        if (top) {
            const pct = Math.round(top[1] / cur.expense * 100);
            tips.push(mm
                ? `🏆 "<b>${esc(top[0])}</b>" တစ်ခုတည်း ကုန်ကျစရိတ်၏ <b>${pct}%</b> (${top[1].toLocaleString()} Ks) ဖြစ်နေပါသည် — ${pct > 40 ? 'ဒီလ လျှော့ချဖို့ အကောင်းဆုံး နေရာဖြစ်ပါသည်။' : 'ကောင်းမွန်စွာ ထိန်းညှိထားပါသည်။'}`
                : `🏆 "<b>${esc(top[0])}</b>" alone is <b>${pct}%</b> of your spending (${top[1].toLocaleString()} Ks) — ${pct > 40 ? 'the best place to cut back this month.' : 'well balanced.'}`);
        }
        if (prev.expense > 0) {
            const diff = Math.round((cur.expense - prev.expense) / prev.expense * 100);
            if (diff > 0) tips.push(mm ? `📈 ပြီးခဲ့သောလထက် <b>${diff}%</b> ပိုသုံးနေပါသည် — သတိထားပါ!` : `📈 You are spending <b>${diff}%</b> more than last month — watch out!`);
            else if (diff < 0) tips.push(mm ? `🎉 ပြီးခဲ့သောလထက် <b>${Math.abs(diff)}%</b> လျှော့သုံးနေပါသည် — အလွန်ကောင်းပါသည်!` : `🎉 You cut spending by <b>${Math.abs(diff)}%</b> vs last month — great job!`);
        }
        (window.globalBudgets || []).forEach((b) => {
            const spent = cur.byCat[b.category] || 0;
            if (b.amount > 0 && spent > b.amount) tips.push(mm ? `🔴 "${esc(b.category)}" ဘတ်ဂျက် ကျော်သွားပါပြီ (+${(spent - b.amount).toLocaleString()} Ks)` : `🔴 Budget exceeded for "${esc(b.category)}" (+${(spent - b.amount).toLocaleString()} Ks)`);
        });
        if (cur.income > 0) {
            const saveRate = Math.round((cur.income - cur.expense) / cur.income * 100);
            tips.push(mm
                ? (saveRate >= 20 ? `💪 Save rate <b>${saveRate}%</b> — ၂၀% အထက် ရှိနေပြီး သင့်တော်ပါသည်။ ဆက်လက် ထိန်းသိမ်းပါ!` : `🎯 Save rate <b>${saveRate}%</b> ဖြစ်နေပါသည် — လစဉ်ဝင်ငွေ၏ ၂၀% အနည်းဆုံး စုရန် ပန်းတိုင်ထားပါ။`)
                : (saveRate >= 20 ? `💪 Your save rate is <b>${saveRate}%</b> — above the healthy 20% mark. Keep it up!` : `🎯 Save rate is <b>${saveRate}%</b> — aim to save at least 20% of income monthly.`));
        }
        if ((window.globalGoals || []).length) {
            const g = window.globalGoals.find((x) => (x.targetAmount || 0) > (x.savedAmount || 0));
            if (g) tips.push(mm ? `🎯 "<b>${esc(g.name)}</b>" အတွက် ${(g.targetAmount - (g.savedAmount || 0)).toLocaleString()} Ks လို remaining — ဒီလ ကျန်ငွေကနေ ထည့်ကြည့်ပါ!` : `🎯 "<b>${esc(g.name)}</b>" needs ${(g.targetAmount - (g.savedAmount || 0)).toLocaleString()} Ks more — consider allocating this month's surplus.`);
        }
    }
    botSay(`${mm ? '💡 <b>သင့်အတွက် အကြံပြုချက်များ</b>' : '💡 <b>Tips for you</b>'}<br><br>• ${tips.join('<br><br>• ')}`);
};

const answerHelp = () => {
    const mm = replyMM();
    botSay(mm
        ? '🐷 <b>ကျွန်တော် ဒီလိုမျိုးတွေ ကူညီနိုင်ပါတယ်:</b><br><br>💱 "USD ပေါက်ဈေး ဘယ်လောက်လဲ"<br>🌦️ "မနက်ဖြန် မိုးရွာမလား"<br>📊 "ဒီလ ကုန်ကျစရိတ် ဘယ်လောက်လဲ"<br>💰 "လက်ကျန် ဘယ်လောက်ကျန်လဲ"<br>🎯 "ဘတ်ဂျက် ဘယ်လောက်သုံးပြီးလဲ"<br>💡 "ငွေစုနိုင်အောင် အကြံပေးပါ"'
        : '🐷 <b>Here is what I can do:</b><br><br>💱 "What is the USD rate?"<br>🌦️ "Will it rain tomorrow?"<br>📊 "My spending this month"<br>💰 "What is my balance?"<br>🎯 "Budget status"<br>💡 "Give me saving tips"');
};

const answerTipsSmart = async () => {
    if (!geminiCanUse()) return answerTips();
    const mm = replyMM();
    const t = showTyping();
    try {
        const text = await window.callGemini(
            [{ text: mm
                ? 'ကျွန်ုပ်၏ ဒီလ ငွေသုံးစွဲမှုအခြေအနေအပေါ် အခြေခံပြီး ငွေစုနိုင်ရန် အကြံပြုချက် ၃-၄ ချက် ပေးပါ။'
                : 'Based on my financial context, give me 3-4 specific, actionable saving tips this month.' }],
            GEMINI_CHAT_SYSTEM(mm), 1200);
        hideTyping(t);
        botSay(`💡 <b>${mm ? 'AI အကြံပြုချက်များ' : 'AI tips for you'}</b><br><br>${geminiFormat(text)}`);
    } catch (e) {
        hideTyping(t);
        answerTips();
    }
};

const answerSmartFallback = async (question) => {
    if (!geminiCanUse()) return answerHelp();
    const mm = replyMM();
    const t = showTyping();
    try {
        const text = await window.callGemini([{ text: question }], GEMINI_CHAT_SYSTEM(mm), 1200);
        hideTyping(t);
        botSay(geminiFormat(text));
    } catch (e) {
        hideTyping(t);
        botSay(mm
            ? '😔 ဒီအချိန်မှာ AI နဲ့ ချိတ်ဆက်မရပါ။ အင်တာနက် စစ်ဆေးပြီး ပြန်ကြိုးစားပါ။'
            : '😔 Could not reach the AI right now. Please check your connection and try again.');
    }
};

const answerQuery = (raw) => {
    const text = String(raw || '').toLowerCase();
    detectReplyLang(raw);
    stopAIAudio();
    const t = showTyping();
    setTimeout(() => {
        hideTyping(t);
        const has = (...words) => words.some((w) => text.includes(w));
        if (has('usd', 'dollar', 'exchange', 'rate', 'currency', 'eur', 'sgd', 'baht', 'thb', 'singapore', 'ပေါက်ဈေး', 'နှုန်း', 'ဒေါ်လာ', 'ငွေကြေး', 'လဲလှယ်')) return answerCurrency();
        if (has('weather', 'rain', 'temperature', 'hot', 'cold', 'forecast', 'မိုး', 'ရာသီ', 'ပူ', 'အအေး', 'နွေး')) return answerWeather();
        if (has('budget', 'ဘတ်ဂျက်')) return answerBudgets();
        if (has('goal', 'saving goal', 'ရည်မှန်း')) return answerGoals();
        if (has('balance', 'total', 'remaining money', 'လက်ကျန်', 'စုစုပေါင်း', 'ကျန်ငွေ')) return answerBalance();
        if (has('tip', 'advice', 'suggest', 'help me save', 'အကြံ', 'ညွှန်ကြား', 'စုနိုင်', 'လျှော့ချ')) return answerTipsSmart();
        if (has('month', 'report', 'spend', 'spent', 'expense', 'summary', 'ဒီလ', 'လစဉ်', 'ကုန်', 'သုံး', 'ကျသုံး', 'ကျသင့်', 'အနှစ်ချုပ်', 'စာရင်း')) return answerMonthReport();
        if (has('hi', 'hello', 'hey', 'မင်္ဂလာ', 'ဟယ်လို', 'ဟေး')) return answerHelp();
        answerSmartFallback(String(raw || ''));
    }, 450);
};

window.handleAISend = () => {
    const inp = document.getElementById('ai-chat-input');
    if (!inp) return;
    const v = inp.value.trim();
    if (!v) return;
    inp.value = '';
    if (v.toLowerCase().startsWith('/key ')) {
        const k = v.slice(5).trim();
        if (!k || k === 'clear') {
            localStorage.removeItem('mtw_gemini_key');
            return botSay(isMM() ? '🔑 API key ဖျက်လိုက်ပါပြီ။' : '🔑 API key removed.');
        }
        localStorage.setItem('mtw_gemini_key', k);
        return botSay(isMM()
            ? '🔑 API key သိမ်းပြီးပါပြီ — AI စကားပြောမှု ဖွင့်လုပ်ပြီးပါပြီ! အခု ဘာမဆို မေးကြည့်ပါ။'
            : '🔑 API key saved — full AI chat is now enabled! Try asking me anything.');
    }
    pushMsg('user', esc(v));
    answerQuery(v);
};

window.startAIVoiceInput = () => {
    window.haptic && window.haptic();
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return window.customAlert(isMM() ? 'ဤ browser တွင် voice input မထောက်ပံ့ပါ။' : 'Voice input is not supported in this browser.');
    if (window._aiRec) {
        try { window._aiRec.stop(); } catch (e) {}
        return;
    }
    stopAIAudio();
    const rec = new SR();
    window._aiRec = rec;
    rec.lang = isMM() ? 'my-MM' : 'en-US';
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    const btn = document.getElementById('ai-mic-btn');
    const setRec = (on) => { if (btn) btn.classList.toggle('recording', on); };
    rec.onstart = () => setRec(true);
    rec.onresult = (ev) => {
        const text = (ev.results[0][0].transcript || '').trim();
        const inp = document.getElementById('ai-chat-input');
        if (inp && text) {
            inp.value = text;
            window.handleAISend();
        }
    };
    rec.onerror = (ev) => {
        if (ev.error !== 'no-speech' && ev.error !== 'aborted') {
            window.customAlert(isMM() ? `🎙️ အသံဖမ်းယူမှု ချို့ယွင်း: ${ev.error}` : `🎙️ Voice error: ${ev.error}`);
        }
    };
    rec.onend = () => { setRec(false); window._aiRec = null; };
    try { rec.start(); } catch (e) { setRec(false); window._aiRec = null; }
};

// ---------------- NL Transaction Parser (PRO) ----------------
const MM_DIGITS = { '၀': '0', '၁': '1', '၂': '2', '၃': '3', '၄': '4', '၅': '5', '၆': '6', '၇': '7', '၈': '8', '၉': '9' };
const normalizeText = (txt) => String(txt || '')
    .replace(/[၀-၉]/g, (m) => MM_DIGITS[m])
    .replace(/,/g, '')
    .toLowerCase();

const extractAmount = (norm) => {
    let best = 0;
    const re = /(\d+(?:\.\d+)?)\s*(သန်း|သောင်း|ထောင်|k)?/g;
    let m;
    while ((m = re.exec(norm)) !== null) {
        let v = parseFloat(m[1]);
        if (isNaN(v)) continue;
        const mult = m[2];
        if (mult === 'သန်း') v *= 1000000;
        else if (mult === 'သောင်း') v *= 10000;
        else if (mult === 'ထောင်' || mult === 'k') v *= 1000;
        if (v > best) best = v;
    }
    return best > 0 ? Math.round(best) : null;
};

const detectTypeKeywords = (norm) => {
    if (/transfer|လွှဲ|ပို့ငွေ/.test(norm)) return 'Transfer';
    if (/salary|income|received|bonus|refund|wage|earned|လစာ|ဝင်ငွေ|ဝင်လာ|ရလာ|ဗောနပ်|ဘောနပ်|ပြန်ရ/.test(norm)) return 'Income';
    if (/spend|spent|paid|buy|bought|expense|cost|shop|သုံး|ကုန်|ကျသုံး|ကျသင့်|ဝယ်|ပေးခဲ့|စား/.test(norm)) return 'Expense';
    return null;
};

const CAT_SYNONYMS = [
    ['food', ['food', 'meal', 'lunch', 'dinner', 'breakfast', 'restaurant', 'snack', 'coffee', 'drink', 'grocery', 'ထမင်း', 'စား', 'ဟင်း', 'မုန့်', 'ကဖေး', 'ကော်ဖီ', 'အသုပ်', 'ဟိုတယ်စာ']],
    ['transport', ['transport', 'taxi', 'grab', 'bus', 'train', 'fuel', 'gasoline', 'petrol', 'car', 'fare', 'ကား', 'တွင်း', 'ခရီး', 'ဘတ်စ်', 'ဆီ', 'ခလောက်']],
    ['shopping', ['shopping', 'clothes', 'shirt', 'shoes', 'cosmetics', 'ဝယ်', 'အဝတ်', 'အထည်', 'ဇွန်း', 'ဖိနပ်']],
    ['bills', ['bill', 'recharge', 'topup', 'internet', 'wifi', 'phone', 'electricity', 'water bill', 'ဓာတ်ငွေ', 'ဖုန်း', 'အင်တာနက်', 'လျှပ်စစ်', 'ရေငွေ']],
    ['health', ['health', 'hospital', 'clinic', 'medicine', 'doctor', 'ဆေး', 'ဆရာဝန်', 'ရောဂါ']],
    ['education', ['education', 'school', 'tuition', 'course', 'book', 'ကျောင်း', 'စာအုပ်', 'သင်တန်း']],
    ['entertainment', ['game', 'movie', 'cinema', 'entertainment', 'karaoke', 'ရုပ်ရှင်', 'ဂိမ်း', 'အပန်းဖြေ']],
    ['rent', ['rent', 'house rent', 'အိမ်လခ', 'လခ']],
    ['salary', ['salary', 'wage', 'bonus', 'payroll', 'လစာ', 'လုပ်ခ', 'ဗောနပ်', 'ဘောနပ်']]
];

const matchCategory = (norm, type) => {
    const cats = window.globalCategories || [];
    let bestScore = 0;
    let best = null;
    cats.forEach((c) => {
        if (type && c.type && type !== c.type) return;
        let score = 0;
        const nameL = String(c.name || '').toLowerCase();
        if (nameL && norm.includes(nameL)) score += nameL.length + 5;
        CAT_SYNONYMS.forEach(([key, syns]) => {
            const nameRelated = syns.some((s) => nameL.includes(s) || s.includes(nameL)) || (!!nameL && nameL.includes(key));
            if (!nameRelated) return;
            syns.forEach((s) => {
                if (norm.includes(s)) score = Math.max(score, s.length + 3);
            });
        });
        if (score > bestScore) {
            bestScore = score;
            best = c;
        }
    });
    return bestScore >= 3 ? best : null;
};

const matchAccountsIn = (norm) => {
    const found = [];
    (window.globalAccounts || []).forEach((a) => {
        const n = String(a.name || '').toLowerCase();
        if (n && norm.includes(n)) found.push(a.name);
    });
    return [...new Set(found)];
};

window.parseNaturalTransaction = () => {
    window.haptic && window.haptic();
    if (!window.isProUser()) return window.showProPaymentDialog();
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const rawInput = document.getElementById('ai-smart-input');
    const raw = rawInput ? rawInput.value.trim() : '';
    if (!raw) return window.customAlert(isMM() ? 'ဥပမာ - "ထမင်း ၈၀၀၀ ကျသုံးခဲ့တယ်" လိုမျိုး ရေးပြီး ✨ နှိပ်ပါ' : 'Type something like "Lunch 8000" then tap ✨');
    const norm = normalizeText(raw);
    detectReplyLang(raw);
    const amount = extractAmount(norm);
    if (!amount) return window.customAlert(isMM() ? '😔 ပမာဏ (amount) မတွေ့ပါ။ ဥပမာ - "ထမင်း ၈၀၀၀"' : '😔 No amount detected. Try e.g. "Food 5000"');
    let type = detectTypeKeywords(norm);
    const cat = matchCategory(norm, type);
    if (cat && !type) type = cat.type;
    if (!type) type = 'Expense';
    const accsFound = matchAccountsIn(norm);

    window.setTransactionType && window.setTransactionType(type);
    const amtEl = document.getElementById('trans-amount');
    if (amtEl) amtEl.value = amount;
    const noteEl = document.getElementById('trans-note');
    if (noteEl) noteEl.value = raw;
    if (cat) {
        const catEl = document.getElementById('trans-category');
        if (catEl && [...catEl.options].some((o) => o.value === cat.name)) catEl.value = cat.name;
    }
    if (accsFound[0]) {
        const accEl = document.getElementById('trans-account');
        if (accEl && [...accEl.options].some((o) => o.value === accsFound[0])) accEl.value = accsFound[0];
    }
    if (type === 'Transfer' && accsFound[1]) {
        const toEl = document.getElementById('trans-to-account');
        if (toEl && [...toEl.options].some((o) => o.value === accsFound[1])) toEl.value = accsFound[1];
    }
    const mm = replyMM();
    const line = (label, val) => `<div style="display:flex; justify-content:space-between; padding:3px 0;"><span style="opacity:.7;">${label}</span><b>${val || '—'}</b></div>`;
    window.customAlert(`
        <div style="text-align:left; font-size:14px;">
        <p style="text-align:center; margin-bottom:10px;">✨ <b>${mm ? 'Form ဖြည့်ပြီးပါပြီ' : 'Fields auto-filled'}</b></p>
        <div class="glass-panel" style="padding:12px; border-radius:12px;">
        ${line(mm ? 'ပမာဏ' : 'Amount', amount.toLocaleString())}
        ${line(mm ? 'အမျိုးအစား' : 'Type', type)}
        ${line(mm ? 'Category' : 'Category', cat ? esc(cat.name) : '')}
        ${line(mm ? 'အကောင့်' : 'Account', esc(accsFound[0] || ''))}
        ${type === 'Transfer' ? line(mm ? 'ပြောင်းရန်' : 'To Account', esc(accsFound[1] || '')) : ''}
        </div>
        <small style="opacity:.6;">${mm ? 'မှန်ကန်မှု အတည်ပြုပြီးမှ Save နှိပ်ပါ' : 'Review the fields, then tap Save.'}</small></div>`, '✨ SUBUU AI');
    if (rawInput) rawInput.value = '';
};

// ---------------- Live Rates Update (FREE, currencies manager) ----------------
window.updateLiveRates = async () => {
    window.haptic && window.haptic();
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const curs = (window.globalCurrencies || []).filter((c) => c.code && c.code.toUpperCase() !== 'MMK');
    if (!curs.length) return window.customAlert(isMM() ? 'Update လုပ်ရန် currency မရှိပါ။' : 'No currencies to update.');
    const mm = isMM();
    window.customConfirm(
        mm ? 'Live reference နှုန်းများဖြင့် ရှိပြီးသား rates များကို အစားထိုးမလား?' : 'Replace your stored rates with live reference rates?',
        async () => {
            window.customLoading(mm ? 'နှုန်းများ ဆွဲယူနေပါသည်...' : 'Fetching live rates...');
            try {
                const fx = await window.fetchLiveRates(true);
                let updated = 0;
                const skipped = [];
                for (const c of curs) {
                    const v = mmkPerUnit(fx, c.code);
                    if (!v) {
                        skipped.push(c.code);
                        continue;
                    }
                    await updateDoc(doc(db, 'users', window.activeUid, 'currencies', c.id), { rate: Math.round(v * 100) / 100 });
                    updated++;
                }
                window.closeCustomModal();
                window.customAlert(`✅ <b>${updated}</b> ${mm ? 'ခု update ပြီးပါပြီ' : 'rate(s) updated'}${skipped.length ? `<br><small>⏭ ${esc(skipped.join(', '))}: not found in API</small>` : ''}
                <br><small style="opacity:.6;">${mm ? 'Reference နှုန်း (official) ဖြစ်ပါသည် — market နှုန်းနှင့် ကွာခြားနိုင်ပါသည်။' : 'These are official reference rates and may differ from street/market rates.'}</small>`);
            } catch (e) {
                window.closeCustomModal();
                window.customAlert(mm ? 'ဆွဲယူမရပါ။ အင်တာနက် စစ်ပါ။' : 'Could not fetch rates. Check your connection.');
            }
        }
    );
};

// ---------------- Monthly AI Report (PRO + Gemini) ----------------
window.generateAIReport = async () => {
    window.haptic && window.haptic();
    if (!window.isProUser()) return window.showProPaymentDialog();
    const mm = isMM();
    if (!geminiCanUse()) {
        return window.customAlert(mm
            ? '🤖 AI Analysis ကို အသုံးပြုရန် Gemini API key လိုအပ်ပါသည်။<br><small>App owner: aistudio.google.com မှ key ယူပြီး code ထဲ (သို့) AI chat ထဲ "/key ..." ဖြင့် ထည့်ပါ။</small>'
            : '🤖 AI Analysis requires a Gemini API key.<br><small>App owner: get a key at aistudio.google.com and set it in code (or "/key ..." in AI chat).</small>', 'AI Analysis');
    }
    const monthVal = (document.getElementById('report-month') || {}).value || monthKey();
    const s = monthStats(monthVal);
    const p = monthStats(prevMonthKey());
    if (!s.count) {
        return window.customAlert(mm ? 'ဤလအတွက် စာရင်း မရှိသေးပါ။' : 'No transactions for this month yet.', 'AI Analysis');
    }
    window.customLoading(mm ? '🤖 AI က သင့်လကို သုံးသပ်နေပါသည်...' : '🤖 AI is analyzing your month...');
    const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const [yy, mpart] = monthVal.split('-');
    const label = `${monthNames[parseInt(mpart, 10) - 1]} ${yy}`;
    const prompt = mm
        ? `ဒီလ (${label}) ငွေသုံးစွဲမှု အနှစ်ချုပ် သုံးသပ်ချက် ရေးပါ။ ပုံစံ- ၁) အနှစ်ချုပ် ၂-၃ ကြောင်း ၂) သတိထားစရာ အချက် ၃) လက်တွေ့ကျသော အကြံပြုချက် ၃ ချက်။ ဂဏန်းအချက်အလက်များကို context ကလိုက်ပါ။ ၁၅၀ စာလုံးအတွင်း။`
        : `Write a monthly financial analysis for ${label}. Structure: 1) short overview 2) things to watch out for 3) three specific actionable suggestions. Use only numbers from the context. Under 150 words.`;
    const context = `MONTH: ${label}\nThis month: income ${s.income}, expense ${s.expense}, net ${s.income - s.expense}\nTop categories: ${Object.entries(s.byCat).sort((a, b) => b[1] - a[1]).map(([c, v]) => `${c}=${v}`).join(', ') || 'none'}\nLast month: income ${p.income}, expense ${p.expense}\n${buildFinanceContext()}`;
    try {
        const text = await window.callGemini([{ text: prompt + '\n\n' + context }],
            `You are a friendly financial analyst inside MTW SUBUU app. Reply in ${mm ? 'simple natural Burmese (Myanmar script)' : 'English'}. Use the provided data only. Currency Ks.`, 1800);
        window.closeCustomModal();
        window.customAlert(`<div style="text-align:left; max-height:55vh; overflow-y:auto; font-size:14px; line-height:1.7;">🤖 <b>${mm ? `${label} — AI သုံးသပ်ချက်` : `${label} — AI Analysis`}</b><br><br>${geminiFormat(text)}</div>`, 'AI Analysis');
    } catch (e) {
        window.closeCustomModal();
        window.customAlert(mm ? '😔 AI ချိတ်ဆက်မရပါ။ နောက်ထပ် ပြန်ကြိုးစားပါ။' : '😔 Could not reach AI. Please try again.', 'AI Analysis');
    }
};

// ---------------- Gemini Vision Receipt Scan ----------------
window.geminiScanReceipt = async (dataUrl, userCategories) => {
    if (!geminiCanUse()) return null;
    const base64 = String(dataUrl).split(',')[1];
    if (!base64) return null;
    const cats = (userCategories || []).map((c) => c.name).filter(Boolean);
    const mm = isMM();
    const prompt = `This is a photo of a payment receipt/transfer screenshot (likely from Myanmar). Extract ONLY this JSON, no other text:
{"amount": number_or_null, "date": "YYYY-MM-DD"_or_null, "merchant": string_or_null, "category": one_of_${JSON.stringify(cats)}_or_null, "type": "Expense"_or_"Income"}
Rules: amount = the grand total actually paid (largest total, not phone numbers or account numbers). If uncertain, use null. ${mm ? 'Category must be from the provided list, otherwise null.' : 'Pick the closest category from the list, otherwise null.'}`;
    try {
        const text = await window.callGemini(
            [{ text: prompt }, { inline_data: { mime_type: 'image/jpeg', data: base64 } }],
            'You extract structured data from receipt photos. Reply with raw JSON only.', 1000);
        const jsonText = text.replace(/```json|```/g, '').trim();
        const obj = JSON.parse(jsonText.slice(jsonText.indexOf('{'), jsonText.lastIndexOf('}') + 1));
        return obj && (obj.amount || obj.merchant) ? obj : null;
    } catch (e) {
        return null;
    }
};

// ---------------- Text / i18n ----------------
window.applyAITexts = () => {
    const mm = isMM();
    if (lastRenderedLang !== null && lastRenderedLang !== (mm ? 'mm' : 'en')) {
        window.renderSmartCards();
        return;
    }
    const set = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
    set('ai-ask-text', mm ? 'SUBUU AI ကို မေးမြန်းမည်' : 'Ask SUBUU AI');
    const nl = document.getElementById('ai-smart-input');
    if (nl) nl.placeholder = mm ? '"ထမင်း ၈၀၀၀ ကျသုံး" — ရေးပြီး ✨ နှိပ်ပါ' : 'Try: "Lunch 8000" then tap ✨';
    const ci = document.getElementById('ai-chat-input');
    if (ci) ci.placeholder = mm ? 'မေးခွန်း ရေးပါ...' : 'Ask anything...';
    set('lbl-live-rates', mm ? 'Live နှုန်း Update လုပ်မည်' : 'Update Live Rates');
    set('ai-report-title', mm ? 'AI သုံးသပ်ချက်' : 'AI Analysis');
    set('ai-report-sub', mm ? 'ဒီလ ငွေသုံးစွဲမှုကို AI က သုံးသပ်ပေးမည်' : 'Let AI analyze this month for you');
    const sub = document.querySelector('#ai-chat-sheet .ai-bot-status');
    if (sub) sub.innerText = mm ? 'စာရင်းအကြံပေး · ပေါက်ဈေး · ရာသီဥတု' : 'Finance assistant · FX · Weather';
    if (chatHistory.length && document.getElementById('ai-chat-sheet')?.classList.contains('active')) renderChips();
};

// ---------------- Init & hooks ----------------
(() => {
    window.renderSmartCards();

    const origApplyLanguage = window.applyLanguage;
    if (origApplyLanguage) {
        window.applyLanguage = (lang) => {
            origApplyLanguage(lang);
            setTimeout(() => window.applyAITexts(), 30);
        };
    }

    const origSetupListeners = window.setupRealtimeListeners;
    if (origSetupListeners) {
        window.setupRealtimeListeners = () => {
            origSetupListeners();
            window.initSmartCardsData();
        };
    }

    const chatInput = document.getElementById('ai-chat-input');
    if (chatInput) {
        chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                window.handleAISend();
            }
        });
    }

    updateVoiceBtn();
    if ('speechSynthesis' in window) {
        speechSynthesis.getVoices();
        speechSynthesis.onvoiceschanged = () => {};
    }
})();
