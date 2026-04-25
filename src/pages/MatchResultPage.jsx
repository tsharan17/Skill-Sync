import { useEffect, useState } from "react";
import "./MatchResultPage.css";

// ── Call the Firebase matchCandidate function ──
async function callMatchCandidate(userData, job) {
  try {
    const res = await fetch(
      "https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/matchCandidate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userData, job }),
      }
    );
    if (!res.ok) throw new Error("API error");
    return await res.json();
  } catch (err) {
    console.warn("matchCandidate API failed, using fallback:", err.message);
    return { match_score: 0, strengths: [], missing_skills: [] };
  }
}

// ── Fallback: compute match locally from job skills vs user skills ──
function computeLocalMatch(job, userSkills) {
  const lowerUserSkills = userSkills.map((s) => s.toLowerCase());

  const strengths = job.requiredSkills.filter((s) =>
    lowerUserSkills.includes(s.toLowerCase())
  );
  const missing = job.requiredSkills
    .filter((s) => !lowerUserSkills.includes(s.toLowerCase()))
    .concat(job.niceToHave.slice(0, 2));

  const score = Math.round((strengths.length / job.requiredSkills.length) * 100);

  return { match_score: score, strengths, missing_skills: missing };
}

// ── Score ring SVG ──
function ScoreRing({ score }) {
  const r = 56;
  const circumference = 2 * Math.PI * r;
  const [animated, setAnimated] = useState(0);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(score), 150);
    return () => clearTimeout(t);
  }, [score]);

  const offset = circumference - (animated / 100) * circumference;
  const color = score >= 70 ? "var(--accent)" : score >= 45 ? "var(--warn)" : "var(--danger)";

  return (
    <div className="score-ring-wrapper">
      <svg width="140" height="140" viewBox="0 0 140 140">
        <circle cx="70" cy="70" r={r} fill="none" stroke="var(--surface2)" strokeWidth="10" />
        <circle
          cx="70" cy="70" r={r}
          fill="none" stroke={color} strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          transform="rotate(-90 70 70)"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="score-number" style={{ color }}>
        {score}<span>%</span>
      </div>
    </div>
  );
}

export default function MatchResultPage({ job, userData, navigate }) {
  const [loading, setLoading] = useState(true);
  const [match, setMatch] = useState(null);

  useEffect(() => {
    if (!job) { setLoading(false); return; }

    async function runMatch() {
      // Try the real API first
      const apiResult = await callMatchCandidate(userData, job);

      if (apiResult.match_score > 0) {
        // API returned real data
        setMatch({
          score: apiResult.match_score,
          strengths: apiResult.strengths || [],
          missing: apiResult.missing_skills || [],
        });
      } else {
        // API failed or returned 0 — compute locally from skills
        const userSkills = userData?.skills || [];
        const local = computeLocalMatch(job, userSkills);
        setMatch({
          score: local.match_score,
          strengths: local.strengths,
          missing: local.missing_skills,
        });
      }
      setLoading(false);
    }

    runMatch();
  }, [job, userData]);

  if (!job) {
    return (
      <div className="page" style={{ textAlign: "center", paddingTop: 80 }}>
        <p style={{ color: "var(--text-muted)" }}>No job selected.</p>
        <button className="btn btn-primary" style={{ marginTop: 20 }} onClick={() => navigate("jobs")}>
          ← Back to jobs
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="page" style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 100 }}>
        <div className="match-loading-spinner" />
        <p style={{ marginTop: 20, color: "var(--text-muted)" }}>Running match analysis…</p>
      </div>
    );
  }

  const level = match.score >= 70 ? "high" : match.score >= 45 ? "medium" : "low";
  const levelLabel = { high: "Strong match", medium: "Good match", low: "Partial match" };
  const levelDesc = {
    high: "Your skills and projects closely align with what this team needs.",
    medium: "Solid candidate. A few skill gaps but your portfolio shows real potential.",
    low: "Partial match. Consider upskilling in the missing areas before applying.",
  };

  return (
    <div className="page">
      <button className="btn btn-ghost" onClick={() => navigate("jobs")} style={{ marginBottom: 24 }}>
        ← Back to jobs
      </button>

      <h1 className="page-title">Match result</h1>
      <p className="page-subtitle">{job.title} at {job.company}</p>

      {/* Score hero */}
      <div className="card match-hero">
        <ScoreRing score={match.score} />
        <div className="match-hero-text">
          <p className={`match-level match-level--${level}`}>{levelLabel[level]}</p>
          <p className="match-explanation">{levelDesc[level]}</p>
          <p className="match-note">
            ℹ️ Score calculated from your skills vs. job requirements.
            Results are cached — won't re-run for this job.
          </p>
        </div>
      </div>

      {/* Strengths */}
      <div className="card">
        <h2 className="result-section-title">✅ Your strengths</h2>
        <p className="result-section-sub">Skills that match this role.</p>
        {match.strengths.length === 0 ? (
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            No direct skill matches found. Update your portfolio to improve this.
          </p>
        ) : (
          <div className="skill-list">
            {match.strengths.map((s) => (
              <div key={s} className="skill-row strength">
                <span className="skill-icon">✓</span>
                <span className="skill-name">{s}</span>
                <span className="skill-badge good">Matched</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Missing skills */}
      <div className="card">
        <h2 className="result-section-title">⚡ Skills to develop</h2>
        <p className="result-section-sub">Close these gaps to improve your match score.</p>
        <div className="skill-list">
          {match.missing.map((s) => (
            <div key={s} className="skill-row missing">
              <span className="skill-icon">○</span>
              <span className="skill-name">{s}</span>
              <span className="skill-badge gap">Gap</span>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="card match-cta">
        <p style={{ fontSize: 14, marginBottom: 16 }}>
          Ready to apply? Make sure your portfolio showcases the matched skills.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button className="btn btn-primary">Apply now →</button>
          <button className="btn btn-outline" onClick={() => navigate("portfolio")}>
            Update portfolio
          </button>
        </div>
      </div>
    </div>
  );
}
