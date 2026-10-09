// ui-handlers.js - Full UI Management, Rendering & Handlers

window.globalTransactions = window.globalTransactions || [];
window.globalAccounts = window.globalAccounts || [];
window.globalCategories = window.globalCategories || [];
window.globalBudgets = window.globalBudgets || [];
window.globalRecurring = window.globalRecurring || [];
window.globalGoals = window.globalGoals || [];
window.globalDebts = window.globalDebts || [];
window.globalCurrencies = window.globalCurrencies || [];

window.myPieChart = null;
window.ioBarChart = null;
window.catTrendChart = null;
window.currentSelectedType = 'Expense';
window.currentChartType = 'Expense';
window.currentReportView = 'Monthly';
window.isEditMode = false; 
window.editId = null;
window.isRecEditMode = false; 
window.recEditId = null;
window.currentReceiptFile = null; 
window.currentReceiptUrl = null;
window.tempTime = { h: '08', m: '00', ampm: 'AM' };
window.confirmAction = null;
window.txDisplayLimit = 50;

window.haptic = () => { 
    if (navigator.vibrate) {
        navigator.vibrate(15); 
    }
};

window.isProUser = () => { 
    if (!window.userProfileData || !window.userProfileData.plan) return false; 
    const plan = String(window.userProfileData.plan).toLowerCase().trim(); 
    if (plan === 'free' || plan === 'normal' || plan === '') return false; 
    if (plan === 'lifetime') return true;
    if (window.userProfileData.expiryDate && new Date(window.userProfileData.expiryDate) < new Date()) return false;
    return true; 
};

// --- Report Dates Initializer ---
window.initReportDates = () => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    
    const rm = document.getElementById('report-month');
    if(rm && !rm.value) {
        rm.value = `${y}-${m}`;
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]; 
        const dsp = document.getElementById('display-report-month');
        if(dsp && dsp.innerText.includes('Loading')) {
            dsp.innerText = `${monthNames[today.getMonth()]} ${y}`;
        }
    }
    
    const ry = document.getElementById('report-year');
    if(ry && !ry.value) {
        ry.value = `${y}`;
        const dspy = document.getElementById('display-report-year');
        if(dspy && dspy.innerText.includes('Loading')) {
            dspy.innerText = `${y}`;
        }
    }

    const monWrap = document.getElementById('month-picker-wrapper'); 
    if(monWrap) { 
        monWrap.style.position = 'relative'; 
        monWrap.style.zIndex = '100'; 
    }
    
    const yrWrap = document.getElementById('yearly-picker-wrapper'); 
    if(yrWrap) { 
        yrWrap.style.position = 'relative'; 
        yrWrap.style.zIndex = '100'; 
    }
};

// --- Custom Modals & Alerts ---
window.customAlert = (msg, title = "MTW SUBUU") => { 
    const t = document.getElementById('modal-title'); 
    if(t) { 
        t.innerText = title; 
        t.style.display = title ? 'block' : 'none'; 
    }
    const m = document.getElementById('modal-message'); 
    if(m) m.innerHTML = msg; 
    
    const b = document.getElementById('modal-buttons'); 
    if(b) b.innerHTML = `<button class="glass-panel" style="background:var(--primary-color) !important; color:white; border:none;" onclick="closeCustomModal()">OK</button>`; 
    
    const c = document.getElementById('custom-modal'); 
    if(c) c.style.display = 'flex'; 
};

window.customLoading = (msg, title = "Please Wait") => { 
    const t = document.getElementById('modal-title'); 
    if(t) { 
        t.innerText = title; 
        t.style.display = 'block'; 
    }
    const m = document.getElementById('modal-message'); 
    if(m) m.innerHTML = msg; 
    
    const b = document.getElementById('modal-buttons'); 
    if(b) b.innerHTML = `<i class="fa-solid fa-spinner fa-spin" style="font-size:32px; color:var(--primary-color);"></i>`; 
    
    const c = document.getElementById('custom-modal'); 
    if(c) c.style.display = 'flex'; 
};

window.customConfirm = (msg, callback, title = "Confirm") => { 
    window.confirmAction = callback; 
    
    const t = document.getElementById('modal-title'); 
    if(t) { 
        t.innerText = title; 
        t.style.display = 'block'; 
    }
    const m = document.getElementById('modal-message'); 
    if(m) m.innerHTML = msg; 
    
    const b = document.getElementById('modal-buttons'); 
    if(b) b.innerHTML = `<div style="display:flex; gap:10px;"><button class="glass-panel" onclick="closeCustomModal()" style="color:var(--text-color); border: none;">Cancel</button><button class="glass-panel" style="background:var(--primary-color) !important; color:white; border:none;" onclick="executeConfirm()">Confirm</button></div>`; 
    
    const c = document.getElementById('custom-modal'); 
    if(c) c.style.display = 'flex'; 
};

window.executeConfirm = () => { 
    window.closeCustomModal(); 
    if(window.confirmAction) {
        window.confirmAction(); 
    }
};

window.closeCustomModal = () => { 
    const c = document.getElementById('custom-modal'); 
    if(c) {
        c.style.display = 'none'; 
    }
};

window.showProPaymentDialog = () => { 
    window.customAlert(`<div style="text-align:center;"><div style="background: linear-gradient(135deg, #B8A9E8, #7C6BB0); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto; box-shadow: 0 10px 20px rgba(124,107,176,0.3);"><i class="fa-solid fa-crown" style="font-size:40px; color:white;"></i></div><h3 style="font-weight: 800; color: var(--text-color); margin-bottom: 5px;">Premium Access</h3><p style="font-size:14px; color:var(--secondary-text); margin-bottom:20px;">Upgrade to PRO to unlock this feature.</p><div class="glass-panel" style="padding:15px; border-radius:16px; text-align:left;"><p style="margin-bottom:12px; font-size:14px; display: flex; align-items: center; color: var(--text-color);"><i class="fa-brands fa-viber" style="color:#7360f2; font-size: 18px; width: 30px; text-align: center;"></i> <b style="margin-right: 5px;">Viber:</b> 09 777 49 777 6</p><p style="font-size:22px; font-weight:800; color:var(--primary-color); text-align:center; margin: 5px 0; letter-spacing: 1px;">09777497776</p><p style="font-size:12px; text-align:center; color:var(--secondary-text); font-weight: 600;">👤 U Aung Htwe Naing</p></div></div>`, ""); 
};

window.showAbout = () => { 
    window.customAlert(`<div style="text-align:center;">
        <div style="background: linear-gradient(135deg, var(--primary-color), var(--primary-dark)); width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 15px auto; box-shadow: 0 10px 20px rgba(124,107,176,0.3);">
            <i class="fa-solid fa-piggy-bank" style="font-size:40px; color:white;"></i>
        </div>
        <h3 style="font-weight: 800; color: var(--text-color); margin-bottom: 5px;">MTW SUBUU Pro Max</h3>
        <p style="color:var(--text-color); font-size:14px; font-weight: 700; margin-bottom:20px; opacity: 0.9;">Version 3.2</p>
        <div class="glass-panel" style="padding:20px 15px; border-radius:16px; text-align:center;">
            <p style="margin-bottom:15px; font-size:15px; color: var(--text-color); font-weight: 600;">
                <i class="fa-solid fa-code" style="color: var(--primary-color); margin-right: 5px;"></i> Developer: Ko Aung
            </p>
            <div style="display: flex; justify-content: center; gap: 20px; margin-bottom: 10px;">
                <a href="http://www.facebook.com/daddynaing" target="_blank" style="color: #1877F2; font-size: 32px;"><i class="fa-brands fa-facebook"></i></a>
                <a href="https://t.me/sasoriaa" target="_blank" style="color: #229ED9; font-size: 32px;"><i class="fa-brands fa-telegram"></i></a>
                <a href="viber://chat?number=%2B959777497776" target="_blank" style="color: #7360f2; font-size: 32px;"><i class="fa-brands fa-viber"></i></a>
            </div>
        </div>
        <p style="font-size:12px; color:var(--text-color); font-weight: 600; margin-top: 20px; opacity: 0.8;">&copy; 2026 MTW SUBUU. All Rights Reserved.</p>
    </div>`, ""); 
};

// --- Profile & Theme ---
window.setAppProfileImage = (url) => { 
    const defaultPhoto = "https://img.icons8.com/color/512/user-male-circle--v1.png"; 
    const finalUrl = url || defaultPhoto; 
    
    const topImg = document.getElementById('top-bar-profile-img'); 
    if(topImg) topImg.src = finalUrl; 
    
    const setImg = document.getElementById('settings-profile-img'); 
    if(setImg) setImg.src = finalUrl; 
    
    const modImg = document.getElementById('modal-profile-img'); 
    if(modImg) modImg.src = finalUrl; 
};

window.openSubscription = () => { 
    const s = document.getElementById('subscription-modal'); 
    if(s) s.style.display = 'flex'; 
};

window.closeSubscription = () => { 
    const s = document.getElementById('subscription-modal'); 
    if(s) s.style.display = 'none'; 
};

window.openProfileModal = () => { 
    if (!window.currentUser) return; 
    
    const e = document.getElementById('profile-email-display'); 
    if(e) e.innerText = window.currentUser.email; 
    
    const img = document.getElementById('modal-profile-img'); 
    const planSpan = document.getElementById('profile-plan-display'); 
    
    if (window.isProUser()) { 
        if(planSpan) { 
            planSpan.innerHTML = `<i class="fa-solid fa-crown"></i> ${(window.userProfileData?.plan||'PREMIUM').toUpperCase()} MEMBER`; 
            planSpan.style.color = "var(--primary-color)"; 
        } 
        if(img) {
            img.style.border = "4px solid var(--primary-color)"; 
        }
    } else { 
        if(planSpan) { 
            planSpan.innerText = "Free Plan"; 
            planSpan.style.color = "#34c759"; 
        } 
        if(img) {
            img.style.border = "3px solid #34c759"; 
        }
    } 
    
    const p = document.getElementById('profile-modal'); 
    if(p) p.style.display = 'flex'; 
};

window.closeProfileModal = () => { 
    const p = document.getElementById('profile-modal'); 
    if(p) p.style.display = 'none'; 
};

window.openThemeColorPicker = () => { 
    if(!window.isProUser()) return window.showProPaymentDialog(); 
    
    const m = document.getElementById('theme-color-picker-modal'); 
    if(m) m.style.display = 'flex'; 
};

window.closeThemeColorPicker = () => { 
    const m = document.getElementById('theme-color-picker-modal'); 
    if(m) m.style.display = 'none'; 
};

window.setAppThemeColor = (color) => { 
    window.haptic(); 
    document.documentElement.style.setProperty('--primary-color', color); 
    
    const shadeColor = (color, percent) => { 
        let R = parseInt(color.substring(1,3),16);
        let G = parseInt(color.substring(3,5),16);
        let B = parseInt(color.substring(5,7),16); 
        
        R = parseInt(R * (100 + percent) / 100); 
        G = parseInt(G * (100 + percent) / 100); 
        B = parseInt(B * (100 + percent) / 100); 
        
        R = (R < 255) ? R : 255; 
        G = (G < 255) ? G : 255; 
        B = (B < 255) ? B : 255; 
        
        let RR = ((R.toString(16).length == 1) ? "0" + R.toString(16) : R.toString(16)); 
        let GG = ((G.toString(16).length == 1) ? "0" + G.toString(16) : G.toString(16)); 
        let BB = ((B.toString(16).length == 1) ? "0" + B.toString(16) : B.toString(16)); 
        
        return "#" + RR + GG + BB; 
    }; 
    
    document.documentElement.style.setProperty('--primary-dark', shadeColor(color, -20)); 
    
    // 🌟 Rebuild gradient + glow from the picked color (so old orange glows don't linger)
    const lightShade = shadeColor(color, 30); 
    document.documentElement.style.setProperty('--primary-gradient', `linear-gradient(135deg, ${lightShade} 0%, ${color} 100%)`); 
    const hexToRgba = (hex, alpha) => { 
        const r = parseInt(hex.substring(1,3),16), g = parseInt(hex.substring(3,5),16), b = parseInt(hex.substring(5,7),16); 
        return `rgba(${r}, ${g}, ${b}, ${alpha})`; 
    }; 
    document.documentElement.style.setProperty('--primary-shadow', 
        `0 8px 20px ${hexToRgba(color, 0.35)}, inset 0 2px 3px rgba(255, 255, 255, 0.4), inset 0 -3px 5px rgba(0, 0, 0, 0.15)`); 
    
    const meta = document.getElementById('meta-theme-color'); 
    if(meta) meta.setAttribute('content', color); 
    
    localStorage.setItem('mtw_theme_color', color); 
    
    const preview = document.getElementById('current-color-preview'); 
    if(preview) preview.style.backgroundColor = color; 
    
    window.closeThemeColorPicker(); 
    
    if(window.renderChart) {
        window.renderChart(); 
    }
};

