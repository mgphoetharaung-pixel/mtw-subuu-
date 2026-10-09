import { db } from './firebase-config.js';
import { doc, setDoc, deleteField, getDoc, getDocs, query, limit } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Voice Input Feature ---
window.startVoiceInput = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if(!SpeechRecognition) return window.customAlert("Voice entry not supported in this browser.", "Error");
    const recognition = new SpeechRecognition();
    recognition.lang = localStorage.getItem('mtw_lang') === 'mm' ? 'my-MM' : 'en-US';
    recognition.interimResults = false; recognition.maxAlternatives = 1; let hasResult = false;
    recognition.onstart = () => { if(window.haptic) window.haptic(); const btn = document.getElementById('voice-input-btn'); if(btn) btn.classList.add('recording-active'); window.customLoading(localStorage.getItem('mtw_lang') === 'mm' ? "စကားပြောပါ... (ဥပမာ - စားစရိတ် ၅၀၀၀)" : "Listening... (e.g., 'Food 5000')", "🎙️ Voice Scanner"); };
    recognition.onresult = (event) => {
        hasResult = true; const text = event.results[0][0].transcript.toLowerCase(); const btn = document.getElementById('voice-input-btn'); if(btn) btn.classList.remove('recording-active'); window.closeCustomModal();
        let myanmarToEn = {'၀':'0','၁':'1','၂':'2','၃':'3','၄':'4','၅':'5','၆':'6','၇':'7','၈':'8','၉':'9'};
        let engText = text.replace(/[၀-၉]/g, m => myanmarToEn[m]).replace(/,/g, '');
        let amountMatch = engText.match(/\d+/g), amount = amountMatch ? Math.max(...amountMatch.map(Number)).toString() : null;
        let matchedCat = null; (window.globalCategories||[]).forEach(c => { if(engText.includes(c.name.toLowerCase())) matchedCat = c.name; });
        const amtEl = document.getElementById('trans-amount'); if(amtEl && amount) amtEl.value = amount;
        const catEl = document.getElementById('trans-category'); if(catEl && matchedCat) catEl.value = matchedCat;
        const noteEl = document.getElementById('trans-note'); if(noteEl) noteEl.value = text;
        window.customAlert(`<b>Recognized:</b> "${text}"<br><br><b>Amount:</b> ${amount || '-'} <br><b>Category:</b> ${matchedCat || '-'}`, "✅ Voice Detected");
    };
    recognition.onerror = (event) => { const btn = document.getElementById('voice-input-btn'); if(btn) btn.classList.remove('recording-active'); window.closeCustomModal(); if (event.error !== 'no-speech') window.customAlert("Voice recognition error: " + event.error, "Error"); };
    recognition.onend = () => { const btn = document.getElementById('voice-input-btn'); if(btn) btn.classList.remove('recording-active'); if(!hasResult) window.closeCustomModal(); };
    try { recognition.start(); } catch(e) { console.error("Voice Error: ", e); }
};

// --- AI Receipt Scanner ---

