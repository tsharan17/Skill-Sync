import { useState, useEffect, useCallback, useRef } from "react";
import "./PortfolioPage.css";

// ── Tag Input ──────────────────────────────────────────────
function TagInput({ tags, setTags, placeholder }) {
  const [input, setInput] = useState("");
  const add = (e) => {
    if ((e.key === "Enter" || e.key === ",") && input.trim()) {
      e.preventDefault();
      if (!tags.includes(input.trim())) setTags([...tags, input.trim()]);
      setInput("");
    }
  };
  return (
    <div className="tag-input-wrapper">
      <div className="tag-input-tags">
        {tags.map((t) => (
          <span key={t} className="tag">
            {t}
            <button onClick={() => setTags(tags.filter((x) => x !== t))}>×</button>
          </span>
        ))}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={add}
          placeholder={tags.length === 0 ? placeholder : ""}
          style={{ flex: 1, minWidth: 120, background: "transparent", border: "none", outline: "none" }}
        />
      </div>
    </div>
  );
}

// ── Section Header ─────────────────────────────────────────
function SectionHeader({ icon, title, subtitle, onAdd, addLabel }) {
  return (
    <div className="section-header-block">
      <div className="section-header-left">
        <span className="section-icon">{icon}</span>
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
      </div>
      {onAdd && (
        <button className="btn btn-outline btn-sm" onClick={onAdd}>
          + {addLabel}
        </button>
      )}
    </div>
  );
}

// ── Grade / Score Input ────────────────────────────────────
function ScoreInput({ value, onChange, placeholder = "e.g. 92 or A+" }) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
    />
  );
}

// ── Defaults ───────────────────────────────────────────────
const emptyProject = () => ({
  title: "", description: "", link: "", techStack: [], duration: "",
});
const emptyCert = () => ({ name: "", issuer: "", year: "", score: "", skillsCovered: [] });
const emptyCourse = () => ({ name: "", institution: "", grade: "", skillsCovered: [], type: "course" });

