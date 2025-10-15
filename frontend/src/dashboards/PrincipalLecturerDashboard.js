import { Link, Routes, Route, useNavigate, useLocation } from "react-router-dom";
import Courses from "../modules/Principal-Lecturer/Courses";
import Reports from "../modules/Principal-Lecturer/Reports";
import Monitoring from "../modules/Principal-Lecturer/Monitoring";
import Rating from "../modules/Principal-Lecturer/Rating";
import Classes from "../modules/Principal-Lecturer/Classes";
import dashboardheader from "./dashboardheader";

function PrincipalLecturerDashboard() {
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
      <div className="pl-dashboard-header">
        <h1> Principal Lecturer Dashboard</h1>
        <button onClick={handleLogout} className="logout-btn">
          Logout
        </button>
      </div>

      {/* Navigation */}
      <nav className="pl-dashboard-nav">
        <Link to="courses" className={location.pathname.includes("courses") ? "active" : ""}>
           Courses
        </Link>
        <Link to="reports" className={location.pathname.includes("reports") ? "active" : ""}>
           Reports
        </Link>
        <Link to="monitoring" className={location.pathname.includes("monitoring") ? "active" : ""}>
           Monitoring
        </Link>
        <Link to="rating" className={location.pathname.includes("rating") ? "active" : ""}>
           Rating
        </Link>
        <Link to="classes" className={location.pathname.includes("classes") ? "active" : ""}>
           Classes
        </Link>
      </nav>

      {/* Content */}
      <div className="pl-dashboard-content">
        <Routes>
          <Route path="courses" element={<Courses />} />
          <Route path="reports" element={<Reports />} />
          <Route path="monitoring" element={<Monitoring />} />
          <Route path="rating" element={<Rating />} />
          <Route path="classes" element={<Classes />} />
        </Routes>
      </div>
    </div>
  );
}

export default PrincipalLecturerDashboard;
