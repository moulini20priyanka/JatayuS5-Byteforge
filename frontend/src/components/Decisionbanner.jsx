// ─────────────────────────────────────────────────────────────────
// DecisionBanner.jsx
//
// The top-level hiring decision display. Renders the final output
// from decisionAgent.js in a hero-style banner.
//
// Props:
//   report        object    full report from orchestrator/reportGenerator
//                           needs: decision, confidence, risk,
//                           overall_score, recommendation,
//                           source_status, missing_sources,
//                           evaluated_at, method
//   compact       boolean   smaller layout for use inside tables/modals
//                           default false
//   showSources   boolean   show source status pills  default true
//   showMeta      boolean   show evaluated_at + method  default true
//
// Usage:
//   <DecisionBanner report={report} />
//   <DecisionBanner report={report} compact />
// ─────────────────────────────────────────────────────────────────

// ── Score ring (same SVG pattern used in Reports.jsx) ─────────────
function ScoreRing({ score, size = 80, strokeWidth = 6, color = '#6366f1' }) {
  const r    = (size - strokeWidth * 2) / 2;
  const circ = 2 * Math.PI * r;
  const fill = (Math.min(Math.max(score || 0, 0), 100) / 100) * circ;

  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="#e2e8f0" strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={`${fill} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
      <text
        x={size / 2} y={size / 2 - 4}
        textAnchor="middle" dominantBaseline="middle"
        fill={color} fontSize={size / 3.8} fontWeight="700"
        fontFamily="monospace"
      >
        {Math.round(score || 0)}
      </text>
      <text
        x={size / 2} y={size / 2 + size / 5}
        textAnchor="middle" dominantBaseline="middle"
        fill="#94a3b8" fontSize={size / 7}
        fontFamily="inherit"
      >
        /100
      </text>
    </svg>
  );
}

// ── Decision config ───────────────────────────────────────────────
const DECISION_CONFIG = {
  Hire: {
    bg:         '#f0fdf4',
    border:     '#bbf7d0',
    color:      '#16a34a',
    ringColor:  '#16a34a',
    icon:       '✓',
    iconBg:     '#dcfce7',
    headline:   'Recommend for hire',
  },
  Maybe: {
    bg:         '#fffbeb',
    border:     '#fde68a',
    color:      '#ea580c',
    ringColor:  '#f59e0b',
    icon:       '?',
    iconBg:     '#fef3c7',
    headline:   'Further evaluation needed',
  },
  Reject: {
    bg:         '#fef2f2',
    border:     '#fecaca',
    color:      '#dc2626',
    ringColor:  '#dc2626',
    icon:       '✗',
    iconBg:     '#fee2e2',
    headline:   'Not recommended',
  },
};

const CONFIDENCE_COLORS = {
  High:   '#16a34a',
  Medium: '#ea580c',
  Low:    '#dc2626',
};

const RISK_COLORS = {
  Low:    '#16a34a',
  Medium: '#ea580c',
  High:   '#dc2626',
};

const SOURCE_CONFIG = {
  github:   { label: 'GitHub',   icon: '🐙' },
  leetcode: { label: 'LeetCode', icon: '🧩' },
  linkedin: { label: 'LinkedIn', icon: '💼' },
  resume:   { label: 'Resume',   icon: '📄' },
};

const SOURCE_STATUS_STYLE = {
  real:      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Real'      },
  estimated: { bg: '#fffbeb', color: '#ea580c', border: '#fde68a', label: 'Estimated' },
  missing:   { bg: '#f8fafc', color: '#94a3b8', border: '#e2e8f0', label: 'Missing'   },
};

// ── Badge ─────────────────────────────────────────────────────────
function Badge({ label, value, color, bg, border }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      gap: 2,
    }}>
      <span style={{
        fontSize: 10, fontWeight: 700, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.5px',
      }}>{label}</span>
      <span style={{
        fontSize: 12, fontWeight: 700, color,
        background: bg, border: `1px solid ${border}`,
        borderRadius: 20, padding: '2px 10px',
      }}>{value}</span>
    </div>
  );
}

// ── Source pill ───────────────────────────────────────────────────
function SourcePill({ sourceKey, status }) {
  const src = SOURCE_CONFIG[sourceKey] || { label: sourceKey, icon: '⚙' };
  const sty = SOURCE_STATUS_STYLE[status] || SOURCE_STATUS_STYLE.missing;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 5,
      background: sty.bg, border: `1px solid ${sty.border}`,
      borderRadius: 20, padding: '3px 10px',
      fontSize: 11,
    }}>
      <span style={{ fontSize: 12 }}>{src.icon}</span>
      <span style={{ fontWeight: 600, color: '#1e293b' }}>{src.label}</span>
      <span style={{
        fontSize: 9, fontWeight: 700, color: sty.color,
        textTransform: 'uppercase', letterSpacing: '0.3px',
      }}>{sty.label}</span>
    </div>
  );
}

// ── Full banner ───────────────────────────────────────────────────
function FullBanner({ report, showSources, showMeta }) {
  const cfg = DECISION_CONFIG[report.decision] || DECISION_CONFIG.Maybe;

  return (
    <div style={{
      background: cfg.bg,
      border:     `1px solid ${cfg.border}`,
      borderRadius: 14,
      padding: '20px 24px',
    }}>

      {/* Top row: icon + headline + score ring */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>

        {/* Decision icon */}
        <div style={{
          width: 48, height: 48, borderRadius: 12,
          background: cfg.iconBg,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, fontWeight: 700, color: cfg.color, flexShrink: 0,
        }}>
          {cfg.icon}
        </div>

        {/* Decision text */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 18, fontWeight: 800, color: cfg.color,
            }}>{report.decision || '—'}</span>
            <span style={{
              fontSize: 12, color: '#64748b',
              borderLeft: '1px solid #e2e8f0', paddingLeft: 8,
            }}>{cfg.headline}</span>
          </div>

          {/* Confidence + Risk badges inline */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              borderRadius: 20,
              background: CONFIDENCE_COLORS[report.confidence] + '18',
              color: CONFIDENCE_COLORS[report.confidence] || '#64748b',
            }}>
              Confidence: {report.confidence || '—'}
            </span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 10px',
              borderRadius: 20,
              background: RISK_COLORS[report.risk] + '18',
              color: RISK_COLORS[report.risk] || '#64748b',
            }}>
              Risk: {report.risk || '—'}
            </span>
          </div>
        </div>

        {/* Score ring */}
        <div style={{ textAlign: 'center' }}>
          <ScoreRing
            score={report.overall_score || 0}
            size={80}
            color={cfg.ringColor}
          />
          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Overall score</div>
        </div>
      </div>

      {/* Recommendation paragraph */}
      {report.recommendation && (
        <div style={{
          background: 'rgba(255,255,255,0.7)',
          borderRadius: 8, padding: '10px 14px',
          fontSize: 13, color: '#374151', lineHeight: 1.65,
          marginBottom: showSources || showMeta ? 16 : 0,
        }}>
          {report.recommendation}
        </div>
      )}

      {/* Source status pills */}
      {showSources && report.source_status && (
        <div style={{ marginBottom: showMeta ? 12 : 0 }}>
          <div style={{
            fontSize: 10, fontWeight: 700, color: '#94a3b8',
            textTransform: 'uppercase', letterSpacing: '0.5px',
            marginBottom: 8,
          }}>Data sources</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {Object.entries(report.source_status).map(([key, status]) => (
              <SourcePill key={key} sourceKey={key} status={status}/>
            ))}
          </div>
        </div>
      )}

      {/* Meta row */}
      {showMeta && (report.evaluated_at || report.method) && (
        <div style={{
          display: 'flex', gap: 16, flexWrap: 'wrap',
          fontSize: 11, color: '#94a3b8',
          borderTop: '1px solid rgba(0,0,0,0.06)',
          paddingTop: 12, marginTop: 4,
        }}>
          {report.evaluated_at && (
            <span>
              Evaluated {new Date(report.evaluated_at).toLocaleString()}
            </span>
          )}
          {report.method && (
            <span style={{ textTransform: 'capitalize' }}>
              Method: {report.method.replace('rule_based:', 'rule — ').replace('_', ' ')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ── Compact banner (for use inside modals/tables) ─────────────────
function CompactBanner({ report }) {
  const cfg = DECISION_CONFIG[report.decision] || DECISION_CONFIG.Maybe;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderRadius: 10, padding: '12px 16px',
    }}>
      <ScoreRing score={report.overall_score || 0} size={52}
        strokeWidth={5} color={cfg.ringColor}/>

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>
            {report.decision || '—'}
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '1px 8px',
            borderRadius: 20,
            background: CONFIDENCE_COLORS[report.confidence] + '18',
            color: CONFIDENCE_COLORS[report.confidence] || '#64748b',
          }}>
            {report.confidence || '—'} confidence
          </span>
          <span style={{
            fontSize: 11, fontWeight: 600, padding: '1px 8px',
            borderRadius: 20,
            background: RISK_COLORS[report.risk] + '18',
            color: RISK_COLORS[report.risk] || '#64748b',
          }}>
            {report.risk || '—'} risk
          </span>
        </div>
        {report.recommendation && (
          <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.4 }}>
            {report.recommendation.slice(0, 120)}{report.recommendation.length > 120 ? '…' : ''}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────
function EmptyBanner() {
  return (
    <div style={{
      background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 14, padding: '32px 24px',
      textAlign: 'center', fontSize: 13, color: '#94a3b8',
    }}>
      <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
      No hiring decision yet.
      <br/>
      <span style={{ fontSize: 12 }}>Run the evaluation pipeline to generate a recommendation.</span>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────
export default function DecisionBanner({
  report,
  compact      = false,
  showSources  = true,
  showMeta     = true,
}) {
  if (!report?.decision) return <EmptyBanner/>;
  if (compact) return <CompactBanner report={report}/>;
  return (
    <FullBanner report={report} showSources={showSources} showMeta={showMeta}/>
  );
}