window.openTimePickerModal = () => {
    window.haptic();
    const saved = localStorage.getItem('mtw_reminder_time');
    
    if (saved) { 
        const [t, ampm] = saved.split(' '); 
        const [h, m] = t.split(':'); 
        window.tempTime = { h, m, ampm }; 
    } else { 
        window.tempTime = { h: '08', m: '00', ampm: 'AM' }; 
    }
    
    const hours = Array.from({length: 12}, (_, i) => String(i+1).padStart(2, '0'));
    const minutes = Array.from({length: 12}, (_, i) => String(i*5).padStart(2, '0')); 
    const ampms = ['AM', 'PM'];
    
    window.renderRoller('roller-hour', hours, window.tempTime.h);
    window.renderRoller('roller-minute', minutes, window.tempTime.m);
    window.renderRoller('roller-ampm', ampms, window.tempTime.ampm);
    
    const m = document.getElementById('time-picker-modal'); 
    if(m) m.style.display = 'flex';
    
    if ("Notification" in window && Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission();
    }
};

window.renderRoller = (id, items, selectedValue) => {
    const col = document.getElementById(id);
    if(!col) return;
    
    col.innerHTML = '';
    
    items.forEach(item => {
        const div = document.createElement('div');
        div.className = 'roller-item';
        div.innerText = item;
        div.dataset.val = item;
        
        div.onclick = () => {
            const idx = items.indexOf(item);
            col.scrollTo({ top: idx * 38, behavior: 'smooth' });
        };
        col.appendChild(div);
    });
    
    setTimeout(() => {
        const index = items.indexOf(selectedValue) >= 0 ? items.indexOf(selectedValue) : 0;
        col.scrollTop = index * 38;
        window.updateRollerSelection(id);
    }, 50);
};

window.updateRollerSelection = (id) => {
    const col = document.getElementById(id);
    if(!col) return;
    
    const itemHeight = 38;
    const index = Math.round(col.scrollTop / itemHeight);
    const items = col.querySelectorAll('.roller-item');
    
    items.forEach((item, i) => {
        if(i === index) {
            item.classList.add('active');
            if(id === 'roller-hour') window.tempTime.h = item.dataset.val;
            if(id === 'roller-minute') window.tempTime.m = item.dataset.val;
            if(id === 'roller-ampm') window.tempTime.ampm = item.dataset.val;
        } else {
            item.classList.remove('active');
        }
    });
};

window.confirmTimePicker = () => { 
    window.haptic();
    const timeStr = `${window.tempTime.h}:${window.tempTime.m} ${window.tempTime.ampm}`; 
    localStorage.setItem('mtw_reminder_time', timeStr); 
    
    window.updateTimeDisplay(timeStr); 
    window.closeTimePicker(); 
    window.customAlert(`Reminder Set for ${timeStr}`, "Alarm Set");
};

window.closeTimePicker = () => { 
    const m = document.getElementById('time-picker-modal'); 
    if(m) m.style.display = 'none'; 
};

window.updateTimeDisplay = (timeStr) => { 
    const display = document.getElementById('display-time'); 
    if (display) {
        display.innerText = timeStr || '--:--'; 
    }
};

window.openTransactionSheet = () => { 
    window.haptic(); 
    const ts = document.getElementById('transaction-sheet'); 
    if(ts) ts.classList.add('active'); 
    
    const so = document.getElementById('sheet-overlay'); 
    if(so) so.classList.add('active'); 
};

window.closeTransactionSheet = () => { 
    const ts = document.getElementById('transaction-sheet'); 
    if(ts) ts.classList.remove('active'); 
    
    const so = document.getElementById('sheet-overlay'); 
    if(so) so.classList.remove('active'); 
    
    if(window.cancelEdit) {
        window.cancelEdit(); 
    }
};

window.toggleAccordion = (contentId, headerEl) => { 
    window.haptic(); 
    const content = document.getElementById(contentId); 
    const icon = headerEl.querySelector('i'); 
    
    if(!content) return; 
    
    if (content.style.display === 'none') { 
        content.style.display = 'block'; 
        if(icon) icon.classList.replace('fa-chevron-down','fa-chevron-up'); 
        // Chart.js cannot measure a hidden container — re-render on open
        if(contentId === 'io-bar-content' && window.renderIOBarChart) window.renderIOBarChart();
        if(contentId === 'cat-trend-content' && window.renderCatTrendChart) window.renderCatTrendChart();
    } else { 
        content.style.display = 'none'; 
        if(icon) icon.classList.replace('fa-chevron-up','fa-chevron-down'); 
    } 
};

window.switchTab = (tab, el) => { 
    window.haptic(); 
    
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active')); 
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active')); 
    
    const tc = document.getElementById('tab-'+tab); 
    if(tc) tc.classList.add('active'); 
    
    if(el) el.classList.add('active'); 
    
    const fab = document.getElementById('main-fab'); 
    if(fab) fab.style.display = (tab === 'home') ? 'flex' : 'none'; 
    
    if(tab === 'report' && window.renderReport) {
        window.renderReport(); 
    }
};

window.setTransactionType = (type) => { 
    window.haptic(); 
    window.currentSelectedType = type; 
    
    document.querySelectorAll('#type-expense, #type-income, #type-transfer').forEach(b => b.classList.remove('active')); 
    
    const te = document.getElementById('type-'+type.toLowerCase()); 
    if(te) te.classList.add('active'); 
    
    const toAcc = document.getElementById('to-account-group'); 
    if(toAcc) toAcc.style.display = type === 'Transfer' ? 'flex' : 'none'; 
    
    const catGroup = document.getElementById('category-group'); 
    if(catGroup) catGroup.style.display = type === 'Transfer' ? 'none' : 'flex'; 
    
    if(type !== 'Transfer' && window.updateCategoryDropdowns) {
        window.updateCategoryDropdowns(); 
    }
};

window.toggleTheme = () => { 
    window.haptic(); 
    const isDark = document.body.classList.toggle('dark-mode'); 
    localStorage.setItem('mtw_theme', isDark ? 'dark' : 'light'); 
    
    const icon = document.getElementById('theme-icon'); 
    const text = document.getElementById('theme-text'); 
    
    if(icon && text) { 
        if (isDark) { 
            icon.className = 'fa-solid fa-moon input-icon-inline'; 
            icon.style.backgroundColor = '#000000'; 
            text.innerText = 'Dark'; 
        } else { 
            icon.className = 'fa-solid fa-sun input-icon-inline'; 
            icon.style.backgroundColor = '#7C6BB0'; 
            text.innerText = 'Light'; 
        } 
    } 
    
    if(window.renderChart) {
        window.renderChart(); 
    }
    if(window.renderIOBarChart) {
        window.renderIOBarChart(); 
    }
    if(window.renderCatTrendChart) {
        window.renderCatTrendChart(); 
    }
};

window.setReportView = (view) => { 
    if(view === 'Yearly' && !window.isProUser()) return window.showProPaymentDialog(); 
    
    window.haptic(); 
    window.currentReportView = view; 
    window.txDisplayLimit = 50; 
    
    const vm = document.getElementById('view-monthly'); 
    if(vm) vm.classList.toggle('active', view === 'Monthly'); 
    
    const vy = document.getElementById('view-yearly'); 
    if(vy) vy.classList.toggle('active', view === 'Yearly'); 
    
    const mrc = document.getElementById('monthly-report-content'); 
    if(mrc) mrc.style.display = view === 'Monthly' ? 'block' : 'none'; 
    
    const yrc = document.getElementById('yearly-report-content'); 
    if(yrc) yrc.style.display = view === 'Yearly' ? 'block' : 'none'; 
    
    const monWrap = document.getElementById('month-picker-wrapper'); 
    const yrWrap = document.getElementById('yearly-picker-wrapper'); 
    
    if(monWrap) { 
        monWrap.style.display = view === 'Monthly' ? 'flex' : 'none'; 
    } 
    if(yrWrap) { 
        yrWrap.style.display = view === 'Yearly' ? 'flex' : 'none'; 
    } 
    
    if(window.renderReport) {
        window.renderReport(); 
    }
};

window.checkProAndSetView = (view) => { 
    if(view === 'Yearly' && !window.isProUser()) return window.showProPaymentDialog(); 
    window.setReportView(view); 
};

window.onMonthFilterChange = () => { 
    try { 
        window.txDisplayLimit = 50; 
        const monthVal = document.getElementById('report-month')?.value; 
        
        if(monthVal) { 
            const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"]; 
            const [y, m] = monthVal.split('-'); 
            const displaySpan = document.getElementById('display-report-month'); 
            if(displaySpan) displaySpan.innerText = `${monthNames[parseInt(m)-1]} ${y}`; 
        } 
        
        const yearVal = document.getElementById('report-year')?.value; 
        if(yearVal) { 
            const displaySpanY = document.getElementById('display-report-year'); 
            if(displaySpanY) displaySpanY.innerText = yearVal; 
        } 
        
        if(window.renderReport) {
            window.renderReport(); 
        }
    } catch(e) { 
        console.error(e); 
    } 
};

window.updateTransDateDisplay = () => { 
    try { 
        const dVal = document.getElementById('trans-date')?.value; 
        if(dVal) { 
            const [y, m, d] = dVal.split('-'); 
            const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]; 
            const displaySpan = document.getElementById('display-trans-date'); 
            if(displaySpan) displaySpan.innerText = `${monthNames[parseInt(m)-1]} ${d}, ${y}`; 
        } 
    } catch(e) { 
        console.error(e); 
    } 
};

window.setChartType = (type) => { 
    window.haptic(); 
    window.currentChartType = type; 
    
    document.querySelectorAll('.chart-tab-btn').forEach(b => b.classList.remove('active','expense-glow','income-glow')); 
    
    const btn = document.getElementById('chart-type-'+type.toLowerCase()); 
    if(btn) { 
        btn.classList.add('active'); 
        if(type === 'Expense') {
            btn.classList.add('expense-glow'); 
        } else {
            btn.classList.add('income-glow'); 
        }
    } 
    
    if(window.renderChart) {
        window.renderChart(); 
    }
};

window.loadMoreTransactions = () => { 
    window.haptic(); 
    window.txDisplayLimit += 50; 
    window.renderReport(); 
};

// ==========================================
// 🌟 Gradient 3D Pie Chart (User Reference Code) 🌟
// ==========================================
window.renderChart = (forceLight = false) => {
    try {
        window.initReportDates(); 
        const canvas = document.getElementById('expensePieChart'); 
        if(!canvas) return;
        
        const month = document.getElementById('report-month')?.value; 
        const year = document.getElementById('report-year')?.value;
        let filtered = [];
        
        if(window.currentReportView === 'Monthly' && month) {
            filtered = window.globalTransactions.filter(t => (t.month === month || (t.timestamp && String(t.timestamp).startsWith(month))) && t.type === window.currentChartType);
        } else if(window.currentReportView === 'Yearly' && year) {
            filtered = window.globalTransactions.filter(t => t.month && t.month.startsWith(year) && t.type === window.currentChartType);
        } else {
            filtered = window.globalTransactions.filter(t => t.type === window.currentChartType);
        }
        
        const catTotals = {}; 
        filtered.forEach(t => { 
            const cat = t.category || t.toAccount || 'Other'; 
            catTotals[cat] = (catTotals[cat] || 0) + t.amount; 
        });
        
        const labels = Object.keys(catTotals);
        const data = Object.values(catTotals);
        
        if(window.myPieChart) {
            window.myPieChart.destroy();
        }
        
        const themeColor = localStorage.getItem('mtw_theme_color') || '#7C6BB0';
        const isDark = !forceLight && document.body.classList.contains('dark-mode');
        const bgColors = data.map((_, i) => { return `hsl(${(i * 50) % 360}, 70%, 50%)`; });
        
        window.myPieChart = new Chart(canvas, { 
            type: 'pie', 
            data: { 
                labels: labels.length ? labels : ['No Data'], 
                datasets: [{ 
                    data: data.length ? data : [1], 
                    backgroundColor: data.length ? bgColors : ['#e5e5ea'], 
                    borderWidth: 2, 
                    borderColor: isDark ? 'rgba(28,28,30,0.2)' : 'rgba(255,255,255,0.5)', 
                    hoverOffset: 12 
                }] 
            }, 
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { display: false } 
                } 
            } 
        });
        
        const legend = document.getElementById('chart-custom-legend');
        if(legend && labels.length) { 
            let html = ''; 
            labels.forEach((l,i) => { 
                html += `<div class="legend-pill"><span class="legend-color" style="background:${bgColors[i]};"></span><span class="legend-text">${l} - ${data[i].toLocaleString()}</span></div>`; 
            }); 
            legend.innerHTML = html; 
        } else if(legend) {
            legend.innerHTML = '<span style="color:var(--secondary-text); font-size:13px;">No Data</span>';
        }
    } catch(e) {
        console.error(e);
    }
};

setTimeout(() => { if(window.renderChart) window.renderChart(); }, 800);

setTimeout(() => { if(window.renderChart) window.renderChart(); }, 800);

