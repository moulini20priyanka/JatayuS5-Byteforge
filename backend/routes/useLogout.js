/**
 * useLogout.js
 *
 * Shared hook — import and call logout() from any dashboard component.
 * Clears ALL session keys and redirects to the home page ("/").
 *
 * Usage:
 *   import useLogout from '../hooks/useLogout';
 *
 *   function AdminDashboard() {
 *     const logout = useLogout();
 *     return <button onClick={logout}>Sign out</button>;
 *   }
 */

import { useNavigate } from "react-router-dom";

const SESSION_KEYS = [
  "token",
  "role",
  "user_name",
  "user_email",
  "student_id",
  "admin_token",
  "recruiter_token",
  "student_token",
];

export default function useLogout() {
  const navigate = useNavigate();

  return function logout() {
    // Wipe every session key
    SESSION_KEYS.forEach(k => localStorage.removeItem(k));

    // Always land on the home page that shows the three login options
    navigate("/", { replace: true });
  };
}