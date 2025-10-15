import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Monitoring from "../modules/Student/Monitoring";
import Rating from "../modules/Student/Rating";
import dashboardHeader from "./dashboardheader";

function StudentDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
  };

  return (
    <div className="student-dashboard">
      {/* Header */}
      <header className="student-header">
        <h1> Student Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      {/* Navigation */}
      <nav className="student-nav">
        <Link
          to="monitoring"
          className={location.pathname.includes("monitoring") ? "active" : ""}
        >
           Monitoring
        </Link>
        <Link
          to="rating"
          className={location.pathname.includes("rating") ? "active" : ""}
        >
           Rating
        </Link>
      </nav>

      {/* Content */}
      <main className="student-main">
        <Routes>
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="rating" element={<Rating />} />
        </Routes>
      </main>
    </div>
  );
}

export default StudentDashboard;
