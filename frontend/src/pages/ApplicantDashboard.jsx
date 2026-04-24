import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../App';
import { Upload, Activity, CheckCircle, AlertCircle, Briefcase, FileText, Link, Save } from 'lucide-react';
import { functions, db } from '../firebase';
import { httpsCallable } from 'firebase/functions';
import { doc, setDoc } from 'firebase/firestore';
import * as pdfjsLib from 'pdfjs-dist';

// Use a stable CDN version for the worker to ensure it loads correctly
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.js`;

const dummyJobs = [
  { id: 'job_1', title: 'Frontend React Engineer', company: 'TechFlow', match: 88 },
  { id: 'job_2', title: 'Embedded Systems Dev', company: 'HardwareX', match: 25 },
  { id: 'job_3', title: 'Fullstack Developer', company: 'WebSolutions', match: 72 },
  { id: 'job_4', title: 'IoT Engineer', company: 'SmartCorp', match: 40 },
];

export default function ApplicantDashboard() {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState('profile');
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState('');
  
  // Portfolio State
  const [portfolio, setPortfolio] = useState({
    github: '',
    project1Title: '',
    project1Desc: '',
    project2Title: '',
    project2Desc: '',
  });

  const fileInputRef = useRef(null);

  const extractTextFromPDF = async (file) => {
    try {
      setUploadStatus('Extracting text from PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      let fullText = "";
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(" ");
        fullText += pageText + "\n";
      }
      return fullText;
    } catch (err) {
      console.error("PDF Extraction Error:", err);
      throw new Error("Failed to extract text from PDF");
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF file.");
      return;
    }

    setLoading(true);
    setUploadStatus('Reading PDF...');
    
    try {
      const extractedText = await extractTextFromPDF(file);
      setUploadStatus('Analyzing with SkillSync AI...');
      
      // Mocking for frontend demo if backend isn't ready
      try {
        const analyzeResume = httpsCallable(functions, 'analyzeResume');
        const res = await analyzeResume({ uid: user.uid, resume_text: extractedText });
        setAnalysis(res.data.analysis_result);
        setUploadStatus('Analysis Complete');
      } catch (backendError) {
        console.warn('Backend call failed, using mock data for demo:', backendError);
        setTimeout(() => {
          setAnalysis({
            skills: ["React", "JavaScript", "Node.js", "CSS", "UI/UX"],
            domains: ["Frontend Development", "Web Apps"],
            summary: "Experienced developer focused on clean, modern React applications.",
            confidence_score: 92,
            type: "software"
          });
          setUploadStatus('Analysis Complete (Mock)');
        }, 1500);
      }
    } catch (error) {
      alert(error.message);
      setUploadStatus('');
    } finally {
      setLoading(false);
    }
  };

  const handlePortfolioSave = async () => {
    try {
      setUploadStatus('Saving portfolio...');
      await setDoc(doc(db, "candidates", user.uid), { portfolio }, { merge: true });
      alert("Portfolio saved successfully!");
      setUploadStatus('');
    } catch (err) {
      console.error("Error saving portfolio:", err);
      // Fallback for hackathon demo if firestore rule fails
      alert("Portfolio saved (Mocked).");
      setUploadStatus('');
    }
  };

  return (
    <div className="container fade-in">
      <div className="tabs">
        <div className={`tab ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>My Profile</div>
        <div className={`tab ${activeTab === 'portfolio' ? 'active' : ''}`} onClick={() => setActiveTab('portfolio')}>Portfolio</div>
        <div className={`tab ${activeTab === 'jobs' ? 'active' : ''}`} onClick={() => setActiveTab('jobs')}>Job Board</div>
      </div>

      {activeTab === 'profile' && (
        <div className="grid grid-cols-2 gap-4 flex-col-mobile">
          <div className="card">
            <h3><Upload size={18} className="inline mr-2" /> Upload Resume (PDF)</h3>
            <p className="mb-4 text-sm text-secondary">Upload your PDF resume. Our AI extracts raw text completely locally before securely processing semantics.</p>
            
            <div 
              style={{ border: '2px dashed var(--border-color)', borderRadius: '8px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: '#f8f9fa' }}
              onClick={() => fileInputRef.current.click()}
            >
              <FileText size={32} color="var(--accent-secondary)" className="mx-auto mb-2" style={{margin: '0 auto'}}/>
              <p className="font-bold">Click to Upload PDF</p>
              <input 
                type="file" 
                ref={fileInputRef} 
                accept="application/pdf" 
                style={{ display: 'none' }} 
                onChange={handleFileUpload}
              />
            </div>
            
            {uploadStatus && (
              <div className="mt-4 p-2 text-center text-sm" style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: '6px' }}>
                {uploadStatus}
              </div>
            )}
          </div>

          <div className="card">
            <h3><Activity size={18} className="inline mr-2" /> Skill DNA Analysis</h3>
            {analysis ? (
              <div className="fade-in mt-2">
                <div className="flex justify-between items-center mb-4">
                  <span className="badge badge-primary">{analysis.type.toUpperCase()}</span>
                  <div className="text-right">
                    <span className="text-sm text-secondary">AI Confidence</span>
                    <h4 className="text-success" style={{color: 'var(--accent-success)'}}>{analysis.confidence_score}%</h4>
                  </div>
                </div>
                
                <p className="mb-4" style={{ fontStyle: 'italic', color: 'var(--text-primary)' }}>"{analysis.summary}"</p>

                <h4>Detected Skills</h4>
                <div className="flex flex-wrap gap-1 mb-4">
                  {analysis.skills.map(s => <span key={s} className="badge badge-outline">{s}</span>)}
                </div>

                <h4>Domains</h4>
                <div className="flex flex-wrap gap-1">
                  {analysis.domains.map(d => <span key={d} className="badge badge-success">{d}</span>)}
                </div>
              </div>
            ) : (
              <div className="text-center mt-4 text-secondary">
                <p>No analysis found. Please upload a resume PDF.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'portfolio' && (
        <div className="card" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <h2 className="mb-4"><Briefcase size={22} className="inline mr-2" /> Project Portfolio</h2>
          <p className="mb-4 text-sm text-secondary">Add your real-world projects to boost your Project Relevance score during matching.</p>
          
          <div className="input-group">
            <label className="input-label"><Link size={14} className="inline mr-1" /> GitHub Profile Link</label>
            <input className="input-field" type="url" placeholder="https://github.com/yourusername" value={portfolio.github} onChange={e => setPortfolio({...portfolio, github: e.target.value})} />
          </div>

          <h4 className="mt-4 mb-2">Project 1</h4>
          <div className="input-group">
            <input className="input-field" type="text" placeholder="Project Title" value={portfolio.project1Title} onChange={e => setPortfolio({...portfolio, project1Title: e.target.value})} />
            <textarea className="input-field mt-1" placeholder="Briefly describe the tech stack and your impact..." value={portfolio.project1Desc} onChange={e => setPortfolio({...portfolio, project1Desc: e.target.value})} />
          </div>

          <h4 className="mt-4 mb-2">Project 2</h4>
          <div className="input-group">
            <input className="input-field" type="text" placeholder="Project Title" value={portfolio.project2Title} onChange={e => setPortfolio({...portfolio, project2Title: e.target.value})} />
            <textarea className="input-field mt-1" placeholder="Briefly describe the tech stack and your impact..." value={portfolio.project2Desc} onChange={e => setPortfolio({...portfolio, project2Desc: e.target.value})} />
          </div>

          <button className="btn btn-primary mt-4" onClick={handlePortfolioSave}>
            <Save size={18} /> Save Portfolio
          </button>
        </div>
      )}

      {activeTab === 'jobs' && (
        <div className="card">
          <h2 className="mb-4">Recommended Jobs</h2>
          <div className="grid grid-cols-2 gap-3 flex-col-mobile">
            {dummyJobs.map(job => (
              <div key={job.id} className="card" style={{ background: '#f8f9fa' }}>
                <div className="flex justify-between items-start">
                  <div>
                    <h4 style={{margin:0}}>{job.title}</h4>
                    <p className="text-sm text-secondary">{job.company}</p>
                  </div>
                  <div className="score-circle" style={{"--score": `${job.match}%`, width: '50px', height: '50px', fontSize: '1rem'}}>
                    <span style={{color: job.match >= 70 ? 'var(--accent-success)' : 'var(--accent-warning)'}}>{job.match}</span>
                  </div>
                </div>
                <div className="mt-4">
                  <button className={`btn w-full ${job.match >= 70 ? 'btn-primary' : 'btn-secondary'}`} disabled={job.match < 70}>
                    {job.match >= 70 ? <span><CheckCircle size={16}/> Apply Now</span> : <span><AlertCircle size={16}/> Skill Gap Too High</span>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
