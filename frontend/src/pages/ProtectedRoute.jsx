/**
 * ProtectedRoute.jsx
 *
 * Wraps any dashboard route. Checks that:
 *   1. A token exists in localStorage
 *   2. The stored role matches the required role for this route
 *
 * If either check fails the user is sent to the correct login page
 * (or to "/" if the role is unknown), never to another portal.
 *
 * Usage in your router:
 *
 *   <Route path="/admin-dashboard"     element={<ProtectedRoute role="admin">     <AdminDashboard />     </ProtectedRoute>} />
 *   <Route path="/recruiter-dashboard" element={<ProtectedRoute role="recruiter"> <RecruiterDashboard /> </ProtectedRoute>} />
 *   <Route path="/student-dashboard"   element={<ProtectedRoute role="student">   <StudentDashboard />   </ProtectedRoute>} />
 */

import { useEffect, useState } from "react";
import { useNavigate }          from "react-router-dom";

const ROLE_LOGIN_PATH = {
  admin:     "/login?role=admin",
  recruiter: "/login?role=recruiter",
  student:   "/login?role=student",
};

export default function ProtectedRoute({ role, children }) {
  const navigate    = useNavigate();
  const [ok, setOk] = useState(false); // only render children after auth passes

  useEffect(() => {
    const token       = localStorage.getItem("token");
    const storedRole  = (localStorage.getItem("role") || "").toLowerCase().trim();
    const required    = (role || "").toLowerCase().trim();

    if (!token) {
      // No session at all — send to the matching login page
      navigate(ROLE_LOGIN_PATH[required] || "/", { replace: true });
      return;
    }

    if (storedRole !== required) {
      /**
       * Session exists but belongs to a different role.
       * Do NOT redirect to their actual dashboard — that would let
       * someone jump portals by just visiting the URL.
       * Instead send them to the login page for the portal they tried
       * to access, so they can supply the right credentials.
       */
      navigate(ROLE_LOGIN_PATH[required] || "/", { replace: true });
      return;
    }

    // All checks passed
    setOk(true);
  }, [role, navigate]);

  if (!ok) {
    // Brief blank while the redirect fires (avoids flash of protected content)
    return null;
  }

  return children;
}