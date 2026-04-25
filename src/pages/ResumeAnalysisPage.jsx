import { useEffect, useState, useRef } from "react";
import { claudeChat } from "../lib/claudeApi.js";
import "./ResumeAnalysisPage.css";

// ─────────────────────────────────────────────────────────────────
// Sarvam API: extract skills FROM descriptions, auto-detect complexity
// ─────────────────────────────────────────────────────────────────
async function generateSkillProfile(userData) {
  const { projects = [], certifications = [], courses = [], skills = [] } = userData;

  const hasContent =
    projects.some((p) => p.title || p.description) ||
    certifications.some((c) => c.name) ||
    courses.some((c) => c.name) ||
    skills.length > 0;

  if (!hasContent) return [];

  const projectContext = projects
    .filter((p) => p.title || p.description)
    .map((p, i) =>
      `Project ${i + 1}: "${p.title || "Untitled"}"\nDuration: ${p.duration || "unknown"}\nDescription: ${p.description || "No description provided"}\nTech Stack Listed: ${(p.techStack || []).join(", ") || "none"}`
    ).join("\n\n");

  const certContext = certifications.filter((c) => c.name).map((c) =>
    `• ${c.name} by ${c.issuer || "unknown"} (${c.year || "?"}) — Score: ${c.score || "not provided"} — Covers: ${(c.skillsCovered || []).join(", ") || "not specified"}`
  ).join("\n");

  const courseContext = courses.filter((c) => c.name).map((c) =>
    `• [${c.type === "cbp" ? "College subject" : "Online course"}] "${c.name}" at ${c.institution || "unknown"} — Grade: ${c.grade || "not provided"} — Covers: ${(c.skillsCovered || []).join(", ") || "not specified"}`
  ).join("\n");

  const prompt = `You are an expert technical skill evaluator for a hiring intelligence platform.

IMPORTANT: Extract skills from EVERY source — projects, certifications, courses, AND manually listed skills. Do not skip any source.

RULES:
- For projects: extract skills from BOTH the description AND the tech stack list. Even a short description like "built a fan controller using ESP32" proves ESP32, embedded systems, and hardware programming as skills.
- For manually listed skills: include ALL of them. Score at 10–20 pts if there is no other evidence, higher if they appear in projects too.
- Never return an empty array if any data was provided.

COMPLEXITY DETECTION (for projects):
- Advanced: distributed systems, production scale, novel architecture, optimization
- Intermediate: multi-feature apps, real-world API integrations, data pipelines
- Beginner: simple implementations, single-purpose tools, basic builds

SCORING RUBRIC (1–100):
- Project tech stack / description evidence: Advanced=50pts, Intermediate=35pts, Beginner=20pts
- Cert/course grade: 90%+/A+=30pts, Pass/B=15pts, low=5pts
- Breadth bonus: +5pts per extra source type (project + cert + course)
- Manually listed only: 10–20pts base

PROJECTS TO ANALYZE:
${projectContext || "None provided"}

CERTIFICATIONS:
${certContext || "None provided"}

COURSES & COLLEGE SUBJECTS:
${courseContext || "None provided"}

MANUALLY LISTED SKILLS (include every single one of these in your output):
${skills.join(", ") || "None"}

Respond with ONLY a raw JSON array — no markdown, no backticks, no explanation:
[{"skill":"ESP32","score":22,"category":"Other","evidence":"Used to build DC motor fan controller in Project 1 (Beginner complexity).","detectedComplexity":"Beginner"},...]`;

  // Throws on API failure — UI catches this and shows the error state
  // instead of silently showing fake fallback data
  const reply = await claudeChat([{ role: "user", content: prompt }], { max_tokens: 2000 });

  // Strip any markdown fences the model may have added
  let clean = reply.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();

  // Extract the JSON array even if there's surrounding text
  const jsonStart = clean.indexOf("[");
  const jsonEnd   = clean.lastIndexOf("]");
  if (jsonStart === -1 || jsonEnd === -1) {
    throw new Error(`Model did not return a JSON array. Got: ${clean.slice(0, 300)}`);
  }

  const parsed = JSON.parse(clean.slice(jsonStart, jsonEnd + 1));
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Model returned an empty skill list — check your project descriptions.");
  }
  return parsed;
}

// ─────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────

