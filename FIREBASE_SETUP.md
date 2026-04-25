# Firebase Setup for Skill Sync

## 1. Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it `skill-sync` → Continue
3. Disable Google Analytics (optional) → **Create project**

## 2. Enable Authentication

1. In Firebase Console → **Build → Authentication**
2. Click **"Get started"**
3. Under **Sign-in method**, enable **Email/Password** → Save

## 3. Create Firestore Database

1. In Firebase Console → **Build → Firestore Database**
2. Click **"Create database"**
3. Choose **"Start in test mode"** → Next → Select a region → **Done**

## 4. Add Your Web App

1. In Firebase Console → **Project Overview → "Add app" → Web (</> icon)**
2. Register the app (name it `skill-sync-web`)
3. Copy the `firebaseConfig` object shown — it looks like:

```js
const firebaseConfig = {
  apiKey:            "AIza...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project-id",
  storageBucket:     "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc123",
};
```

## 5. Paste Config into the App

Open `src/lib/firebase.js` and replace the placeholder `firebaseConfig` with your real values.

## 6. Add Sarvam API Key

Open `src/lib/config.js` and paste your Sarvam key:

```js
export const SARVAM_API_KEY = "your-sarvam-key-here";
```

Get a free key at [https://dashboard.sarvam.ai](https://dashboard.sarvam.ai)

## 7. Install & Run

```bash
npm install
npm run dev
```

---

## Firestore Data Structure

```
users/
  {uid}/
    meta/
      profile        → { role, email, updatedAt }
    portfolio/
      data           → { name, email, skills, projects, certifications, courses, resumeText, updatedAt }
    skillScores/
      latest         → { scored: [...], savedAt }

applicants/
  {uid}              → { name, syncScore, skills, userData, publishedAt }
```

## Security Rules (for production — replace test mode)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{uid}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
    match /applicants/{uid} {
      allow write: if request.auth != null && request.auth.uid == uid;
      allow read: if request.auth != null;
    }
  }
}
```

---

## Anthropic API Key (for skill scoring)

1. Go to [https://console.anthropic.com](https://console.anthropic.com) → API Keys → Create key
2. Copy `.env.example` to `.env` in the project root
3. Paste your key:
   ```
   VITE_ANTHROPIC_API_KEY=sk-ant-...
   ```
4. The Vite dev server proxies all `/api/anthropic/*` requests server-side — no CORS errors.

> ⚠️ For production (after `npm run build`), you need a backend proxy (Vercel serverless function, Express server, etc.) — the Vite proxy only works during `npm run dev`.
