import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "../App.css"; // external CSS

function LoginRegister() {
  const PRL_STREAMS = [
    "Information Technology",
    "Software Engineering",
    "Information Systems",
    "Computer Science",
  ];

  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    role: "student",
    stream: "",
    class_id: "",
  });

  // Hardcoded classes
  const [classes] = useState([
    { id: 1, class_name: "BSCIT" },
    { id: 2, class_name: "BSCBIT" },
    { id: 3, class_name: "BSCSM" },
    { id: 10, class_name: "DIT" },
    { id: 11, class_name: "DBIT" },
    { id: 12, class_name: "DSM" },
  ]);

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post("http://localhost:5000/api/auth/login", {
        email: formData.email,
        password: formData.password,
      });

      const { user } = res.data;
      localStorage.setItem("user", JSON.stringify(user));
      localStorage.setItem("role", user.role);

      switch (user.role) {
        case "student":
          navigate("/student/dashboards");
          break;
        case "lecturer":
          navigate("/lecturer/dashboards");
          break;
        case "prl":
          navigate("/prl/dashboards");
          break;
        case "pl":
          navigate("/pl/dashboards");
          break;
        default:
          setError("Unknown role: " + user.role);
      }
    } catch (err) {
      setError(err.response?.data?.error || "Login failed");
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");

    if (formData.role === "prl" && !formData.stream) {
      setError("Please select a stream for PRL");
      return;
    }

    if (formData.role === "student" && !formData.class_id) {
      setError("Please select a class");
      return;
    }

    try {
      await axios.post("http://localhost:5000/api/auth/register", {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
        ...(formData.role === "prl" && { stream: formData.stream }),
        ...(formData.role === "student" && { class_id: formData.class_id }),
      });

      alert("Registration successful! You can now log in.");
      setIsLogin(true);
      setFormData({
        name: "",
        email: "",
        password: "",
        role: "student",
        stream: "",
        class_id: "",
      });
    } catch (err) {
      setError(err.response?.data?.error || "Registration failed");
    }
  };

  return (
    <>
      {/* Fixed header */}
      <header className="fixed-header">
        <h2>LUCT Reporting System</h2>
      </header>

      {/* Form container */}
      <div className="login-register-container">
        <div className="form-card card p-4 shadow-sm">
          <div className="toggle-buttons mb-3">
            <button
              className={isLogin ? "active" : "inactive"}
              onClick={() => setIsLogin(true)}
            >
              Login
            </button>
            <button
              className={!isLogin ? "active" : "inactive"}
              onClick={() => setIsLogin(false)}
            >
              Register
            </button>
          </div>

          {isLogin ? (
            <form onSubmit={handleLogin}>
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <button type="submit" className="btn btn-success">
                Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegister}>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                required
              />
              <input
                type="email"
                name="email"
                placeholder="Email"
                value={formData.email}
                onChange={handleChange}
                required
              />
              <input
                type="password"
                name="password"
                placeholder="Password"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <select name="role" value={formData.role} onChange={handleChange}>
                <option value="student">Student</option>
                <option value="lecturer">Lecturer</option>
                <option value="prl">Principal Lecturer</option>
                <option value="pl">Program Leader</option>
              </select>

              {formData.role === "prl" && (
                <select
                  name="stream"
                  value={formData.stream}
                  onChange={handleChange}
                >
                  <option value="">Select Stream</option>
                  {PRL_STREAMS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              )}

              {formData.role === "student" && (
                <select
                  name="class_id"
                  value={formData.class_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.class_name}
                    </option>
                  ))}
                </select>
              )}

              <button type="submit" className="btn btn-success">
                Register
              </button>
            </form>
          )}

          {error && <p className="error-message">{error}</p>}
        </div>
      </div>
    </>
  );
}

export default LoginRegister;