const CATEGORY_COLORS = {
  "Frontend":   { bar: "#4fffb0", bg: "rgba(79,255,176,0.10)",  text: "#4fffb0"  },
  "Backend":    { bar: "#60a5fa", bg: "rgba(96,165,250,0.10)",  text: "#60a5fa"  },
  "DevOps":     { bar: "#f472b6", bg: "rgba(244,114,182,0.10)", text: "#f472b6"  },
  "Data/ML":    { bar: "#a78bfa", bg: "rgba(167,139,250,0.10)", text: "#a78bfa"  },
  "Mobile":     { bar: "#fb923c", bg: "rgba(251,146,60,0.10)",  text: "#fb923c"  },
  "Design":     { bar: "#facc15", bg: "rgba(250,204,21,0.10)",  text: "#facc15"  },
  "Database":   { bar: "#34d399", bg: "rgba(52,211,153,0.10)",  text: "#34d399"  },
  "Language":   { bar: "#94a3b8", bg: "rgba(148,163,184,0.10)", text: "#94a3b8"  },
  "Soft Skill": { bar: "#f87171", bg: "rgba(248,113,113,0.10)", text: "#f87171"  },
  "Other":      { bar: "#7a8499", bg: "rgba(122,132,153,0.10)", text: "#7a8499"  },
};

function getCatStyle(cat) {
  return CATEGORY_COLORS[cat] || CATEGORY_COLORS["Other"];
}

function getLevel(score) {
  if (score >= 80) return { label: "Expert",       color: "#4fffb0" };
  if (score >= 60) return { label: "Proficient",   color: "#60a5fa" };
  if (score >= 40) return { label: "Intermediate", color: "#ffb347" };
  return                   { label: "Beginner",    color: "#ff5f6d" };
}

const COMPLEXITY_BADGE = {
  "Advanced":     { color: "#4fffb0", bg: "rgba(79,255,176,0.10)"  },
  "Intermediate": { color: "#ffb347", bg: "rgba(255,179,71,0.10)"  },
  "Beginner":     { color: "#ff5f6d", bg: "rgba(255,95,109,0.10)"  },
  "N/A":          { color: "#7a8499", bg: "rgba(122,132,153,0.10)" },
};

function SkillCard({ item, delay = 0 }) {
  const [width, setWidth] = useState(0);
  const catStyle = getCatStyle(item.category);
  const level    = getLevel(item.score);
  const cplx     = item.detectedComplexity && item.detectedComplexity !== "N/A"
    ? COMPLEXITY_BADGE[item.detectedComplexity]
    : null;

  useEffect(() => {
    const t = setTimeout(() => setWidth(item.score), delay);
    return () => clearTimeout(t);
  }, [item.score, delay]);

  return (
    <div className="skill-card">
      <div className="skill-card-top">
        <div className="skill-card-name-row">
          <span className="skill-card-name">{item.skill}</span>
          <span className="skill-cat-badge" style={{ background: catStyle.bg, color: catStyle.text }}>
            {item.category}
          </span>
        </div>
        <div className="skill-card-score-row">
          <span className="skill-card-score" style={{ color: catStyle.bar }}>{item.score}</span>
          <span className="skill-level-badge" style={{ color: level.color }}>{level.label}</span>
          {cplx && (
            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 4, background: cplx.bg, color: cplx.color, letterSpacing: "0.03em" }}>
              {item.detectedComplexity}
            </span>
          )}
        </div>
      </div>

      <div className="skill-bar-track">
        <div
          className="skill-bar-fill"
          style={{
            width: `${width}%`,
            background: catStyle.bar,
            transition: `width 0.9s cubic-bezier(0.16,1,0.3,1) ${delay * 0.001}s`,
          }}
        />
      </div>

      {item.evidence && (
        <p className="skill-evidence">{item.evidence}</p>
      )}
    </div>
  );
}

