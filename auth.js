import { auth, googleProvider, db } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signInWithRedirect, 
    signInWithPopup, 
    getRedirectResult, 
    signOut, 
    updatePassword, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

window.isLoginMode = true;

googleProvider.setCustomParameters({
    prompt: 'select_account'
});

window.toggleAuthMode = () => { 
    window.isLoginMode = !window.isLoginMode; 
    const lang = localStorage.getItem('mtw_lang') || 'en';
    const isMM = lang === 'mm';
    
    const authTitle = document.getElementById('auth-title');
    if(authTitle) authTitle.innerText = window.isLoginMode ? (isMM ? "အကောင့်ဝင်ရန်" : "Login") : (isMM ? "အကောင့်သစ်ဖွင့်ရန်" : "Register");
    
    const loginBtnText = document.getElementById('lbl-login-btn');
    if(loginBtnText) loginBtnText.innerText = window.isLoginMode ? (isMM ? "အကောင့်ဝင်ရန်" : "Login") : (isMM ? "အကောင့်သစ်ဖွင့်ရန်" : "Register");
    
    const toggleText = document.getElementById('auth-toggle-text');
    if(toggleText) toggleText.innerText = window.isLoginMode ? (isMM ? "အကောင့်သစ်ဖွင့်ရန်" : "Create Account") : (isMM ? "အကောင့်ဝင်ရန်သို့ ပြန်သွားမည်" : "Back to Login");
    
    const forgotText = document.getElementById('forgot-pwd-text');
    if(forgotText) { 
        forgotText.style.display = window.isLoginMode ? "block" : "none"; 
        forgotText.innerText = isMM ? "စကားဝှက် မေ့နေပါသလား?" : "Forgot Password?"; 
    }
};

window.handleAuth = async () => { 
    const email = document.getElementById('email-input').value.trim(); 
    const password = document.getElementById('password-input').value.trim(); 
    
    if (!email || !password) return window.customAlert("Please fill email and password."); 
    window.customLoading("Authenticating..."); 
    
    try { 
        if (window.isLoginMode) {
            await signInWithEmailAndPassword(auth, email, password); 
        } else {
            await createUserWithEmailAndPassword(auth, email, password); 
        }
        window.closeCustomModal(); 
    } catch(e) { 
        window.closeCustomModal(); 
        window.customAlert(e.message); 
    } 
};

// Google login error များကို အသုံးပြုသူ နားလည်နိုင်မည့် အကြောင်းအလင်းဖြင့် ပြသခြင်း
const googleErrorText = (error) => {
    const code = String(error?.code || '');
    const mm = localStorage.getItem('mtw_lang') === 'mm';
    if (code.includes('web-storage-unsupported') || code.includes('storage-unsupported')) {
        return mm ? "Browser က third-party cookies/storage ပိတ်ထားလို့ Google Login မအလုပ်လုပ်ပါ။ Browser Settings → Cookies မှာ ခွင့်ပြုပါ (သို့) Chrome ဖြင့် စမ်းပါ။"
                  : "Your browser is blocking third-party cookies/storage, so Google Login cannot work. Allow cookies in browser settings (or try Chrome).";
    }
    if (code.includes('unauthorized-domain')) {
        return mm ? "ဤ domain ကို ခွင့်ပြုရန် လိုအပ်ပါသည်။"
                  : "This domain must be added in Firebase Console → Authentication → Settings → Authorized domains.";
    }
    if (code.includes('operation-not-allowed')) {
        return mm ? "Google provider ကို ခွင့်ပြုထားခြင်း မရှိပါ။"
                  : "The Google provider is not enabled in Firebase Console → Sign-in method.";
    }
    if (code.includes('popup-blocked')) {
        return mm ? "Popup ပိတ်ထားသဖြင့် မဖွင့်နိုင်ပါ။ Popup ခွင့်ပြုပါ။"
                  : "The popup was blocked. Please allow popups for this site.";
    }
    if (code.includes('network-request-failed')) {
        return mm ? "အင်တာနက် ချိတ်ဆက်မှု စစ်ဆေးပါ။"
                  : "Network error. Please check your internet connection.";
    }
    return (error?.message || error?.code || 'Unknown error');
};

