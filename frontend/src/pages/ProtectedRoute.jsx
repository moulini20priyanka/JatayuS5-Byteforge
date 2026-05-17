
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
      // Logged in but wrong role — clear session and send to correct login
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