// 🌟 Image file → compressed base64 Data URL
// (Firebase Storage မသုံးနိုင်လို့ Firestore doc ထဲ base64 အဖြစ် သိမ်းခြင်း —
//  doc size limit 1MB ကြောင့် canvas နဲ့ ချုံ့ပြီးမှ သိမ်းရမည်)
window.compressImageFile = (file, maxDim = 900, quality = 0.65) => {
    return new Promise((resolve, reject) => {
        if (!file || !file.type.startsWith('image/')) return reject(new Error('Not an image file.'));
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the file.'));
        reader.onload = (e) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Unsupported or corrupted image.'));
            img.onload = () => {
                try {
                    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
                    const w = Math.max(1, Math.round(img.width * scale));
                    const h = Math.max(1, Math.round(img.height * scale));
                    const canvas = document.createElement('canvas');
                    canvas.width = w;
                    canvas.height = h;
                    const ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, w, h);
                    ctx.drawImage(img, 0, 0, w, h);
                    resolve(canvas.toDataURL('image/jpeg', quality));
                } catch (err) {
                    reject(err);
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
};

window.handleReceiptSelection = (input) => { if(!input.files || !input.files[0]) return; if(!window.isProUser()) { input.value = ""; return window.showProPaymentDialog(); } window.currentReceiptFile = input.files[0]; const reader = new FileReader(); reader.onload = (e) => { const img = document.getElementById('receipt-preview-img'); if(img) img.src = e.target.result; const box = document.getElementById('receipt-preview-box'); if(box) box.style.display = 'block'; const fn = document.getElementById('receipt-file-name'); if(fn) fn.innerText = window.currentReceiptFile.name; }; reader.readAsDataURL(window.currentReceiptFile); };
window.removeReceipt = () => { window.currentReceiptFile = null; window.currentReceiptUrl = null; const box = document.getElementById('receipt-preview-box'); if(box) box.style.display = 'none'; const img = document.getElementById('receipt-preview-img'); if(img) img.src = ''; const fn = document.getElementById('receipt-file-name'); if(fn) fn.innerText = 'Attach Receipt Image'; const tf = document.getElementById('trans-receipt-file'); if(tf) tf.value = ''; };
window.scanReceiptPrompt = () => { if(!window.isProUser()) return window.showProPaymentDialog(); const ci = document.getElementById('camera-input'); if(ci) ci.click(); };
window.scanReceipt = async (input) => {
    if(!input.files || !input.files[0]) return;
    const file = input.files[0];
    input.value = "";
    window.customLoading("Starting AI Scanner...");
    try {
        let dataUrl = null;
        try { dataUrl = await window.compressImageFile(file, 1024, 0.75); } catch(e) { dataUrl = null; }
        if (dataUrl && window.geminiScanReceipt && window.getGeminiKey && window.getGeminiKey()) {
            window.customLoading("🤖 Gemini Vision is reading your receipt...");
            const info = await window.geminiScanReceipt(dataUrl, window.globalCategories || []);
            if (info && (info.amount || info.merchant)) {
                if (info.type === 'Income' || info.type === 'Expense') window.setTransactionType(info.type);
                if (info.amount) { const a = document.getElementById('trans-amount'); if (a) a.value = info.amount; }
                if (info.date && /^\d{4}-\d{2}-\d{2}$/.test(info.date)) {
                    const d = document.getElementById('trans-date');
                    if (d && info.date <= window.getLocalToday()) d.value = info.date;
                }
                if (info.category) {
                    const c = document.getElementById('trans-category');
                    if (c && [...c.options].some(o => o.value === info.category)) c.value = info.category;
                }
                if (info.merchant) { const n = document.getElementById('trans-note'); if (n && !n.value) n.value = info.merchant; }
                window.closeCustomModal();
                window.customAlert(`🤖 <b>Gemini scanned your receipt!</b><br><br><b>Amount:</b> ${info.amount ? Number(info.amount).toLocaleString() : '—'}<br><b>Date:</b> ${info.date || '—'}<br><b>Merchant:</b> ${info.merchant || '—'}<br><b>Category:</b> ${info.category || '—'}<br><br><small>Please review before saving.</small>`, "AI Scanner");
                return;
            }
        }
        if(typeof Tesseract === 'undefined'){
            await new Promise((resolve,reject)=>{
                const script=document.createElement('script');
                script.src="https://cdn.jsdelivr.net/npm/tesseract.js@4/dist/tesseract.min.js";
                script.onload=resolve;
                script.onerror=()=>reject(new Error("Failed to load AI scanner"));
                document.head.appendChild(script);
            });
        }
        window.customLoading("AI is reading receipt...");
        const result = await Tesseract.recognize(file,'eng');
        const text = result.data.text;
        const matches = text.match(/\b\d{1,3}(,\d{3})*(\.\d{1,2})?\b|\b\d+\b/g);
        if(matches){
            let maxAmount=0;
            matches.forEach(m=>{
                const num=parseFloat(m.replace(/,/g,''));
                if(!isNaN(num)&&num<100000000&&num>maxAmount&&num!==2024&&num!==2025&&num!==2026) maxAmount=num;
            });
            if(maxAmount>0){
                const amtEl = document.getElementById('trans-amount');
                if(amtEl) amtEl.value=maxAmount;
                window.closeCustomModal();
                window.customAlert(`Scanned successfully! Detected Amount: <b>${maxAmount.toLocaleString()}</b>`,"AI Scanner");
            } else {
                window.closeCustomModal();
                window.customAlert("Could not detect a valid amount.");
            }
        } else {
            window.closeCustomModal();
            window.customAlert("No numbers found in the image.");
        }
    } catch(e){
        window.closeCustomModal();
        window.customAlert("Scan failed: "+e.message,"Error");
    }
};

// ==========================================
// 🌟 PDF REPORT EXPORT SYSTEM (FIXED & BEAUTIFUL DATES) 🌟
// ==========================================
window.exportAdvancedPDF = () => {
    if(window.haptic) window.haptic();
    
    // လက်ရှိရွေးထားတဲ့ လ သို့မဟုတ် နှစ်အလိုက် စာရင်းကို ဆွဲထုတ်ခြင်း
    const month = document.getElementById('report-month')?.value;
    const year = document.getElementById('report-year')?.value;
    let filtered = [];
    
    if (window.currentReportView === 'Monthly' && month) {
        filtered = window.globalTransactions.filter(t => t.month === month || (t.timestamp && String(t.timestamp).startsWith(month)));
    } else if (window.currentReportView === 'Yearly' && year) {
        filtered = window.globalTransactions.filter(t => t.month && t.month.startsWith(year));
    } else {
        filtered = window.globalTransactions;
    }
    
    if (filtered.length === 0) {
        alert("ဒေါင်းလုဒ်ဆွဲရန် စာရင်းမှတ်တမ်းမရှိသေးပါ!");
        return;
    }
    
    // ဝင်ငွေ/ထွက်ငွေ စုစုပေါင်း တွက်ချက်ခြင်း
    let totalIncome = 0;
    let totalExpense = 0;
    filtered.forEach(t => {
        if (t.type === 'Income') totalIncome += t.amount;
        else if (t.type === 'Expense') totalExpense += t.amount;
    });
    const balance = totalIncome - totalExpense;
    
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    const titleText = isMM ? "MTW SUBUU ဘဏ္ဍာရေးအစီရင်ခံစာ" : "MTW SUBUU Financial Report";
    const dateText = window.currentReportView === 'Monthly' ? (month || '') : (year || '');
    
    // PDF စာမျက်နှာအဖြစ် ပြောင်းလဲပေးမည့် Window ဖွင့်ခြင်း
    const printWindow = window.open('', '_blank');
    
    let html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <title>${titleText} - ${dateText}</title>
        <style>
            @page { size: A4; margin: 15mm; }
            @media print {
                body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                .summary-box { page-break-inside: avoid; }
                tr { page-break-inside: avoid; }
            }
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1d1d1f; margin: 0; padding: 20px; background: #ffffff; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #7C6BB0; padding-bottom: 15px; }
            .header h1 { margin: 0; font-size: 24px; color: #7C6BB0; font-weight: 800; text-transform: uppercase; }
            .header p { margin: 5px 0 0 0; color: #666; font-size: 14px; }
            .summary-box { display: flex; justify-content: space-between; background: #f2f2f7; padding: 15px; border-radius: 12px; margin-bottom: 25px; border: 1px solid #e5e5ea; }
            .summary-item { text-align: center; flex: 1; }
            .summary-item h3 { margin: 0; font-size: 12px; color: #666; text-transform: uppercase; }
            .summary-item p { margin: 8px 0 0 0; font-size: 16px; font-weight: bold; }
            .income { color: #34c759; }
            .expense { color: #ff3b30; }
            table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 10px; }
            th, td { padding: 12px 10px; text-align: left; border-bottom: 1px solid #eee; vertical-align: middle; }
            th { background-color: #f2f2f7; color: #1d1d1f; font-weight: 700; border-bottom: 2px solid #ddd; }
            tr:nth-child(even) { background-color: #fafafa; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
        </style>
    </head>
    <body>
        <div class="header">
            <h1>MTW SUBUU Pro Max</h1>
            <p>${titleText} (${dateText})</p>
            <p style="font-size:12px; color:#999;">Printed on: ${new Date().toLocaleString()}</p>
        </div>
        
        <div class="summary-box">
            <div class="summary-item">
                <h3>${isMM ? "ဝင်ငွေစုစုပေါင်း" : "Total Income"}</h3>
                <p class="income">+${totalIncome.toLocaleString()} MMK</p>
            </div>
            <div class="summary-item">
                <h3>${isMM ? "ထွက်ငွေစုစုပေါင်း" : "Total Expense"}</h3>
                <p class="expense">-${totalExpense.toLocaleString()} MMK</p>
            </div>
            <div class="summary-item">
                <h3>${isMM ? "လက်ကျန်ငွေ" : "Net Balance"}</h3>
                <p style="color: ${balance >= 0 ? '#34c759' : '#ff3b30'}">${balance.toLocaleString()} MMK</p>
            </div>
        </div>
        
        <table>
            <thead>
                <tr>
                    <th class="text-center" style="width: 70px;">${isMM ? "ရက်စွဲ" : "Date"}</th>
                    <th>${isMM ? "အမျိုးအစား" : "Category / Wallet"}</th>
                    <th>${isMM ? "မှတ်ချက်" : "Note"}</th>
                    <th>${isMM ? "ငွေစာရင်း" : "Account"}</th>
                    <th class="text-right">${isMM ? "ပမာဏ" : "Amount"}</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    filtered.forEach(t => {
        const amtColor = t.type === 'Income' ? 'income' : (t.type === 'Expense' ? 'expense' : '');
        const prefix = t.type === 'Income' ? '+' : (t.type === 'Expense' ? '-' : '');
        
        // 🌟 Date ကို ပေါ်အောက် သပ်သပ်ရပ်ရပ် ခွဲထုတ်ခြင်း 🌟
        let dateHtml = '-';
        if (t.timestamp) {
            const localTs = window.toLocalDateStr(t.timestamp) || String(t.timestamp).substring(0, 10);
            const [y, m, d] = localTs.split('-');
            const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const shortMonth = monthNames[parseInt(m) - 1];
            // အပေါ်တွင် ရက်စွဲ၊ အောက်တွင် လနှင့်နှစ် ပြမည်
            dateHtml = `<div style="text-align:center; line-height:1.3;"><b style="font-size:16px; color:#1d1d1f;">${d}</b><br><span style="font-size:11px; color:#888;">${shortMonth} ${y}</span></div>`;
        }

        html += `
            <tr>
                <td>${dateHtml}</td>
                <td><strong>${t.category || t.toAccount || 'Transfer'}</strong></td>
                <td>${t.note || '-'}</td>
                <td>${t.account || '-'}</td>
                <td class="text-right ${amtColor}"><strong>${prefix}${t.amount.toLocaleString()} MMK</strong></td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
        
        <script>
            window.onload = function() {
                // UI များကို သေချာ Render လုပ်ပြီးမှ Print ခေါ်ရန် အချိန်ဆွဲပေးခြင်း
                setTimeout(function() {
                    window.print();
                    setTimeout(function() { window.close(); }, 500);
                }, 500);
            };
        </script>
    </body>
    </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
};

// --- Excel Export ---
window.exportData = async () => {
    if(!window.isProUser()) return window.showProPaymentDialog();
    window.customLoading("Generating Excel...");
    try {
        if(typeof XLSX === 'undefined'){
            await new Promise((resolve, reject) => {
                const script = document.createElement('script'); script.src = "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js";
                script.onload = resolve; script.onerror = reject; document.head.appendChild(script);
            });
        }
        const dataForExcel = (window.globalTransactions||[]).map(t => ({ "Date": (t.timestamp || '').substring(0,10), "Type": t.type, "Category": t.category || t.toAccount || '-', "Amount": t.amount, "Note": t.note || '-' }));
        const ws = XLSX.utils.json_to_sheet(dataForExcel); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, "Transactions");
        XLSX.writeFile(wb, "MTW_SUBUU_Report.xlsx"); window.closeCustomModal();
    } catch (e) { window.closeCustomModal(); window.customAlert("Excel Export Error: " + e.message); }
};

// --- JSON Backup & Restore ---
window.exportJSON = () => { const data={transactions:window.globalTransactions, accounts:window.globalAccounts, categories:window.globalCategories, budgets:window.globalBudgets, goals:window.globalGoals, debts:window.globalDebts, currencies:window.globalCurrencies, recurring:window.globalRecurring}; const a=document.createElement('a'); a.href="data:text/json;charset=utf-8,"+encodeURIComponent(JSON.stringify(data)); a.download="MTW_SUBUU_Backup.json"; a.click(); };
window.importJSON = (input) => { const file=input.files[0]; if(!file) return; window.customConfirm("Are you sure? This will add data from the backup file.",()=>{ window.customLoading("Restoring Backup..."); const reader=new FileReader(); reader.onload=async(e)=>{ try{ const data=JSON.parse(e.target.result); const restore=async(coll,items)=>{ if(items) for(let item of items){ const {id,...rest}=item; if(id) await setDoc(doc(db,"users",window.activeUid,coll,id),rest); } }; await restore("transactions",data.transactions); await restore("accounts",data.accounts); await restore("categories",data.categories); await restore("budgets",data.budgets); await restore("recurring",data.recurring); await restore("goals",data.goals); await restore("debts",data.debts); await restore("currencies",data.currencies); window.closeCustomModal(); window.customAlert("Backup restored!"); } catch(err){ window.closeCustomModal(); window.customAlert("Restore failed: Invalid JSON format."); } }; reader.readAsText(file); }); input.value=""; };

// --- Biometrics & PIN ---
const bufferToBase64 = (buffer) => { let binary = ''; const bytes = new Uint8Array(buffer); for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]); return window.btoa(binary); };
const base64ToBuffer = (base64) => { const binary = window.atob(base64); const bytes = new Uint8Array(binary.length); for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i); return bytes.buffer; };
window.setupAppPin = () => { if(!window.isProUser()) return window.showProPaymentDialog(); const n = document.getElementById('new-pin-input'); if(n) n.value=localStorage.getItem('mtw_pin_'+window.currentUser.uid)||''; const m = document.getElementById('setup-pin-modal'); if(m) m.style.display='flex'; }; 
window.closeSetupPin = () => { const m = document.getElementById('setup-pin-modal'); if(m) m.style.display='none'; }; 
window.saveAppPin = () => { const n = document.getElementById('new-pin-input'); if(!n) return; const pin=n.value.trim(); if(pin.length!==4||isNaN(pin)) return window.customAlert("Please enter a valid 4-digit PIN."); localStorage.setItem('mtw_pin_'+window.currentUser.uid,pin); window.customAlert("PIN has been set!"); window.closeSetupPin(); }; 
window.removeAppPin = () => { localStorage.removeItem('mtw_pin_'+window.currentUser.uid); const n = document.getElementById('new-pin-input'); if(n) n.value=''; window.customAlert("PIN has been removed."); window.closeSetupPin(); };
window.setupBiometrics = async () => { if(!window.isProUser()) return window.showProPaymentDialog(); if (!window.PublicKeyCredential) return window.customAlert("Biometrics / Face ID not supported on this device or browser."); try { const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge); const userId = new Uint8Array(16); window.crypto.getRandomValues(userId); const publicKey = { challenge: challenge, rp: { name: "MTW SUBUU", id: window.location.hostname }, user: { id: userId, name: window.currentUser.email, displayName: window.currentUser.email }, pubKeyCredParams: [{ type: "public-key", alg: -7 }], authenticatorSelection: { authenticatorAttachment: "platform", userVerification: "required" }, timeout: 60000 }; const credential = await navigator.credentials.create({ publicKey }); const credId = credential.rawId ? bufferToBase64(credential.rawId) : credential.id; localStorage.setItem('mtw_bio_cred_' + window.currentUser.uid, credId); window.customAlert("Face ID / Fingerprint setup successful!"); } catch (e) { window.customAlert("Setup failed or cancelled."); } };
window.unlockWithBiometrics = async () => { if(window.haptic) window.haptic(); if (!window.PublicKeyCredential) return window.customAlert("Biometrics / Face ID not supported."); const savedCredId = localStorage.getItem('mtw_bio_cred_' + (window.currentUser ? window.currentUser.uid : '')); if (!savedCredId) return window.customAlert(localStorage.getItem('mtw_lang') === 'mm' ? "Setting ထဲတွင် မျက်နှာ / လက်ဗွေ အရင်သတ်မှတ်ပါ။" : "Please setup Face ID / Fingerprint in Settings first."); try { const challenge = new Uint8Array(32); window.crypto.getRandomValues(challenge); const publicKey = { challenge: challenge, allowCredentials: [{ type: "public-key", id: base64ToBuffer(savedCredId) }], userVerification: "required", timeout: 60000 }; const assertion = await navigator.credentials.get({ publicKey }); if (assertion) { const ps = document.getElementById('pin-screen'); if(ps) ps.style.display = 'none'; window.currentPin = ''; document.querySelectorAll('.pin-dot').forEach(d => d.classList.remove('active')); } } catch (e) {} };
window.pinDigit = (num) => { if(window.haptic) window.haptic(); if(window.currentPin.length>=4) return; window.currentPin+=num; document.querySelectorAll('.pin-dot').forEach((dot,i)=>dot.classList.toggle('active',i<window.currentPin.length)); if(window.currentPin.length===4){ setTimeout(()=>{ if(window.currentPin===localStorage.getItem('mtw_pin_'+(window.currentUser?window.currentUser.uid:''))) { const ps = document.getElementById('pin-screen'); if(ps) ps.style.display='none'; } else { if(window.haptic) window.haptic(); const pinContainer = document.querySelector('.pin-container'); if(pinContainer) { pinContainer.classList.add('shake'); setTimeout(() => pinContainer.classList.remove('shake'), 400); } window.currentPin=''; document.querySelectorAll('.pin-dot').forEach(d=>d.classList.remove('active')); } },200); } };
window.pinClear = () => { if(window.haptic) window.haptic(); window.currentPin=window.currentPin.slice(0,-1); document.querySelectorAll('.pin-dot').forEach((dot,i)=>dot.classList.toggle('active',i<window.currentPin.length)); };
window.addEventListener('keydown', (e) => { const pinScreen=document.getElementById('pin-screen'); if(pinScreen&&pinScreen.style.display!=='none'){ if(/^[0-9]$/.test(e.key)) window.pinDigit(parseInt(e.key)); else if(e.key==='Backspace'||e.key==='Delete') window.pinClear(); } });

// --- Calculator Tool ---
window.openCalculator = () => { if(window.haptic) window.haptic(); const msg = `<div class="input-group glass-panel" style="margin-top:5px; padding: 15px; border-radius: 15px;"><input type="text" id="calc-display" value="0" readonly style="font-size:26px; font-weight:800; width:100%; border:none; outline:none; background:transparent; color:var(--text-color); text-align: right; pointer-events: none; letter-spacing: 1px;"></div><div class="calc-grid"><button class="calc-btn op-btn" onclick="calcInput('C')">C</button><button class="calc-btn op-btn" onclick="calcInput('DEL')">⌫</button><button class="calc-btn op-btn" onclick="calcInput('/')">÷</button><button class="calc-btn op-btn" onclick="calcInput('*')">×</button><button class="calc-btn" onclick="calcInput('7')">7</button><button class="calc-btn" onclick="calcInput('8')">8</button><button class="calc-btn" onclick="calcInput('9')">9</button><button class="calc-btn op-btn" onclick="calcInput('-')">−</button><button class="calc-btn" onclick="calcInput('4')">4</button><button class="calc-btn" onclick="calcInput('5')">5</button><button class="calc-btn" onclick="calcInput('6')">6</button><button class="calc-btn op-btn" onclick="calcInput('+')">+</button><button class="calc-btn" onclick="calcInput('1')">1</button><button class="calc-btn" onclick="calcInput('2')">2</button><button class="calc-btn" onclick="calcInput('3')">3</button><button class="calc-btn action-btn" style="grid-row: span 2;" onclick="calcInput('=')">=</button><button class="calc-btn" style="grid-column: span 2;" onclick="calcInput('0')">0</button><button class="calc-btn" onclick="calcInput('.')">.</button></div>`; const t = document.getElementById('modal-title'); if(t) { t.innerText = "Calculator"; t.style.display = 'block'; } const m = document.getElementById('modal-message'); if(m) m.innerHTML = msg; const b = document.getElementById('modal-buttons'); if(b) b.innerHTML = `<div style="display:flex; gap:10px; margin-top: 5px;"><button class="glass-panel" onclick="closeCustomModal()" style="color:var(--text-color); border: none;">Close</button><button class="glass-panel" style="background:var(--primary-color) !important; color:white; border:none;" onclick="applyCalc()">Confirm</button></div>`; const c = document.getElementById('custom-modal'); if(c) c.style.display = 'flex'; const amt = document.getElementById('trans-amount'); window.calcValue = amt ? (amt.value || '0') : '0'; const cd = document.getElementById('calc-display'); if(cd) cd.value = window.calcValue; };
window.calcInput = (val) => { if(window.haptic) window.haptic(); const disp = document.getElementById('calc-display'); if(!disp) return; if(val === 'C') { window.calcValue = '0'; } else if (val === 'DEL') { window.calcValue = window.calcValue.length > 1 ? window.calcValue.slice(0, -1) : '0'; } else if (val === '=') { try { let expr = window.calcValue.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/[^0-9+\-*/.]/g, ''); if(expr) { let res = eval(expr); res = Math.round(res * 1000) / 1000; window.calcValue = res.toString(); } } catch(e) { window.calcValue = 'Error'; setTimeout(() => { window.calcValue = '0'; disp.value = window.calcValue; }, 1000); } } else { let displayChar = val; if(val === '*') displayChar = '×'; if(val === '/') displayChar = '÷'; if(val === '-') displayChar = '−'; if(window.calcValue === '0' && val !== '.') { window.calcValue = displayChar; } else { window.calcValue += displayChar; } } disp.value = window.calcValue; };
window.applyCalc = () => { if(window.haptic) window.haptic(); if(window.calcValue !== 'Error') { try { let expr = window.calcValue.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/[^0-9+\-*/.]/g, ''); let finalRes = eval(expr) || 0; const amt = document.getElementById('trans-amount'); if(amt) amt.value = Math.round(finalRes * 100) / 100; } catch(e) {} } window.closeCustomModal(); };

// ==========================================
// 🌟 FAMILY SYNC (Invite-code based — no Cloud Functions required) 🌟
// Invite format: MTW1.<base64url(json{u,k})>  (u = owner uid, k = owner secret code)
// Grant model: the viewer stores familyLinks.{ownerUid} = k on their OWN profile;
// the owner lists the active k in familyCodes. Firestore rules match the two.
// ==========================================
const familyIsMM = () => localStorage.getItem('mtw_lang') === 'mm';
const FAMILY_INVITE_PREFIX = 'MTW1.';
const FAMILY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const b64uEncode = (str) => btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const b64uDecode = (str) => {
    let s = String(str || '').replace(/-/g, '+').replace(/_/g, '/');
    while (s.length % 4) s += '=';
    return atob(s);
};

window.parseFamilyInvite = (raw) => {
    try {
        let token = String(raw || '').trim().replace(/\s+/g, '');
        if (!token.toUpperCase().startsWith(FAMILY_INVITE_PREFIX)) return null;
        token = token.substring(FAMILY_INVITE_PREFIX.length);
        const data = JSON.parse(b64uDecode(token));
        if (!data || typeof data.u !== 'string' || !/^[A-Za-z0-9]{10,}$/.test(data.u)) return null;
        if (!data.k || !/^[A-Z2-9]{12}$/i.test(String(data.k))) return null;
        return { ownerUid: data.u, code: String(data.k).toUpperCase() };
    } catch (_) {
        return null;
    }
};

const generateFamilySecret = () => {
    const bytes = new Uint8Array(12);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes).map(b => FAMILY_CODE_ALPHABET[b % FAMILY_CODE_ALPHABET.length]).join('');
};

// Version ဟောင်းက ဂဏန်းတို (6/8 လုံး) codes ကို ငြင်းပယ်ရန် — 12 လုံး format အတိအကျသာ ခွင့်ပြု
const isValidFamilySecret = (c) => typeof c === 'string' && /^[A-Z2-9]{12}$/.test(c);

const buildFamilyInviteToken = () => {
    const uid = window.currentUser?.uid;
    const codes = (Array.isArray(window.userProfileData?.familyCodes) ? window.userProfileData.familyCodes : [])
        .filter(isValidFamilySecret);
    if (!uid || !codes.length) return '';
    return FAMILY_INVITE_PREFIX + b64uEncode(JSON.stringify({ u: uid, k: codes[0] }));
};

window.closeFamilySync = () => {
    const m = document.getElementById('family-sync-modal');
    if(m) m.style.display = 'none';
};

// Settings မှ ခေါ်သည် — PRO gate + modal ဖွင့်ခြင်း
window.showFamilySync = () => {
    if (window.haptic) window.haptic();
    if (window.isProUser && !window.isProUser()) {
        return window.showProPaymentDialog ? window.showProPaymentDialog() : null;
    }
    const m = document.getElementById('family-sync-modal');
    if (m) m.style.display = 'flex';
    window.refreshFamilySyncModal();
};

// Modal ထဲ၏ code/QR/status များကို server မှ data ဖြင့် refresh လုပ်ခြင်း
window.refreshFamilySyncModal = async () => {
    const uid = window.currentUser?.uid;
    if (!uid) return;

    const linkedUid = (window.activeUid && window.activeUid !== uid)
        ? window.activeUid
        : (localStorage.getItem('mtw_sync_uid_' + uid) || '');

    const viewBox = document.getElementById('family-viewing-box');
    const nameEl = document.getElementById('family-viewing-name');
    if (viewBox) viewBox.style.display = linkedUid ? 'block' : 'none';
    if (nameEl && linkedUid) {
        let partnerName = '';
        try {
            const names = JSON.parse(localStorage.getItem('mtw_family_names_' + uid) || '{}');
            partnerName = names[linkedUid] || '';
        } catch (_) {}
        nameEl.innerText = partnerName || linkedUid.substring(0, 10) + '…';
    }

    const codeEl = document.getElementById('my-sync-code');
    const qrEl = document.getElementById('family-qr-img');

    // ⭐ Server ထဲက familyCodes အစစ်ကို အရင်ဖတ်သည် — screen ပေါ် code နဲ့ server code
    //   မကွာစေရန် (cache/stale ပြဿနာ အမြစ်ဖြတ်)။ မရှိမှသာ အသစ်ဖန်တီးသည်။
    //   Version ဟောင်း ဂဏန်းတို codes ပါလာပါက အလိုအလျောက် 12-လုံး အသစ်ထုတ်သည် (migration)။
    let activeCodes = null;
    try {
        const snap = await getDoc(doc(db, 'users', uid));
        const serverCodes = snap.exists() ? snap.data().familyCodes : null;
        const validCodes = Array.isArray(serverCodes) ? serverCodes.filter(isValidFamilySecret) : [];
        if (validCodes.length > 0) {
            activeCodes = validCodes;
            // ပုံစံဟောင်း codes ပါဝင်နေပါက ရှင်းလင်းပြီး ပြန်သိမ်းသည်
            if (validCodes.length !== serverCodes.length) {
                await setDoc(doc(db, 'users', uid), {
                    familyCodes: validCodes,
                    updatedAt: new Date().toISOString()
                }, { merge: true });
            }
        } else {
            const freshCode = generateFamilySecret();
            await setDoc(doc(db, 'users', uid), {
                familyCodes: [freshCode],
                updatedAt: new Date().toISOString()
            }, { merge: true });
            activeCodes = [freshCode];
        }
        window.userProfileData = { ...(window.userProfileData || {}), familyCodes: activeCodes };
    } catch (e) {
        console.error('familyCodes load/save failed:', e);
        if (codeEl) codeEl.innerText = familyIsMM() ? 'ကုဒ် ယာယီမရနိုင်ပါ' : 'Code unavailable';
        if (qrEl) qrEl.src = '';
        return;
    }

    const token = buildFamilyInviteToken();
    if (codeEl) codeEl.innerText = token || '…';
    if (qrEl) qrEl.src = token ? `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(token)}` : '';
};

window.copySyncCode = async () => {
    const token = String(document.getElementById('my-sync-code')?.innerText || '');
    if (!token || token === '…') return;
    try {
        await navigator.clipboard.writeText(token);
    } catch (_) {
        const ta = document.createElement('textarea');
        ta.value = token;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); } catch (_) {}
        ta.remove();
    }
    window.customAlert(familyIsMM() ? 'Invite code ကူးယူပြီးပါပြီ။' : 'Invite code copied!', '✅');
};

// ကုဒ်အသစ် ထုတ်ခြင်း — ကုဒ်ဟောင်းဖြင့် ချိတ်ထားသူ အားလုံး access ပျက်သည်
window.regenerateFamilyCode = () => {
    const uid = window.currentUser?.uid;
    if (!uid) return;
    const mm = familyIsMM();
    window.customConfirm(
        mm ? "ကုဒ်အသစ် ထုတ်မလား? ကုဒ်ဟောင်းဖြင့် ချိတ်ဆက်ထားသူ အားလုံး ကြည့်၍ မရတော့ပါ။"
           : "Generate a new code? Everyone connected with your old code will lose access.",
        async () => {
            window.customLoading(mm ? "ပြင်နေပါသည်..." : "Updating...");
            try {
                await setDoc(doc(db, 'users', uid), {
                    familyCodes: [generateFamilySecret()],
                    updatedAt: new Date().toISOString()
                }, { merge: true });
                window.closeCustomModal();
                window.customAlert(mm ? "ကုဒ်အသစ် ရရှိပါပြီ။" : "New code generated!", '✅');
                window.refreshFamilySyncModal();
            } catch (e) {
                window.closeCustomModal();
                window.customAlert('Error: ' + e.message);
            }
        }
    );
};

window.connectFamily = async () => {
    const uid = window.currentUser?.uid;
    if (!uid) return;
    const mm = familyIsMM();

    const parsed = window.parseFamilyInvite(document.getElementById('partner-sync-code')?.value);
    if (!parsed) return window.customAlert(mm
        ? "Invite code မမှန်ပါ။ MTW1.… စတင်သော စာသားအပြည့်အစုံကို ကူးထည့်ပါ။"
        : "Invalid invite code. Paste the full MTW1.… string.");
    if (parsed.ownerUid === uid) return window.customAlert(mm
        ? "ကိုယ့်ကိုယ်ကိုယ် ချိတ်ဆက်လို့ မရပါ။"
        : "You cannot connect to your own invite.");

    window.customLoading(mm ? "ချိတ်ဆက်နေပါသည်..." : "Connecting...");
    try {
        // ကိုယ့် profile ကို အရင်ဖတ် → familyLinks map အပြည့်အစုံ ပြန်ရေးသည်
        const before = await getDoc(doc(db, 'users', uid));
        const currentLinks = (before.exists() && before.data()?.familyLinks) || {};
        const newLinks = { ...currentLinks, [parsed.ownerUid]: parsed.code };

        await setDoc(doc(db, 'users', uid), {
            familyLinks: newLinks,
            updatedAt: new Date().toISOString()
        }, { merge: true });

        // ⭐ Write-back verification — DB ထဲ တကယ်ရောက်မှန်း ပြန်ဖတ်အတည်ပြုသည်
        let storedCode = null;
        let docExists = false;
        try {
            const selfCheck = await getDoc(doc(db, 'users', uid));
            docExists = selfCheck.exists();
            storedCode = selfCheck.data()?.familyLinks?.[parsed.ownerUid];
        } catch (_) {}
        if (storedCode !== parsed.code) {
            await new Promise(r => setTimeout(r, 1500));
            try {
                const reCheck = await getDoc(doc(db, 'users', uid));
                docExists = reCheck.exists();
                storedCode = reCheck.data()?.familyLinks?.[parsed.ownerUid];
            } catch (_) {}
        }
        if (storedCode !== parsed.code) {
            const dbg = `doc:${docExists ? 'yes' : 'NO'} · saved:${storedCode ? 'yes' : 'NO'}`;
            throw new Error(mm ? `Link သိမ်းဆည်းမှု အတည်မပြုနိုင်ပါ (${dbg})`
                               : `Family link save could not be verified (${dbg})`);
        }

        try {
            const names = JSON.parse(localStorage.getItem('mtw_family_names_' + uid) || '{}');
            names[parsed.ownerUid] = names[parsed.ownerUid] || null;
            localStorage.setItem('mtw_family_names_' + uid, JSON.stringify(names));
        } catch (_) {}

        localStorage.setItem('mtw_sync_uid_' + uid, parsed.ownerUid);
        window.activeUid = parsed.ownerUid;
        window.clearRealtimeListeners();
        window.resetGlobalData();
        window.setupRealtimeListeners();

        // Partner profile ဖတ်၍ အမည် cache လုပ်သည် (rules မှ family read ခွင့်ပြုထားသည်)
        try {
            const ownerSnap = await getDoc(doc(db, 'users', parsed.ownerUid));
            if (ownerSnap.exists()) {
                const od = ownerSnap.data();
                const displayName = od.name || od.email || null;
                const names2 = JSON.parse(localStorage.getItem('mtw_family_names_' + uid) || '{}');
                names2[parsed.ownerUid] = displayName;
                localStorage.setItem('mtw_family_names_' + uid, JSON.stringify(names2));
            }
        } catch (_) {}

        // ⭐ Verification probe — partner ၏ data ကို အမှန်တကယ် ဖတ်လို့ရမှန်း စစ်သည်
        // Stage A: owner profile doc read (isFamilyMember rules) — ဒီမှာပဲ permission ပျက်ရင် rules/deploy ပြဿနာ
        // Stage B: owner transactions query — propagation delay ဖြစ်နိုင်လို့ ၁ ခါ retry လုပ်သည်
        const sleepMs = (ms) => new Promise(r => setTimeout(r, ms));
        let probeErrInfo = '';
        let profileOk = false;
        let probeOk = false;
        try {
            await getDoc(doc(db, 'users', parsed.ownerUid));
            profileOk = true;
        } catch (pErr) {
            console.warn('Family probe (profile) failed:', pErr);
            probeErrInfo = String(pErr.code || '') + ' ' + String(pErr.message || '').slice(0, 120);
        }
        if (profileOk) {
            for (let attempt = 0; attempt < 2 && !probeOk; attempt++) {
                if (attempt) await sleepMs(1200);
                try {
                    await getDocs(query(collection(db, 'users', parsed.ownerUid, 'transactions'), limit(1)));
                    probeOk = true;
                } catch (tErr) {
                    console.warn('Family probe (transactions) failed:', tErr);
                    probeErrInfo = String(tErr.code || '') + ' ' + String(tErr.message || '').slice(0, 120);
                }
            }
        }
        if (!probeOk) {
            localStorage.removeItem('mtw_sync_uid_' + uid);
            window.activeUid = uid;
            window.clearRealtimeListeners();
            window.resetGlobalData();
            window.setupRealtimeListeners();
            window.closeCustomModal();
            const dbg = `profile:${profileOk ? 'OK' : 'DENIED'} · ${probeErrInfo || 'unknown'}`;
            const rulesHint = !profileOk && probeErrInfo.includes('permission-denied')
                ? (mm ? "<br><br>⚙️ Firestore <b>rules</b> မှာ ပြဿနာရှိနေပုံရသည် — နောက်ဆုံး rules ကို Firebase သို့ <b>deploy</b> လုပ်ထားပါ။"
                     : "<br><br>⚙️ This looks like a Firestore <b>rules</b> problem — please make sure the latest rules are <b>deployed</b> to Firebase.")
                : (mm ? "<br><br>Partner အကောင့်မှ Family Sync ကို <b>ပြန်ဖွင့်</b>ပြီး QR/Code <b>အသစ်</b> ယူ၍ ထည့်ပါ။"
                      : "<br><br>Ask your partner to <b>reopen</b> Family Sync and share a <b>fresh</b> code.");
            window.customAlert(mm
                ? `❌ Code စစ်ဆေးမှု မအောင်မြင်ပါ။<br><small style="color:var(--secondary-text);">${dbg}</small>${rulesHint}`
                : `❌ Verification failed.<br><small style="color:var(--secondary-text);">${dbg}</small>${rulesHint}`, 'Family Sync');
            return;
        }

        const inputEl = document.getElementById('partner-sync-code');
        if (inputEl) inputEl.value = '';
        window.closeCustomModal();
        if (window.refreshFamilySyncModal) window.refreshFamilySyncModal();
        window.customAlert(mm ? "ချိတ်ဆက်မှု အောင်မြင်ပါသည်။" : "Connected successfully!", '✅');
    } catch (e) {
        window.closeCustomModal();
        console.error('connectFamily failed:', e);
        const detail = (window.familyErrorText ? window.familyErrorText(e) : (e.message || 'Connection failed.'));
        const codeLine = (e && e.code) ? `<br><small style="color:var(--secondary-text);">Code: ${String(e.code)}</small>` : '';
        window.customAlert(detail + codeLine, 'Family Sync');
    }
};

// ကိုယ် ကြည့်နေတဲ့ partner ချိတ်ဆက်မှု အားလုံး ဖြုတ်ခြင်း (ကိုယ့် doc ပေါ်မှာသာ ရေးသည်)
window.disconnectFamily = () => {
    const uid = window.currentUser?.uid;
    if (!uid) return;
    const mm = familyIsMM();
    window.customConfirm(mm ? "ချိတ်ဆက်မှု အားလုံး ဖြုတ်မလား?" : "Disconnect from all partners?", async () => {
        window.customLoading(mm ? "ဖြုတ်နေပါသည်..." : "Disconnecting...");
        try {
            await setDoc(doc(db, 'users', uid), {
                familyLinks: deleteField(),
                updatedAt: new Date().toISOString()
            }, { merge: true });
            window.closeCustomModal();
            localStorage.removeItem('mtw_sync_uid_' + uid);
            window.activeUid = uid;
            window.clearRealtimeListeners();
            window.resetGlobalData();
            window.setupRealtimeListeners();
            if (window.refreshFamilySyncModal) window.refreshFamilySyncModal();
            window.customAlert(mm ? "ဖြုတ်ပြီးပါပြီ။" : "Disconnected!");
        } catch (e) {
            window.closeCustomModal();
            window.customAlert('Error: ' + e.message);
        }
    });
};

// BarcodeDetector API ရှိမှ အလုပ်လုပ်သည် — မရှိလျှင် လက်ဖြင့်ထည့်ရန် ညွှန်းသည်
window.startFamilyScanner = () => {
    if (!('BarcodeDetector' in window)) {
        return window.customAlert(familyIsMM()
            ? "ဤစက်/ဘရောက်ဇာတွင် QR scan မထောက်ပံ့ပါ။ Invite code ကို ကူးထည့်ပါ။"
            : "QR scanning is not supported on this device. Please paste the invite code instead.");
    }
    const cameraInput = document.createElement('input');
    cameraInput.type = 'file';
    cameraInput.accept = 'image/*';
    cameraInput.capture = 'environment';
    cameraInput.onchange = async (e) => {
        const file = e.target.files && e.target.files[0];
        if (!file) return;
        window.customLoading(familyIsMM() ? "QR ဖတ်နေပါသည်..." : "Scanning QR...");
        try {
            const detector = new window.BarcodeDetector();
            const bitmap = await createImageBitmap(file);
            const results = await detector.detect(bitmap);
            const found = results.map(r => r.rawValue).find(v => window.parseFamilyInvite(v) !== null);
            window.closeCustomModal();
            const inputEl = document.getElementById('partner-sync-code');
            if (found && inputEl) {
                inputEl.value = String(found).trim();
                window.customAlert(familyIsMM() ? "QR မှ code တွေ့ရှိပါသည်။ Connect နှိပ်ပါ။" : "Invite code detected. Tap Connect.", '✅');
            } else {
                window.customAlert(familyIsMM() ? "QR ထဲတွင် Invite code မတွေ့ပါ။" : "No invite code found in the image.");
            }
        } catch (err) {
            window.closeCustomModal();
            window.customAlert("Scan failed: " + err.message, "Error");
        }
    };
    cameraInput.click();
};