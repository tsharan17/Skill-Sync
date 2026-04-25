import "./Navbar.css";

export default function Navbar({ currentPage, navigate, onLogout, userRole }) {
  const candidateLinks = [
    { label: "Resume",    page: "resume" },
    { label: "Portfolio", page: "portfolio" },
    { label: "Analysis",  page: "analysis" },
    { label: "Jobs",      page: "jobs" },
  ];

  const companyLinks = [
    { label: "Dashboard", page: "company" },
  ];

  const links = userRole === "company" ? companyLinks : candidateLinks;

  return (
    <nav className="navbar">
      <span className="navbar-brand">Skill<span>Sync</span></span>

      <div className="navbar-links">
        {links.map((link) => (
          <button
            key={link.page}
            className={`nav-link ${currentPage === link.page ? "active" : ""}`}
            onClick={() => navigate(link.page)}
          >
            {link.label}
          </button>
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span className="role-badge">{userRole === "company" ? "Employer" : "Candidate"}</span>
        <button className="btn btn-ghost" onClick={onLogout}>Log out</button>
      </div>
    </nav>
  );
}
