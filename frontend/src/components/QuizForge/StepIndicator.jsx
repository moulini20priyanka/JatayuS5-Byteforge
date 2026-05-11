// src/components/QuizForge/StepIndicator.jsx
// Adapted for NeuroAssess — inline styles, no CSS variables

const STEPS = [
  { key:'configure', label:'Configure' },
  { key:'generate',  label:'Generate'  },
  { key:'review',    label:'Review'    },
  { key:'export',    label:'Export'    },
];

export default function StepIndicator({ currentStep }) {
  const currentIdx = STEPS.findIndex(s => s.key === currentStep);

  return (
    <div style={{ display:'flex', alignItems:'center', gap:0 }}>
      {STEPS.map((step, i) => {
        const done   = i < currentIdx;
        const active = i === currentIdx;

        return (
          <div key={step.key} style={{ display:'flex', alignItems:'center' }}>
            {/* Step node */}
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
              <div style={{
                width:28, height:28, borderRadius:'50%',
                display:'flex', alignItems:'center', justifyContent:'center',
                background: done   ? '#7055C8'
                          : active ? 'linear-gradient(135deg,#7055C8,#C060C0)'
                          : '#f0ecfc',
                border:`2px solid ${done || active ? '#7055C8' : '#e8e4f8'}`,
                boxShadow: active ? '0 0 0 3px rgba(112,85,200,0.2)' : 'none',
                transition:'all 0.2s',
              }}>
                {done ? (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M2 6L5 9L10 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                ) : (
                  <span style={{
                    fontSize:11, fontWeight:700,
                    color: active ? '#fff' : '#c4b8e8',
                  }}>{i + 1}</span>
                )}
              </div>
              <span style={{
                fontSize:10, fontWeight: active ? 700 : 500,
                color: done || active ? '#7055C8' : '#94a3b8',
                whiteSpace:'nowrap',
              }}>{step.label}</span>
            </div>

            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div style={{
                width:32, height:2, margin:'0 4px', marginBottom:14,
                background: i < currentIdx ? '#7055C8' : '#e8e4f8',
                transition:'background 0.3s',
              }}/>
            )}
          </div>
        );
      })}
    </div>
  );
}