// ─────────────────────────────────────────────────────────────────
// InsightCards.jsx
//
// Renders the insight cards produced by inferenceAgent.js and
// decisionAgent.js. Each card has a type (positive/warning/info),
// section, severity, and message.
//
// Props:
//   insights          Insight[]   from report.insights
//   decisionInsights  string[]    from report.decision_insights
//   missingSource     string[]    from report.missing_sources
//   showEmpty         boolean     show empty state if no insights (default true)
//   filterSection     string      optional — only show one section
//   maxCards          number      optional — cap total cards shown
//
// Usage:
//   <InsightCards
//     insights={report.insights}
//     decisionInsights={report.decision_insights}
//     missingSources={report.missing_sources}
//   />
// ─────────────────────────────────────────────────────────────────

// Section display metadata
const SECTION_META = {
  github:      { label: 'GitHub',              icon: '🐙' },
  leetcode:    { label: 'LeetCode',            icon: '🧩' },
  linkedin:    { label: 'LinkedIn',            icon: '💼' },
  resume:      { label: 'Resume',              icon: '📄' },
  cross_check: { label: 'Cross-check',         icon: '🔗' },
  overall:     { label: 'Overall',             icon: '📊' },
  decision:    { label: 'Decision',            icon: '🤖' },
};

// Type → colour scheme
const TYPE_COLORS = {
  positive: {
    bg:     '#f0fdf4',
    border: '#bbf7d0',
    dot:    '#16a34a',
    text:   '#166534',
    label:  '#16a34a',
  },
  warning: {
    bg:     '#fffbeb',
    border: '#fde68a',
    dot:    '#f59e0b',
    text:   '#78350f',
    label:  '#92400e',
  },
  info: {
    bg:     '#eff6ff',
    border: '#bfdbfe',
    dot:    '#3b82f6',
    text:   '#1e3a5f',
    label:  '#1d4ed8',
  },
};

// Severity → priority for sorting (high first)
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2, none: 3 };

// Pipeline section display order
const SECTION_ORDER = [
  'overall', 'cross_check', 'github', 'leetcode',
  'linkedin', 'resume', 'decision',
];

// ── Single card ───────────────────────────────────────────────────
function InsightCard({ type, section, severity, message, label }) {
  const c    = TYPE_COLORS[type] || TYPE_COLORS.info;
  const meta = SECTION_META[section] || { label: section, icon: '💡' };

  return (
    <div style={{
      background: c.bg,
      border: `1px solid ${c.border}`,
      borderRadius: 10,
      padding: '12px 14px',
      display: 'flex',
      gap: 10,
      alignItems: 'flex-start',
    }}>
      {/* Coloured dot */}
      <div style={{
        width: 8, height: 8,
        borderRadius: '50%',
        background: c.dot,
        flexShrink: 0,
        marginTop: 5,
      }}/>

      <div style={{ flex: 1 }}>
        {/* Section + label row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
          <span style={{ fontSize: 12 }}>{meta.icon}</span>
          <span style={{
            fontSize: 10, fontWeight: 700, color: c.label,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {label || meta.label}
          </span>
          {severity && severity !== 'none' && (
            <span style={{
              fontSize: 9, fontWeight: 700,
              background: severity === 'high'   ? '#fef2f2' :
                          severity === 'medium' ? '#fffbeb' : '#f0fdf4',
              color:      severity === 'high'   ? '#dc2626' :
                          severity === 'medium' ? '#ea580c' : '#16a34a',
              borderRadius: 20, padding: '1px 6px',
              textTransform: 'uppercase',
            }}>{severity}</span>
          )}
        </div>

        {/* Message */}
        <div style={{
          fontSize: 12, color: c.text, lineHeight: 1.55,
        }}>
          {message}
        </div>
      </div>
    </div>
  );
}

