import { useState, useEffect } from "react";
import LoginPage from "./pages/LoginPage";
import ResumeUploadPage from "./pages/ResumeUploadPage";
import PortfolioPage from "./pages/PortfolioPage";
import ResumeAnalysisPage from "./pages/ResumeAnalysisPage";
import JobListingPage from "./pages/JobListingPage";
import MatchResultPage from "./pages/MatchResultPage";
import CompanyDashboard from "./pages/CompanyDashboard";
import Navbar from "./components/Navbar";
import {
  onAuthChange,
  logOut,
  saveUserMeta,
  loadUserMeta,
  loadPortfolio,
  savePortfolio,
  saveSkillScores,
  publishApplicant,
  subscribeApplicants,
} from "./lib/firebase.js";
import "./styles/global.css";

export default function App() {
  const [page, setPage]               = useState("login");
  const [isLoggedIn, setIsLoggedIn]   = useState(false);
  const [userRole, setUserRole]       = useState("candidate");
  const [firebaseUser, setFirebaseUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Global candidate data
  const [userData, setUserData]             = useState(null);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [selectedJob, setSelectedJob]       = useState(null);

  // Company applicants (real-time from Firestore)
  const [applicants, setApplicants] = useState([]);

  // ── Firebase auth listener — runs once on mount ──────────────────
  useEffect(() => {
    const unsub = onAuthChange(async (user) => {
      if (user) {
        setFirebaseUser(user);

        // Load saved meta (role, name)
        const meta = await loadUserMeta(user.uid).catch(() => null);
        const role = meta?.role || "candidate";
        setUserRole(role);

        // Load saved portfolio data
        const saved = await loadPortfolio(user.uid).catch(() => null);
        if (saved) {
          setUserData((prev) => ({
            ...prev,
            ...saved,
            // Force a fresh portfolioUpdatedAt so analysis re-runs
            portfolioUpdatedAt: saved.updatedAt?.toMillis?.() || Date.now(),
          }));
        }

        setIsLoggedIn(true);
        setPage(role === "company" ? "company" : "resume");
      } else {
        setFirebaseUser(null);
        setIsLoggedIn(false);
        setPage("login");
      }
      setAuthLoading(false);
    });
    return unsub;
  }, []);

  // ── Subscribe to applicants when company logs in ─────────────────
  useEffect(() => {
    if (!isLoggedIn || userRole !== "company") return;
    const unsub = subscribeApplicants((list) => setApplicants(list));
    return unsub;
  }, [isLoggedIn, userRole]);

  // ── Auto-save portfolio to Firestore whenever userData changes ───
  useEffect(() => {
    if (!firebaseUser || !userData?.portfolioUpdatedAt) return;
    // Firestore rejects undefined — strip it out with nullish coalescing
    const { name, email, skills, projects, certifications, courses, resumeText } = userData;
    const clean = (v, fallback) => (v !== undefined && v !== null) ? v : fallback;
    savePortfolio(firebaseUser.uid, {
      name:           clean(name, ""),
      email:          clean(email, ""),
      skills:         clean(skills, []),
      projects:       clean(projects, []),
      certifications: clean(certifications, []),
      courses:        clean(courses, []),
      resumeText:     clean(resumeText, ""),
    }).catch((err) => console.warn("Portfolio save failed:", err));
  }, [userData?.portfolioUpdatedAt, firebaseUser]);

  // ── Navigation ───────────────────────────────────────────────────
  const navigate = (to, data = null) => {
    if (to === "match" && data) setSelectedJob(data);
    setPage(to);
  };

  // ── Called from LoginPage after Firebase auth succeeds ───────────
  const handleLogin = async (role = "candidate", user = null) => {
    const uid = user?.uid || firebaseUser?.uid;
    if (uid) {
      await saveUserMeta(uid, { role, email: user?.email || "" }).catch(() => {});
    }
    setUserRole(role);
    setIsLoggedIn(true);
    setFirebaseUser(user || firebaseUser);
    setPage(role === "company" ? "company" : "resume");
  };

  const handleLogout = async () => {
    await logOut().catch(() => {});
    setIsLoggedIn(false);
    setFirebaseUser(null);
    setUserData(null);
    setAnalysisResult(null);
    setPage("login");
  };

  // ── Called from ResumeAnalysisPage after skill scoring is done ───
  const handleAnalysisDone = async (result, combinedUserData) => {
    setAnalysisResult(result);
    setUserData(combinedUserData);

    const uid = firebaseUser?.uid;
    if (uid) {
      // Persist skill scores to Firestore
      await saveSkillScores(uid, result.skills || []).catch(() => {});

      // Publish this candidate to the shared applicants pool
      await publishApplicant(uid, {
        name:       combinedUserData.name || "Anonymous Candidate",
        syncScore:  result.syncScore,
        skills:     result.skills,
        summary:    result.summary,
        userData:   combinedUserData,
        analysisResult: result,
      }).catch(() => {});
    }

    navigate("jobs");
  };

  if (authLoading) {
    return (
      <div className="app" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh" }}>
        <div style={{ textAlign: "center" }}>
          <div className="loading-spinner" style={{ margin: "0 auto 16px" }} />
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading Skill Sync…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {isLoggedIn && (
        <Navbar
          currentPage={page}
          navigate={navigate}
          onLogout={handleLogout}
          userRole={userRole}
        />
      )}

      {page === "login"    && <LoginPage onLogin={handleLogin} />}
      {page === "resume"   && <ResumeUploadPage navigate={navigate} setUserData={setUserData} />}
      {page === "portfolio" && (
        <PortfolioPage navigate={navigate} setUserData={setUserData} userData={userData} />
      )}
      {page === "analysis" && (
        <ResumeAnalysisPage
          userData={userData}
          onDone={handleAnalysisDone}
          navigate={navigate}
        />
      )}
      {page === "jobs" && (
        <JobListingPage
          navigate={navigate}
          analysisResult={analysisResult}
          userData={userData}
        />
      )}
      {page === "match" && (
        <MatchResultPage
          job={selectedJob}
          userData={userData}
          navigate={navigate}
        />
      )}
      {page === "company" && (
        <CompanyDashboard applicants={applicants} navigate={navigate} />
      )}
    </div>
  );
}
