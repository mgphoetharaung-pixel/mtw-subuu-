import { db, auth } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, doc, getDoc, getDocs, query, where, orderBy, updateDoc, writeBatch, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const PLAN_PRICES = {
    '1 Month': { amount: 3000, durationMonths: 1 },
    '3 Months': { amount: 8000, durationMonths: 3 },
    '6 Months': { amount: 15000, durationMonths: 6 },
    '1 Year': { amount: 25000, durationMonths: 12 },
    'Lifetime': { amount: 100000, durationMonths: null }
};

const el = (id) => document.getElementById(id);
let adminUid = null;
let paymentsCache = [];
let usersCache = [];
let payStatusFilter = 'pending';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const fmtDate = (v) => {
    if (!v) return '—';
    const d = v.toDate ? v.toDate() : new Date(v);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString();
};

const calcExpiry = (planName) => {
    const p = PLAN_PRICES[planName];
    if (!p || p.durationMonths == null) return null;
    const d = new Date();
    d.setMonth(d.getMonth() + p.durationMonths);
    return d.toISOString();
};

const isProNow = (u) => {
    if (!u || !u.plan || u.plan === 'Free') return false;
    if (String(u.plan).toLowerCase() === 'lifetime') return true;
    if (u.expiryDate && new Date(u.expiryDate) < new Date()) return false;
    return true;
};

el('adm-login-btn').addEventListener('click', doLogin);
el('adm-pass').addEventListener('keydown', (e) => { if (e.key === 'Enter') doLogin(); });

async function doLogin() {
    const email = el('adm-email').value.trim();
    const pass = el('adm-pass').value;
    const errEl = el('adm-login-err');
    errEl.innerText = '';
    if (!email || !pass) { errEl.innerText = 'Please fill email and password.'; return; }
    const btn = el('adm-login-btn');
    btn.disabled = true;
    try {
        await signInWithEmailAndPassword(auth, email, pass);
    } catch (e) {
        errEl.innerText = e.message || 'Login failed.';
    }
    btn.disabled = false;
}

onAuthStateChanged(auth, async (user) => {
    el('adm-loading').style.display = 'none';
    if (!user) {
        el('adm-panel').style.display = 'none';
        el('adm-denied').style.display = 'none';
        el('adm-login').style.display = 'flex';
        return;
    }
    let adminDoc = null;
    try {
        adminDoc = await getDoc(doc(db, 'admins', user.uid));
    } catch (e) {
        console.error(e);
    }
    if (!adminDoc || !adminDoc.exists() || adminDoc.data()?.enabled === false) {
        el('adm-login').style.display = 'none';
        el('adm-panel').style.display = 'none';
        el('adm-denied-uid').innerText = user.uid;
        el('adm-copy-uid').onclick = () => navigator.clipboard?.writeText(user.uid);
        el('adm-denied').style.display = 'flex';
        await signOut(auth).catch(() => {});
        return;
    }
    adminUid = user.uid;
    el('adm-login').style.display = 'none';
    el('adm-denied').style.display = 'none';
    el('adm-panel').style.display = 'block';
    await loadAll();
});

document.querySelectorAll('.a-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.a-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        ['payments', 'users', 'stats'].forEach(name => {
            el('tab-' + name).style.display = (name === tab.dataset.tab) ? 'block' : 'none';
        });
    });
});

el('adm-refresh').addEventListener('click', loadAll);
el('adm-logout').addEventListener('click', async () => {
    if (!confirm('Logout from Admin Panel?')) return;
    await signOut(auth);
});