// ==========================================
// 📊 Report Analytics Dashboard (insights · IO bars · category trends · CSV)
// ==========================================
const rptParseAmt = (t) => Number(String(t.amount).replace(/,/g, '')) || 0;

const rptMonthKey = (baseMonth, offset) => {
    let parts = baseMonth.split('-'); 
    let y = parseInt(parts[0], 10), m = parseInt(parts[1], 10) - offset;
    while (m < 1) { m += 12; y -= 1; }
    return `${y}-${String(m).padStart(2, '0')}`;
};

const rptInMonth = (t, mk) => t.month === mk || (t.timestamp && String(t.timestamp).startsWith(mk));

const rptMonthNames = (isMM) => isMM
    ? ['ဇန်','ဖေ','မတ်','ဧ','မေ','ဇွန်','ဇူ','ဩ','စက်','အောက်','နို','ဒီ']
    : ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const rptAxisColors = () => {
    const isDark = document.body.classList.contains('dark-mode');
    return {
        grid: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        tick: isDark ? '#ebebf5' : '#3a3a3c'
    };
};

// --- 1 · Spending insights cards (top of report tab) ---
window.renderInsights = () => {
    try {
        const c = document.getElementById('insights-container'); 
        if(!c) return;
        
        const isMM = localStorage.getItem('mtw_lang') === 'mm';
        const month = document.getElementById('report-month')?.value;
        if(!month) { c.innerHTML = ''; return; }
        
        const prevMonth = rptMonthKey(month, 1);
        let exp = 0, inc = 0, prevExp = 0;
        const catTotals = {};
        let biggest = null;
        
        (window.globalTransactions || []).forEach(t => {
            const amt = rptParseAmt(t);
            if (rptInMonth(t, month)) {
                if (t.type === 'Expense') {
                    exp += amt;
                    const cat = t.category || 'Other';
                    catTotals[cat] = (catTotals[cat] || 0) + amt;
                    if (!biggest || amt > biggest.amt) biggest = { amt, cat, note: t.note || '' };
                } else if (t.type === 'Income') {
                    inc += amt;
                }
            } else if (t.type === 'Expense' && rptInMonth(t, prevMonth)) {
                prevExp += amt;
            }
        });
        
        let momTxt = '—', momColor = 'var(--secondary-text)';
        if (prevExp > 0) {
            const pct = ((exp - prevExp) / prevExp) * 100;
            momTxt = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
            momColor = pct <= 0 ? '#34c759' : '#ff3b30';
        } else if (exp > 0) {
            momTxt = isMM ? 'အသစ်' : 'New';
            momColor = '#7C6BB0';
        }
        
        const sortedCats = Object.keys(catTotals).sort((a, b) => catTotals[b] - catTotals[a]);
        const topCat = sortedCats.length ? sortedCats[0] : '—';
        const topShare = (sortedCats.length && exp > 0) ? ((catTotals[sortedCats[0]] / exp) * 100).toFixed(0) + '%' : '';
        
        const parts = month.split('-');
        const daysInMonth = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10), 0).getDate();
        const avgDaily = exp / daysInMonth;
        
        let saveTxt = '—', saveSub = '', saveColor = 'var(--text-color)';
        if (inc > 0) {
            const sr = ((inc - exp) / inc) * 100;
            saveTxt = sr.toFixed(0) + '%';
            saveColor = sr >= 20 ? '#34c759' : '#ff9f0a';
            if (sr < 20) saveSub = isMM ? '💡 20% အောက် — နည်းနည်းစုကြည့်ပါ' : '💡 Below 20% — try saving a bit more';
        }
        
        const card = (label, value, sub, color) => `
            <div class="glass-panel" style="border-radius: 18px; padding: 12px 8px; text-align: center;">
                <div style="font-size: 10px; font-weight: 800; color: var(--secondary-text); margin-bottom: 4px;">${label}</div>
                <div style="font-size: 16px; font-weight: 800; color: ${color || 'var(--text-color)'}; word-break: break-word;">${value}</div>
                ${sub ? `<div style="font-size: 10px; color: var(--secondary-text); margin-top: 3px;">${sub}</div>` : ''}
            </div>`;
        
        c.innerHTML = `<div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
            ${card(isMM ? 'လအလိုက် ပြောင်းလဲမှု' : 'MoM Change', momTxt, isMM ? 'အရင်လနဲ့ ယှဉ်' : 'vs last month', momColor)}
            ${card(isMM ? 'အများဆုံး ကဏ္ဍ' : 'Top Category', topCat, topShare ? topShare + (isMM ? ' သုံးငွေ' : ' of expenses') : '', '#7C6BB0')}
            ${card(isMM ? 'ပျမ်းမျှ နေ့စဉ်သုံး' : 'Avg Daily Spend', Math.round(avgDaily).toLocaleString() + ' Ks')}
            ${card(isMM ? 'စုဆောင်းနိုင်မှု' : 'Savings Rate', saveTxt, saveSub, saveColor)}
            <div style="grid-column: span 2;">${card(isMM ? 'အကြီးဆုံး တစ်ကြိမ်သုံး' : 'Biggest Expense', biggest ? biggest.amt.toLocaleString() + ' Ks' : '—', biggest ? biggest.cat + (biggest.note ? ' · ' + biggest.note : '') : '', '#ff3b30')}</div>
        </div>`;
    } catch(e) {
        console.error(e);
    }
};

// --- 2 · Income vs Expense bar chart (last 6 months) ---
window.renderIOBarChart = () => {
    try {
        const canvas = document.getElementById('ioBarChart'); 
        if(!canvas || typeof Chart === 'undefined') return;
        
        const isMM = localStorage.getItem('mtw_lang') === 'mm';
        const base = document.getElementById('report-month')?.value;
        if(!base) return;
        
        const mNames = rptMonthNames(isMM);
        const labels = [], incData = [], expData = [];
        
        for (let i = 5; i >= 0; i--) {
            const mk = rptMonthKey(base, i);
            labels.push(mNames[parseInt(mk.split('-')[1], 10) - 1]);
            let inc = 0, exp = 0;
            (window.globalTransactions || []).forEach(t => {
                if (!rptInMonth(t, mk)) return;
                const amt = rptParseAmt(t);
                if (t.type === 'Income') inc += amt;
                else if (t.type === 'Expense') exp += amt;
            });
            incData.push(inc);
            expData.push(exp);
        }
        
        if (window.ioBarChart) {
            window.ioBarChart.destroy();
        }
        
        const ac = rptAxisColors();
        window.ioBarChart = new Chart(canvas, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    { label: isMM ? 'ဝင်ငွေ' : 'Income', data: incData, backgroundColor: 'rgba(52,199,89,0.85)', borderRadius: 6, borderSkipped: false },
                    { label: isMM ? 'ထွက်ငွေ' : 'Expense', data: expData, backgroundColor: 'rgba(255,59,48,0.75)', borderRadius: 6, borderSkipped: false }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: ac.tick, boxWidth: 12, font: { size: 11 } } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: ac.tick, font: { size: 10 } } },
                    y: { grid: { color: ac.grid }, ticks: { color: ac.tick, font: { size: 10 }, callback: (v) => v >= 1000 ? (v/1000) + 'k' : v } }
                }
            }
        });
    } catch(e) {
        console.error(e);
    }
};

// --- 3 · Category trend lines (top 5 expense categories, last 6 months) ---
window.renderCatTrendChart = () => {
    try {
        const canvas = document.getElementById('catTrendChart'); 
        if(!canvas || typeof Chart === 'undefined') return;
        
        const isMM = localStorage.getItem('mtw_lang') === 'mm';
        const base = document.getElementById('report-month')?.value;
        if(!base) return;
        
        const mNames = rptMonthNames(isMM);
        const months = [];
        for (let i = 5; i >= 0; i--) months.push(rptMonthKey(base, i));
        
        const totals = {};
        (window.globalTransactions || []).forEach(t => {
            if (t.type !== 'Expense') return;
            const tm = t.month || String(t.timestamp || '').substring(0, 7);
            if (!months.includes(tm)) return;
            const cat = t.category || 'Other';
            totals[cat] = (totals[cat] || 0) + rptParseAmt(t);
        });
        
        const topCats = Object.keys(totals).sort((a, b) => totals[b] - totals[a]).slice(0, 5);
        const palette = ['#7C6BB0', '#B39DDB', '#34c759', '#ff9f0a', '#0a84ff'];
        
        const datasets = topCats.map((cat, i) => ({
            label: cat,
            data: months.map(mk => {
                let s = 0;
                (window.globalTransactions || []).forEach(t => {
                    if (t.type === 'Expense' && (t.category || 'Other') === cat && rptInMonth(t, mk)) s += rptParseAmt(t);
                });
                return s;
            }),
            borderColor: palette[i % palette.length],
            backgroundColor: palette[i % palette.length] + '22',
            tension: 0.35,
            borderWidth: 2,
            pointRadius: 3,
            fill: false
        }));
        
        if (window.catTrendChart) {
            window.catTrendChart.destroy();
        }
        
        const ac = rptAxisColors();
        window.catTrendChart = new Chart(canvas, {
            type: 'line',
            data: {
                labels: months.map(mk => mNames[parseInt(mk.split('-')[1], 10) - 1]),
                datasets: datasets.length ? datasets : [{ label: isMM ? 'ဒေတာ မရှိသေးပါ' : 'No Data', data: months.map(() => 0), borderColor: '#c7c7cc' }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: ac.tick, boxWidth: 12, font: { size: 10 } } }
                },
                scales: {
                    x: { grid: { display: false }, ticks: { color: ac.tick, font: { size: 10 } } },
                    y: { beginAtZero: true, grid: { color: ac.grid }, ticks: { color: ac.tick, font: { size: 10 }, callback: (v) => v >= 1000 ? (v/1000) + 'k' : v } }
                }
            }
        });
    } catch(e) {
        console.error(e);
    }
};

