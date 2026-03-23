// frontend/src/pages/TestComplete.jsx
import React from "react";

export default function TestComplete() {
  return (
    <div style={{
      minHeight: "100vh", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", background: "#f0fdf4"
    }}>
      <div style={{
        background: "#fff", borderRadius: 16, padding: "48px 64px",
        textAlign: "center", boxShadow: "0 4px 24px rgba(0,0,0,0.08)"
      }}>
        {/* Green checkmark */}
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: "#dcfce7", display: "flex", alignItems: "center",
          justifyContent: "center", margin: "0 auto 24px", fontSize: 36
        }}>✓</div>

        <h1 style={{ fontSize: 28, fontWeight: 700, color: "#15803d", margin: "0 0 12px" }}>
          Test Completed!
        </h1>
        <p style={{ fontSize: 16, color: "#6b7280", maxWidth: 380, lineHeight: 1.6, margin: 0 }}>
          All questions answered. Your responses have been recorded and will
          be reviewed by the evaluation team. Results will be communicated
          through the platform.
        </p>
      </div>
    </div>
  );
}