import { db } from './firebase-config.js';
import { collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js';

const PRO_PLANS = {
    '1 Month': { amount: 3000, durationMonths: 1 },
    '3 Months': { amount: 8000, durationMonths: 3 },
    '6 Months': { amount: 15000, durationMonths: 6 },
    '1 Year': { amount: 25000, durationMonths: 12 },
    'Lifetime': { amount: 100000, durationMonths: null }
};

window.selectedProPlan = null;

window.purchasePlan = (planName) => {
    const plan = PRO_PLANS[planName];
    if (!plan || !window.currentUser) return window.customAlert('Please sign in before subscribing.');
    window.selectedProPlan = { name: planName, ...plan };
    const selection = document.getElementById('plan-selection');
    const form = document.getElementById('payment-form');
    const label = document.getElementById('selected-plan-label');
    if (selection) selection.style.display = 'none';
    if (form) form.style.display = 'block';
    if (label) label.textContent = `${planName} — ${plan.amount.toLocaleString()} MMK`;
};

window.backToPlans = () => {
    const selection = document.getElementById('plan-selection');
    const form = document.getElementById('payment-form');
    if (selection) selection.style.display = 'block';
    if (form) form.style.display = 'none';
    window.selectedProPlan = null;
};

window.updatePaymentProofName = (input) => {
    const file = input?.files?.[0];
    const label = document.getElementById('payment-proof-name');
    if (label) label.textContent = file ? file.name : 'Upload payment screenshot';
};

window.submitPaymentRequest = async () => {
    if (window._paySubmitting) return;
    const user = window.currentUser;
    const plan = window.selectedProPlan;
    const reference = document.getElementById('payment-reference')?.value.trim() || '';
    const method = document.getElementById('payment-method')?.value || 'Other';
    const proof = document.getElementById('payment-proof-file')?.files?.[0];

    if (!user || !plan) return window.customAlert('Please select a subscription plan.');
    if (!reference || reference.length < 4) return window.customAlert('Please enter the payment reference or transaction ID.');
    if (!proof) return window.customAlert('Please upload a payment screenshot.');
    if (!proof.type.startsWith('image/')) return window.customAlert('Payment proof must be an image.');
    if (proof.size > 30 * 1024 * 1024) return window.customAlert('That image is too large. Please choose a smaller screenshot.');

    window._paySubmitting = true;
    window.customLoading('Submitting payment for review...');
    try {
        // Storage မသုံးနိုင်လို့ canvas နဲ့ ချုံ့ပြီး base64 data URL အနေနဲ့ Firestore doc ထဲ သိမ်းသည်
        let proofUrl = '';
        try {
            proofUrl = await window.compressImageFile(proof, 1000, 0.6);
        } catch (imgErr) {
            throw new Error('Could not process the screenshot: ' + imgErr.message);
        }
        if (!proofUrl || proofUrl.length > 700000) {
            throw new Error('The screenshot is too large even after compression. Please use a smaller image.');
        }

        await addDoc(collection(db, 'paymentRequests'), {
            userId: user.uid,
            userEmail: user.email || null,
            plan: plan.name,
            amount: plan.amount,
            durationMonths: plan.durationMonths,
            paymentMethod: method,
            paymentReference: reference,
            proofUrl,
            status: 'pending',
            createdAt: serverTimestamp(),
            reviewedAt: null,
            reviewedBy: null,
            adminNote: null
        });

        window.closeCustomModal();
        window.backToPlans();
        const refInput = document.getElementById('payment-reference');
        const proofInput = document.getElementById('payment-proof-file');
        if (refInput) refInput.value = '';
        if (proofInput) proofInput.value = '';
        window.updatePaymentProofName(proofInput);
        window.closeSubscription();
        window.customAlert('Payment submitted! Please wait while an admin verifies your payment. Pro access will be activated after approval.', '✅');
    } catch (error) {
        window.closeCustomModal();
        window.customAlert(`Payment submission failed: ${error.message}`);
    } finally {
        window._paySubmitting = false;
    }
};