// ── Missing sources banner ────────────────────────────────────────
function MissingSourcesBanner({ sources }) {
  if (!sources?.length) return null;

  const labels = {
    github:   '🐙 GitHub',
    leetcode: '🧩 LeetCode',
    linkedin: '💼 LinkedIn',
    resume:   '📄 Resume',
  };

  return (
    <div style={{
      background: '#fffbeb', border: '1px solid #fde68a',
      borderRadius: 10, padding: '10px 14px',
      display: 'flex', alignItems: 'flex-start', gap: 10,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>⚠</span>
      <div>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 3 }}>
          Missing data sources
        </div>
        <div style={{ fontSize: 12, color: '#78350f', lineHeight: 1.5 }}>
          {sources.map(s => labels[s] || s).join(', ')} could not be fetched.
          Scores for these dimensions were estimated from available sources
          and carry lower confidence.
        </div>
      </div>
    </div>
  );
}

// ── Section group ─────────────────────────────────────────────────
function SectionGroup({ sectionKey, cards }) {
  const meta = SECTION_META[sectionKey] || { label: sectionKey, icon: '💡' };
  return (
    <div>
      <div style={{
        fontSize: 11, fontWeight: 700, color: '#94a3b8',
        textTransform: 'uppercase', letterSpacing: '0.6px',
        marginBottom: 8, paddingBottom: 4,
        borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 5,
      }}>
        <span>{meta.icon}</span>
        <span>{meta.label}</span>
        <span style={{ fontWeight: 400, marginLeft: 2 }}>({cards.length})</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {cards.map((card, i) => (
          <InsightCard key={i} {...card}/>
        ))}
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────
export default function InsightCards({
  insights         = [],
  decisionInsights = [],
  missingSources   = [],
  showEmpty        = true,
  filterSection    = null,
  maxCards         = null,
  groupBySection   = false,
}) {
  // Convert decision_insights string[] into InsightCard objects
  const DIMENSION_LABELS = [
    'Coding ability', 'Problem solving', 'Consistency',
    'Professional presence', 'Test performance',
  ];
  const decisionCards = decisionInsights
    .filter(Boolean)
    .map((message, i) => ({
      type:     'info',
      section:  'decision',
      severity: 'none',
      label:    DIMENSION_LABELS[i] || `Dimension ${i + 1}`,
      message,
    }));

  // Merge all cards
  let allCards = [...(insights || []), ...decisionCards];

  // Optional section filter
  if (filterSection) {
    allCards = allCards.filter(c => c.section === filterSection);
  }

  // Sort: warnings first, then by section order, then by severity
  allCards.sort((a, b) => {
    // Warnings always first
    if (a.type === 'warning' && b.type !== 'warning') return -1;
    if (b.type === 'warning' && a.type !== 'warning') return  1;
    // Then by section order
    const ai = SECTION_ORDER.indexOf(a.section);
    const bi = SECTION_ORDER.indexOf(b.section);
    if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    // Then by severity
    return (SEVERITY_ORDER[a.severity] ?? 3) - (SEVERITY_ORDER[b.severity] ?? 3);
  });

  // Optional cap
  if (maxCards) allCards = allCards.slice(0, maxCards);

  const isEmpty = allCards.length === 0 && !missingSources?.length;

  if (isEmpty && !showEmpty) return null;

  if (isEmpty) {
    return (
      <div style={{
        padding: '24px 16px', textAlign: 'center',
        background: '#f8fafc', borderRadius: 12,
        border: '1px solid #e2e8f0',
        fontSize: 12, color: '#94a3b8',
      }}>
        No insights available — run the evaluation pipeline first.
      </div>
    );
  }

  // ── Grouped mode ─────────────────────────────────────────────
  if (groupBySection) {
    const grouped = {};
    for (const card of allCards) {
      const key = card.section || 'overall';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(card);
    }

    const orderedKeys = [
      ...SECTION_ORDER.filter(k => grouped[k]),
      ...Object.keys(grouped).filter(k => !SECTION_ORDER.includes(k)),
    ];

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {missingSources?.length > 0 && (
          <MissingSourcesBanner sources={missingSources}/>
        )}
        {orderedKeys.map(key => (
          <SectionGroup key={key} sectionKey={key} cards={grouped[key]}/>
        ))}
      </div>
    );
  }

  // ── Flat mode (default) ───────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {missingSources?.length > 0 && (
        <MissingSourcesBanner sources={missingSources}/>
      )}
      {allCards.map((card, i) => (
        <InsightCard key={i} {...card}/>
      ))}
    </div>
  );
}