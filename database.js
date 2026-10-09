import { db } from './firebase-config.js';
import { collection, addDoc, deleteDoc, doc, updateDoc, onSnapshot, query, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// ပြုတ်ကျန်ခဲ့သော Global State များကို အတိအကျ ကြေညာပေးခြင်း
window.unsubscribeSnapshots = window.unsubscribeSnapshots || [];
window.hasCheckedRecurring = window.hasCheckedRecurring || false;
window.userProfileData = window.userProfileData || { plan: 'Free', expiryDate: null, profileUrl: null };
window.currentPin = window.currentPin || '';
window.calcValue = window.calcValue || '0';

// Family Sync helpers: partner data is read-only for the viewer.
window.isViewingPartner = () => !!(window.currentUser && window.activeUid && window.activeUid !== window.currentUser.uid);
window.readOnlyAlert = () => {
    const mm = localStorage.getItem('mtw_lang') === 'mm';
    window.customAlert(mm ? "မိသားစုဝင်၏ စာရင်းကို ကြည့်ရှုသာနိုင်ပါသည် (ပြင်ဆင်ခွင့် မရှိပါ)။"
                          : "You are viewing a family member's records. This view is read-only.");
};
window.familyErrorText = (e) => {
    const mm = localStorage.getItem('mtw_lang') === 'mm';
    const code = String(e?.code || '');
    if (code.includes('not-found')) return mm ? "ကုဒ်နံပါတ် မတွေ့ပါ။ ပြန်စစ်ဆေးပါ။" : "Family code not found. Please double-check it.";
    if (code.includes('unavailable') || code.includes('internal') || code.includes('deadline-exceeded')) return mm ? "ဆာဗာနှင့် ချိတ်ဆက်မရပါ။ ခဏနေ ပြန်စမ်းပါ。" : "Could not reach the server. Please try again shortly.";
    return (e && e.message) ? e.message : (mm ? "ချိတ်ဆက်မှု မအောင်မြင်ပါ။" : "Connection failed.");
};

window.clearRealtimeListeners = () => { 
    if(window.unsubscribeSnapshots && window.unsubscribeSnapshots.length > 0) {
        window.unsubscribeSnapshots.forEach(u=>u()); 
    }
    window.unsubscribeSnapshots = []; 
};

window.resetGlobalData = () => { 
    window.globalTransactions=[]; window.globalAccounts=[]; window.globalCategories=[]; 
    window.globalBudgets=[]; window.globalGoals=[]; window.globalDebts=[]; 
    window.globalCurrencies=[]; window.globalRecurring=[]; 
};

// Realtime Listeners 
const handleSyncListenerError = (label) => (err) => {
    console.warn(`[${label}] listener error:`, err);
    if (err && err.code === 'permission-denied' && window.isViewingPartner && window.isViewingPartner()) {
        const myUid = window.currentUser ? window.currentUser.uid : null;
        if (myUid) {
            const mm = localStorage.getItem('mtw_lang') === 'mm';
            window.customAlert(mm ? 'Family link ပျက်နေပါသည်။ Family Sync မှ ပြန်ချိတ်ဆက်ပါ။'
                                  : 'Your family link is no longer valid. Please reconnect in Family Sync.', 'Family Sync');
            localStorage.removeItem('mtw_sync_uid_' + myUid);
            window.activeUid = myUid;
            window.clearRealtimeListeners();
            window.resetGlobalData();
            window.setupRealtimeListeners();
        }
    }
};

window.setupRealtimeListeners = () => { 
    if(!window.activeUid) return; 
    window.clearRealtimeListeners(); 
    
    window.unsubscribeSnapshots = [];
    
    window.unsubscribeSnapshots.push(onSnapshot(doc(db,"users",window.activeUid),(ds)=>{ 
        if(ds.exists()) { window.userProfileData={...window.userProfileData,...ds.data()}; } 
        else { window.userProfileData={plan:'Free',expiryDate:null}; } 
        const title=document.getElementById('sub-title'); 
        if(title) title.innerText = window.isProUser() ? `${window.userProfileData.plan.toUpperCase()} MEMBER` : (localStorage.getItem('mtw_lang') === 'mm' ? "Pro သို့ အဆင့်မြှင့်ရန်" : "Upgrade to Pro"); 
        if(window.currentUser){ 
            const nameDisplay = document.getElementById('settings-profile-name');
            if(nameDisplay) nameDisplay.innerText = window.userProfileData.name || window.currentUser.displayName || window.currentUser.email.split('@')[0]; 
            const emailDisplay = document.getElementById('settings-profile-email');
            if(emailDisplay) emailDisplay.innerText = window.currentUser.email; 
            const photo = window.userProfileData.profileUrl || window.currentUser.photoURL; 
            if(photo && window.setAppProfileImage) window.setAppProfileImage(photo); 
        } 
    }, handleSyncListenerError('profile')));

    window.unsubscribeSnapshots.push(onSnapshot(query(collection(db,"users",window.activeUid,"transactions"),orderBy("timestamp","desc")),(s)=>{ 
        window.globalTransactions=s.docs.map(d=>({id:d.id,...d.data()})); 
        if(window.updateAccountBalances) window.updateAccountBalances(); 
        if(window.renderReport) window.renderReport(); 
        if(window.updateQuickRecentList) window.updateQuickRecentList(); 
        if(!window.hasCheckedRecurring && window.globalTransactions.length>0){ 
            window.hasCheckedRecurring=true; 
            if(window.checkAndRunAutoRecurring) window.checkAndRunAutoRecurring(); 
        } 
    })); 

    window.unsubscribeSnapshots.push(onSnapshot(collection(db,"users",window.activeUid,"accounts"),(s)=>{ window.globalAccounts=s.docs.map(d=>({id:d.id,name:d.data().name})); if(window.updateAccountDropdowns) window.updateAccountDropdowns(); if(window.updateAccountsManagerList) window.updateAccountsManagerList(); if(window.updateAccountBalances) window.updateAccountBalances(); }, handleSyncListenerError('accounts'))); 
    window.unsubscribeSnapshots.push(onSnapshot(collection(db,"users",window.activeUid,"categories"),(s)=>{ window.globalCategories=s.docs.map(d=>({id:d.id,...d.data()})); if(window.updateCategoryDropdowns) window.updateCategoryDropdowns(); if(window.updateCategoriesManagerList) window.updateCategoriesManagerList(); }, handleSyncListenerError('categories'))); 
    window.unsubscribeSnapshots.push(onSnapshot(collection(db,"users",window.activeUid,"budgets"),(s)=>{ window.globalBudgets=s.docs.map(d=>({id:d.id,...d.data()})); if(window.updateBudgetManagerList) window.updateBudgetManagerList(); if(window.updateBudgetProgress) window.updateBudgetProgress(); }, handleSyncListenerError('budgets'))); 
    window.unsubscribeSnapshots.push(onSnapshot(collection(db,"users",window.activeUid,"goals"),(s)=>{ window.globalGoals=s.docs.map(d=>({id:d.id,...d.data()})); if(window.updateGoalsManagerList) window.updateGoalsManagerList(); }, handleSyncListenerError('goals'))); 
    window.unsubscribeSnapshots.push(onSnapshot(collection(db,"users",window.activeUid,"debts"),(s)=>{ window.globalDebts=s.docs.map(d=>({id:d.id,...d.data()})); if(window.updateDebtsManagerList) window.updateDebtsManagerList(); }, handleSyncListenerError('debts'))); 
    window.unsubscribeSnapshots.push(onSnapshot(collection(db,"users",window.activeUid,"currencies"),(s)=>{ window.globalCurrencies=s.docs.map(d=>({id:d.id,...d.data()})); if(window.updateCurrencyDropdown) window.updateCurrencyDropdown(); if(window.updateCurrencyManagerList) window.updateCurrencyManagerList(); }, handleSyncListenerError('currencies'))); 
    window.unsubscribeSnapshots.push(onSnapshot(collection(db,"users",window.activeUid,"recurring"),(s)=>{ window.globalRecurring=s.docs.map(d=>({id:d.id,...d.data()})); if(window.updateRecurringManagerList) window.updateRecurringManagerList(); }, handleSyncListenerError('recurring'))); 
};

window.saveTransaction = async () => {
    if(window.haptic) window.haptic(); 
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const amountInput = document.getElementById('trans-amount').value;
    const amount = parseFloat(amountInput.replace(/,/g, '')); 
    const account = document.getElementById('trans-account').value;
    const date = document.getElementById('trans-date').value;
    const note = document.getElementById('trans-note').value;
    const isRecurring = document.getElementById('trans-recurring') ? document.getElementById('trans-recurring').checked : false;
    const category = window.currentSelectedType !== 'Transfer' ? document.getElementById('trans-category').value : null;
    const toAccount = window.currentSelectedType === 'Transfer' ? document.getElementById('trans-to-account').value : null;
    
    if (!amount || !account || !date) return window.customAlert("Please fill all required fields.");
    
    let finalReceiptUrl = window.currentReceiptUrl;
    if(window.currentReceiptFile) { 
        window.customLoading("Processing receipt image..."); 
        try { 
            finalReceiptUrl = await window.compressImageFile(window.currentReceiptFile);
        } catch(e) { window.closeCustomModal(); return window.customAlert("Failed to process receipt image: " + e.message); } 
    }
    
    // 🌟 အချိန် (Time) ကိုပါ အတိအကျ တွက်ချက်ထည့်သွင်းခြင်း (စာရင်းများ အပေါ်ဆုံးရောက်စေရန်) 🌟
    let finalDateTime = date;
    const todayStr = window.getLocalToday();
    
    if (date === todayStr) {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        finalDateTime = `${date}T${h}:${m}:${s}`;
    } else {
        finalDateTime = `${date}T23:59:59`;
    }
    
    const data = { type: window.currentSelectedType, amount, account, note, timestamp: new Date(finalDateTime).toISOString(), month: date.substring(0, 7), isRecurring, receiptUrl: finalReceiptUrl };
    if (window.currentSelectedType === 'Transfer') data.toAccount = toAccount; else data.category = category;
    
    try { 
        if(window.isEditMode && window.editId) { 
            await updateDoc(doc(db, "users", window.activeUid, "transactions", window.editId), data); 
            window.closeCustomModal(); window.customAlert("Transaction updated!"); 
        } else { 
            await addDoc(collection(db, "users", window.activeUid, "transactions"), data); 
            window.closeCustomModal(); window.customAlert("Transaction saved!"); 
        } 
        if(window.closeTransactionSheet) window.closeTransactionSheet(); 
        
        document.getElementById('trans-amount').value = '';
        document.getElementById('trans-note').value = '';
        if(window.removeReceipt) window.removeReceipt();
        
    } catch(e) { window.closeCustomModal(); window.customAlert("Error saving: " + e.message); }
};

window.deleteRecord = (collectionName, docId) => { 
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const isMM = localStorage.getItem('mtw_lang') === 'mm'; 
    window.customConfirm(isMM ? "ဖျက်ရန် သေချာပါသလား?" : "Are you sure you want to delete this?", async () => { 
        window.customLoading(isMM ? "ဖျက်နေပါသည်..." : "Deleting..."); 
        try { 
            await deleteDoc(doc(db, "users", window.activeUid, collectionName, docId)); 
            window.closeCustomModal(); 
        } catch(e) { window.closeCustomModal(); window.customAlert(e.message); } 
    }); 
};

// Manager Functions Add/Edit (Accounts, Categories) - Cascading Update
window.addAccount = async () => { 
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const name = document.getElementById('new-acc-name').value.trim(); 
    if(!name) return window.customAlert("Please enter account name."); 
    if(window.isAccEditMode && window.accEditId) {
        const oldAcc = window.globalAccounts.find(a => a.id === window.accEditId);
        const oldName = oldAcc ? oldAcc.name : null;
        window.customLoading("Updating related records..."); // စာရင်းဟောင်းများကိုပါ ပြင်ဆင်နေကြောင်းပြမည်
        await updateDoc(doc(db,"users",window.activeUid,"accounts",window.accEditId), {name});
        // Update historical transactions
        if(oldName && oldName !== name) {
            const txs = window.globalTransactions.filter(t => t.account === oldName || t.toAccount === oldName);
            for(let t of txs) {
                let updates = {};
                if(t.account === oldName) updates.account = name;
                if(t.toAccount === oldName) updates.toAccount = name;
                await updateDoc(doc(db,"users",window.activeUid,"transactions",t.id), updates);
            }
        }
        window.closeCustomModal();
    } else {
        await addDoc(collection(db,"users",window.activeUid,"accounts"), {name}); 
    }
    if(window.cancelAccEdit) window.cancelAccEdit(); 
};

window.addCategory = async () => { 
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const name = document.getElementById('new-cat-name').value.trim(), type = document.getElementById('new-cat-type').value; 
    if(!name) return window.customAlert("Please enter category name."); 
    if(window.isCatEditMode && window.catEditId) {
        const oldCat = window.globalCategories.find(c => c.id === window.catEditId);
        const oldName = oldCat ? oldCat.name : null;
        window.customLoading("Updating related records..."); // စာရင်းဟောင်းများကိုပါ ပြင်ဆင်နေကြောင်းပြမည်
        await updateDoc(doc(db,"users",window.activeUid,"categories",window.catEditId), {name, type});
        // Update historical transactions and budgets
        if(oldName && oldName !== name) {
            const txs = window.globalTransactions.filter(t => t.category === oldName && t.type === type);
            for(let t of txs) {
                await updateDoc(doc(db,"users",window.activeUid,"transactions",t.id), {category: name});
            }
            const buds = window.globalBudgets.filter(b => b.category === oldName);
            for(let b of buds) {
                await updateDoc(doc(db,"users",window.activeUid,"budgets",b.id), {category: name});
            }
        }
        window.closeCustomModal();
    } else {
        await addDoc(collection(db,"users",window.activeUid,"categories"), {name, type}); 
    }
    if(window.cancelCatEdit) window.cancelCatEdit(); 
};

// Other Manager Functions
window.addBudget = async () => { if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert(); const cat = document.getElementById('budget-category').value, amt = parseFloat(document.getElementById('budget-amount').value); if(!cat || isNaN(amt)) return window.customAlert("Please enter valid amount."); if(window.isBudEditMode && window.budEditId) await updateDoc(doc(db,"users",window.activeUid,"budgets",window.budEditId), {category:cat, amount:amt}); else await addDoc(collection(db,"users",window.activeUid,"budgets"), {category:cat, amount:amt}); if(window.cancelBudEdit) window.cancelBudEdit(); };
window.addGoal = async () => { if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert(); const name = document.getElementById('goal-name').value.trim(), target = parseFloat(document.getElementById('goal-target').value); if(!name || isNaN(target)) return window.customAlert("Please enter valid name and target."); if(window.isGoalEditMode && window.goalEditId) await updateDoc(doc(db,"users",window.activeUid,"goals",window.goalEditId), {name, targetAmount:target}); else await addDoc(collection(db,"users",window.activeUid,"goals"), {name, targetAmount:target, savedAmount:0}); if(window.cancelGoalEdit) window.cancelGoalEdit(); };
window.addCurrency = async () => { if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert(); const code = document.getElementById('curr-code').value.trim().toUpperCase(), rate = parseFloat(document.getElementById('curr-rate').value); if(!code || isNaN(rate)) return window.customAlert("Please enter valid code and rate."); if(window.isCurEditMode && window.curEditId) await updateDoc(doc(db,"users",window.activeUid,"currencies",window.curEditId), {code, rate}); else await addDoc(collection(db,"users",window.activeUid,"currencies"), {code, rate}); if(window.cancelCurEdit) window.cancelCurEdit(); };
window.addDebt = async () => {
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    const nameEl = document.getElementById('debt-name'), amtEl = document.getElementById('debt-amount');
    const name = nameEl ? nameEl.value.trim() : '', amount = amtEl ? parseFloat(amtEl.value) : NaN;
    const paidEl = document.getElementById('debt-paid'), paidAmount = paidEl ? (parseFloat(paidEl.value) || 0) : 0;
    const type = window.debtFormType === 'borrow' ? 'borrow' : 'lend';
    const dueEl = document.getElementById('debt-due'), dueDate = dueEl ? dueEl.value : '';
    const noteEl = document.getElementById('debt-notes'), notes = noteEl ? noteEl.value.trim() : '';
    if(!name || isNaN(amount) || amount <= 0) return window.customAlert(isMM ? "နာမည်နှင့် မှန်ကန်သော ပမာဏ ထည့်ပါ။" : "Please enter valid name and amount.");
    const status = paidAmount >= amount ? 'settled' : 'open';
    try {
        if(window.isDebtEditMode && window.debtEditId) {
            await updateDoc(doc(db,"users",window.activeUid,"debts",window.debtEditId), {name, amount, paidAmount, type, dueDate, notes, status});
        } else {
            await addDoc(collection(db,"users",window.activeUid,"debts"), {name, amount, paidAmount, type, dueDate, notes, status, createdAt: new Date().toISOString()});
        }
        if(window.cancelDebtEdit) window.cancelDebtEdit();
    } catch(e) { window.customAlert(e.message); }
};

window.recordDebtPayment = async (debtId) => {
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    const d = (window.globalDebts || []).find(x => x.id === debtId);
    if(!d) return;
    const remaining = Math.max(0, (Number(d.amount) || 0) - (Number(d.paidAmount) || 0));
    const safeName = String(d.name || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const t = document.getElementById('modal-title');
    if(t) { t.innerText = isMM ? 'ငွေသွင်းမှတ်မယ်' : 'Record Payment'; t.style.display = 'block'; }
    const m = document.getElementById('modal-message');
    if(m) m.innerHTML = `<div style="color:var(--text-color); font-size:14px; margin-bottom:10px;">${safeName} · ${isMM ? 'ကျန်ငွေ' : 'Remaining'}: <b>${remaining.toLocaleString()} Ks</b></div><div class="input-group glass-panel"><input type="number" id="debt-pay-input" placeholder="${isMM ? 'ပမာဏ (MMK)' : 'Amount (MMK)'}" style="width:100%;"></div>`;
    const b = document.getElementById('modal-buttons');
    if(b) b.innerHTML = `<div style="display:flex; gap:10px;"><button class="glass-panel" onclick="closeCustomModal()" style="color:var(--text-color); border:none;">${isMM ? 'မလုပ်တော့ဘူး' : 'Cancel'}</button><button class="glass-panel" style="background:var(--primary-color) !important; color:white; border:none;" onclick="submitDebtPayment('${debtId}')">${isMM ? 'သိမ်းမယ်' : 'Save'}</button></div>`;
    const c = document.getElementById('custom-modal');
    if(c) c.style.display = 'flex';
};

window.submitDebtPayment = async (debtId) => {
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const isMM = localStorage.getItem('mtw_lang') === 'mm';
    const inp = document.getElementById('debt-pay-input');
    const add = inp ? parseFloat(inp.value) : NaN;
    if(isNaN(add) || add <= 0) return window.customAlert(isMM ? "မှန်ကန်သော ပမာဏ ထည့်ပါ။" : "Please enter a valid amount.");
    const d = (window.globalDebts || []).find(x => x.id === debtId);
    if(!d) { window.closeCustomModal(); return; }
    const total = Number(d.amount) || 0;
    const newPaid = Math.min(total, (Number(d.paidAmount) || 0) + add);
    try {
        await updateDoc(doc(db,"users",window.activeUid,"debts",debtId), {paidAmount: newPaid, status: newPaid >= total ? 'settled' : 'open'});
        window.closeCustomModal();
    } catch(e) { window.closeCustomModal(); window.customAlert(e.message); }
};

window.toggleDebtSettled = async (debtId) => {
    if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert();
    const d = (window.globalDebts || []).find(x => x.id === debtId);
    if(!d) return;
    const total = Number(d.amount) || 0;
    try {
        if((d.status || 'open') === 'settled') await updateDoc(doc(db,"users",window.activeUid,"debts",debtId), {status: 'open'});
        else await updateDoc(doc(db,"users",window.activeUid,"debts",debtId), {status: 'settled', paidAmount: total});
    } catch(e) { window.customAlert(e.message); }
};
window.addRecurring = async () => { if (window.isViewingPartner && window.isViewingPartner()) return window.readOnlyAlert(); const name=document.getElementById('rec-name').value.trim(), amount=parseFloat(document.getElementById('rec-amount').value); if(name&&!isNaN(amount)){ if(window.isRecEditMode&&window.recEditId) await updateDoc(doc(db,"users",window.activeUid,"recurring",window.recEditId),{name,amount}); else await addDoc(collection(db,"users",window.activeUid,"recurring"),{name,amount}); if(window.cancelRecEdit) window.cancelRecEdit(); } else window.customAlert("Please enter a valid Name and Amount."); };

// Auto Recurring System
window.checkAndRunAutoRecurring = async () => { 
    if (window.isViewingPartner && window.isViewingPartner()) return;
    if (!window.activeUid || window.globalTransactions.length === 0) return; 
    const currentMonth = window.getLocalToday().substring(0, 7); 
    const lastRun = localStorage.getItem(`mtw_recurring_run_${window.activeUid}`); 
    if (lastRun === currentMonth) return; 
    
    const recurringTxs = window.globalTransactions.filter(t => t.isRecurring === true); 
    const uniqueRecurring = {}; 
    recurringTxs.forEach(t => { 
        const key = `${t.type}_${t.category || t.toAccount}_${t.account}_${t.amount}`; 
        if (!uniqueRecurring[key] || t.month > uniqueRecurring[key].month) uniqueRecurring[key] = t; 
    }); 
    
    let addedCount = 0; 
    for (let key in uniqueRecurring) { 
        const template = uniqueRecurring[key]; 
        if (template.month >= currentMonth) continue; 
        const alreadyExists = window.globalTransactions.some(t => t.month === currentMonth && t.isRecurring === true && t.autoGenerated === true && t.type === template.type && t.amount === template.amount && (t.category === template.category || t.toAccount === template.toAccount)); 
        if (!alreadyExists) { 
            const newData = { type: template.type, amount: template.amount, account: template.account, note: template.note || 'Auto Recurring', timestamp: `${currentMonth}-01T08:00:00.000Z`, month: currentMonth, isRecurring: true, autoGenerated: true }; 
            if (template.category) newData.category = template.category; 
            if (template.toAccount) newData.toAccount = template.toAccount; 
            try { 
                await addDoc(collection(db, "users", window.activeUid, "transactions"), newData); 
                addedCount++; 
            } catch(e) { console.error(e); } 
        } 
    } 
    localStorage.setItem(`mtw_recurring_run_${window.activeUid}`, currentMonth); 
    if (addedCount > 0) window.customAlert(`Successfully auto-added <b>${addedCount}</b> recurring transaction(s) for ${currentMonth}!`, "Auto Recurring"); 
};

// Family Sync (connect/disconnect/invite logic) lives in features.js.
// Partner data is READ-ONLY: firestore.rules grant familyLinks holders read access only.