// --- 5 · Export this month's transactions as CSV ---
window.exportMonthCSV = () => {
    try {
        window.haptic();
        const isMM = localStorage.getItem('mtw_lang') === 'mm';
        const month = document.getElementById('report-month')?.value;
        if(!month) return;
        
        const rows = (window.globalTransactions || []).filter(t => rptInMonth(t, month));
        if (!rows.length) return window.customAlert(isMM ? 'ဒီလအတွက် စာရင်း မရှိသေးပါ။' : 'No transactions this month.');
        
        const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const lines = [[ 'ရက်စွဲ', 'အမျိုးအစား', 'ကဏ္ဍ', 'အကောင့်', 'ပမာဏ (Ks)', 'မှတ်ချက်' ].map(q).join(',')];
        
        rows.forEach(t => {
            lines.push([
                (t.timestamp || '').substring(0, 10),
                t.type || '',
                t.category || t.toAccount || '',
                t.account || '',
                String(t.amount || '').replace(/,/g, ''),
                t.note || ''
            ].map(q).join(','));
        });
        
        const blob = new Blob(["﻿" + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `MTW_SUBUU_${month}.csv`;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
    } catch(e) {
        console.error(e);
    }
};

window.renderReport = () => {
    try {
        window.initReportDates(); 
        const month = document.getElementById('report-month')?.value; 
        const year = document.getElementById('report-year')?.value;
        let filtered = [];
        
        if(window.currentReportView === 'Monthly' && month) {
            filtered = window.globalTransactions.filter(t => t.month === month || (t.timestamp && String(t.timestamp).startsWith(month)));
        } else if(window.currentReportView === 'Yearly' && year) {
            filtered = window.globalTransactions.filter(t => t.month && t.month.startsWith(year));
        } else {
            filtered = window.globalTransactions;
        }
        
        let income = 0;
        let expense = 0;
        
        filtered.forEach(t => { 
            const amt = Number(String(t.amount).replace(/,/g, '')) || 0;
            if(t.type === 'Income') income += amt; 
            else if(t.type === 'Expense') expense += amt; 
        });
        
        // လ/နှစ် ရွေးချယ်မှုနှင့်အတူ Account Balances ကိုပါ ပြန်တွက်စေသည်
        if(window.updateAccountBalances) window.updateAccountBalances();
        
        const rb = document.getElementById('rep-balance'); 
        if(rb) rb.innerText = (income - expense).toLocaleString() + " MMK";
        
        const ri = document.getElementById('rep-income'); 
        if(ri) ri.innerText = income.toLocaleString() + " MMK";
        
        const re = document.getElementById('rep-expense'); 
        if(re) re.innerText = expense.toLocaleString() + " MMK";
        
        window.renderChart();
        
        // 📊 Analytics dashboard sections
        if(window.renderInsights) window.renderInsights();
        if(window.renderIOBarChart) window.renderIOBarChart();
        if(window.renderCatTrendChart) window.renderCatTrendChart();
        if(window.updateBudgetProgress) window.updateBudgetProgress();
        
        const searchTx = document.getElementById('search-tx'); 
        const searchQuery = searchTx ? searchTx.value.toLowerCase().trim() : '';
        
        window.txDisplayLimit = window.txDisplayLimit || 50;
        
        let displayTxs = searchQuery 
            ? window.globalTransactions.filter(t => `${t.category||''} ${t.toAccount||''} ${t.note||''} ${t.amount||''} ${t.account||''}`.toLowerCase().includes(searchQuery)) 
            : filtered.slice(0, window.txDisplayLimit);
            
        const list = document.getElementById('recent-list');
        
        if(list) {
            let html = `<h4 style="margin-bottom:10px; font-size:14px; color:var(--secondary-text);">${searchQuery ? `Search Results (${displayTxs.length})` : 'Transactions'}</h4>`;
            if (displayTxs.length > 0) {
                html += displayTxs.map(t => { 
                    const receiptBadge = t.receiptUrl ? `<span class="receipt-attach-badge"><i class="fa-solid fa-paperclip"></i></span>` : ''; 
                    const displayAmt = Number(String(t.amount).replace(/,/g, '')) || 0;
                    return `<div class="list-item glass-panel" onclick="editTransaction('${t.id}')"><div class="list-info"><span class="list-cat">${t.category||t.toAccount||'Unknown'} ${t.autoGenerated ? '🔄' : ''}</span><span class="list-date">${(t.timestamp||'').length ? (window.toLocalDateStr(t.timestamp)||'') : ''} • ${t.note||''} ${receiptBadge}</span></div><div class="list-amt-wrapper"><span class="list-amt ${t.type}">${displayAmt.toLocaleString()} MMK</span><i class="fa-solid fa-pen-to-square" style="color:var(--secondary-text); cursor:pointer;"></i></div></div>`; 
                }).join('');
                
                if (!searchQuery && filtered.length > window.txDisplayLimit) { 
                    const isMM = localStorage.getItem('mtw_lang') === 'mm'; 
                    const loadMoreText = isMM ? 'နောက်ထပ်ကြည့်မည်' : 'Load More'; 
                    html += `<div style="text-align:center; margin-top:15px; margin-bottom: 20px;"><button onclick="loadMoreTransactions()" style="background:var(--input-bg); color:var(--text-color); border:1px solid var(--glass-border); border-radius:14px; padding:10px 20px; font-weight:bold; box-shadow:none; width:auto; font-size:14px;"><i class="fa-solid fa-caret-down" style="margin-right: 5px;"></i> ${loadMoreText}</button></div>`; 
                }
            } else { 
                html += `<p style="text-align:center; padding:15px; color:var(--secondary-text);">No transactions found.</p>`; 
            }
            list.innerHTML = html;
        }
    } catch(e) {
        console.error(e);
    }
};

window.updateQuickRecentList = () => { 
    const list = document.getElementById('quick-recent-list'); 
    if(!list) return; 
    
    if(!window.globalTransactions.length) { 
        list.innerHTML = ''; 
        return; 
    } 
    
    list.innerHTML = `<h4 style="margin-bottom:10px; font-size:14px; color:var(--secondary-text);">Recent Transactions</h4>` + window.globalTransactions.slice(0,5).map(t => { 
        const receiptBadge = t.receiptUrl ? `<span class="receipt-attach-badge"><i class="fa-solid fa-paperclip"></i></span>` : ''; 
        const displayAmt = Number(String(t.amount).replace(/,/g, '')) || 0;
        return `<div class="list-item glass-panel" onclick="editTransaction('${t.id}')"><div class="list-info"><span class="list-cat">${t.category||t.toAccount||'Unknown'} ${t.autoGenerated ? '🔄' : ''}</span><span class="list-date">${(t.timestamp||'').length ? (window.toLocalDateStr(t.timestamp)||'') : ''} • ${t.note||''} ${receiptBadge}</span></div><div class="list-amt-wrapper"><span class="list-amt ${t.type}">${displayAmt.toLocaleString()} MMK</span><i class="fa-solid fa-pen-to-square" style="color:var(--secondary-text); cursor:pointer;"></i></div></div>` 
    }).join(''); 
};

// 🌟 Account balances — ရွေးထားသော လ/နှစ် အဆုံးရက်အထိ လက်ကျန်ငွေ ပြပါမည်
window.updateAccountBalances = () => { 
    const container = document.getElementById('account-balances-container'); 
    if(!container) return; 
    
    if(!window.globalAccounts.length){ 
        container.innerHTML='<p style="text-align:center; padding:10px; color:var(--secondary-text);">No accounts found.</p>'; 
        return; 
    } 
    
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    const monthVal = document.getElementById('report-month')?.value; 
    const yearVal = document.getElementById('report-year')?.value;
    
    // Selected period ၏ နောက်ဆုံးလ ('YYYY-MM') — ၎င်းလကုန်အထိ ပေါင်းတွက်မည်
    let cutoffMonth = null;
    if(window.currentReportView === 'Yearly' && yearVal) {
        cutoffMonth = `${yearVal}-12`;
    } else if(monthVal) {
        cutoffMonth = monthVal;
    }
    
    let periodLabel = '';
    if(cutoffMonth) {
        const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
        const parts = cutoffMonth.split('-');
        const cy = parts[0], cm = parts[1];
        if(cm === '12' && window.currentReportView === 'Yearly') {
            periodLabel = isMM ? `${cy} နှစ် အထိ` : `As of ${cy}`;
        } else {
            periodLabel = isMM ? `${monthNames[parseInt(cm)-1]} ${cy} အထိ` : `As of ${monthNames[parseInt(cm)-1]} ${cy}`;
        }
    }
    
    let html = '';
    if(periodLabel) {
        html += `<p style="text-align:center; font-size:12px; font-weight:700; color:var(--secondary-text); margin:0 0 10px;"><i class="fa-solid fa-calendar-days" style="margin-right:4px;"></i>${periodLabel}</p>`;
    }
    html += '<div class="account-balance-grid">'; 
    window.globalAccounts.forEach(acc => { 
        let bal = 0; 
        window.globalTransactions.forEach(t => { 
            if(cutoffMonth) {
                const tm = String(t.month || '') || String(t.timestamp || '').substring(0, 7);
                if(!tm || tm > cutoffMonth) return; // ရွေးထားသောကာလထက် နောက်ကျနေသော စာရင်းများ ချန်ထား
            }
            const amt = Number(String(t.amount).replace(/,/g, '')) || 0;
            if(t.type === 'Income' && t.account === acc.name) bal += amt; 
            if(t.type === 'Expense' && t.account === acc.name) bal -= amt; 
            if(t.type === 'Transfer' && t.account === acc.name) bal -= amt; 
            if(t.type === 'Transfer' && t.toAccount === acc.name) bal += amt; 
        }); 
        let colorClass = bal > 0 ? 'text-green' : (bal < 0 ? 'text-red' : ''); 
        html += `<div class="account-bal-card glass-panel"><div class="acc-name">${acc.name}</div><div class="acc-amt ${colorClass}">${bal.toLocaleString()}</div></div>`; 
    }); 
    html += '</div>'; 
    container.innerHTML = html; 
};

window.updateBudgetProgress = () => { 
    const container = document.getElementById('budget-progress-container'); 
    if(!container) return; 
    
    if(!window.globalBudgets.length){ 
        container.innerHTML='<p style="text-align:center; padding:10px; color:var(--secondary-text);">No active budgets.</p>'; 
        return; 
    } 
    
    const month = document.getElementById('report-month')?.value; 
    let html = ''; 
    window.globalBudgets.forEach(b => { 
        let spent = 0; 
        window.globalTransactions.forEach(t => { 
            if(t.type === 'Expense' && t.category === b.category && (t.month === month || (t.timestamp && String(t.timestamp).startsWith(month)))) {
                spent += Number(String(t.amount).replace(/,/g, '')) || 0; 
            }
        }); 
        
        let percent = Math.min((spent/b.amount)*100, 100) || 0; 
        let barClass = percent >= 90 ? 'danger' : (percent >= 70 ? 'warning' : ''); 
        html += `<div class="budget-card glass-panel"><div class="budget-header"><span>${b.category}</span><span>${spent.toLocaleString()} / ${b.amount.toLocaleString()}</span></div><div class="budget-bar-bg"><div class="budget-bar-fill ${barClass}" style="width:${percent}%"></div></div><div class="budget-details"><span>${percent.toFixed(1)}% Used</span><span>${(b.amount-spent).toLocaleString()} Left</span></div></div>`; 
    }); 
    container.innerHTML = html; 
};

window.updateAccountDropdowns = () => { 
    const from = document.getElementById('trans-account');
    const to = document.getElementById('trans-to-account'); 
    const options = '<option value="" disabled selected>Select Account</option>' + window.globalAccounts.map(a => `<option value="${a.name}">${a.name}</option>`).join(''); 
    
    if(from) from.innerHTML = options; 
    if(to) to.innerHTML = options; 
};

window.updateCategoryDropdowns = () => { 
    const sel = document.getElementById('trans-category'); 
    if(sel) {
        sel.innerHTML = '<option value="" disabled selected>Select Category</option>' + window.globalCategories.filter(c => c.type === window.currentSelectedType).map(c => `<option value="${c.name}">${c.name}</option>`).join(''); 
    }
};

window.updateCurrencyDropdown = () => { 
    const sel = document.getElementById('trans-currency'); 
    if(!sel) return; 
    
    let options = '<option value="MMK" selected>MMK</option>'; 
    if (window.globalCurrencies.length) { 
        options += window.globalCurrencies.filter(c => c.code.toUpperCase() !== 'MMK').map(c => `<option value="${c.code.toUpperCase()}">${c.code.toUpperCase()}</option>`).join(''); 
    } 
    sel.innerHTML = options; 
};

window.updateAccountsManagerList = () => { 
    const list = document.getElementById('account-manager-list'); 
    if(list) {
        list.innerHTML = window.globalAccounts.map(a => `<div class="acc-list-item glass-panel"><span>${a.name||'Unknown'}</span><div><i class="fa-solid fa-pen-to-square text-blue" style="cursor:pointer; margin-right: 15px;" onclick="editAccount('${a.id}')"></i><i class="fa-solid fa-trash text-red" style="cursor:pointer;" onclick="deleteRecord('accounts', '${a.id}')"></i></div></div>`).join(''); 
    }
};

window.updateCategoriesManagerList = () => { 
    const list = document.getElementById('category-manager-list'); 
    if(list) {
        list.innerHTML = window.globalCategories.map(c => `<div class="acc-list-item glass-panel"><span>${c.name||'Unknown'} (${c.type})</span><div><i class="fa-solid fa-pen-to-square text-blue" style="cursor:pointer; margin-right: 15px;" onclick="editCategory('${c.id}')"></i><i class="fa-solid fa-trash text-red" style="cursor:pointer;" onclick="deleteRecord('categories', '${c.id}')"></i></div></div>`).join(''); 
    }
};

window.updateBudgetManagerList = () => { 
    const list = document.getElementById('budget-manager-list'); 
    if(list) {
        list.innerHTML = window.globalBudgets.map(b => `<div class="acc-list-item glass-panel"><span>${b.category||'Unknown'}: ${(b.amount||0).toLocaleString()}</span><div><i class="fa-solid fa-pen-to-square text-blue" style="cursor:pointer; margin-right: 15px;" onclick="editBudget('${b.id}')"></i><i class="fa-solid fa-trash text-red" style="cursor:pointer;" onclick="deleteRecord('budgets', '${b.id}')"></i></div></div>`).join(''); 
    }
};

window.updateGoalsManagerList = () => { 
    const list = document.getElementById('goals-manager-list'); 
    if(list) {
        list.innerHTML = window.globalGoals.map(g => `<div class="acc-list-item glass-panel"><span>${g.name||'Unknown'}: ${g.savedAmount||0}/${(g.targetAmount||0).toLocaleString()}</span><div><i class="fa-solid fa-pen-to-square text-blue" style="cursor:pointer; margin-right: 15px;" onclick="editGoal('${g.id}')"></i><i class="fa-solid fa-trash text-red" style="cursor:pointer;" onclick="deleteRecord('goals', '${g.id}')"></i></div></div>`).join(''); 
    }
};

window.updateCurrencyManagerList = () => { 
    const list = document.getElementById('currency-manager-list'); 
    if(list) {
        list.innerHTML = window.globalCurrencies.map(c => `<div class="acc-list-item glass-panel"><span>${c.code||'N/A'} (${c.rate||0})</span><div><i class="fa-solid fa-pen-to-square text-blue" style="cursor:pointer; margin-right: 15px;" onclick="editCurrency('${c.id}')"></i><i class="fa-solid fa-trash text-red" style="cursor:pointer;" onclick="deleteRecord('currencies', '${c.id}')"></i></div></div>`).join(''); 
    }
};

window.debtFormType = window.debtFormType || 'lend';

window.setDebtFormType = (t) => { 
    window.debtFormType = t === 'borrow' ? 'borrow' : 'lend'; 
    const l = document.getElementById('debt-type-lend'), b = document.getElementById('debt-type-borrow'); 
    if(l) l.classList.toggle('active', window.debtFormType === 'lend'); 
    if(b) b.classList.toggle('active', window.debtFormType === 'borrow'); 
};

window.debtRemaining = (d) => Math.max(0, (Number(d.amount) || 0) - (Number(d.paidAmount) || 0));
window.debtIsOpen = (d) => (d.status || 'open') === 'open';
window.debtDaysUntil = (d) => { 
    if(!d.dueDate) return 99999; 
    const due = new Date(String(d.dueDate) + 'T00:00:00'); 
    if(isNaN(due)) return 99999; 
    const today = new Date(); today.setHours(0, 0, 0, 0); 
    return Math.round((due - today) / 86400000); 
};

window.updateDebtsManagerList = () => { 
    const list = document.getElementById('debts-manager-list'); 
    if(!list) return; 
    const isMM = localStorage.getItem('mtw_lang') === 'mm'; 
    const debts = (window.globalDebts || []).slice(); 
    debts.sort((a, b) => { 
        const ao = window.debtIsOpen(a) ? 0 : 1, bo = window.debtIsOpen(b) ? 0 : 1; 
        if(ao !== bo) return ao - bo; 
        return window.debtDaysUntil(a) - window.debtDaysUntil(b); 
    }); 
    const sumEl = document.getElementById('debt-summary'); 
    if(sumEl) { 
        let lentOut = 0, borrowedOut = 0; 
        debts.forEach(d => { 
            if(!window.debtIsOpen(d)) return; 
            if((d.type || 'lend') === 'borrow') borrowedOut += window.debtRemaining(d); 
            else lentOut += window.debtRemaining(d); 
        }); 
        sumEl.innerHTML = `<div class="glass-panel" style="display:flex; gap:8px; padding:10px 12px; border-radius:14px;"><div style="flex:1; text-align:center;"><div style="font-size:11px; opacity:.7; font-weight:700;">${isMM ? '🤝 ချေးပေးထားတာ ကျန်' : '🤝 Lent Out'}</div><div style="font-size:16px; font-weight:800; color:#28cd41;">${lentOut.toLocaleString()} Ks</div></div><div style="flex:1; text-align:center;"><div style="font-size:11px; opacity:.7; font-weight:700;">${isMM ? '🙏 ချေးယူထားတာ ကျန်' : '🙏 Borrowed'}</div><div style="font-size:16px; font-weight:800; color:#ff9f0a;">${borrowedOut.toLocaleString()} Ks</div></div></div>`; 
    } 
    if(!debts.length) { 
        list.innerHTML = `<div style="text-align:center; padding:20px; color:var(--secondary-text); font-size:14px;">${isMM ? '🤝 အကြွေး စာရင်း မရှိသေးပါ' : '🤝 No debts recorded yet'}</div>`; 
        return; 
    } 
    list.innerHTML = debts.map(d => { 
        const total = Number(d.amount) || 0, paid = Number(d.paidAmount) || 0; 
        const remain = window.debtRemaining(d); 
        const pct = total > 0 ? Math.min(100, Math.round(paid / total * 100)) : 0; 
        const type = (d.type || 'lend') === 'borrow' ? 'borrow' : 'lend'; 
        const settled = !window.debtIsOpen(d); 
        const days = window.debtDaysUntil(d); 
        const dueStr = d.dueDate ? String(d.dueDate).substring(0, 10) : ''; 
        let dueHtml = ''; 
        if(dueStr && !settled) { 
            if(days < 0) dueHtml = `<div style="font-size:12px; font-weight:700; color:#ff453a; margin-top:4px;">⚠️ ${isMM ? 'ရက်ကျော်နေပြီ' : 'Overdue'} · ${dueStr}</div>`; 
            else if(days <= 7) dueHtml = `<div style="font-size:12px; font-weight:700; color:#ff9f0a; margin-top:4px;">⏳ ${isMM ? days + ' ရက် လိုသေးတယ်' : days + 'd left'} · ${dueStr}</div>`; 
            else dueHtml = `<div style="font-size:12px; opacity:.65; margin-top:4px;">📅 ${dueStr}</div>`; 
        } 
        const badgeBg = type === 'borrow' ? 'rgba(255,159,10,0.15)' : 'rgba(52,199,89,0.15)'; 
        const badgeColor = type === 'borrow' ? '#ff9f0a' : '#28cd41'; 
        const badgeText = type === 'borrow' ? (isMM ? 'ချေးယူထားတယ်' : 'Borrowed') : (isMM ? 'ချေးပေးထားတယ်' : 'Lent Out'); 
        const safeName = String(d.name || 'Unknown').replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
        const safeNotes = String(d.notes || '').replace(/</g, '&lt;').replace(/>/g, '&gt;'); 
        const payBtn = settled ? '' : `<button onclick="recordDebtPayment('${d.id}')" class="glass-panel" style="flex:1; padding:8px; font-size:12px; font-weight:700; color:var(--text-color); border:none; cursor:pointer;">💰 ${isMM ? 'ငွေသွင်းမှတ်မယ်' : 'Record Payment'}</button>`; 
        const settleBtn = `<button onclick="toggleDebtSettled('${d.id}')" class="glass-panel" style="flex:1; padding:8px; font-size:12px; font-weight:700; color:${settled ? 'var(--secondary-text)' : '#28cd41'}; border:none; cursor:pointer;">${settled ? (isMM ? '↩️ ပြန်ဖွင့်မယ်' : '↩️ Reopen') : '✅ ' + (isMM ? 'ဆပ်ပြီးပြီ' : 'Settled')}</button>`; 
        return `<div class="glass-panel" style="padding:12px; border-radius:16px; margin-bottom:10px; ${settled ? 'opacity:.65;' : ''}"><div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;"><span style="font-weight:800; font-size:15px; color:var(--text-color);">${safeName}</span><span style="font-size:11px; font-weight:800; padding:3px 10px; border-radius:100px; background:${badgeBg}; color:${badgeColor};">${badgeText}</span></div><div style="display:flex; justify-content:space-between; align-items:baseline; font-size:13px; color:var(--secondary-text); margin-bottom:6px;"><span>${isMM ? 'ကျန်' : 'Remaining'}: <b style="color:var(--text-color); font-size:15px;">${remain.toLocaleString()} Ks</b></span><span>${paid.toLocaleString()} / ${total.toLocaleString()} Ks</span></div><div style="height:8px; border-radius:100px; background:var(--input-bg); box-shadow:var(--inner-shadow-track); overflow:hidden; margin-bottom:4px;"><div style="height:100%; width:${pct}%; border-radius:100px; background:linear-gradient(90deg, ${type === 'borrow' ? '#ff9f0a, #ff7a00' : '#32d74b, #28cd41'}); transition:width .3s;"></div></div>${dueHtml}${safeNotes ? `<div style="font-size:12px; opacity:.65; margin-top:4px;">📝 ${safeNotes}</div>` : ''}<div style="display:flex; gap:8px; margin-top:8px;">${payBtn}${settleBtn}<i class="fa-solid fa-pen-to-square" style="cursor:pointer; color:#0a84ff; align-self:center; padding:4px;" onclick="editDebt('${d.id}')"></i><i class="fa-solid fa-trash" style="cursor:pointer; color:#ff453a; align-self:center; padding:4px;" onclick="deleteRecord('debts', '${d.id}')"></i></div></div>`; 
    }).join(''); 
};

window.updateRecurringManagerList = () => { 
    const list = document.getElementById('recurring-manager-list'); 
    if(list) {
        list.innerHTML = window.globalRecurring.map(r => `<div class="acc-list-item glass-panel"><span>${r.name||'Unnamed'}: ${(r.amount||0).toLocaleString()}</span><div><i class="fa-solid fa-pen-to-square text-blue" style="cursor:pointer; margin-right: 15px;" onclick="editRecurring('${r.id}')"></i><i class="fa-solid fa-trash text-red" style="cursor:pointer;" onclick="deleteRecord('recurring', '${r.id}')"></i></div></div>`).join(''); 
    }
};

window.setupEditButtons = (containerId, saveFnName, prefix, cancelFn) => { 
    let saveBtn = document.getElementById(`save-${prefix}-btn`); 
    let cancelBtn = document.getElementById(`cancel-${prefix}-btn`); 
    
    if(!saveBtn) { 
        saveBtn = document.querySelector(`#${containerId} button[onclick="${saveFnName}()"]`); 
        if(saveBtn) saveBtn.id = `save-${prefix}-btn`; 
    } 
    
    if(!cancelBtn && saveBtn) { 
        cancelBtn = document.createElement('button'); 
        cancelBtn.id = `cancel-${prefix}-btn`; 
        cancelBtn.className = "btn-close"; 
        cancelBtn.style.display = "none"; 
        cancelBtn.style.background = "#8e8e93"; 
        cancelBtn.style.marginBottom = "15px"; 
        cancelBtn.style.marginTop = "10px"; 
        cancelBtn.innerText = "Cancel Edit"; 
        cancelBtn.onclick = cancelFn; 
        saveBtn.parentNode.insertBefore(cancelBtn, saveBtn.nextSibling); 
    } 
    
    return { saveBtn, cancelBtn }; 
};

// Manager Modals
window.openAccountsManager = () => { const m = document.getElementById('acc-manager-modal'); if(m) m.style.display='flex'; window.updateAccountsManagerList(); }; 
window.closeAccountsManager = () => { const m = document.getElementById('acc-manager-modal'); if(m) m.style.display='none'; window.cancelAccEdit(); }; 
window.editAccount = (id) => { const acc = window.globalAccounts.find(a => a.id === id); if(!acc) return; window.isAccEditMode = true; window.accEditId = id; const n = document.getElementById('new-acc-name'); if(n) n.value = acc.name || ''; const btns = window.setupEditButtons('acc-manager-modal', 'addAccount', 'acc', window.cancelAccEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Update"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'block'; }; 
window.cancelAccEdit = () => { window.isAccEditMode = false; window.accEditId = null; const n = document.getElementById('new-acc-name'); if(n) n.value = ''; const btns = window.setupEditButtons('acc-manager-modal', 'addAccount', 'acc', window.cancelAccEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Add Account"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'none'; };

window.openCategoriesManager = () => { const m = document.getElementById('cat-manager-modal'); if(m) m.style.display='flex'; window.updateCategoriesManagerList(); }; 
window.closeCategoriesManager = () => { const m = document.getElementById('cat-manager-modal'); if(m) m.style.display='none'; window.cancelCatEdit(); }; 
window.editCategory = (id) => { const cat = window.globalCategories.find(c => c.id === id); if(!cat) return; window.isCatEditMode = true; window.catEditId = id; const n = document.getElementById('new-cat-name'); if(n) n.value = cat.name || ''; const t = document.getElementById('new-cat-type'); if(t) t.value = cat.type || 'Expense'; const btns = window.setupEditButtons('cat-manager-modal', 'addCategory', 'cat', window.cancelCatEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Update"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'block'; }; 
window.cancelCatEdit = () => { window.isCatEditMode = false; window.catEditId = null; const n = document.getElementById('new-cat-name'); if(n) n.value = ''; const t = document.getElementById('new-cat-type'); if(t) t.value = 'Expense'; const btns = window.setupEditButtons('cat-manager-modal', 'addCategory', 'cat', window.cancelCatEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Add Category"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'none'; };

window.openBudgetManager = () => { if(!window.isProUser()) return window.showProPaymentDialog(); const sel = document.getElementById('budget-category'); if(sel) sel.innerHTML = window.globalCategories.filter(c => c.type === 'Expense').map(c => `<option value="${c.name}">${c.name}</option>`).join(''); const m = document.getElementById('budget-manager-modal'); if(m) m.style.display='flex'; window.updateBudgetManagerList(); }; 
window.closeBudgetManager = () => { const m = document.getElementById('budget-manager-modal'); if(m) m.style.display='none'; window.cancelBudEdit(); }; 
window.editBudget = (id) => { const b = window.globalBudgets.find(x => x.id === id); if(!b) return; window.isBudEditMode = true; window.budEditId = id; const c = document.getElementById('budget-category'); if(c) c.value = b.category || ''; const a = document.getElementById('budget-amount'); if(a) a.value = b.amount || ''; const btns = window.setupEditButtons('budget-manager-modal', 'addBudget', 'bud', window.cancelBudEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Update"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'block'; }; 
window.cancelBudEdit = () => { window.isBudEditMode = false; window.budEditId = null; const c = document.getElementById('budget-category'); if(c) c.value = ''; const a = document.getElementById('budget-amount'); if(a) a.value = ''; const btns = window.setupEditButtons('budget-manager-modal', 'addBudget', 'bud', window.cancelBudEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Add Budget"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'none'; };

window.openGoalsManager = () => { if(!window.isProUser() && window.globalGoals.length >= 1) return window.showProPaymentDialog(); const m = document.getElementById('goals-manager-modal'); if(m) m.style.display='flex'; window.updateGoalsManagerList(); }; 
window.closeGoalsManager = () => { const m = document.getElementById('goals-manager-modal'); if(m) m.style.display='none'; window.cancelGoalEdit(); }; 
window.editGoal = (id) => { const g = window.globalGoals.find(x => x.id === id); if(!g) return; window.isGoalEditMode = true; window.goalEditId = id; const n = document.getElementById('goal-name'); if(n) n.value = g.name || ''; const t = document.getElementById('goal-target'); if(t) t.value = g.targetAmount || ''; const btns = window.setupEditButtons('goals-manager-modal', 'addGoal', 'goal', window.cancelGoalEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Update"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'block'; }; 
window.cancelGoalEdit = () => { window.isGoalEditMode = false; window.goalEditId = null; const n = document.getElementById('goal-name'); if(n) n.value = ''; const t = document.getElementById('goal-target'); if(t) t.value = ''; const btns = window.setupEditButtons('goals-manager-modal', 'addGoal', 'goal', window.cancelGoalEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Add Goal"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'none'; };

window.openCurrenciesManager = () => { const m = document.getElementById('currency-manager-modal'); if(m) m.style.display='flex'; window.updateCurrencyManagerList(); }; 
window.closeCurrenciesManager = () => { const m = document.getElementById('currency-manager-modal'); if(m) m.style.display='none'; window.cancelCurEdit(); }; 
window.editCurrency = (id) => { const c = window.globalCurrencies.find(x => x.id === id); if(!c) return; window.isCurEditMode = true; window.curEditId = id; const cd = document.getElementById('curr-code'); if(cd) cd.value = c.code || ''; const r = document.getElementById('curr-rate'); if(r) r.value = c.rate || ''; const btns = window.setupEditButtons('currency-manager-modal', 'addCurrency', 'cur', window.cancelCurEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Update"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'block'; }; 
window.cancelCurEdit = () => { window.isCurEditMode = false; window.curEditId = null; const cd = document.getElementById('curr-code'); if(cd) cd.value = ''; const r = document.getElementById('curr-rate'); if(r) r.value = ''; const btns = window.setupEditButtons('currency-manager-modal', 'addCurrency', 'cur', window.cancelCurEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Add Currency"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'none'; };

window.openDebtsManager = () => { const m = document.getElementById('debts-manager-modal'); if(m) m.style.display='flex'; window.cancelDebtEdit(); window.updateDebtsManagerList(); }; 
window.closeDebtsManager = () => { const m = document.getElementById('debts-manager-modal'); if(m) m.style.display='none'; window.cancelDebtEdit(); }; 
window.editDebt = (id) => { const d = window.globalDebts.find(x => x.id === id); if(!d) return; if(window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert(); window.isDebtEditMode = true; window.debtEditId = id; const n = document.getElementById('debt-name'); if(n) n.value = d.name || ''; const a = document.getElementById('debt-amount'); if(a) a.value = d.amount || ''; const p = document.getElementById('debt-paid'); if(p) p.value = d.paidAmount || ''; const dd = document.getElementById('debt-due'); if(dd) dd.value = String(d.dueDate || '').substring(0, 10); const nt = document.getElementById('debt-notes'); if(nt) nt.value = d.notes || ''; window.setDebtFormType((d.type || 'lend') === 'borrow' ? 'borrow' : 'lend'); const btns = window.setupEditButtons('debts-manager-modal', 'addDebt', 'debt', window.cancelDebtEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Update"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'block'; }; 
window.cancelDebtEdit = () => { window.isDebtEditMode = false; window.debtEditId = null; const n = document.getElementById('debt-name'); if(n) n.value = ''; const a = document.getElementById('debt-amount'); if(a) a.value = ''; const p = document.getElementById('debt-paid'); if(p) p.value = ''; const dd = document.getElementById('debt-due'); if(dd) dd.value = ''; const nt = document.getElementById('debt-notes'); if(nt) nt.value = ''; window.setDebtFormType('lend'); const btns = window.setupEditButtons('debts-manager-modal', 'addDebt', 'debt', window.cancelDebtEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Add Debt"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'none'; };

window.openRecurringManager = () => { const m = document.getElementById('recurring-manager-modal'); if(m) m.style.display='flex'; window.updateRecurringManagerList(); }; 
window.closeRecurringManager = () => { const m = document.getElementById('recurring-manager-modal'); if(m) m.style.display='none'; window.cancelRecEdit(); }; 
window.editRecurring = (id) => { const r = window.globalRecurring.find(x => x.id === id); if(!r) return; window.isRecEditMode=true; window.recEditId=id; const n = document.getElementById('rec-name'); if(n) n.value=r.name||''; const a = document.getElementById('rec-amount'); if(a) a.value=r.amount||''; const btns = window.setupEditButtons('recurring-manager-modal', 'addRecurring', 'rec', window.cancelRecEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Update"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'block'; }; 
window.cancelRecEdit = () => { window.isRecEditMode=false; window.recEditId=null; const n = document.getElementById('rec-name'); if(n) n.value=''; const a = document.getElementById('rec-amount'); if(a) a.value=''; const btns = window.setupEditButtons('recurring-manager-modal', 'addRecurring', 'rec', window.cancelRecEdit); if(btns.saveBtn) btns.saveBtn.innerText = "Add Recurring"; if(btns.cancelBtn) btns.cancelBtn.style.display = 'none'; }; 

// --- Transaction Form Actions ---
window.editTransaction = (id) => {
    const t = window.globalTransactions.find(x => x.id === id);
    if(!t) return;
    
    window.isEditMode = true; 
    window.editId = id; 
    window.setTransactionType(t.type);
    
    const amt = document.getElementById('trans-amount'); 
    if(amt) amt.value = t.amount || '';
    
    const dt = document.getElementById('trans-date'); 
    if(dt) dt.value = t.timestamp ? (window.toLocalDateStr(t.timestamp) || window.getLocalToday()) : window.getLocalToday();
    
    const acc = document.getElementById('trans-account'); 
    if(acc) acc.value = t.account || '';
    
    const toAcc = document.getElementById('trans-to-account'); 
    if(toAcc && t.type === 'Transfer') toAcc.value = t.toAccount || '';
    
    const cat = document.getElementById('trans-category'); 
    if(cat && t.type !== 'Transfer') cat.value = t.category || '';
    
    const n = document.getElementById('trans-note'); 
    if(n) n.value = t.note || '';
    
    const r = document.getElementById('trans-recurring'); 
    if(r) r.checked = t.isRecurring || false;
    
    if(t.receiptUrl) { 
        window.currentReceiptUrl = t.receiptUrl; 
        const img = document.getElementById('receipt-preview-img'); 
        if(img) img.src = t.receiptUrl; 
        
        const box = document.getElementById('receipt-preview-box'); 
        if(box) box.style.display = 'block'; 
        
        const fn = document.getElementById('receipt-file-name'); 
        if(fn) fn.innerText = 'Attached Receipt'; 
    } else { 
        if(window.removeReceipt) window.removeReceipt(); 
    }
    
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    const sv = document.getElementById('lbl-btn-save'); 
    if(sv) sv.innerText = isMM ? 'ပြန်ပြင်မည်' : 'Update';
    
    let cancelBtn = document.getElementById('cancel-edit-btn');
    if(!cancelBtn) { 
        cancelBtn = document.createElement('button'); 
        cancelBtn.id = 'cancel-edit-btn'; 
        cancelBtn.style.background = '#8e8e93'; 
        cancelBtn.style.marginTop = '10px'; 
        cancelBtn.innerHTML = `<i class="fa-solid fa-xmark"></i> <span id="lbl-btn-cancel">${isMM ? 'ဖျက်သိမ်းမည်' : 'Cancel Edit'}</span>`; 
        cancelBtn.onclick = window.cancelEdit; 
        const saveBtn = document.getElementById('save-btn'); 
        if(saveBtn && saveBtn.parentNode) saveBtn.parentNode.appendChild(cancelBtn); 
    }
    cancelBtn.style.display = 'block';
    
    let deleteBtn = document.getElementById('delete-edit-btn');
    if(!deleteBtn) { 
        deleteBtn = document.createElement('button'); 
        deleteBtn.id = 'delete-edit-btn'; 
        deleteBtn.style.background = 'rgba(255, 59, 48, 0.15)'; 
        deleteBtn.style.color = '#ff3b30'; 
        deleteBtn.style.border = '1px solid rgba(255, 59, 48, 0.3)'; 
        deleteBtn.style.marginTop = '10px'; 
        deleteBtn.innerHTML = `<i class="fa-solid fa-trash"></i> <span id="lbl-btn-delete">${isMM ? 'စာရင်းဖျက်မည်' : 'Delete Transaction'}</span>`; 
        deleteBtn.onclick = () => { 
            if(window.deleteRecord) window.deleteRecord('transactions', window.editId); 
            window.closeTransactionSheet(); 
        }; 
        const saveBtn = document.getElementById('save-btn'); 
        if(saveBtn && saveBtn.parentNode) saveBtn.parentNode.appendChild(deleteBtn); 
    }
    deleteBtn.style.display = 'block';
    
    if(window.updateTransDateDisplay) window.updateTransDateDisplay(); 
    window.openTransactionSheet();
};

window.cancelEdit = () => {
    window.isEditMode = false; 
    window.editId = null;
    
    const isMM = localStorage.getItem('mtw_lang') === 'mm'; 
    const sv = document.getElementById('lbl-btn-save'); 
    if(sv) sv.innerText = isMM ? 'သိမ်းမည်' : 'Save';
    
    const cancelBtn = document.getElementById('cancel-edit-btn'); 
    if(cancelBtn) cancelBtn.style.display = 'none';
    
    const deleteBtn = document.getElementById('delete-edit-btn'); 
    if(deleteBtn) deleteBtn.style.display = 'none';
    
    const amt = document.getElementById('trans-amount'); 
    if(amt) amt.value = ''; 
    
    const n = document.getElementById('trans-note'); 
    if(n) n.value = '';
    
    const r = document.getElementById('trans-recurring'); 
    if(r) r.checked = false;
    
    const dt = document.getElementById('trans-date'); 
    if(dt) dt.value = window.getLocalToday();
    
    if(window.removeReceipt) window.removeReceipt(); 
    if(window.updateTransDateDisplay) window.updateTransDateDisplay(); 
    window.setTransactionType('Expense');
};

// --- Language Handlers ---
window.openLangSheet = () => { 
    window.haptic(); 
    const ls = document.getElementById('lang-sheet'); 
    if(ls) ls.classList.add('active'); 
    const lo = document.getElementById('lang-overlay'); 
    if(lo) lo.classList.add('active'); 
};

window.closeLangSheet = () => { 
    const ls = document.getElementById('lang-sheet'); 
    if(ls) ls.classList.remove('active'); 
    const lo = document.getElementById('lang-overlay'); 
    if(lo) lo.classList.remove('active'); 
};

window.selectLanguage = (lang) => { 
    window.haptic(); 
    localStorage.setItem('mtw_lang', lang); 
    window.applyLanguage(lang); 
    window.closeLangSheet(); 
};

window.applyLanguage = (lang) => {
    const isMM = lang === 'mm';
    const dispLang = document.getElementById('display-lang'); 
    if(dispLang) dispLang.innerText = isMM ? 'မြန်မာ' : 'English';
    
    const checkEn = document.getElementById('lang-check-en'); 
    const checkMm = document.getElementById('lang-check-mm');
    if(checkEn) checkEn.style.display = isMM ? 'none' : 'block'; 
    if(checkMm) checkMm.style.display = isMM ? 'block' : 'none';

    const lblAuthOr = document.getElementById('lbl-auth-or'); 
    if (lblAuthOr) lblAuthOr.innerText = isMM ? 'သို့မဟုတ်' : 'OR';
    
    const lblGoogleLogin = document.getElementById('lbl-google-login'); 
    if (lblGoogleLogin) lblGoogleLogin.innerText = isMM ? 'Google ဖြင့် ဝင်မည်' : 'Google Login';
    
    const loginBtnText = document.getElementById('lbl-login-btn'); 
    if(loginBtnText) loginBtnText.innerText = window.isLoginMode ? (isMM ? "အကောင့်ဝင်ရန်" : "Login") : (isMM ? "အကောင့်သစ်ဖွင့်ရန်" : "Register");
    
    const toggleText = document.getElementById('auth-toggle-text'); 
    if(toggleText) toggleText.innerText = window.isLoginMode ? (isMM ? "အကောင့်သစ်ဖွင့်ရန်" : "Create Account") : (isMM ? "အကောင့်ဝင်ရန်သို့ ပြန်သွားမည်" : "Back to Login");
    
    const forgotText = document.getElementById('forgot-pwd-text'); 
    if(forgotText) forgotText.innerText = isMM ? "စကားဝှက် မေ့နေပါသလား?" : "Forgot Password?";

    if(isMM) {
        const h = document.querySelector('.nav-home-text'); if(h) h.innerText = 'ပင်မ'; 
        const r = document.querySelector('.nav-report-text'); if(r) r.innerText = 'မှတ်တမ်း'; 
        const s = document.querySelector('.nav-setting-text'); if(s) s.innerText = 'ဆက်တင်';
        
        const wt = document.getElementById('welcome-text'); if(wt) wt.innerText = 'ပြန်လည်ကြိုဆိုပါတယ်!'; 
        const ws = document.getElementById('welcome-sub'); if(ws) ws.innerText = 'စာရင်းသွင်းရန် အောက်ပါ "+" ခလုတ်ကို နှိပ်ပါ။';
        
        const bl = document.getElementById('lbl-balance'); if(bl) bl.innerText = 'လက်ကျန်ငွေ'; 
        const il = document.getElementById('lbl-income'); if(il) il.innerText = 'ဝင်ငွေ'; 
        const el = document.getElementById('lbl-expense'); if(el) el.innerText = 'ထွက်ငွေ';
        
        const ll = document.querySelector('.lbl-lang'); if(ll) ll.innerText = 'ဘာသာစကား'; 
        const tl = document.querySelector('.lbl-theme'); if(tl) tl.innerText = 'အလင်း/အမှောင်'; 
        const rl = document.querySelector('.lbl-reminder'); if(rl) rl.innerText = 'နေ့စဉ်သတိပေးချက်';
        const pl = document.querySelector('.lbl-pwd'); if(pl) pl.innerText = 'စကားဝှက်ပြောင်းရန်'; 
        
        const ab = document.getElementById('lbl-acc-bals'); if(ab) ab.innerText = 'အကောင့်လက်ကျန်များ'; 
        const bu = document.getElementById('lbl-budget-usage'); if(bu) bu.innerText = 'ဘတ်ဂျက်သုံးစွဲမှု';
        const ecsv = document.getElementById('lbl-export-csv'); if(ecsv) ecsv.innerText = 'ဒီလ CSV ထုတ်မည်'; 
        const lio = document.getElementById('lbl-io-chart'); if(lio) lio.innerText = 'ဝင်ငွေ vs ထွက်ငွေ · ၆ လ'; 
        const lct = document.getElementById('lbl-cat-trend'); if(lct) lct.innerText = 'ကဏ္ဍလမ်းကြောင်း · ၆ လ';
        
        const tcl = document.getElementById('lbl-theme-color'); if(tcl) tcl.innerText = 'အရောင်ပြောင်းရန်'; 
        const yl = document.getElementById('lbl-yearly'); if(yl) yl.innerText = 'နှစ်စဉ်'; 
        const fs = document.getElementById('lbl-family-sync'); if(fs) fs.innerText = 'မိသားစု စာရင်းချိတ်ရန်'; 
        const fnote = document.getElementById('lbl-family-note'); if(fnote) fnote.innerText = 'ကိုယ့် QR/Invite code ကို မျှဝေပါ သို့မဟုတ် ဖောက်သည့် code ကို ထည့်ပါ။ ကြည့်ရှုခြင်းသာ ပြုလုပ်နိုင်ပါသည်။';
        const fcopy = document.getElementById('lbl-copy-code'); if(fcopy) fcopy.innerText = 'Invite Code ကူးယူမည်';
        const fview = document.getElementById('lbl-viewing'); if(fview) fview.innerText = 'ကြည့်ရှုနေသည်';
        const fnew = document.getElementById('lbl-new-code'); if(fnew) fnew.innerText = 'ကုဒ်အသစ်ထုတ်မည် (ချိတ်ဆက်မှု ဖြုတ်မည်)';
        const fenter = document.getElementById('lbl-family-enter'); if(fenter) fenter.innerText = 'သို့မဟုတ် Partner ၏ Invite Code ကို ထည့်ပါ:';
        
        const bpl = document.getElementById('lbl-back-plans'); if(bpl) bpl.innerText = 'Plan များ';
        const ypl = document.getElementById('lbl-your-plan'); if(ypl) ypl.innerText = 'ရွေးချယ်ထားသော PLAN';
        const pmet = document.getElementById('lbl-pay-method'); if(pmet) pmet.innerText = 'ငွေပေးချေမှု နည်းလမ်း';
        const pref = document.getElementById('lbl-pay-ref'); if(pref) pref.innerText = 'Reference / Transaction ID';
        const prefIn = document.getElementById('payment-reference'); if(prefIn) prefIn.placeholder = 'ဥပမာ - KPAY123456789';
        const pproof = document.getElementById('lbl-pay-proof'); if(pproof) pproof.innerText = 'ငွေလွှဲပြစာ မျက်နှာပုံ';
        const pnote = document.getElementById('lbl-payment-note'); if(pnote) pnote.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:4px;"></i>Pro access ဖွင့်ရန် Admin မှ သင့်ငွေပေးချေမှုကို စစ်ဆေးအတည်ပြုပါမည်။';
        const psub = document.getElementById('lbl-pay-submit'); if(psub) psub.innerText = 'စစ်ဆေးရန် ပေးပို့မည်';
        
        const ma = document.getElementById('lbl-manage-acc'); if(ma) ma.innerText = 'အကောင့်များ စီမံရန်'; 
        const mc = document.getElementById('lbl-manage-cat'); if(mc) mc.innerText = 'အမျိုးအစားများ စီမံရန်'; 
        const mb = document.getElementById('lbl-manage-bud'); if(mb) mb.innerText = 'ဘတ်ဂျက်များ စီမံရန်'; 
        const mr = document.getElementById('lbl-manage-rec'); if(mr) mr.innerText = 'လစဉ်ပုံမှန် စီမံရန်'; 
        const mg = document.getElementById('lbl-manage-goal'); if(mg) mg.innerText = 'ရည်မှန်းချက်များ စီမံရန်'; 
        const md = document.getElementById('lbl-manage-debt'); if(md) md.innerText = 'အကြွေးများ စီမံရန်'; 
        const mcu = document.getElementById('lbl-manage-cur'); if(mcu) mcu.innerText = 'ငွေကြေးအမျိုးအစား စီမံရန်';
        
        const sp = document.getElementById('lbl-setup-pin'); if(sp) sp.innerText = 'App PIN သတ်မှတ်ရန်'; 
        const sbi = document.getElementById('lbl-setup-bio'); if (sbi) sbi.innerText = 'မျက်နှာ / လက်ဗွေ စနစ်ထည့်ရန်'; 
        const bk = document.getElementById('lbl-backup'); if(bk) bk.innerText = 'ဒေတာ သိမ်းဆည်းရန်'; 
        const rs = document.getElementById('lbl-restore'); if(rs) rs.innerText = 'ဒေတာ ပြန်လည်ထည့်သွင်းရန်'; 
        const abt = document.getElementById('lbl-about'); if(abt) abt.innerText = 'App အကြောင်း';
        
        const lo = document.getElementById('lbl-logout'); if(lo) lo.innerText = 'အကောင့်ထွက်မည်'; 
        const tt = document.getElementById('lbl-trans-title'); if(tt) tt.innerText = 'စာရင်းသွင်းရန်'; 
        const tr = document.getElementById('lbl-trans-rec'); if(tr) tr.innerText = 'လစဉ်ထပ်ထည့်မည်';
        
        const bs = document.getElementById('lbl-btn-save'); if(bs) bs.innerText = window.isEditMode ? 'ပြန်ပြင်မည်' : 'သိမ်းမည်'; 
        const bc = document.getElementById('lbl-btn-cancel'); if(bc) bc.innerText = 'ဖျက်သိမ်းမည်'; 
        const bd = document.getElementById('lbl-btn-delete'); if(bd) bd.innerText = 'စာရင်းဖျက်မည်';
        
        const mda = document.getElementById('lbl-mdl-acc'); if(mda) mda.innerText = 'အကောင့်များ စီမံရန်'; 
        const mdc = document.getElementById('lbl-mdl-cat'); if(mdc) mdc.innerText = 'အမျိုးအစားများ စီမံရန်'; 
        const mdb = document.getElementById('lbl-mdl-bud'); if(mdb) mdb.innerText = 'ဘတ်ဂျက်များ စီမံရန်'; 
        const mdg = document.getElementById('lbl-mdl-goal'); if(mdg) mdg.innerText = 'ရည်မှန်းချက်များ စီမံရန်'; 
        const mdcu = document.getElementById('lbl-mdl-cur'); if(mdcu) mdcu.innerText = 'ငွေကြေးအမျိုးအစား စီမံရန်'; 
        const mdr = document.getElementById('lbl-mdl-rec'); if(mdr) mdr.innerText = 'လစဉ်ပုံမှန် စီမံရန်'; 
        const mdd = document.getElementById('lbl-mdl-debt'); if(mdd) mdd.innerText = 'အကြွေးများ စီမံရန်'; 
        const dtl = document.getElementById('lbl-debt-type-lend'); if(dtl) dtl.innerText = 'ချေးပေးထားတယ်'; 
        const dtb = document.getElementById('lbl-debt-type-borrow'); if(dtb) dtb.innerText = 'ချေးယူထားတယ်'; 
        
        const cc = document.getElementById('lbl-choose-color'); if(cc) cc.innerText = 'အဓိကအရောင် ရွေးချယ်ရန်';
        const subTitle = document.getElementById('sub-title'); if (subTitle && !window.isProUser()) subTitle.innerText = "Pro သို့ အဆင့်မြှင့်ရန်";
    } else {
        const h = document.querySelector('.nav-home-text'); if(h) h.innerText = 'Home'; 
        const r = document.querySelector('.nav-report-text'); if(r) r.innerText = 'Report'; 
        const s = document.querySelector('.nav-setting-text'); if(s) s.innerText = 'Setting';
        
        const wt = document.getElementById('welcome-text'); if(wt) wt.innerText = 'Welcome Back!'; 
        const ws = document.getElementById('welcome-sub'); if(ws) ws.innerText = 'Tap the "+" button below to track your finances.';
        
        const bl = document.getElementById('lbl-balance'); if(bl) bl.innerText = 'Balance'; 
        const il = document.getElementById('lbl-income'); if(il) il.innerText = 'Income'; 
        const el = document.getElementById('lbl-expense'); if(el) el.innerText = 'Expense';
        
        const ll = document.querySelector('.lbl-lang'); if(ll) ll.innerText = 'Language'; 
        const tl = document.querySelector('.lbl-theme'); if(tl) tl.innerText = 'Display Theme'; 
        const rl = document.querySelector('.lbl-reminder'); if(rl) rl.innerText = 'Daily Reminder';
        const pl = document.querySelector('.lbl-pwd'); if(pl) pl.innerText = 'Change Password'; 
        
        const ab = document.getElementById('lbl-acc-bals'); if(ab) ab.innerText = 'Account Balances'; 
        const bu = document.getElementById('lbl-budget-usage'); if(bu) bu.innerText = 'Budget Usage';
        const ecsv = document.getElementById('lbl-export-csv'); if(ecsv) ecsv.innerText = 'Export this month (CSV)'; 
        const lio = document.getElementById('lbl-io-chart'); if(lio) lio.innerText = 'Income vs Expense · 6 months'; 
        const lct = document.getElementById('lbl-cat-trend'); if(lct) lct.innerText = 'Category Trends · 6 months';
        
        const tcl = document.getElementById('lbl-theme-color'); if(tcl) tcl.innerText = 'Theme Color'; 
        const yl = document.getElementById('lbl-yearly'); if(yl) yl.innerText = 'Yearly'; 
        const fs = document.getElementById('lbl-family-sync'); if(fs) fs.innerText = 'Family Sync'; 
        const fnote = document.getElementById('lbl-family-note'); if(fnote) fnote.innerText = "Share your QR / invite code, or enter a partner's code. Viewing is read-only.";
        const fcopy = document.getElementById('lbl-copy-code'); if(fcopy) fcopy.innerText = 'Copy Invite';
        const fview = document.getElementById('lbl-viewing'); if(fview) fview.innerText = 'Viewing';
        const fnew = document.getElementById('lbl-new-code'); if(fnew) fnew.innerText = 'New Code (Revoke Access)';
        const fenter = document.getElementById('lbl-family-enter'); if(fenter) fenter.innerText = "Or paste partner's invite code:";
        
        const bpl = document.getElementById('lbl-back-plans'); if(bpl) bpl.innerText = 'Plans';
        const ypl = document.getElementById('lbl-your-plan'); if(ypl) ypl.innerText = 'SELECTED PLAN';
        const pmet = document.getElementById('lbl-pay-method'); if(pmet) pmet.innerText = 'Payment Method';
        const pref = document.getElementById('lbl-pay-ref'); if(pref) pref.innerText = 'Reference / Transaction ID';
        const prefIn = document.getElementById('payment-reference'); if(prefIn) prefIn.placeholder = 'e.g., KPAY123456789';
        const pproof = document.getElementById('lbl-pay-proof'); if(pproof) pproof.innerText = 'Payment Screenshot';
        const pnote = document.getElementById('lbl-payment-note'); if(pnote) pnote.innerHTML = '<i class="fa-solid fa-shield-halved" style="margin-right:4px;"></i>Admin will verify your payment before Pro access is activated.';
        const psub = document.getElementById('lbl-pay-submit'); if(psub) psub.innerText = 'Submit for Review';
        
        const ma = document.getElementById('lbl-manage-acc'); if(ma) ma.innerText = 'Manage Accounts'; 
        const mc = document.getElementById('lbl-manage-cat'); if(mc) mc.innerText = 'Manage Categories'; 
        const mb = document.getElementById('lbl-manage-bud'); if(mb) mb.innerText = 'Manage Budgets'; 
        const mr = document.getElementById('lbl-manage-rec'); if(mr) mr.innerText = 'Manage Recurring'; 
        const mg = document.getElementById('lbl-manage-goal'); if(mg) mg.innerText = 'Manage Goals'; 
        const md = document.getElementById('lbl-manage-debt'); if(md) md.innerText = 'Manage Debts'; 
        const mcu = document.getElementById('lbl-manage-cur'); if(mcu) mcu.innerText = 'Manage Currencies';
        
        const sp = document.getElementById('lbl-setup-pin'); if(sp) sp.innerText = 'Setup App PIN'; 
        const sbi = document.getElementById('lbl-setup-bio'); if (sbi) sbi.innerText = 'Setup Face ID / Fingerprint'; 
        const bk = document.getElementById('lbl-backup'); if(bk) bk.innerText = 'Backup Data'; 
        const rs = document.getElementById('lbl-restore'); if(rs) rs.innerText = 'Restore Data'; 
        const abt = document.getElementById('lbl-about'); if(abt) abt.innerText = 'About';
        
        const lo = document.getElementById('lbl-logout'); if(lo) lo.innerText = 'Logout'; 
        const tt = document.getElementById('lbl-trans-title'); if(tt) tt.innerText = 'Transaction'; 
        const tr = document.getElementById('lbl-trans-rec'); if(tr) tr.innerText = 'Repeat Monthly';
        
        const bs = document.getElementById('lbl-btn-save'); if(bs) bs.innerText = window.isEditMode ? 'Update' : 'Save'; 
        const bc = document.getElementById('lbl-btn-cancel'); if(bc) bc.innerText = 'Cancel Edit'; 
        const bd = document.getElementById('lbl-btn-delete'); if(bd) bd.innerText = 'Delete Transaction';
        
        const mda = document.getElementById('lbl-mdl-acc'); if(mda) mda.innerText = 'Manage Accounts'; 
        const mdc = document.getElementById('lbl-mdl-cat'); if(mdc) mdc.innerText = 'Manage Categories'; 
        const mdb = document.getElementById('lbl-mdl-bud'); if(mdb) mdb.innerText = 'Manage Budgets'; 
        const mdg = document.getElementById('lbl-mdl-goal'); if(mdg) mdg.innerText = 'Manage Goals'; 
        const mdcu = document.getElementById('lbl-mdl-cur'); if(mdcu) mdcu.innerText = 'Manage Currencies'; 
        const mdr = document.getElementById('lbl-mdl-rec'); if(mdr) mdr.innerText = 'Manage Recurring'; 
        const mdd = document.getElementById('lbl-mdl-debt'); if(mdd) mdd.innerText = 'Manage Debts'; 
        const dtl = document.getElementById('lbl-debt-type-lend'); if(dtl) dtl.innerText = 'Lent Out'; 
        const dtb = document.getElementById('lbl-debt-type-borrow'); if(dtb) dtb.innerText = 'Borrowed'; 
        
        const cc = document.getElementById('lbl-choose-color'); if(cc) cc.innerText = 'Choose Accent Color';
        const subTitle = document.getElementById('sub-title'); if (subTitle && !window.isProUser()) subTitle.innerText = "Upgrade to Pro";
    }
};

// --- Calculator Handler ---
window.calcValue = '0';

window.openCalculator = () => { 
    window.haptic(); 
    const msg = `
        <div class="input-group glass-panel" style="margin-top:5px; padding: 15px; border-radius: 15px;">
            <input type="text" id="calc-display" value="0" readonly style="font-size:26px; font-weight:800; width:100%; border:none; outline:none; background:transparent; color:var(--text-color); text-align: right; pointer-events: none; letter-spacing: 1px;">
        </div>
        <div class="calc-grid">
            <button class="calc-btn op-btn" onclick="calcInput('C')">C</button>
            <button class="calc-btn op-btn" onclick="calcInput('DEL')">⌫</button>
            <button class="calc-btn op-btn" onclick="calcInput('/')">÷</button>
            <button class="calc-btn op-btn" onclick="calcInput('*')">×</button>
            <button class="calc-btn" onclick="calcInput('7')">7</button>
            <button class="calc-btn" onclick="calcInput('8')">8</button>
            <button class="calc-btn" onclick="calcInput('9')">9</button>
            <button class="calc-btn op-btn" onclick="calcInput('-')">−</button>
            <button class="calc-btn" onclick="calcInput('4')">4</button>
            <button class="calc-btn" onclick="calcInput('5')">5</button>
            <button class="calc-btn" onclick="calcInput('6')">6</button>
            <button class="calc-btn op-btn" onclick="calcInput('+')">+</button>
            <button class="calc-btn" onclick="calcInput('1')">1</button>
            <button class="calc-btn" onclick="calcInput('2')">2</button>
            <button class="calc-btn" onclick="calcInput('3')">3</button>
            <button class="calc-btn action-btn" style="grid-row: span 2;" onclick="calcInput('=')">=</button>
            <button class="calc-btn" style="grid-column: span 2;" onclick="calcInput('0')">0</button>
            <button class="calc-btn" onclick="calcInput('.')">.</button>
        </div>`; 
    
    document.getElementById('modal-title').innerText = "Calculator"; 
    document.getElementById('modal-title').style.display = 'block'; 
    document.getElementById('modal-message').innerHTML = msg; 
    document.getElementById('modal-buttons').innerHTML = `
        <div style="display:flex; gap:10px; margin-top: 5px;">
            <button class="glass-panel" onclick="closeCustomModal()" style="color:var(--text-color); border: none;">Close</button>
            <button onclick="applyCalc()">Confirm</button>
        </div>`; 
    
    document.getElementById('custom-modal').style.display = 'flex'; 
    
    window.calcValue = document.getElementById('trans-amount').value || '0'; 
    document.getElementById('calc-display').value = window.calcValue; 
};

window.calcInput = (val) => { 
    window.haptic(); 
    const disp = document.getElementById('calc-display'); 
    if(!disp) return; 
    
    if(val === 'C') { 
        window.calcValue = '0'; 
    } else if (val === 'DEL') { 
        window.calcValue = window.calcValue.length > 1 ? window.calcValue.slice(0, -1) : '0'; 
    } else if (val === '=') { 
        try { 
            let expr = window.calcValue.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-'); 
            expr = expr.replace(/[^0-9+\-*/.]/g, ''); 
            if(expr) { 
                let res = eval(expr); 
                res = Math.round(res * 1000) / 1000; 
                window.calcValue = res.toString(); 
            } 
        } catch(e) { 
            window.calcValue = 'Error'; 
            setTimeout(() => { 
                window.calcValue = '0'; 
                disp.value = window.calcValue; 
            }, 1000); 
        } 
    } else { 
        let displayChar = val; 
        if(val === '*') displayChar = '×'; 
        if(val === '/') displayChar = '÷'; 
        if(val === '-') displayChar = '−'; 
        
        if(window.calcValue === '0' && val !== '.') { 
            window.calcValue = displayChar; 
        } else { 
            window.calcValue += displayChar; 
        } 
    } 
    disp.value = window.calcValue; 
};

window.applyCalc = () => { 
    window.haptic(); 
    if(window.calcValue !== 'Error') { 
        try { 
            let expr = window.calcValue.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/[^0-9+\-*/.]/g, ''); 
            let finalRes = eval(expr) || 0; 
            document.getElementById('trans-amount').value = Math.round(finalRes * 100) / 100; 
        } catch(e) {} 
    } 
    window.closeCustomModal(); 
};

// ====================================================
// 🌟 MONTH & YEAR PICKER LOGIC 🌟
// ====================================================

window.tempSelectedMonth = null;

window.openMonthPicker = () => {
    window.haptic();
    const modal = document.getElementById('month-picker-modal');
    if(!modal) return;

    const yearSelect = document.getElementById('picker-year');
    if(yearSelect && yearSelect.options.length === 0) {
        const currentYear = new Date().getFullYear();
        for(let y = currentYear - 5; y <= currentYear + 5; y++) {
            const opt = document.createElement('option');
            opt.value = y; opt.innerText = y;
            yearSelect.appendChild(opt);
        }
    }
    if(yearSelect) yearSelect.value = document.getElementById('report-year')?.value || new Date().getFullYear();

    const monthGrid = document.getElementById('picker-month-grid');
    if(monthGrid) {
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        let html = '';
        const currentMonthVal = document.getElementById('report-month')?.value; 
        const selM = currentMonthVal ? currentMonthVal.split('-')[1] : String(new Date().getMonth() + 1).padStart(2, '0');
        
        window.tempSelectedMonth = selM; 

        monthNames.forEach((m, idx) => {
            const mNum = String(idx + 1).padStart(2, '0');
            const isActive = (mNum === selM) ? 'background: var(--primary-gradient); color: white; box-shadow: var(--primary-shadow);' : 'background: var(--input-bg); color: var(--text-color); box-shadow: var(--inner-shadow-track);';
            html += `<div class="picker-month-btn" style="${isActive}; transition: all 0.2s;" onclick="window.selectPickerMonth('${mNum}', this)">${m}</div>`;
        });
        monthGrid.innerHTML = html;
    }
    
    if (window.currentReportView === 'Yearly') {
        if(monthGrid) monthGrid.style.display = 'none';
        document.getElementById('picker-modal-title').innerText = "Select Year";
    } else {
        if(monthGrid) monthGrid.style.display = 'grid';
        document.getElementById('picker-modal-title').innerText = "Select Date";
    }

    modal.style.display = 'flex';
};

window.selectPickerMonth = (mNum, el) => {
    window.haptic();
    window.tempSelectedMonth = mNum;
    
    const monthGrid = document.getElementById('picker-month-grid');
    if(monthGrid) {
        Array.from(monthGrid.children).forEach(div => {
            div.style.background = 'var(--input-bg)';
            div.style.color = 'var(--text-color)';
            div.style.boxShadow = 'var(--inner-shadow-track)';
        });
    }
    el.style.background = 'var(--primary-color)';
    el.style.color = 'white';
    el.style.boxShadow = 'var(--primary-shadow)';
};

window.closeMonthPicker = () => {
    const modal = document.getElementById('month-picker-modal');
    if(modal) modal.style.display = 'none';
};

window.applyMonthPicker = () => {
    window.haptic();
    const yearVal = document.getElementById('picker-year')?.value || new Date().getFullYear();
    
    if (window.currentReportView === 'Yearly') {
        document.getElementById('report-year').value = yearVal;
    } else {
        const mNum = window.tempSelectedMonth || String(new Date().getMonth() + 1).padStart(2, '0');
        document.getElementById('report-month').value = `${yearVal}-${mNum}`;
        document.getElementById('report-year').value = yearVal;
    }
    
    window.closeMonthPicker();
    if(window.onMonthFilterChange) window.onMonthFilterChange();
};

// ==========================================
// 🌟 AI Receipt Scanner (Tesseract.js) 🌟
// ==========================================

window.scanReceiptPrompt = () => {
    window.haptic();
    if(!window.isProUser()) {
        return window.showProPaymentDialog(); 
    }
    document.getElementById('camera-input').click();
};

window.scanReceipt = async (input) => {
    if (!input.files || !input.files[0]) return;
    const file = input.files[0];

    if (window.customLoading) {
        window.customLoading("AI is scanning the receipt...<br><span style='font-size:12px; color:var(--secondary-text);'>This might take a few seconds.</span>", "Scanning Receipt");
    }

    try {
        const result = await Tesseract.recognize(file, 'eng', {
            logger: m => console.log(m)
        });

        const text = result.data.text;
        const amounts = text.match(/[\d,]+\.\d{2}|[\d,]+/g) || [];
        let maxAmount = 0;

        amounts.forEach(amtStr => {
            const num = parseFloat(amtStr.replace(/,/g, ''));
            if (!isNaN(num) && num > maxAmount) {
                maxAmount = num; 
            }
        });

        if (window.closeCustomModal) window.closeCustomModal();

        if (maxAmount > 0) {
            document.getElementById('trans-amount').value = maxAmount;
            window.customAlert(`Found amount: <b>${maxAmount.toLocaleString()}</b>`, "Scan Successful");
        } else {
            window.customAlert("Could not detect a valid amount. Please enter manually.", "Scan Failed");
        }
    } catch (error) {
        console.error(error);
        if (window.closeCustomModal) window.closeCustomModal();
        window.customAlert("An error occurred during scanning. Please try again.", "Scan Failed");
    }
    
    input.value = ""; 
};
