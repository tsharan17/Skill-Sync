import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import ApplicantDashboard from './pages/ApplicantDashboard';
import CompanyDashboard from './pages/CompanyDashboard';

export const AuthContext = React.createContext();

function App() {
  const [user, setUser] = useState(null); // { uid, role, name }

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      <Router>
        <div className="app-container">
          {user && (
            <header className="app-header flex justify-between items-center">
              <h2>MirrorHire ✦ <span style={{color: "var(--accent-primary)", fontSize: "1rem"}}>{user.role.toUpperCase()}</span></h2>
              <div className="flex items-center gap-2">
                <span>{user.name}</span>
                <button className="btn btn-secondary" onClick={() => setUser(null)} style={{padding: "0.25rem 0.75rem"}}>Logout</button>
              </div>
            </header>
          )}
          <main>
            <Routes>
              <Route path="/login" element={!user ? <Login /> : <Navigate to={user.role === 'applicant' ? "/applicant" : "/company"} />} />
              <Route path="/applicant" element={user?.role === 'applicant' ? <ApplicantDashboard /> : <Navigate to="/login" />} />
              <Route path="/company" element={user?.role === 'company' ? <CompanyDashboard /> : <Navigate to="/login" />} />
              <Route path="/" element={<Navigate to="/login" />} />
            </Routes>
          </main>
        </div>
      </Router>
    </AuthContext.Provider>
  );
}

export default App;
