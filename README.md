# SkillSync

SkillSync is a dual-sided hackathon-ready hiring platform that replaces ATS keyword filtering with skill-based semantic evaluation.

## Folder Structure

```
c:\Users\nithy\OneDrive\Documents\kritoathon\
├── frontend/                     # React (Vite) + Vanilla CSS
│   ├── src/
│   │   ├── index.css             # Complete Design System (Dark mode, glassmorphism)
│   │   ├── main.jsx              # React Entry Point
│   │   ├── App.jsx               # Main App component with React Router & Mock Auth
│   │   ├── firebase.js           # Firebase configuration and functions connection
│   │   └── pages/
│   │       ├── Login.jsx         # Role Selection (Applicant / Company)
│   │       ├── ApplicantDashboard.jsx  # Resume parsing, Skill DNA visualization, Job Board
│   │       └── CompanyDashboard.jsx    # Candidate viewing, Blind Mode, ATS toggling
├── backend/
│   └── functions/
│       ├── index.js              # 3 Firebase HTTPS Callable functions with Sarvam API + Caching
│       ├── package.json          # Dependencies (firebase-admin, firebase-functions, etc.)
│       └── .env.example          # SARVAM_API_KEY placeholder
```

## Setup Instructions

### 1. Backend (Firebase Functions)

1. Open a terminal and navigate to `backend/functions`:
   ```bash
   cd backend/functions
   ```
2. Install dependencies (if not already installed):
   ```bash
   npm install
   ```
3. Set your Sarvam API Key:
   - Copy `.env.example` to `.env`
   - Edit `.env` and set `SARVAM_API_KEY=your_real_key_here`
4. Set up Firebase Project:
   - Ensure you have the Firebase CLI installed (`npm i -g firebase-tools`)
   - Run `firebase login`
   - Run `firebase init functions` and select your Firebase project.
   - Deploy functions: `firebase deploy --only functions`

### 2. Frontend (React + Vite)

1. Open a terminal and navigate to `frontend`:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure Firebase:
   - Open `src/firebase.js`
   - Replace the `firebaseConfig` object with your actual Firebase project settings from the Firebase Console.
4. Run the development server:
   ```bash
   npm run dev
   ```
5. Open your browser to the local URL (usually `http://localhost:5173`).

## Testing the Application

The application comes pre-configured with a "Demo Mode" for the Hackathon:
1. **Login Page**: Click "Login as Applicant" or "Login as Company" to instantly load the mock auth context.
2. **Applicant Flow**: Go to the Applicant Dashboard, click "Generate Skill DNA" to see the semantic parsing in action, then view the Recommended Jobs to see the matching engine.
3. **Company Flow**: Go to the Company Dashboard to see how candidates are evaluated. Try toggling "Blind Mode" and "ATS View" to see how SkillSync removes bias.
