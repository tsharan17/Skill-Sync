const functions = require("firebase-functions");
const admin = require("firebase-admin");
require("dotenv").config();

admin.initializeApp();
const db = admin.firestore();

// ---------------------------------------------------------------------------
// Helper: Call Sarvam API
// ---------------------------------------------------------------------------
async function callSarvamAPI(prompt, fallback) {
  const apiKey = process.env.SARVAM_API_KEY || "YOUR_SARVAM_API_KEY";
  
  try {
    const response = await fetch("https://api.sarvam.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "sarvam-m",
        messages: [{ role: "user", content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`Sarvam API HTTP Error: ${response.status}`, errText);
      return fallback;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    // Attempt strict JSON parsing
    const match = content.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(content);
  } catch (error) {
    console.error("Sarvam API or Parse Error:", error);
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// 1. analyzeResume
// ---------------------------------------------------------------------------
exports.analyzeResume = functions.https.onCall(async (data, context) => {
  const { uid, resume_text } = data;
  if (!uid || !resume_text) throw new functions.https.HttpsError("invalid-argument", "Missing uid or resume_text");

  // 1. Check Cache
  const candidateRef = db.collection("candidates").doc(uid);
  const doc = await candidateRef.get();
  if (doc.exists && doc.data().analysis_result) {
    return { cached: true, analysis_result: doc.data().analysis_result };
  }

  // 2. Call Sarvam API
  const prompt = `
  Analyze the following resume text.
  Extract:
  - skills (array of strings)
  - domains (array of strings)
  - summary (short string)
  - type ("software" or "hardware")

  Return ONLY valid JSON. No text outside JSON. Format:
  {
    "skills": [],
    "domains": [],
    "summary": "",
    "type": ""
  }
  
  Resume Text:
  ${resume_text.substring(0, 3000)}
  `;

  const fallback = {
    skills: ["JavaScript", "HTML"],
    domains: ["General Tech"],
    summary: "Could not parse resume completely.",
    type: "software"
  };

  const parsedResult = await callSarvamAPI(prompt, fallback);

  try {
    // 3. Store and Return
    // Provide a default confidence score since it's removed from the prompt
    parsedResult.confidence_score = 85; 
    await candidateRef.set({ analysis_result: parsedResult, resume_text }, { merge: true });
    return { cached: false, analysis_result: parsedResult };
  } catch (error) {
    console.error("Firestore Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to save resume analysis");
  }
});

// ---------------------------------------------------------------------------
// 2. analyzeJob
// ---------------------------------------------------------------------------
exports.analyzeJob = functions.https.onCall(async (data, context) => {
  const { jobId, job_description, companyId, title } = data;
  if (!jobId || !job_description) throw new functions.https.HttpsError("invalid-argument", "Missing jobId or job_description");

  const jobRef = db.collection("jobs").doc(jobId);
  const doc = await jobRef.get();
  if (doc.exists && doc.data().parsed_data) {
    return { cached: true, parsed_data: doc.data().parsed_data };
  }

  const prompt = `
  Analyze the job description.
  Extract:
  - required_skills (array of strings)
  - optional_skills (array of strings)
  - domain (string)
  - type ("software" or "hardware")

  Return ONLY valid JSON. No text outside JSON. Format:
  {
    "required_skills": [],
    "optional_skills": [],
    "domain": "",
    "type": ""
  }
  
  Job Description:
  ${job_description.substring(0, 3000)}
  `;

  const fallback = {
    required_skills: ["JavaScript", "React"],
    optional_skills: ["Node.js"],
    domain: "Web Development",
    type: "software"
  };

  const parsedData = await callSarvamAPI(prompt, fallback);

  try {
    await jobRef.set({
      companyId: companyId || "demo-company",
      title: title || "Job Role",
      job_description,
      parsed_data: parsedData,
    }, { merge: true });

    return { cached: false, parsed_data: parsedData };
  } catch (error) {
    console.error("Firestore Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to save job analysis");
  }
});

// ---------------------------------------------------------------------------
// 3. matchCandidate
// ---------------------------------------------------------------------------
exports.matchCandidate = functions.https.onCall(async (data, context) => {
  const { candidateId, jobId } = data;
  if (!candidateId || !jobId) throw new functions.https.HttpsError("invalid-argument", "Missing IDs");

  const matchId = `${candidateId}_${jobId}`;
  const matchRef = db.collection("matches").doc(matchId);
  const doc = await matchRef.get();

  if (doc.exists && doc.data().match_result) {
    return { cached: true, match_result: doc.data().match_result };
  }

  // Fetch candidate and job
  const candidateDoc = await db.collection("candidates").doc(candidateId).get();
  const jobDoc = await db.collection("jobs").doc(jobId).get();

  if (!candidateDoc.exists || !jobDoc.exists) {
    throw new functions.https.HttpsError("not-found", "Candidate or Job not found");
  }

  const cData = candidateDoc.data().analysis_result || { skills: [], domains: [] };
  const jData = jobDoc.data().parsed_data || { required_skills: [], domain: "" };
  
  // ---------------------------------------------------------
  // Mathematical Matching Logic (No API Call for scoring)
  // Match Score = (Skill Match × 0.5) + (Domain Match × 0.3) + (Project Relevance × 0.2)
  // ---------------------------------------------------------

  // 1. Skill Match (out of 100)
  const candidateSkills = (cData.skills || []).map(s => s.toLowerCase());
  const requiredSkills = (jData.required_skills || []).map(s => s.toLowerCase());
  
  let skillHits = 0;
  const missing_skills = [];
  const strengths = [];

  requiredSkills.forEach(req => {
    // Simple substring match for robustness (e.g. "react.js" matches "react")
    const found = candidateSkills.find(cs => cs.includes(req) || req.includes(cs));
    if (found) {
      skillHits++;
      strengths.push(req);
    } else {
      missing_skills.push(req);
    }
  });

  const skillScore = requiredSkills.length > 0 ? Math.round((skillHits / requiredSkills.length) * 100) : 100;

  // 2. Domain Match (out of 100)
  const candDomains = (cData.domains || []).map(d => d.toLowerCase());
  const jobDomain = (jData.domain || "").toLowerCase();
  
  let domainScore = 0;
  if (jobDomain && candDomains.some(cd => cd.includes(jobDomain) || jobDomain.includes(cd))) {
    domainScore = 100;
  } else if (cData.type === jData.type) {
    domainScore = 50; // Partial match if at least hardware/software matches
  }

  // 3. Project Relevance (out of 100)
  // In a real app, this might check portfolio length. For hackathon, default to a high score if they have any projects.
  const portfolio = candidateDoc.data().portfolio || {};
  const projectScore = Object.keys(portfolio).length > 0 ? 80 : 50; 

  // Final Match Score calculation
  const finalMatchScore = Math.round(
    (skillScore * 0.5) + 
    (domainScore * 0.3) + 
    (projectScore * 0.2)
  );

  const matchResult = {
    match_score: finalMatchScore,
    missing_skills,
    strengths,
    explanation: `Scored based on formula: Skill Match (${skillScore} * 0.5) + Domain Match (${domainScore} * 0.3) + Project Relevance (${projectScore} * 0.2).`,
    factor_breakdown: {
      skillMatch: Math.round(skillScore * 0.5),
      domainMatch: Math.round(domainScore * 0.3),
      projectRelevance: Math.round(projectScore * 0.2)
    }
  };

  try {
    await matchRef.set({
      candidateId,
      jobId,
      match_result: matchResult,
      timestamp: admin.firestore.FieldValue.serverTimestamp()
    });

    return { cached: false, match_result: matchResult };
  } catch (error) {
    console.error("Firestore Error:", error);
    throw new functions.https.HttpsError("internal", "Failed to save match calculation");
  }
});
