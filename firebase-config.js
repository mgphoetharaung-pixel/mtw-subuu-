import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, enableIndexedDbPersistence } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDmQE70Pe4bwmUcwLLMt8ZQoWdy_xmBRww",
    authDomain: "mtw-subuu.firebaseapp.com",
    projectId: "mtw-subuu",
    storageBucket: "mtw-subuu.appspot.com",
    messagingSenderId: "1028688066359",
    appId: "1:1028688066359:web:8a0e1000a760ba1dc40cb2"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();

// Enable Offline Persistence (အင်တာနက်မရှိဘဲ သုံးနိုင်ရန်)
try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code == 'failed-precondition') console.log("Multiple tabs open, offline mode only works in one tab.");
        else if (err.code == 'unimplemented') console.log("Browser doesn't support offline mode.");
    });
} catch(e) { console.log(e); }

export { db, auth, googleProvider };