import { useState } from "react";
import JOBS from "../data/jobs";
import "./CompanyDashboard.css";

// Dummy applicants shown when no real ones have submitted yet
const DUMMY_APPLICANTS = [
  {
    id: 101,
    name: "Priya Sharma",
    syncScore: 80,
    skills: ["React", "TypeScript", "Node.js", "CSS"],
    summary: "Frontend engineer with 3 years building SaaS products. Strong in React and design systems.",
    analysisResult: { syncScore: 80, skills: ["React", "TypeScript", "Node.js", "CSS"], summary: "Frontend engineer with 3 years building SaaS products." },
  },
  {
    id: 102,
    name: "Arjun Mehta",
    syncScore: 60,
    skills: ["Python", "Django", "PostgreSQL", "Docker"],
    summary: "Backend developer focused on API design and database performance.",
    analysisResult: { syncScore: 60, skills: ["Python", "Django", "PostgreSQL", "Docker"], summary: "Backend developer focused on API design and database performance." },
  },
  {
    id: 103,
    name: "Simran Kaur",
    syncScore: 90,
    skills: ["React", "GraphQL", "TypeScript", "AWS", "CSS", "Testing"],
    summary: "Full-stack engineer with experience shipping at scale. Led a team of 4 at a Series B startup.",
    analysisResult: { syncScore: 90, skills: ["React", "GraphQL", "TypeScript", "AWS", "CSS", "Testing"], summary: "Full-stack engineer with experience shipping at scale." },
  },
];

// Simple match score: how many job skills does the applicant have?
function computeMatchForJob(applicantSkills, job) {
  if (!job) return 0;
  const lower = applicantSkills.map((s) => s.toLowerCase());
  const matched = job.requiredSkills.filter((s) => lower.includes(s.toLowerCase()));
  return Math.round((matched.length / job.requiredSkills.length) * 100);
}

// Score colour helper
function scoreColor(score) {
  if (score >= 70) return "var(--accent)";
  if (score >= 45) return "var(--warn)";
  return "var(--danger)";
}

export default function CompanyDashboard({ applicants, navigate }) {
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(JOBS[0].id);

  const selectedJob = JOBS.find((j) => j.id === selectedJobId);

  // Show real applicants if any, else show dummies
  const displayApplicants = applicants.length > 0 ? applicants : DUMMY_APPLICANTS;

  return (
    <div className="page">
      <h1 className="page-title">Company Dashboard</h1>
      <p className="page-subtitle">
        {displayApplicants.length} applicant{displayApplicants.length !== 1 ? "s" : ""} ·
        {applicants.length === 0 && " showing demo data"}
      </p>

      {/* Job filter */}
      <div className="card" style={{ marginBottom: 20 }}>
        <label>Filter by job opening</label>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(Number(e.target.value))}
        >
          {JOBS.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title} — {j.company}
            </option>
          ))}
        </select>
      </div>

      <div className="dashboard-layout">
        {/* Left: applicant list */}
        <div className="applicant-list">
          {displayApplicants.map((applicant) => {
            const matchScore = computeMatchForJob(applicant.skills, selectedJob);
            const isSelected = selectedApplicant?.id === applicant.id;

            return (
              <div
                key={applicant.id}
                className={`applicant-card ${isSelected ? "selected" : ""}`}
                onClick={() => setSelectedApplicant(applicant)}
              >
                <div className="applicant-card-top">
                  <div className="applicant-avatar">
                    {applicant.name.charAt(0)}
                  </div>
                  <div className="applicant-info">
                    <p className="applicant-name">{applicant.name}</p>
                    <p className="applicant-skill-count">
                      {applicant.skills.length} skills detected
                    </p>
                  </div>
                  <div className="applicant-scores">
                    <div className="score-chip" style={{ color: scoreColor(applicant.syncScore) }}>
                      <span className="score-chip-label">Sync</span>
                      <span className="score-chip-value">{applicant.syncScore}%</span>
                    </div>
                    <div className="score-chip" style={{ color: scoreColor(matchScore) }}>
                      <span className="score-chip-label">Match</span>
                      <span className="score-chip-value">{matchScore}%</span>
                    </div>
                  </div>
                </div>

                <div className="applicant-top-skills">
                  {applicant.skills.slice(0, 4).map((s) => (
                    <span key={s} className="tag">{s}</span>
                  ))}
                  {applicant.skills.length > 4 && (
                    <span className="tag" style={{ background: "var(--surface2)", color: "var(--text-muted)" }}>
                      +{applicant.skills.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right: applicant detail */}
        <div className="applicant-detail">
          {!selectedApplicant ? (
            <div className="detail-empty">
              <p>👈</p>
              <p>Select an applicant to view their full profile.</p>
            </div>
          ) : (
            <ApplicantDetail
              applicant={selectedApplicant}
              job={selectedJob}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ──
function ApplicantDetail({ applicant, job }) {
  const matchScore = computeMatchForJob(applicant.skills, job);
  const lowerSkills = applicant.skills.map((s) => s.toLowerCase());
  const matched = job.requiredSkills.filter((s) => lowerSkills.includes(s.toLowerCase()));
  const missing = job.requiredSkills.filter((s) => !lowerSkills.includes(s.toLowerCase()));

  return (
    <div>
      {/* Header */}
      <div className="detail-header">
        <div className="detail-avatar">{applicant.name.charAt(0)}</div>
        <div>
          <h2 className="detail-name">{applicant.name}</h2>
          <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
            {applicant.skills.length} skills · Sync Score{" "}
            <span style={{ color: scoreColor(applicant.syncScore), fontWeight: 700 }}>
              {applicant.syncScore}%
            </span>
          </p>
        </div>
      </div>

      {/* Match bar */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600 }}>Job match — {job.title}</span>
          <span style={{ color: scoreColor(matchScore), fontWeight: 700 }}>{matchScore}%</span>
        </div>
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{
              width: `${matchScore}%`,
              background: scoreColor(matchScore),
            }}
          />
        </div>
      </div>

      {/* Summary */}
      <div className="card" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Summary
        </p>
        <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.6 }}>
          {applicant.summary || "No summary available."}
        </p>
      </div>

      {/* Skills breakdown */}
      <div className="card" style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Match breakdown
        </p>

        {matched.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <p style={{ fontSize: 12, color: "var(--accent)", marginBottom: 6 }}>✓ Matched</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {matched.map((s) => <span key={s} className="tag">{s}</span>)}
            </div>
          </div>
        )}

        {missing.length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: "var(--danger)", marginBottom: 6 }}>○ Missing</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {missing.map((s) => (
                <span key={s} className="tag" style={{ background: "rgba(255,95,109,0.1)", color: "var(--danger)", borderColor: "rgba(255,95,109,0.3)" }}>
                  {s}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* All skills */}
      <div className="card">
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.5px" }}>
          All skills ({applicant.skills.length})
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {applicant.skills.map((s) => (
            <span key={s} className="tag">{s}</span>
          ))}
        </div>
      </div>
    </div>
  );
}
