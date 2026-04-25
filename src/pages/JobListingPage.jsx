import { useState } from "react";
import JOBS from "../data/jobs";
import "./JobListingPage.css";

export default function JobListingPage({ navigate, analysisResult, userData }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("All");

  const locations = ["All", "Remote", "Bengaluru, India", "San Francisco, CA", "London, UK", "Mumbai / Bengaluru, India"];

  const userSkills = (analysisResult?.skills || []).map((s) => s.toLowerCase());

  // Count how many required skills the user already has
  function getQuickMatchCount(job) {
    return job.requiredSkills.filter((s) =>
      userSkills.includes(s.toLowerCase())
    ).length;
  }

  const filtered = JOBS.filter((job) => {
    const matchSearch =
      job.title.toLowerCase().includes(search.toLowerCase()) ||
      job.company.toLowerCase().includes(search.toLowerCase()) ||
      job.requiredSkills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    const matchLocation = filter === "All" || job.location === filter;
    return matchSearch && matchLocation;
  });

  return (
    <div className="page">
      <h1 className="page-title">Job listings</h1>
      <p className="page-subtitle">
        {JOBS.length} openings
        {analysisResult && ` · Your Skill Sync Score: `}
        {analysisResult && (
          <span className="inline-score">{analysisResult.syncScore}%</span>
        )}
      </p>

      {/* Search + filter bar */}
      <div className="jobs-toolbar">
        <input
          type="text"
          placeholder="Search jobs, companies, or skills…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="jobs-search"
        />
        <div className="filter-pills">
          {locations.map((loc) => (
            <button
              key={loc}
              className={`filter-pill ${filter === loc ? "active" : ""}`}
              onClick={() => setFilter(loc)}
            >
              {loc}
            </button>
          ))}
        </div>
      </div>

      {/* Job cards */}
      <div className="job-list">
        {filtered.length === 0 && (
          <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "40px 0" }}>
            No jobs match your search.
          </p>
        )}

        {filtered.map((job) => {
          const matched = getQuickMatchCount(job);
          const total = job.requiredSkills.length;

          return (
            <div key={job.id} className="job-card">
              <div className="job-card-top">
                <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                  {job.logo && (
                    <span style={{ fontSize: 28, lineHeight: 1, paddingTop: 2 }}>{job.logo}</span>
                  )}
                  <div>
                    <h3 className="job-title">{job.title}</h3>
                    <p className="job-meta">
                      {job.company} · {job.location} · {job.type}
                    </p>
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                  <span className="job-salary">{job.salary}</span>
                  {analysisResult && (
                    <span className="quick-match">
                      {matched}/{total} skills matched
                    </span>
                  )}
                </div>
              </div>

              <p className="job-desc">{job.description}</p>

              <div className="job-skills">
                {job.requiredSkills.map((skill) => (
                  <span
                    key={skill}
                    className={`tag ${
                      userSkills.includes(skill.toLowerCase()) ? "tag-matched" : ""
                    }`}
                  >
                    {skill}
                  </span>
                ))}
              </div>

              <div className="job-card-footer">
                <span className="job-posted">{job.posted}</span>
                <button
                  className="btn btn-primary"
                  onClick={() => navigate("match", job)}
                >
                  See full match →
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