// 🌟 Google Sign-in (Popup အရင်၊ မရရင် Redirect — WebView/Mobile အတွက်)
window.signInWithGoogle = async () => { 
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    window.customLoading(isMM ? "Google နှင့် ချိတ်ဆက်နေပါသည်..." : "Connecting to Google..."); 
    
    try { 
        await signInWithPopup(auth, googleProvider); 
        window.closeCustomModal(); 
    } catch(error) { 
        console.error("Google Login Error:", error);

        // Popup ပိတ်ထား/မထောက်ပံ့သော environment (WebView စသည်) တွင် Redirect ဖြင့် ပြန်ကြိုးစားသည်
        if (['auth/popup-blocked', 'auth/operation-not-supported-in-this-environment', 'auth/cancelled-popup-request'].includes(error.code)) {
            try {
                await signInWithRedirect(auth, googleProvider);
            } catch(redirectError) {
                console.error("Google Redirect Error:", redirectError);
                window.closeCustomModal(); 
                window.customAlert("Google Login Error: " + googleErrorText(redirectError));
            }
            return;
        }

        window.closeCustomModal(); 
        if (error.code !== 'auth/popup-closed-by-user') {
            window.customAlert("Google Login Error: " + googleErrorText(error));
        }
    } 
};

// Redirect မှ ပြန်လာသည့်အခါ Login အောင်မြင်မှုကို စစ်ဆေးခြင်း
// Error ဖြစ်ခဲ့ပါက user မြင်ရသည့် alert ဖြင့် ပြသည် (console ထဲမှာသာ မဝှက်တော့ပါ)
getRedirectResult(auth).then((result) => {
    if (result) {
        window.closeCustomModal();
        console.log("Login successful via redirect");
    }
}).catch((error) => {
    window.closeCustomModal();
    console.error("Redirect Login Error:", error);
    window.customAlert("Google Login Error: " + googleErrorText(error));
});

window.logoutUser = () => { 
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    window.customConfirm(isMM ? "အကောင့်မှ ထွက်မည် သေချာပါသလား?" : "Are you sure you want to logout?", async () => { 
        window.customLoading(isMM ? "ထွက်နေပါသည်..." : "Logging out...");
        try {
            await signOut(auth); 
            window.location.reload(); 
        } catch(e) {
            window.closeCustomModal();
            window.customAlert(e.message);
        }
    }); 
};

window.forgotPassword = async () => { 
    const email = document.getElementById('email-input').value.trim(); 
    if (!email) return window.customAlert("Please enter your Email Address."); 
    
    window.customLoading("Sending reset link..."); 
    try { 
        await sendPasswordResetEmail(auth, email); 
        window.closeCustomModal(); 
        window.customAlert(`Reset link sent to ${email}`); 
    } catch(e) { 
        window.closeCustomModal(); 
        window.customAlert(e.message); 
    } 
};

window.openChangePassword = () => { 
    const m = document.getElementById('password-modal'); 
    if(m) m.style.display = 'flex'; 
};

window.closeChangePassword = () => { 
    const m = document.getElementById('password-modal'); 
    if(m) m.style.display = 'none'; 
};

window.updateUserPassword = async () => { 
    const pwd = document.getElementById('new-password').value; 
    if (!pwd || pwd.length < 6) return window.customAlert("Password minimum 6 characters."); 
    
    window.customLoading("Updating..."); 
    try { 
        await updatePassword(window.currentUser, pwd); 
        window.closeCustomModal(); 
        window.closeChangePassword(); 
        window.customAlert("Password changed!"); 
    } catch(e) { 
        window.closeCustomModal(); 
        window.customAlert(e.message); 
    } 
};

window.uploadProfilePicture = async (input) => { 
    if (!input.files || !input.files[0] || !window.currentUser) return; 
    
    const file = input.files[0]; 
    window.closeProfileModal(); 
    window.customLoading("Uploading image..."); 
    
    try { 
        const imgData = await new Promise((resolve, reject) => { 
            const reader = new FileReader(); 
            reader.onload = e => resolve(e.target.result); 
            reader.onerror = reject; 
            reader.readAsDataURL(file); 
        }); 
        
        const img = new Image(); 
        await new Promise((resolve, reject) => { 
            img.onload = resolve; 
            img.onerror = reject; 
            img.src = imgData; 
        }); 
        
        const canvas = document.createElement('canvas'); 
        const ctx = canvas.getContext('2d'); 
        const size = Math.min(img.width, img.height); 
        canvas.width = canvas.height = 300; 
        
        ctx.drawImage(img, (img.width-size)/2, (img.height-size)/2, size, size, 0, 0, 300, 300); 
        
        // Storage မသုံးနိုင်လို့ base64 data URL အနေနဲ့ profile doc ထဲ သိမ်းသည်
        const imageUrl = canvas.toDataURL('image/jpeg', 0.8);
        await setDoc(doc(db, "users", window.currentUser.uid), { profileUrl: imageUrl }, { merge: true }); 
        
        window.closeCustomModal(); 
        window.customAlert("Profile updated!"); 
    } catch(e) { 
        window.closeCustomModal(); 
        window.customAlert("Upload failed: " + e.message); 
    } 
    input.value = ""; 
};
