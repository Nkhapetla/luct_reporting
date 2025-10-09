// src/components/DashboardHeader.js
import React, { useEffect, useState } from "react";
import "../App.css";

function DashboardHeader({ role }) {
  const [userName, setUserName] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    if (user) setUserName(user.name);
  }, []);

  return (
    <header className="dashboard-header">
      <h1>
        Welcome, {userName}{" "}
        {role === "student" && "👩‍🎓"}
        {role === "lecturer" && "👨‍🏫"}
        {role === "principal" && "📋"}
        {role === "program" && "⚙️"}
      </h1>
    </header>
  );
}

export default DashboardHeader;
