// src/components/StepIndicator.jsx
const STEPS = [
  { id: "configure", label: "Configure" },
  { id: "generate",  label: "Generate"  },
  { id: "review",    label: "Review"    },
  { id: "export",    label: "Export"    },
];

export default function StepIndicator({ currentStep }) {
  const currentIdx = STEPS.findIndex((s) => s.id === currentStep);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
      {STEPS.map((step, idx) => {
        const done   = idx < currentIdx;
        const active = idx === currentIdx;

        return (
          <div key={step.id} style={{ display: "flex", alignItems: "center" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
              <div style={{
                width: 30, height: 30, borderRadius: "50%",
                background: done ? "var(--green)" : active ? "var(--accent)" : "var(--surface)",
                border: `2px solid ${done ? "var(--green)" : active ? "var(--accent)" : "var(--border-2)"}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 12, fontWeight: 700, fontFamily: "var(--font-body)",
                color: done || active ? "#fff" : "var(--text-3)",
                boxShadow: active ? "0 0 0 4px rgba(91,106,240,0.15)" : "none",
                transition: "all 0.25s",
              }}>
                {done ? (
                  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                    <path d="M2 6.5L5.2 10L11 3" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{ fontSize: 11 }}>{idx + 1}</span>
                )}
              </div>
              <span style={{
                fontSize: 11, fontWeight: active || done ? 600 : 400,
                color: done ? "var(--green)" : active ? "var(--accent)" : "var(--text-3)",
                whiteSpace: "nowrap", letterSpacing: "0.02em",
              }}>
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div style={{
                width: 52, height: 2,
                background: idx < currentIdx ? "var(--green)" : "var(--border)",
                margin: "0 6px", marginBottom: 18,
                transition: "background 0.3s",
                borderRadius: 99,
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
