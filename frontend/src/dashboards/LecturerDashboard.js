import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Classes from "../modules/Lecturer/Classes";
import Reports from "../modules/Lecturer/Reports";
import Monitoring from "../modules/Lecturer/Monitoring";
import Rating from "../modules/Lecturer/Rating";
import dashboardheader from "./dashboardheader";

function LecturerDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/", { replace: true }); // Redirect to login/register
  };

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1>👩‍🏫 Lecturer Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {/* Navigation */}
      <nav className="dashboard-nav">
        <Link to="classes" className={location.pathname.includes("classes") ? "active" : ""}>
          📘 Classes
        </Link>
        <Link to="reports" className={location.pathname.includes("reports") ? "active" : ""}>
          📝 Reports
        </Link>
        <Link to="monitoring" className={location.pathname.includes("monitoring") ? "active" : ""}>
          📊 Monitoring
        </Link>
        <Link to="rating" className={location.pathname.includes("rating") ? "active" : ""}>
          ⭐ Rating
        </Link>
      </nav>

      {/* Content */}
      <div className="dashboard-content">
        <Routes>
          <Route path="classes" element={<Classes />} />
          <Route path="reports" element={<Reports />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="rating" element={<Rating />} />
        </Routes>
      </div>
    </div>
  );
}

export default LecturerDashboard;
