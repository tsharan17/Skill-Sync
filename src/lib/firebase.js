// ─────────────────────────────────────────────────────────
//  Firebase v10 — Auth + Firestore
//  Replace the values below with your own Firebase project config.
//  Get it from: Firebase Console → Project Settings → Your Apps → SDK setup
// ─────────────────────────────────────────────────────────
//  HOW TO SET UP:
//  1. Go to https://console.firebase.google.com
//  2. Create a project (or open an existing one)
//  3. Add a Web App → copy the firebaseConfig object
//  4. In Firebase console: Enable Authentication (Email/Password)
//  5. In Firebase console: Create a Firestore database (start in test mode)
//  6. Paste your real values below (or use .env vars for production)
// ─────────────────────────────────────────────────────────

import { initializeApp } from "firebase/app";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
} from "firebase/firestore";

// ── Replace with your real Firebase config ──────────────
const firebaseConfig = {
  apiKey: "",
  authDomain: "skill-sync-1f6aa.firebaseapp.com",
  projectId: "skill-sync-1f6aa",
  storageBucket: "skill-sync-1f6aa.firebasestorage.app",
  messagingSenderId: "827328098571",
  appId: "1:827328098571:web:5af71171b9084d4a76f20e"
};
// ────────────────────────────────────────────────────────

const app  = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db   = getFirestore(app);

// ── Auth helpers ────────────────────────────────────────

/** Sign up a new user with email + password. Returns the Firebase User. */
export async function signUp(email, password) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sign in an existing user. Returns the Firebase User. */
export async function signIn(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

/** Sign out the current user. */
export async function logOut() {
  await signOut(auth);
}

/**
 * Subscribe to auth state changes.
 * @param {(user: import("firebase/auth").User | null) => void} callback
 * @returns unsubscribe function
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

export { auth };

// ── Firestore helpers ───────────────────────────────────

/**
 * Save (or merge-update) a candidate's portfolio data.
 * Document path: users/{uid}/portfolio/data
 */
export async function savePortfolio(uid, portfolioData) {
  const ref = doc(db, "users", uid, "portfolio", "data");
  await setDoc(ref, { ...portfolioData, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Load a candidate's portfolio data once.
 * Returns null if no document exists yet.
 */
export async function loadPortfolio(uid) {
  const ref  = doc(db, "users", uid, "portfolio", "data");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Subscribe to real-time portfolio changes for a user.
 * Calls callback immediately with current data, then on every change.
 * @returns unsubscribe function
 */
export function subscribePortfolio(uid, callback) {
  const ref = doc(db, "users", uid, "portfolio", "data");
  return onSnapshot(ref, (snap) => {
    callback(snap.exists() ? snap.data() : null);
  });
}

/**
 * Save skill score results after analysis.
 * Document path: users/{uid}/skillScores/latest
 */
export async function saveSkillScores(uid, scored) {
  const ref = doc(db, "users", uid, "skillScores", "latest");
  await setDoc(ref, { scored, savedAt: serverTimestamp() });
}

/**
 * Load the latest skill scores for a user.
 * Returns null if none saved yet.
 */
export async function loadSkillScores(uid) {
  const ref  = doc(db, "users", uid, "skillScores", "latest");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().scored : null;
}

/**
 * Save user role (candidate | company) to Firestore.
 * Document path: users/{uid}/meta/profile
 */
export async function saveUserMeta(uid, meta) {
  const ref = doc(db, "users", uid, "meta", "profile");
  await setDoc(ref, { ...meta, updatedAt: serverTimestamp() }, { merge: true });
}

/**
 * Load user meta (role, name, email).
 */
export async function loadUserMeta(uid) {
  const ref  = doc(db, "users", uid, "meta", "profile");
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

/**
 * Add this candidate to the shared applicants pool (company view).
 * Collection: applicants
 */
export async function publishApplicant(uid, applicantData) {
  const ref = doc(db, "applicants", uid);
  await setDoc(ref, { ...applicantData, publishedAt: serverTimestamp() }, { merge: true });
}

/**
 * Subscribe to all applicants (for company dashboard).
 * @returns unsubscribe function
 */
export function subscribeApplicants(callback) {
  const q = query(collection(db, "applicants"), orderBy("publishedAt", "desc"));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  });
}

export { db };
