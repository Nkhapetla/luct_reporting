import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Courses from "../modules/Program-Leader/Courses";
import Reports from "../modules/Program-Leader/Reports";
import Monitoring from "../modules/Program-Leader/Monitoring";
import Classes from "../modules/Program-Leader/Classes";
import Lectures from "../modules/Program-Leader/Lectures";
import Rating from "../modules/Program-Leader/Rating";
import dashboardheader from "./dashboardheader";

function ProgramLeaderDashboard() {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("role");
    navigate("/", { replace: true });
  };

  return (
    <div className="pl-dashboard-container">
      {/* Header */}
      <header className="pl-dashboard-header">
        <h1>📊 Program Leader Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </header>

      {/* Navigation */}
      <nav className="pl-dashboard-nav">
        <Link
          to="courses"
          className={location.pathname.includes("courses") ? "active" : ""}
        >
         📘 Courses
        </Link>
        <Link
          to="reports"
          className={location.pathname.includes("reports") ? "active" : ""}
        >
         📝 Reports
        </Link>
        <Link
          to="monitoring"
          className={location.pathname.includes("monitoring") ? "active" : ""}
        >
          📊Monitoring
        </Link>
        <Link
          to="classes"
          className={location.pathname.includes("classes") ? "active" : ""}
        >
         🏫 Classes
        </Link>
        <Link
          to="lectures"
          className={location.pathname.includes("lectures") ? "active" : ""}
        >
         👩‍🏫 Lectures
        </Link>
        <Link
          to="rating"
          className={location.pathname.includes("rating") ? "active" : ""}
        >
         ⭐ Rating
        </Link>
      </nav>

      {/* Content */}
      <main className="pl-dashboard-content">
        <Routes>
          <Route path="courses" element={<Courses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="classes" element={<Classes />} />
          <Route path="lectures" element={<Lectures />} />
          <Route path="rating" element={<Rating />} />
        </Routes>
      </main>
    </div>
  );
}

export default ProgramLeaderDashboard;
