import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  deleteUser,
  updatePassword,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
} from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  getDoc,
  getDocFromServer,
  updateDoc,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  where,
  orderBy,
  limit,
  limitToLast,
  query,
  startAfter,
  endBefore,
  Timestamp,
  increment,
  arrayUnion,
  arrayRemove,
  getCountFromServer,
} from "firebase/firestore";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";
import { getFunctions } from "firebase/functions";
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { shouldAutoRefreshAppCheck } from "@/composables/data/liveBuildService.js";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROEJCT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
});
const functions = getFunctions(app);
const storage = getStorage(app);

const debugToken = import.meta.env.VITE_DEBUG_TOKEN;
if(debugToken){
  self.FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
}
const appCheck = initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider(import.meta.env.VITE_RECAPTCHA_PROVIDER_KEY),
  isTokenAutoRefreshEnabled: shouldAutoRefreshAppCheck(
    typeof location === "undefined" ? "" : location.hostname,
    debugToken
  ),
});

export {
  auth,
  db,
  appCheck,
  getToken,
  //Auth
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  deleteUser,
  updatePassword,
  onAuthStateChanged,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
  reauthenticateWithPopup,
  //database
  collection,
  getDoc,
  getDocFromServer,
  updateDoc,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  where,
  orderBy,
  limitToLast,
  limit,
  query,
  startAfter,
  endBefore,
  getCountFromServer,
  increment,
  arrayUnion,
  arrayRemove,
  Timestamp,
  //functions
  functions,
  //storage
  storage,
  storageRef,
  uploadBytes,
  getDownloadURL,
};
