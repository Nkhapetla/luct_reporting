// src/components/PrivateRoute.js
import React from "react";
import { Navigate, Outlet } from "react-router-dom";

const PrivateRoute = ({ allowedRoles }) => {
  // Get the stored user and role
  const storedUser = JSON.parse(localStorage.getItem("user"));
  const role = storedUser?.role;

  // If not logged in → redirect to login
  if (!role) {
    return <Navigate to="/" replace />;
  }

  // If role is not allowed → redirect to login
  if (allowedRoles && !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  // Authorized → render nested routes
  return <Outlet />;
};

export default PrivateRoute;