function StatStrip({ scored }) {
  const avg        = scored.length ? Math.round(scored.reduce((a, b) => a + b.score, 0) / scored.length) : 0;
  const expert     = scored.filter((s) => s.score >= 80).length;
  const proficient = scored.filter((s) => s.score >= 60 && s.score < 80).length;
  const cats       = [...new Set(scored.map((s) => s.category))].length;

  return (
    <div className="stat-strip">
      {[
        { label: "Total skills", value: scored.length },
        { label: "Avg. score",   value: avg },
        { label: "Expert level", value: expert },
        { label: "Proficient",   value: proficient },
        { label: "Domains",      value: cats },
      ].map((s) => (
        <div key={s.label} className="stat-item">
          <span className="stat-value">{s.value}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryBreakdown({ scored }) {
  const catMap = {};
  scored.forEach((s) => {
    if (!catMap[s.category]) catMap[s.category] = [];
    catMap[s.category].push(s.score);
  });

  const cats = Object.entries(catMap)
    .map(([cat, scores]) => ({
      cat,
      avg:   Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }))
    .sort((a, b) => b.avg - a.avg);

  if (cats.length === 0) return null;

  return (
    <div className="card">
      <h2 className="result-section-title">📊 Skill Domains</h2>
      <p className="result-section-sub">Average score and skill count per domain.</p>
      <div className="cat-grid">
        {cats.map(({ cat, avg, count }) => {
          const style = getCatStyle(cat);
          return (
            <div key={cat} className="cat-cell">
              <div className="cat-cell-header">
                <span className="cat-cell-name">{cat}</span>
                <span className="cat-cell-count">{count} skill{count !== 1 ? "s" : ""}</span>
              </div>
              <div className="cat-bar-track">
                <div className="cat-bar-fill" style={{ width: `${avg}%`, background: style.bar }} />
              </div>
              <span className="cat-bar-score" style={{ color: style.bar }}>{avg}/100</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CategoryTabs({ categories, active, onChange }) {
  return (
    <div className="cat-tabs">
      <button className={`cat-tab ${active === "all" ? "active" : ""}`} onClick={() => onChange("all")}>
        All
      </button>
      {categories.map((c) => {
        const style = getCatStyle(c);
        return (
          <button
            key={c}
            className={`cat-tab ${active === c ? "active" : ""}`}
            style={active === c ? { borderColor: style.bar, color: style.bar, background: style.bg } : {}}
            onClick={() => onChange(c)}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

function getSuggestions(userData, scored) {
  const sugs = [];
  const { projects = [], certifications = [], courses = [], skills = [] } = userData;
  const lowSkills = scored.filter((s) => s.score < 40);

  if (projects.length === 0) {
    sugs.push({ icon: "🛠️", text: "Add at least one project — it's the highest-weight signal for skill scoring." });
  } else {
    const thinDescriptions = projects.filter((p) => !p.description || p.description.trim().length < 80);
    if (thinDescriptions.length > 0) {
      sugs.push({ icon: "✍️", text: `${thinDescriptions.length} project(s) have thin descriptions. Detailed descriptions unlock higher complexity scores and more skills.` });
    }
    const advancedCount = scored.filter((s) => s.detectedComplexity === "Advanced").length;
    if (advancedCount === 0 && projects.length > 0) {
      sugs.push({ icon: "🚀", text: "No Advanced-complexity projects detected yet. Describe architectural decisions, scale challenges, or performance work to unlock higher scores." });
    }
  }

  const certsWithNoScore = certifications.filter((c) => c.name && !c.score);
  if (certsWithNoScore.length > 0) {
    sugs.push({ icon: "🏅", text: `Add your score/grade for ${certsWithNoScore.length} certification(s) — it directly boosts the skills they cover.` });
  }

  if (courses.length === 0) {
    sugs.push({ icon: "📚", text: "Add courses or college subjects to give more depth to your skill evidence." });
  }

  if (lowSkills.length > 0) {
    sugs.push({ icon: "📈", text: `${lowSkills.map((s) => s.skill).slice(0, 3).join(", ")} have low scores. Add projects that demonstrate these skills in a real context.` });
  }

  if (sugs.length === 0) {
    sugs.push({ icon: "✅", text: "Strong profile! Keep updating your projects as you build more." });
  }

  return sugs;
}

// ─────────────────────────────────────────────────────────────────
// Main page
// ─────────────────────────────────────────────────────────────────
export default function ResumeAnalysisPage({ userData, onDone, navigate }) {
  const [loading, setLoading]     = useState(false);
  const [scored, setScored]       = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [error, setError]         = useState("");

  // FIX: Track the actual timestamp value, not just whether it changed.
  // Previously, the guard `ts === lastUpdated.current && scored.length > 0`
  // was preventing re-scoring when the user went back to Portfolio and
  // edited data — the timestamp could be the same if they navigated quickly.
  // Now we always re-run scoring when this page mounts or userData changes.
  const lastScoredTs = useRef(null);

  useEffect(() => {
    // Check if there is actually any content to score
    const hasContent =
      userData &&
      (
        (userData.projects || []).some((p) => p.title || p.description) ||
        (userData.certifications || []).some((c) => c.name) ||
        (userData.courses || []).some((c) => c.name) ||
        (userData.skills || []).length > 0
      );

    if (!hasContent) {
      // Nothing to score — drop straight to empty state, do not spin forever
      setLoading(false);
      setScored([]);
      return;
    }

    const ts = userData.portfolioUpdatedAt;

    // Only skip if the EXACT same timestamp was already successfully scored
    if (ts && ts === lastScoredTs.current && scored.length > 0) return;

    setLoading(true);
    setError("");
    setScored([]);

    generateSkillProfile(userData)
      .then((result) => {
        setScored(result);
        lastScoredTs.current = ts ?? Date.now();
        setLoading(false);
      })
      .catch((err) => {
        console.error("generateSkillProfile error:", err);
        setError(err.message || "Skill scoring failed. Check your Sarvam API key in src/lib/config.js.");
        setLoading(false);
      });
  // Re-run on any meaningful portfolio change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userData?.portfolioUpdatedAt, userData?.projects?.length, userData?.skills?.length, userData?.certifications?.length, userData?.courses?.length]);

  const categories = [...new Set(scored.map((s) => s.category))].sort();
  const filtered   = activeTab === "all" ? scored : scored.filter((s) => s.category === activeTab);
  const sorted     = [...filtered].sort((a, b) => b.score - a.score);
  const suggestions = userData ? getSuggestions(userData, scored) : [];

  if (loading) {
    return (
      <div className="page analysis-loading">
        <div className="loading-spinner" />
        <p className="loading-text">Analysing your skill profile…</p>
        <p className="loading-sub">Extracting skills from project descriptions and scoring evidence</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page analysis-empty">
        <div className="empty-icon">⚠️</div>
        <h2 className="empty-title">Skill scoring failed</h2>
        <p className="empty-sub" style={{ color: "#ff5f6d" }}>{error}</p>
        <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center" }}>
          <button className="btn btn-outline" onClick={() => navigate("portfolio")}>← Edit portfolio</button>
          <button className="btn btn-primary" onClick={() => {
            lastScoredTs.current = null;
            setError("");
            setLoading(true);
            generateSkillProfile(userData || {}).then((r) => { setScored(r); setLoading(false); }).catch((e) => { setError(e.message); setLoading(false); });
          }}>Retry →</button>
        </div>
      </div>
    );
  }

  if (!loading && scored.length === 0) {
    return (
      <div className="page analysis-empty">
        <div className="empty-icon">🎯</div>
        <h2 className="empty-title">No skills found yet</h2>
        <p className="empty-sub">
          Go back and fill in your projects with detailed descriptions, certifications, courses, and skills.
          The more context you provide, the richer your skill profile.
        </p>
        <button className="btn btn-primary" style={{ marginTop: 24 }} onClick={() => navigate("portfolio")}>
          ← Fill in portfolio
        </button>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="profile-header">
        <div>
          <h1 className="page-title">Skill Profile</h1>
          <p className="page-subtitle">
            Skills and scores extracted from your project descriptions, certifications, and courses.
          </p>
        </div>
        <button className="btn btn-outline" onClick={() => navigate("portfolio")}>
          ← Edit portfolio
        </button>
      </div>

      <StatStrip scored={scored} />
      <CategoryBreakdown scored={scored} />

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="skills-list-header">
          <div>
            <h2 className="result-section-title">⚡ All Skills</h2>
            <p className="result-section-sub">Sorted by score. Complexity badges show what was auto-detected from your descriptions.</p>
          </div>
        </div>

        <CategoryTabs categories={categories} active={activeTab} onChange={setActiveTab} />

        <div className="skill-cards-grid">
          {sorted.map((item, i) => (
            <SkillCard key={item.skill} item={item} delay={i * 60} />
          ))}
        </div>
      </div>

      <div className="card">
        <h2 className="result-section-title">💡 How to improve your scores</h2>
        <p className="result-section-sub">Personalised suggestions based on your current profile.</p>
        <div className="suggestions-list">
          {suggestions.map((s, i) => (
            <div key={i} className="suggestion-row">
              <span className="suggestion-icon">{s.icon}</span>
              <span>{s.text}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button
          className="btn btn-primary"
          onClick={() => onDone(
            {
              skills:    scored.map((s) => s.skill),
              syncScore: Math.round(scored.reduce((a, b) => a + b.score, 0) / (scored.length || 1)),
              summary:   "",
              suggestions: [],
            },
            userData
          )}
        >
          Browse jobs →
        </button>
      </div>
    </div>
  );
}
