import { useState } from "react";
import { extractPdfText } from "../lib/sarvamApi.js";
import { claudeChat } from "../lib/claudeApi.js";
import "./ResumeUploadPage.css";

// Free-tier safe limit: keep resume text under ~3000 tokens (≈12000 chars)
const RESUME_CHAR_LIMIT = 12000;

// ── Parse resume text with Gemini ──────────────────────────────────
async function parseResumeWithGemini(pdfText) {
  // Truncate to stay well within Gemini free-tier input token limits
  const safeText = pdfText.length > RESUME_CHAR_LIMIT
    ? pdfText.slice(0, RESUME_CHAR_LIMIT) + "\n[text truncated to fit API limits]"
    : pdfText;

  const prompt = `You are a resume parser for a hiring intelligence platform.

Extract ALL structured information from the resume text below. Focus especially on projects — capture the full description of what was built and what problems were solved.

Return ONLY a valid JSON object (no markdown, no backticks, no explanation):
{
  "name": "Full Name",
  "email": "email@example.com",
  "skills": ["skill1", "skill2"],
  "projects": [
    {
      "title": "Project Title",
      "description": "Detailed description of what was built, the problem it solved, architecture, scale, and impact. Be thorough.",
      "techStack": ["tech1", "tech2"],
      "link": "",
      "duration": "e.g. 3 months"
    }
  ],
  "certifications": [
    {
      "name": "Cert Name",
      "issuer": "Issuer",
      "year": "2024",
      "score": "",
      "skillsCovered": ["skill1"]
    }
  ],
  "courses": [
    {
      "name": "Course Name",
      "institution": "Platform or University",
      "grade": "",
      "skillsCovered": ["skill1"],
      "type": "course"
    }
  ]
}

Rules:
- For projects: write rich descriptions capturing what was built, challenges, architecture, and technologies in context.
- If a field is absent, use empty string or empty array.
- Do NOT invent information not present in the resume.

RESUME TEXT:
${safeText}`;

  const reply = await claudeChat([{ role: "user", content: prompt }], { max_tokens: 1500 });
  const clean = reply.replace(/```json|```/g, "").trim();
  return JSON.parse(clean);
}

// ─────────────────────────────────────────────────────────────────
export default function ResumeUploadPage({ navigate, setUserData }) {
  const [file, setFile]             = useState(null);
  const [dragOver, setDragOver]     = useState(false);
  const [parsing, setParsing]       = useState(false);
  const [parseStatus, setParseStatus] = useState("");
  const [parseError, setParseError] = useState(null);

  const handleFile = (f) => {
    if (f && f.type === "application/pdf") {
      setFile(f);
      setParseError(null);
      setParseStatus("");
    } else {
      alert("Please upload a PDF file.");
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleChange = (e) => handleFile(e.target.files[0]);

  const handleNext = async () => {
    if (!file) return;
    setParsing(true);
    setParseError(null);
    setParseStatus("Extracting text from PDF…");

    try {
      // Step 1: extract text from PDF in-browser (no server needed)
      const pdfText = await extractPdfText(file);

      setParseStatus("Parsing resume with Gemini AI…");

      // Step 2: parse the extracted text with Gemini (auto-truncated + retry)
      const parsed = await parseResumeWithGemini(pdfText);

      if (setUserData) {
        setUserData((prev) => ({
          ...prev,
          name:             parsed.name          || "",
          email:            parsed.email         || "",
          skills:           parsed.skills        || [],
          projects:         parsed.projects?.length        ? parsed.projects        : [],
          certifications:   parsed.certifications?.length  ? parsed.certifications  : [],
          courses:          parsed.courses?.length         ? parsed.courses         : [],
          resumeText:       pdfText.slice(0, 1000),
          portfolioUpdatedAt: Date.now(),
        }));
      }
      navigate("portfolio");
    } catch (err) {
      console.error("Resume parse error:", err);

      // Show a friendlier message for quota errors
      const is429 = err.message?.includes("429") || err.message?.includes("quota");
      setParseError(
        is429
          ? "Gemini API quota exceeded. Please wait 1 minute and try again, or get a new API key from https://aistudio.google.com"
          : "Could not auto-parse the resume. You can fill in your portfolio details manually."
      );
      if (setUserData) setUserData((prev) => ({ ...prev, resumeText: file.name }));
      navigate("portfolio");
    } finally {
      setParsing(false);
      setParseStatus("");
    }
  };

  return (
    <div className="page">
      <div className="steps">
        <div className="step active" />
        <div className="step" />
        <div className="step" />
      </div>

      <h1 className="page-title">Upload your resume</h1>
      <p className="page-subtitle">
        We'll extract your skills, projects, and experience automatically.
      </p>

      <div
        className={`drop-zone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !parsing && document.getElementById("fileInput").click()}
      >
        <input
          id="fileInput"
          type="file"
          accept=".pdf"
          style={{ display: "none" }}
          onChange={handleChange}
        />
        {file ? (
          <div className="file-preview">
            <span className="file-icon">📄</span>
            <div>
              <p className="file-name">{file.name}</p>
              <p className="file-size">{(file.size / 1024).toFixed(1)} KB · PDF</p>
            </div>
            {!parsing && (
              <button className="btn btn-ghost" onClick={(e) => { e.stopPropagation(); setFile(null); }}>
                Remove
              </button>
            )}
          </div>
        ) : (
          <div className="drop-hint">
            <span className="drop-icon">⬆</span>
            <p className="drop-text">Drop your PDF here</p>
            <p className="drop-sub">or click to browse</p>
          </div>
        )}
      </div>

      {/* Live status while parsing */}
      {parsing && parseStatus && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(99,102,241,0.1)", borderRadius: 8, border: "1px solid rgba(99,102,241,0.25)", fontSize: 13, color: "var(--accent, #6366f1)" }}>
          ⏳ {parseStatus}
        </div>
      )}

      {parseError && (
        <div style={{ marginTop: 12, padding: "10px 14px", background: "rgba(255,95,109,0.1)", borderRadius: 8, border: "1px solid rgba(255,95,109,0.25)", fontSize: 13, color: "#ff5f6d" }}>
          ⚠️ {parseError}
        </div>
      )}

      <div className="card" style={{ marginTop: 24 }}>
        <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 10, fontWeight: 500 }}>
          TIPS FOR BEST RESULTS
        </p>
        {[
          "Include detailed project descriptions — we score skills from them, not just tech stacks",
          "List certifications with scores or grades for higher skill ratings",
          "Keep it to 1–2 pages for faster processing",
        ].map((tip) => (
          <p key={tip} style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 6 }}>· {tip}</p>
        ))}
      </div>

      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 24 }}>
        <button className="btn btn-primary" disabled={!file || parsing} onClick={handleNext}>
          {parsing ? (
            <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 14, height: 14, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
              {parseStatus || "Parsing resume…"}
            </span>
          ) : "Next: Portfolio →"}
        </button>
      </div>
    </div>
  );
}
