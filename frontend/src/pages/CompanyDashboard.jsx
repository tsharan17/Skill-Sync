import React, { useState } from 'react';
import { Eye, EyeOff, Search, Star } from 'lucide-react';

const mockCandidates = [
  { id: 'c1', name: 'Alex Hacker', score: 92, match_breakdown: { skill: 38, domain: 28, project: 18, depth: 8 }, strengths: ['React', 'Node.js', 'System Design'], missing: ['GraphQL'], type: 'software' },
  { id: 'c2', name: 'Sam Smith', score: 65, match_breakdown: { skill: 20, domain: 20, project: 15, depth: 10 }, strengths: ['Python', 'Django'], missing: ['React', 'TypeScript'], type: 'software' },
  { id: 'c3', name: 'Jordan Lee', score: 88, match_breakdown: { skill: 35, domain: 25, project: 20, depth: 8 }, strengths: ['Vue', 'JavaScript', 'UI/UX'], missing: ['Docker'], type: 'software', hiddenGem: true }
];

export default function CompanyDashboard() {
  const [blindMode, setBlindMode] = useState(false);
  const [atsView, setAtsView] = useState(false);

  return (
    <div className="container fade-in">
      <div className="flex justify-between items-center mb-4 flex-col-mobile gap-2">
        <h2>Frontend React Engineer <span className="badge badge-outline">3 Applicants</span></h2>
        <div className="flex gap-2">
          <button className="btn btn-secondary" onClick={() => setBlindMode(!blindMode)}>
            {blindMode ? <Eye size={16} /> : <EyeOff size={16} />} 
            {blindMode ? 'Disable Blind Mode' : 'Enable Blind Mode'}
          </button>
          <button className="btn btn-secondary" onClick={() => setAtsView(!atsView)}>
            {atsView ? 'Switch to Skill View' : 'Switch to ATS View'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 flex-col-mobile">
        {mockCandidates.map(cand => (
          <div key={cand.id} className="card" style={{ position: 'relative' }}>
            {cand.hiddenGem && !atsView && (
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'var(--accent-warning)', color: '#ffffff', padding: '0.25rem 0.5rem', borderRadius: '8px', fontWeight: 'bold', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', boxShadow: '0 4px 10px rgba(245, 158, 11, 0.4)' }}>
                <Star size={14} fill="#ffffff" /> Hidden Gem
              </div>
            )}
            
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3>{blindMode ? `Candidate #${cand.id}` : cand.name}</h3>
                <span className="text-sm text-secondary">{cand.type}</span>
              </div>
              <div className="score-circle" style={{"--score": `${cand.score}%`, width: '60px', height: '60px', fontSize: '1.2rem'}}>
                <span style={{color: cand.score >= 80 ? 'var(--accent-success)' : 'var(--text-primary)'}}>{cand.score}</span>
              </div>
            </div>

            {!atsView ? (
              <div className="fade-in">
                <p className="text-sm font-bold mb-1 text-success">Strengths</p>
                <div className="flex flex-wrap gap-1 mb-2">
                  {cand.strengths.map(s => <span key={s} className="badge badge-success">{s}</span>)}
                </div>
                <p className="text-sm font-bold mb-1 text-danger">Missing / Gaps</p>
                <div className="flex flex-wrap gap-1 mb-4">
                  {cand.missing.map(m => <span key={m} className="badge badge-outline" style={{borderColor: 'var(--accent-danger)'}}>{m}</span>)}
                </div>

                <div className="progress-container"><div className="progress-bar bg-primary" style={{width: `${cand.match_breakdown.skill * 2.5}%`}}></div></div>
                <div className="flex justify-between text-xs text-secondary mt-1 mb-2"><span>Skill Match</span><span>{cand.match_breakdown.skill}/40</span></div>
                
                <div className="progress-container"><div className="progress-bar bg-success" style={{width: `${cand.match_breakdown.domain * 3.33}%`}}></div></div>
                <div className="flex justify-between text-xs text-secondary mt-1"><span>Domain Match</span><span>{cand.match_breakdown.domain}/30</span></div>
              </div>
            ) : (
              <div className="fade-in">
                <p className="text-secondary text-sm">Keyword matching view enabled. Semantic analysis hidden.</p>
                <div className="mt-4 p-2" style={{background: '#f1f5f9', borderRadius: '8px', border: '1px solid #e2e8f0'}}>
                  <p className="text-sm">ATS Score: <strong>{cand.score - 20}%</strong></p>
                  <p className="text-xs text-secondary">Rejected by keyword filter due to missing exact matches.</p>
                </div>
              </div>
            )}
            
            <button className="btn btn-primary w-full mt-4">View Full Profile</button>
          </div>
        ))}
      </div>
    </div>
  );
}
