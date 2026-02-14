import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// TODO: Replace with your actual Firebase project config
// You can find this in Firebase Console -> Project Settings -> General -> Your apps -> Web app
const firebaseConfig = {
    apiKey: "AIzaSyCpiKWGICYJKhE7_Ew3StkzBEIHZs1r9vU",
    authDomain: "focusguard-b074a.firebaseapp.com",
    projectId: "focusguard-b074a",
    storageBucket: "focusguard-b074a.firebasestorage.app",
    messagingSenderId: "77805130574",
    appId: "1:77805130574:web:64646997094ed20f89441f",
    measurementId: "G-1LKLSBPX2V"
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { auth, db, googleProvider };