export default function PortfolioPage({ navigate, setUserData, userData }) {
  // Initialize from parsed resume data if available
  const [projects, setProjects] = useState(() =>
    userData?.projects?.length ? userData.projects : [emptyProject()]
  );
  const [certifications, setCertifications] = useState(() =>
    userData?.certifications?.length ? userData.certifications : [emptyCert()]
  );
  const [courses, setCourses] = useState(() =>
    userData?.courses?.length ? userData.courses : [emptyCourse()]
  );
  const [skills, setSkills] = useState(() => userData?.skills || []);

  // Keep refs so navigate handler always reads latest values without stale closures
  const latestRef = { skills, projects, certifications, courses };
  const latestRefCurrent = useRef(latestRef);
  latestRefCurrent.current = latestRef;

  // If userData arrives later (from resume parse), re-initialize
  const initialized = userData?.portfolioUpdatedAt;
  useEffect(() => {
    if (!initialized) return;
    if (userData?.projects?.length)       setProjects(userData.projects);
    if (userData?.certifications?.length) setCertifications(userData.certifications);
    if (userData?.courses?.length)        setCourses(userData.courses);
    if (userData?.skills?.length)         setSkills(userData.skills);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized]);

  // Live sync to parent (debounce slightly so rapid keystrokes don't flood)
  const syncToParent = useCallback((sk, pr, ce, co) => {
    if (setUserData) {
      setUserData((prev) => ({
        ...prev,
        skills: sk,
        projects: pr,
        certifications: ce,
        courses: co,
        portfolioUpdatedAt: Date.now(),
      }));
    }
  }, [setUserData]);

  useEffect(() => {
    syncToParent(skills, projects, certifications, courses);
  }, [skills, projects, certifications, courses, syncToParent]);

  // Navigate to analysis — flush latest state to parent FIRST, then navigate
  const goToAnalysis = useCallback(() => {
    const { skills: sk, projects: pr, certifications: ce, courses: co } = latestRefCurrent.current;
    // Synchronously push the freshest data before switching page
    if (setUserData) {
      setUserData((prev) => ({
        ...prev,
        skills: sk,
        projects: pr,
        certifications: ce,
        courses: co,
        portfolioUpdatedAt: Date.now(),
      }));
    }
    // Small timeout lets React flush the state update before mounting the analysis page
    setTimeout(() => navigate("analysis"), 50);
  }, [navigate, setUserData]);

  // ── Project helpers ────────────────────────────────────
  const updateProject = (i, field, value) => {
    const u = [...projects];
    u[i] = { ...u[i], [field]: value };
    setProjects(u);
  };
  const addProject    = () => setProjects([...projects, emptyProject()]);
  const removeProject = (i) => setProjects(projects.filter((_, idx) => idx !== i));

  // ── Cert helpers ───────────────────────────────────────
  const updateCert = (i, field, value) => {
    const u = [...certifications];
    u[i] = { ...u[i], [field]: value };
    setCertifications(u);
  };
  const addCert    = () => setCertifications([...certifications, emptyCert()]);
  const removeCert = (i) => setCertifications(certifications.filter((_, idx) => idx !== i));

  // ── Course helpers ─────────────────────────────────────
  const updateCourse = (i, field, value) => {
    const u = [...courses];
    u[i] = { ...u[i], [field]: value };
    setCourses(u);
  };
  const addCourse    = () => setCourses([...courses, emptyCourse()]);
  const removeCourse = (i) => setCourses(courses.filter((_, idx) => idx !== i));

  return (
    <div className="page">
      <div className="steps">
        <div className="step done" />
        <div className="step active" />
        <div className="step" />
      </div>

      <h1 className="page-title">Build your profile</h1>
      <p className="page-subtitle">
        Add or refine your projects — the more detailed your descriptions, the more accurately Skill Sync scores your skills.
      </p>

      {/* ── PROJECTS ─────────────────────────────────────── */}
      <section className="section">
        <SectionHeader
          icon="🛠️"
          title="Projects"
          subtitle="Describe what you built and what problems you solved. Skills are extracted from your descriptions — not just the tech stack."
          onAdd={addProject}
          addLabel="Add project"
        />
        {projects.map((p, i) => (
          <div key={i} className="card entry-card">
            <div className="entry-card-header">
              <span className="entry-label">Project {i + 1}</span>
              {projects.length > 1 && (
                <button className="btn btn-ghost" onClick={() => removeProject(i)}>Remove</button>
              )}
            </div>

            <div className="two-col">
              <div className="field">
                <label>Title</label>
                <input placeholder="E-Commerce Platform" value={p.title}
                  onChange={(e) => updateProject(i, "title", e.target.value)} />
              </div>
              <div className="field">
                <label>GitHub / Live link</label>
                <input type="url" placeholder="https://github.com/…" value={p.link}
                  onChange={(e) => updateProject(i, "link", e.target.value)} />
              </div>
            </div>

            <div className="field">
              <label>Description — what did you build, what problem did it solve, and how?</label>
              <textarea
                placeholder="Built a full-stack marketplace with real-time inventory updates. Used React for the UI with custom hooks for cart state, Node.js + Express for the REST API, and PostgreSQL with complex joins for product search. Implemented JWT auth, reduced page load by 40% via lazy loading, and deployed on AWS with CI/CD via GitHub Actions…"
                value={p.description}
                onChange={(e) => updateProject(i, "description", e.target.value)}
                style={{ minHeight: 100 }}
              />
              <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                💡 Be specific — mention architecture, scale, challenges overcome, and impact. Skill complexity is inferred automatically from your description.
              </p>
            </div>

            <div className="two-col">
              <div className="field">
                <label>Tech stack</label>
                <TagInput
                  tags={p.techStack}
                  setTags={(tags) => updateProject(i, "techStack", tags)}
                  placeholder="React, Node.js, PostgreSQL…"
                />
              </div>
              <div className="field">
                <label>Duration</label>
                <input placeholder="e.g. 3 months" value={p.duration}
                  onChange={(e) => updateProject(i, "duration", e.target.value)} />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── CERTIFICATIONS ───────────────────────────────── */}
      <section className="section">
        <SectionHeader
          icon="🏅"
          title="Certifications"
          subtitle="Include your score or grade — it weighs into how we score covered skills."
          onAdd={addCert}
          addLabel="Add certification"
        />
        {certifications.map((c, i) => (
          <div key={i} className="card entry-card">
            <div className="entry-card-header">
              <span className="entry-label">Certification {i + 1}</span>
              {certifications.length > 1 && (
                <button className="btn btn-ghost" onClick={() => removeCert(i)}>Remove</button>
              )}
            </div>

            <div className="three-col">
              <div className="field">
                <label>Name</label>
                <input placeholder="AWS Certified Developer" value={c.name}
                  onChange={(e) => updateCert(i, "name", e.target.value)} />
              </div>
              <div className="field">
                <label>Issuer</label>
                <input placeholder="Amazon" value={c.issuer}
                  onChange={(e) => updateCert(i, "issuer", e.target.value)} />
              </div>
              <div className="field">
                <label>Year</label>
                <input placeholder="2024" value={c.year}
                  onChange={(e) => updateCert(i, "year", e.target.value)} />
              </div>
            </div>

            <div className="two-col">
              <div className="field">
                <label>Score / Grade (optional)</label>
                <ScoreInput value={c.score} onChange={(v) => updateCert(i, "score", v)}
                  placeholder="e.g. 880/1000 or 92%" />
              </div>
              <div className="field">
                <label>Skills this cert covers</label>
                <TagInput
                  tags={c.skillsCovered}
                  setTags={(tags) => updateCert(i, "skillsCovered", tags)}
                  placeholder="AWS, S3, Lambda…"
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── COURSES & COLLEGE CBPs ───────────────────────── */}
      <section className="section">
        <SectionHeader
          icon="📚"
          title="Courses & College Subjects"
          subtitle="Online courses, CBPs, and college subjects — add your grade or score for each."
          onAdd={addCourse}
          addLabel="Add course"
        />
        {courses.map((c, i) => (
          <div key={i} className="card entry-card">
            <div className="entry-card-header">
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span className="entry-label">
                  {c.type === "cbp" ? "College Subject" : "Course"} {i + 1}
                </span>
                <div className="type-toggle">
                  <button
                    className={`type-btn ${c.type === "course" ? "active" : ""}`}
                    onClick={() => updateCourse(i, "type", "course")}
                  >
                    Online course
                  </button>
                  <button
                    className={`type-btn ${c.type === "cbp" ? "active" : ""}`}
                    onClick={() => updateCourse(i, "type", "cbp")}
                  >
                    College / CBP
                  </button>
                </div>
              </div>
              {courses.length > 1 && (
                <button className="btn btn-ghost" onClick={() => removeCourse(i)}>Remove</button>
              )}
            </div>

            <div className="two-col">
              <div className="field">
                <label>{c.type === "cbp" ? "Subject name" : "Course name"}</label>
                <input
                  placeholder={c.type === "cbp" ? "Data Structures & Algorithms" : "Machine Learning by Andrew Ng"}
                  value={c.name}
                  onChange={(e) => updateCourse(i, "name", e.target.value)}
                />
              </div>
              <div className="field">
                <label>{c.type === "cbp" ? "College / University" : "Platform / Institution"}</label>
                <input
                  placeholder={c.type === "cbp" ? "IIT Bombay" : "Coursera"}
                  value={c.institution}
                  onChange={(e) => updateCourse(i, "institution", e.target.value)}
                />
              </div>
            </div>

            <div className="two-col">
              <div className="field">
                <label>{c.type === "cbp" ? "Grade / CGPA" : "Score / Completion"}</label>
                <ScoreInput value={c.grade} onChange={(v) => updateCourse(i, "grade", v)}
                  placeholder={c.type === "cbp" ? "e.g. A or 9.2 CGPA" : "e.g. 95% or Completed"} />
              </div>
              <div className="field">
                <label>Skills covered</label>
                <TagInput
                  tags={c.skillsCovered}
                  setTags={(tags) => updateCourse(i, "skillsCovered", tags)}
                  placeholder={c.type === "cbp" ? "Algorithms, Trees, Graphs…" : "Python, ML, NumPy…"}
                />
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ── SKILLS ───────────────────────────────────────── */}
      <section className="section">
        <SectionHeader
          icon="⚡"
          title="Additional Skills"
          subtitle="Any skills not already covered by your projects or courses above."
        />
        <div className="card">
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Add skills (Enter or comma to add)</label>
            <TagInput tags={skills} setTags={setSkills} placeholder="e.g. Figma, Docker, Swift…" />
          </div>
        </div>
      </section>

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 8 }}>
        <button className="btn btn-outline" onClick={() => navigate("resume")}>← Back</button>
        <button className="btn btn-primary" onClick={goToAnalysis}>
          Generate skill profile →
        </button>
      </div>
    </div>
  );
}
