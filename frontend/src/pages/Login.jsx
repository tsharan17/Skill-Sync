import React, { useContext } from 'react';
import { AuthContext } from '../App';
import { Briefcase, User } from 'lucide-react';

export default function Login() {
  const { setUser } = useContext(AuthContext);

  const handleLogin = (role) => {
    if (role === 'applicant') {
      setUser({ uid: 'cand_demo_1', role: 'applicant', name: 'Alex Hacker' });
    } else {
      setUser({ uid: 'comp_demo_1', role: 'company', name: 'TechNova Corp' });
    }
  };

  return (
    <div className="container flex items-center justify-center h-screen fade-in">
      <div className="card text-center" style={{ maxWidth: '500px', width: '100%' }}>
        <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem', color: 'var(--accent-primary)' }}>
          SkillSync
        </h1>
        <p className="mb-2 text-secondary">Semantics over Keywords. The future of hiring.</p>
        
        <div className="flex flex-col gap-2 mt-4">
          <button className="btn btn-primary" onClick={() => handleLogin('applicant')}>
            <User size={20} />
            Login as Applicant
          </button>
          <button className="btn btn-secondary" onClick={() => handleLogin('company')}>
            <Briefcase size={20} />
            Login as Company
          </button>
        </div>
        <p className="mt-4 text-secondary" style={{ fontSize: '0.85rem' }}>
          Hackathon Demo Mode - Auto Mock Authentication
        </p>
      </div>
    </div>
  );
}
