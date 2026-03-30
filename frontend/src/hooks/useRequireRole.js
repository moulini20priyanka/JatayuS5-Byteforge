// src/hooks/useRequireRole.js
// Usage: call at the top of any protected page component
// useRequireRole(['admin'])          — only admin
// useRequireRole(['admin','recruiter']) — admin or recruiter

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function useRequireRole(allowedRoles = []) {
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role  = (localStorage.getItem("role") || "").toLowerCase().trim();

    if (!token) {
      // Not logged in at all — send to login
      const guess = allowedRoles.includes("student") ? "student" : "admin";
      navigate(`/login?role=${guess}`, { replace: true });
      return;
    }

    if (allowedRoles.length > 0 && !allowedRoles.includes(role)) {
      console.warn(`[Guard] role="${role}" not in [${allowedRoles}] — redirecting`);
      // Send each role to their own dashboard
      if (role === "student")    navigate("/student-dashboard",    { replace: true });
      else if (role === "recruiter") navigate("/recruiter-dashboard", { replace: true });
      else                       navigate("/admin-dashboard",       { replace: true });
    }
  }, []);
}