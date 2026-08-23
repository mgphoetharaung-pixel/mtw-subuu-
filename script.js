import { auth } from './firebase-config.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// ဖိုင်ခွဲများကို ချိတ်ဆက်ခြင်း
import './time-utils.js';
import './ui-handlers.js';
import './auth.js';
import './database.js';
import './features.js';
import './payment.js';
import './ai-assistant.js';

document.addEventListener("DOMContentLoaded", () => {
    // အရင်သိမ်းထားသော Theme များကို ပြန်ခေါ်ခြင်း
    const savedTheme = localStorage.getItem('mtw_theme');
    if (savedTheme === 'dark') {
        document.body.classList.add('dark-mode');
        const icon = document.getElementById('theme-icon');
        const text = document.getElementById('theme-text');
        if(icon && text) { 
            icon.className = 'fa-solid fa-moon input-icon-inline'; 
            icon.style.backgroundColor = '#000000'; 
            text.innerText = 'Dark'; 
        }
    }
    
    const savedColor = localStorage.getItem('mtw_theme_color');
    if(savedColor && window.setAppThemeColor) window.setAppThemeColor(savedColor);
    
    const savedLang = localStorage.getItem('mtw_lang') || 'en';
    if(window.applyLanguage) window.applyLanguage(savedLang);
    
    const savedTime = localStorage.getItem('mtw_reminder_time');
    if(window.updateTimeDisplay) window.updateTimeDisplay(savedTime || '--:--');

    // Authentication (အကောင့်ဝင်ထားခြင်း ရှိမရှိ စစ်ဆေးခြင်း)
    onAuthStateChanged(auth, (user) => {
        const loading = document.getElementById('loading-screen'); 
        if(loading) loading.style.display = 'none';
        
        if (user) {
            window.currentUser = user;
            if(window.currentUser.photoURL && window.setAppProfileImage) {
                window.setAppProfileImage(window.currentUser.photoURL);
            }
            window.activeUid = localStorage.getItem('mtw_sync_uid_'+user.uid) || user.uid;
            
            // PIN စစ်ဆေးခြင်း
            const savedPin = localStorage.getItem('mtw_pin_'+user.uid);
            const pinScreen = document.getElementById('pin-screen'); 
            if(pinScreen) pinScreen.style.display = savedPin ? 'flex' : 'none';

            // UI အပြောင်းအလဲများ
            const authScreen = document.getElementById('auth-screen');
            if(authScreen) authScreen.style.display = 'none';
            
            const mainApp = document.getElementById('main-app');
            if(mainApp) mainApp.style.display = 'flex';
            
            // စနစ်များ ပြန်လည်စတင်ခြင်း
            if(window.setTransactionType) window.setTransactionType('Expense'); 
            if(window.setupRealtimeListeners) window.setupRealtimeListeners();
            if(window.updateCurrencyDropdown) window.updateCurrencyDropdown();
        } else {
            const authScreen = document.getElementById('auth-screen');
            if(authScreen) authScreen.style.display = 'flex';
            
            const mainApp = document.getElementById('main-app');
            if(mainApp) mainApp.style.display = 'none';
            
            const pinScreen = document.getElementById('pin-screen'); 
            if(pinScreen) pinScreen.style.display = 'none';
        }
    });
});
