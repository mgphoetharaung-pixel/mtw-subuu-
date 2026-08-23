# MTW SUBUU Pro Subscription Workflow

## 1. ရည်ရွယ်ချက်

Client application သည် payment proof နှင့် transaction reference ကို `paymentRequests` collection ထဲသို့ `pending` status ဖြင့်သာ တင်နိုင်ပါသည်။ Client သည် user ၏ `plan`, `expiryDate`, `status` သို့မဟုတ် approval fields များကို တိုက်ရိုက်မပြင်နိုင်ပါ။ Admin သည် သီးခြား admin console သို့မဟုတ် Firebase Console မှ payment proof ကိုစစ်ဆေးပြီး approve/reject ပြုလုပ်ရပါမည်။

> **အရေးကြီးချက်:** Pro access ကို browser/client code မှ မပေးရပါ။ Admin approval သည် trusted server/Admin SDK သို့မဟုတ် Firebase Console မှသာ `users/{uid}` profile ကို update လုပ်ရပါမည်။

## 2. Payment request data model

Collection: `paymentRequests/{requestId}`

| Field | Type | Description |
|---|---|---|
| `userId` | string | Firebase Auth UID |
| `userEmail` | string | Review အတွက် user email |
| `plan` | string | `1 Month`, `3 Months`, `6 Months`, `1 Year`, `Lifetime` |
| `amount` | number | Client plan amount; admin must verify against server-side price list |
| `durationMonths` | number/null | Lifetime အတွက် null |
| `paymentMethod` | string | Bank/Viber/manual transfer စသည် |
| `paymentReference` | string | User တင်သည့် transaction/reference ID |
| `proofUrl` | string | Payment proof image as a client-compressed base64 data URL (stored in Firestore; no Firebase Storage required) |
| `status` | string | `pending`, `approved`, `rejected`, `cancelled` |
| `createdAt` | timestamp | Server timestamp |
| `reviewedAt` | timestamp/null | Admin decision time |
| `reviewedBy` | string/null | Admin UID |
| `adminNote` | string/null | Rejection/review note |

## 3. Status workflow

```text
User selects plan
      |
      v
Uploads screenshot + reference
      |
      v
paymentRequests.status = pending
      |
      v
Admin checks amount, reference, proof and duplicate use
      |
      +--------------------------+
      |                          |
      v                          v
approved                    rejected
      |                          |
      v                          v
Update users/{uid}:          Save adminNote;
plan, expiryDate,            do not unlock Pro
approvedPaymentRequestId
```

Admin approval သည် အောက်ပါစစ်ဆေးမှုများပြီးမှသာ ပြုလုပ်သင့်ပါသည်။ Payment reference သည် duplicate မဖြစ်ရပါ။ Actual received amount သည် selected plan price နှင့် ကိုက်ညီရပါမည်။ Screenshot တွင် receiver account၊ amount နှင့် date/time မြင်ရပါမည်။ တစ်ခုတည်းသော payment ဖြင့် user နှစ်ဦး သို့မဟုတ် request နှစ်ခုကို approve မလုပ်ရပါ။

## 4. Approval result

Approve လုပ်သောအခါ trusted Admin SDK သို့မဟုတ် server-side callable function သည် transaction/batch write တစ်ခုအဖြစ် အောက်ပါ data များကို update လုပ်သင့်ပါသည်။

```js
users/{userId} {
  plan: "6 Months",
  expiryDate: "2027-02-13T00:00:00.000Z",
  approvedPaymentRequestId: "request-document-id",
  subscriptionStatus: "active",
  approvedAt: serverTimestamp(),
  approvedBy: adminUid
}

paymentRequests/{requestId} {
  status: "approved",
  reviewedAt: serverTimestamp(),
  reviewedBy: adminUid,
  adminNote: "Payment verified"
}
```

`Lifetime` plan အတွက် `expiryDate` ကို `null` ထားပြီး `plan: "Lifetime"` ကို server-side logic ဖြင့်စစ်ဆေးရပါမည်။ Client-side `isProUser()` သည် display/access gating အတွက်သာ အသုံးပြုရပြီး security boundary မဖြစ်ရပါ။

## 5. Reject flow

Reject လုပ်သောအခါ `status: "rejected"`၊ `reviewedAt`၊ `reviewedBy` နှင့် အကြောင်းပြချက်ပါသော `adminNote` ကို သိမ်းဆည်းရပါမည်။ User ကို request status ကို ဖတ်ခွင့်ပေးထားသော်လည်း status ကို ပြန်ပြင်ခွင့်မပေးရပါ။ နောက်ထပ် submission ပြုလုပ်နိုင်သော်လည်း တူညီသော payment reference ကို server/admin review မှာ ထပ်စစ်ရပါမည်။

## 6. Admin provisioning

Admin UID များကို client app မှ မဖန်တီးရပါ။ Firebase Console သို့မဟုတ် Admin SDK ဖြင့် အောက်ပါ document ကို manually provision လုပ်ပါ။

```text
admins/{adminUid}
  email: "admin@example.com"
  displayName: "MTW SUBUU Admin"
  enabled: true
```

`firestore.rules` တွင် `admins/{uid}` document ရှိခြင်းကို admin authorization အဖြစ်အသုံးပြုထားပါသည်။ Admin document ကို client-side write မလုပ်နိုင်အောင် rules က ပိတ်ထားပါသည်။ Production တွင် custom claims နှင့် App Check ကို ထပ်မံအသုံးပြုရန် အကြံပြုပါသည်။

## 7. Production checklist

1. Firebase Console တွင် rules ကို deploy ပြီး unauthenticated၊ other-user၊ normal-user plan update နှင့် payment request update စမ်းသပ်ပါ။
2. Plan prices ကို client code မဟုတ်ဘဲ admin/server-side constant အဖြစ် ပြန်စစ်ပါ။
3. Admin approval မတိုင်မီ `isProUser()` သည် false ဖြစ်နေကြောင်း စမ်းသပ်ပါ။
4. Approved request တစ်ခုအတွက် user profile update နှင့် payment request status update ကို atomic batch ဖြင့် ပြုလုပ်ပါ။
5. Rejected/duplicate payment references များကို audit trail ထားပါ။
6. Payment proof များကို base64 data URL အဖြစ် Firestore doc ထဲ သိမ်းထားပါသည် (Firebase Storage မလိုအပ်တော့ပါ)။ Firestore ၏ document size limit (1MB) ကြောင့် client-side compression (`compressImageFile`, max ~700KB) ကို ဘယ်တော့မှ မဖျက်သင့်ပါ။
7. Refund၊ expiry၊ revoke နှင့် admin account disable flow များကို production မတင်မီ သတ်မှတ်ပါ။
