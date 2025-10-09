import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginRegister from "./pages/LoginRegister";
import PrivateRoute from "./pages/PrivateRoute";

// Dashboards
import StudentDashboard from "./dashboards/StudentDashboard";
import LecturerDashboard from "./dashboards/LecturerDashboard";
import PrincipalLecturerDashboard from "./dashboards/PrincipalLecturerDashboard";
import ProgramLeaderDashboard from "./dashboards/ProgramLeaderDashboard";

// Home Page
import Home from "./pages/Home";
import "./App.css";

function App() {
  return (
    <Router>
      <div className="App">
        {/* Content Container: grows to push footer to bottom */}
        <div className="content-container">
          <Routes>
            {/* Home Page Route */}
            <Route path="/" element={<Home />} />
            
            {/* Public login/register page */}
            <Route path="/login" element={<LoginRegister />} />

            {/* Protected routes */}
            <Route element={<PrivateRoute allowedRoles={["student"]} />}>
              <Route path="/student/*" element={<StudentDashboard />} />
            </Route>

            <Route element={<PrivateRoute allowedRoles={["lecturer"]} />}>
              <Route path="/lecturer/*" element={<LecturerDashboard />} />
            </Route>

            <Route element={<PrivateRoute allowedRoles={["prl"]} />}>
              <Route path="/prl/*" element={<PrincipalLecturerDashboard />} />
            </Route>

            <Route element={<PrivateRoute allowedRoles={["pl"]} />}>
              <Route path="/pl/*" element={<ProgramLeaderDashboard />} />
            </Route>

            {/* Catch-all → redirect to home */}
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>

        {/* Global Footer */}
        <div className="home-footer-container">
          <footer className="global-footer">
            <div className="footer-content">
              <p>LUCT REPORTING SYSTEM 2025. All rights reserved.</p>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}

export default App;