document.querySelectorAll('.fchip').forEach(chip => {
    chip.addEventListener('click', () => {
        document.querySelectorAll('.fchip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        payStatusFilter = chip.dataset.status;
        renderPayments();
    });
});
el('pay-search').addEventListener('input', renderPayments);
el('user-search').addEventListener('input', renderUsers);

el('proof-lightbox').addEventListener('click', () => {
    el('proof-lightbox').style.display = 'none';
});

async function loadAll() {
    const refreshBtn = el('adm-refresh');
    refreshBtn.disabled = true;
    try {
        const [paySnap, userSnap] = await Promise.all([
            getDocs(query(collection(db, 'paymentRequests'), orderBy('createdAt', 'desc'))),
            getDocs(collection(db, 'users'))
        ]);
        paymentsCache = paySnap.docs.map(d => ({ id: d.id, ...d.data() }));
        usersCache = userSnap.docs.map(d => ({ uid: d.id, ...d.data() }));
        renderPayments();
        renderUsers();
        renderStats();
    } catch (e) {
        console.error(e);
        alert('Failed to load data: ' + e.message);
    }
    refreshBtn.disabled = false;
}

function renderPayments() {
    const search = (el('pay-search').value || '').toLowerCase().trim();
    const pendingCount = paymentsCache.filter(p => p.status === 'pending').length;
    const badge = el('badge-pending');
    badge.style.display = pendingCount ? 'inline-block' : 'none';
    badge.innerText = pendingCount;

    const list = paymentsCache.filter(p => {
        if (payStatusFilter !== 'all' && p.status !== payStatusFilter) return false;
        if (search) {
            const hay = `${p.userEmail || ''} ${p.paymentReference || ''} ${p.plan || ''} ${p.paymentMethod || ''} ${p.userId || ''}`.toLowerCase();
            if (!hay.includes(search)) return false;
        }
        return true;
    });

    const container = el('pay-list');
    if (!list.length) {
        container.innerHTML = '<div class="glass-panel empty-note">No payment requests found.</div>';
        return;
    }

    container.innerHTML = list.map(r => {
        const proofHtml = r.proofUrl
            ? `<img class="proof-thumb" src="${esc(r.proofUrl)}" alt="proof" data-proof="${esc(r.proofUrl)}">`
            : `<div class="proof-thumb" style="display:flex;align-items:center;justify-content:center;color:#8e8e93;"><i class="fa-solid fa-image-slash"></i></div>`;
        const actions = r.status === 'pending'
            ? `<div class="pay-actions">
                 <button class="abtn green small" onclick="window._admApprove('${esc(r.id)}')"><i class="fa-solid fa-check"></i> Approve</button>
                 <button class="abtn red small" onclick="window._admReject('${esc(r.id)}')"><i class="fa-solid fa-xmark"></i> Reject</button>
               </div>`
            : (r.adminNote ? `<div class="kv"><b>Note:</b> ${esc(r.adminNote)}</div><div class="kv"><b>Reviewed:</b> ${fmtDate(r.reviewedAt)}</div>` : `<div class="kv"><b>Reviewed:</b> ${fmtDate(r.reviewedAt)}</div>`);
        return `
        <div class="glass-panel pay-card">
            <div style="display:flex;gap:14px;">
                <div style="flex:1;min-width:0;">
                    <div class="pay-head">
                        <span class="chip ${esc(r.status)}">${esc(String(r.status).toUpperCase())}</span>
                        <span class="chip" style="background:var(--input-bg,rgba(0,0,0,.05));color:var(--text-color,#111);">${esc(r.plan || '?')} · ${Number(r.amount || 0).toLocaleString()} MMK</span>
                    </div>
                    <div class="kv"><b>Email:</b> ${esc(r.userEmail || r.userId || 'unknown')}</div>
                    <div class="kv"><b>Method:</b> ${esc(r.paymentMethod || '-')} &nbsp;·&nbsp; <b>Ref:</b> <code>${esc(r.paymentReference || '-')}</code></div>
                    <div class="kv"><b>Submitted:</b> ${fmtDate(r.createdAt)}</div>
                    ${actions}
                </div>
                ${proofHtml}
            </div>
        </div>`;
    }).join('');
}

containerProofDelegation();
function containerProofDelegation() {
    el('pay-list').addEventListener('click', (e) => {
        const img = e.target.closest('img.proof-thumb');
        if (!img) return;
        el('proof-img').src = img.dataset.proof;
        el('proof-lightbox').style.display = 'flex';
    });
}

window._admApprove = async (id) => {
    const snap = await getDoc(doc(db, 'paymentRequests', id));
    if (!snap.exists()) return alert('Request not found.');
    const r = snap.data();
    if (r.status !== 'pending') return alert('This request is already reviewed (' + r.status + ').');

    const plan = PLAN_PRICES[r.plan];
    if (!plan) return alert('Unknown plan: ' + r.plan);

    if (Number(r.amount) !== plan.amount && !confirm(`Amount mismatch!\nRequest: ${r.amount} MMK\nPrice:   ${plan.amount} MMK\n\nApprove anyway?`)) return;

    const refStr = String(r.paymentReference || '').trim();
    if (refStr) {
        const dupSnap = await getDocs(query(collection(db, 'paymentRequests'), where('paymentReference', '==', refStr), where('status', '==', 'approved')));
        const dups = dupSnap.docs.filter(d => d.id !== id);
        if (dups.length && !confirm(`⚠ Duplicate reference!\n"${refStr}" was already used by ${dups.length} approved request(s).\n\nApprove anyway?`)) return;
    }

    if (!confirm(`Approve ${r.plan} (${Number(r.amount).toLocaleString()} MMK)\nfor ${r.userEmail || r.userId}?`)) return;

    try {
        const expiry = calcExpiry(r.plan);
        const batch = writeBatch(db);
        batch.update(doc(db, 'users', r.userId), {
            plan: r.plan,
            expiryDate: expiry,
            subscriptionStatus: 'active',
            approvedPaymentRequestId: id,
            approvedAt: new Date().toISOString(),
            approvedBy: adminUid,
            updatedAt: new Date().toISOString()
        });
        batch.update(doc(db, 'paymentRequests', id), {
            status: 'approved',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUid,
            adminNote: 'Payment verified'
        });
        await batch.commit();
        alert('Approved! User now has Pro access.');
        await loadAll();
    } catch (e) {
        console.error(e);
        alert('Approve failed: ' + e.message);
    }
};

window._admReject = async (id) => {
    const note = prompt('Rejection reason:', 'Payment could not be verified.');
    if (note === null) return;
    try {
        await updateDoc(doc(db, 'paymentRequests', id), {
            status: 'rejected',
            reviewedAt: serverTimestamp(),
            reviewedBy: adminUid,
            adminNote: String(note || '').trim().slice(0, 500)
        });
        await loadAll();
    } catch (e) {
        console.error(e);
        alert('Reject failed: ' + e.message);
    }
};

function renderUsers() {
    const search = (el('user-search').value || '').toLowerCase().trim();
    const list = usersCache.filter(u => {
        if (!search) return true;
        const hay = `${u.name || ''} ${u.email || ''} ${u.uid}`.toLowerCase();
        return hay.includes(search);
    }).sort((a, b) => {
        const ap = isProNow(a) ? 0 : 1, bp = isProNow(b) ? 0 : 1;
        return ap - bp;
    });

    const container = el('user-list');
    if (!list.length) {
        container.innerHTML = '<div class="glass-panel empty-note">No users found.</div>';
        return;
    }

    const planOptions = Object.keys(PLAN_PRICES).concat(['Free'])
        .map(p => `<option value="${esc(p)}">${esc(p)}</option>`).join('');

    container.innerHTML = list.map(u => `
        <div class="glass-panel u-row">
            <div class="u-main">
                <div class="u-name">${esc(u.name || '(no name)')}
                    ${isProNow(u) ? '<span class="chip pro">PRO</span>' : '<span class="chip free">FREE</span>'}
                </div>
                <div class="u-sub">${esc(u.email || u.uid)} · UID ${esc(u.uid.substring(0, 10))}…</div>
                ${isProNow(u) ? `<div class="u-sub">Expires: ${u.expiryDate ? fmtDate(u.expiryDate) : 'Never (Lifetime)'}</div>` : ''}
            </div>
            <div class="u-actions">
                <select class="ainput" id="plan-${esc(u.uid)}">${planOptions}</select>
                <button class="abtn small green" onclick="window._admSetPlan('${esc(u.uid)}')">Apply</button>
            </div>
        </div>
    `).join('');
}

window._admSetPlan = async (uid) => {
    const plan = el('plan-' + uid).value;
    const u = usersCache.find(x => x.uid === uid);
    const label = plan === 'Free'
        ? `Set FREE / revoke Pro for ${u?.email || uid}?`
        : `Grant "${plan}" to ${u?.email || uid}?\nExpiry: ${calcExpiry(plan) || 'Never'}`;
    if (!confirm(label)) return;
    try {
        const data = plan === 'Free'
            ? { plan: 'Free', subscriptionStatus: 'expired', expiryDate: null }
            : { plan, subscriptionStatus: 'active', expiryDate: calcExpiry(plan) };
        await updateDoc(doc(db, 'users', uid), {
            ...data,
            approvedBy: adminUid,
            updatedAt: new Date().toISOString()
        });
        await loadAll();
    } catch (e) {
        console.error(e);
        alert('Update failed: ' + e.message);
    }
};

function renderStats() {
    const totalUsers = usersCache.length;
    const proUsers = usersCache.filter(isProNow);
    const pending = paymentsCache.filter(p => p.status === 'pending').length;
    const approvedList = paymentsCache.filter(p => p.status === 'approved');
    const revenueTotal = approvedList.reduce((s, p) => s + Number(p.amount || 0), 0);

    const now = new Date();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const revenueMonth = approvedList.reduce((s, p) => {
        const d = p.reviewedAt ? (p.reviewedAt.toDate ? p.reviewedAt.toDate() : new Date(p.reviewedAt)) : null;
        if (!d || isNaN(d.getTime())) return s;
        const pref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return (pref === thisMonthPrefix) ? s + Number(p.amount || 0) : s;
    }, 0);

    el('stat-grid').innerHTML = `
        <div class="glass-panel stat-box"><h4>TOTAL USERS</h4><p>${totalUsers.toLocaleString()}</p></div>
        <div class="glass-panel stat-box"><h4>ACTIVE PRO</h4><p>${proUsers.length.toLocaleString()}</p></div>
        <div class="glass-panel stat-box"><h4>PENDING PAYMENTS</h4><p>${pending.toLocaleString()}</p></div>
        <div class="glass-panel stat-box"><h4>REVENUE (THIS MONTH)</h4><p>${revenueMonth.toLocaleString()}</p></div>
        <div class="glass-panel stat-box"><h4>REVENUE (ALL TIME)</h4><p>${revenueTotal.toLocaleString()}</p></div>
    `;

    const recent = approvedList.slice(0, 8).map(p => `
        <div class="u-row" style="padding:8px 0;border-bottom:1px solid var(--glass-border,rgba(0,0,0,.06));">
            <div class="u-main">
                <div class="u-sub" style="color:var(--text-color,#111);font-weight:700;">${esc(p.plan)} — ${Number(p.amount || 0).toLocaleString()} MMK</div>
                <div class="u-sub">${esc(p.userEmail || p.userId)} · ${fmtDate(p.reviewedAt)}</div>
            </div>
        </div>
    `).join('');

    const proBreakdown = proUsers.map(u => `
        <div class="u-row" style="padding:8px 0;border-bottom:1px solid var(--glass-border,rgba(0,0,0,.06));">
            <div class="u-main">
                <div class="u-sub" style="color:var(--text-color,#111);font-weight:700;">${esc(u.name || '(no name)')} · ${esc(u.plan)}</div>
                <div class="u-sub">${esc(u.email || u.uid)} · ${u.expiryDate ? 'until ' + fmtDate(u.expiryDate) : 'Lifetime'}</div>
            </div>
        </div>
    `).join('');

    el('stat-detail').innerHTML = `
        <h3 style="margin:0 0 10px;color:var(--text-color,#111);"><i class="fa-solid fa-clock-rotate-left"></i> Recent Approvals</h3>
        ${recent || '<p class="muted">None yet.</p>'}
        <h3 style="margin:18px 0 10px;color:var(--text-color,#111);"><i class="fa-solid fa-crown"></i> Active PRO Members (${proUsers.length})</h3>
        ${proBreakdown || '<p class="muted">None yet.</p>'}
        ${renderFamilyDebug()}
    `;
}

function renderFamilyDebug() {
    const mask = (c) => { const s = String(c || ''); return s.length > 6 ? s.slice(0, 4) + '…' + s.slice(-2) : s; };
    const famUsers = usersCache.filter(u =>
        (Array.isArray(u.familyCodes) && u.familyCodes.length > 0) ||
        (u.familyLinks && Object.keys(u.familyLinks).length > 0)
    );

    let rows = famUsers.map(u => {
        const codes = (Array.isArray(u.familyCodes) ? u.familyCodes.map(mask).join(', ') : '') || '—';
        const linkEntries = Object.entries(u.familyLinks || {});
        const links = linkEntries.length
            ? linkEntries.map(([oid, code]) => {
                const owner = usersCache.find(x => x.uid === oid);
                const ok = !!(owner && Array.isArray(owner.familyCodes) && owner.familyCodes.includes(code));
                const ownerLabel = esc(owner ? (owner.email || oid) : oid);
                return `<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;">${ownerLabel} → <code>${esc(mask(code))}</code> <b style="color:${ok ? '#34c759' : '#ff3b30'}">${ok ? '✅ MATCH' : '❌ NO MATCH'}</b></div>`;
            }).join('')
            : '—';
        return `
            <div style="padding:10px 0;border-bottom:1px solid var(--glass-border,rgba(0,0,0,.08));">
                <div class="u-sub" style="font-weight:800;color:var(--text-color,#111);">${esc(u.email || u.uid)}</div>
                <div class="u-sub">familyCodes: <code>${esc(codes)}</code></div>
                <div class="u-sub">familyLinks:<br>${links}</div>
            </div>`;
    }).join('');

    if (!rows) rows = '<p class="muted">No family sync data on any profile yet.</p>';

    return `
        <details style="margin-top:18px;">
            <summary style="cursor:pointer;font-weight:800;color:var(--text-color,#111);"><i class="fa-solid fa-bug"></i> Family Sync Debug (${famUsers.length})</summary>
            <div style="margin-top:8px;font-size:12px;line-height:1.7;">${rows}</div>
        </details>
    `;
}
