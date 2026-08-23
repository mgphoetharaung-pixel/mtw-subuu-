// Deploy this file as a Firebase Cloud Function in a trusted functions project.
// Do not import it into the browser bundle.
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { getFirestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { initializeApp } from 'firebase-admin/app';

initializeApp();
const db = getFirestore();

const PLAN_PRICES = {
    '1 Month': { amount: 3000, durationMonths: 1 },
    '3 Months': { amount: 8000, durationMonths: 3 },
    '6 Months': { amount: 15000, durationMonths: 6 },
    '1 Year': { amount: 25000, durationMonths: 12 },
    'Lifetime': { amount: 100000, durationMonths: null }
};

async function requireAdmin(uid) {
    if (!uid) throw new HttpsError('unauthenticated', 'Sign-in required.');
    const adminDoc = await db.doc(`admins/${uid}`).get();
    if (!adminDoc.exists || adminDoc.data()?.enabled === false) {
        throw new HttpsError('permission-denied', 'Admin access required.');
    }
}

function calculateExpiry(planName) {
    if (planName === 'Lifetime') return null;
    const plan = PLAN_PRICES[planName];
    const expiry = new Date();
    expiry.setMonth(expiry.getMonth() + plan.durationMonths);
    return Timestamp.fromDate(expiry);
}

export const approvePaymentRequest = onCall(async (request) => {
    await requireAdmin(request.auth?.uid);
    const requestId = String(request.data?.requestId || '').trim();
    const adminNote = String(request.data?.adminNote || 'Payment verified').trim().slice(0, 500);
    if (!requestId) throw new HttpsError('invalid-argument', 'requestId is required.');

    const paymentRef = db.doc(`paymentRequests/${requestId}`);
    await db.runTransaction(async (tx) => {
        const paymentSnap = await tx.get(paymentRef);
        if (!paymentSnap.exists) throw new HttpsError('not-found', 'Payment request not found.');
        const payment = paymentSnap.data();
        if (payment.status !== 'pending') {
            throw new HttpsError('failed-precondition', 'Only pending requests can be approved.');
        }
        const plan = PLAN_PRICES[payment.plan];
        if (!plan || payment.amount !== plan.amount) {
            throw new HttpsError('failed-precondition', 'Plan price mismatch.');
        }
        if (!payment.userId || !payment.paymentReference || !payment.proofUrl) {
            throw new HttpsError('failed-precondition', 'Payment request is incomplete.');
        }

        const userRef = db.doc(`users/${payment.userId}`);
        tx.update(userRef, {
            plan: payment.plan,
            subscriptionStatus: 'active',
            expiryDate: calculateExpiry(payment.plan),
            approvedPaymentRequestId: requestId,
            approvedAt: FieldValue.serverTimestamp(),
            approvedBy: request.auth.uid,
            updatedAt: FieldValue.serverTimestamp()
        });
        tx.update(paymentRef, {
            status: 'approved',
            reviewedAt: FieldValue.serverTimestamp(),
            reviewedBy: request.auth.uid,
            adminNote
        });
        tx.set(db.collection('paymentAudit').doc(), {
            action: 'approve',
            requestId,
            userId: payment.userId,
            adminUid: request.auth.uid,
            createdAt: FieldValue.serverTimestamp()
        });
    });

    return { ok: true, requestId, status: 'approved' };
});

export const rejectPaymentRequest = onCall(async (request) => {
    await requireAdmin(request.auth?.uid);
    const requestId = String(request.data?.requestId || '').trim();
    const adminNote = String(request.data?.adminNote || 'Payment could not be verified.').trim().slice(0, 500);
    if (!requestId) throw new HttpsError('invalid-argument', 'requestId is required.');

    const paymentRef = db.doc(`paymentRequests/${requestId}`);
    await db.runTransaction(async (tx) => {
        const paymentSnap = await tx.get(paymentRef);
        if (!paymentSnap.exists) throw new HttpsError('not-found', 'Payment request not found.');
        const payment = paymentSnap.data();
        if (payment.status !== 'pending') {
            throw new HttpsError('failed-precondition', 'Only pending requests can be rejected.');
        }
        tx.update(paymentRef, {
            status: 'rejected',
            reviewedAt: FieldValue.serverTimestamp(),
            reviewedBy: request.auth.uid,
            adminNote
        });
        tx.set(db.collection('paymentAudit').doc(), {
            action: 'reject',
            requestId,
            userId: payment.userId || null,
            adminUid: request.auth.uid,
            adminNote,
            createdAt: FieldValue.serverTimestamp()
        });
    });

    return { ok: true, requestId, status: 'rejected' };
});
