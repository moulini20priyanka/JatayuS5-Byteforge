import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────
// ScoreCharts.jsx
//
// Three charts rendered from the chart_data produced by
// inferenceAgent.js / reportGenerator.js.
//
// Props:
//   chartData     object    { pie[], skillBar[], testBar[] }
//   showPie       boolean   default true
//   showSkillBar  boolean   default true
//   showTestBar   boolean   default true — hidden if testBar is empty
//
// Usage:
//   <ScoreCharts chartData={report.chartData} />
// ─────────────────────────────────────────────────────────────────

// Colour palette — matches your existing badge colours
const PIE_COLORS   = ['#6366f1', '#16a34a', '#2563eb', '#ea580c'];
const SKILL_COLORS = {
  'Coding skill':          '#6366f1',
  'Problem solving':       '#16a34a',
  'Consistency':           '#2563eb',
  'Professional presence': '#ea580c',
};
const TEST_COLORS = {
  'MCQ':    '#2563eb',
  'SQL':    '#16a34a',
  'Coding': '#ea580c',
};

// Shared axis/grid style
const AXIS_STYLE = { fontSize: 11, fill: '#94a3b8', fontFamily: 'inherit' };
const GRID_STYLE = { stroke: '#f0f0f0', strokeDasharray: '3 3' };

// Custom tooltip shared by both bar charts
function BarTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
      boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    }}>
      <div style={{ fontWeight: 700, color: '#1e293b', marginBottom: 2 }}>{d.name}</div>
      <div style={{ color: d.fill }}>{Math.round(d.value)}<span style={{ color: '#94a3b8' }}>/100</span></div>
    </div>
  );
}

// Custom pie tooltip
function PieTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 8, padding: '8px 12px', fontSize: 12,
    }}>
      <span style={{ fontWeight: 700, color: '#1e293b' }}>{d.name}: </span>
      <span style={{ color: d.payload.fill }}>{d.value}%</span>
    </div>
  );
}

// Custom label inside each pie slice
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, name, value }) {
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  if (value < 8) return null; // skip tiny slices
  return (
    <text x={x} y={y} textAnchor="middle" dominantBaseline="central"
      fill="#fff" fontSize={10} fontWeight={700} fontFamily="inherit">
      {value}%
    </text>
  );
}

// Section header
function ChartTitle({ children }) {
  return (
    <div style={{
      fontSize: 13, fontWeight: 600, color: '#1e293b',
      marginBottom: 12,
    }}>{children}</div>
  );
}

// Empty state
function EmptyState({ message = 'No data available' }) {
  return (
    <div style={{
      padding: '24px 0', textAlign: 'center',
      fontSize: 12, color: '#94a3b8',
    }}>{message}</div>
  );
}

// ── Pie Chart ─────────────────────────────────────────────────────
function SourcePieChart({ data }) {
  if (!data?.length) return <EmptyState message="No source data"/>;

  // Attach colour to each slice
  const colored = data.map((d, i) => ({ ...d, fill: PIE_COLORS[i % PIE_COLORS.length] }));

  return (
    <div>
      <ChartTitle>Source contribution</ChartTitle>
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={colored}
            cx="50%" cy="50%"
            outerRadius={80}
            dataKey="value"
            labelLine={false}
            label={PieLabel}
          >
            {colored.map((entry, i) => (
              <Cell key={i} fill={entry.fill}/>
            ))}
          </Pie>
          <Tooltip content={<PieTooltip/>}/>
        </PieChart>
      </ResponsiveContainer>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 16px',
        justifyContent: 'center', marginTop: 8 }}>
        {colored.map((d, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.fill, flexShrink: 0 }}/>
            <span style={{ color: '#64748b' }}>{d.name} ({d.value}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skill Bar Chart ───────────────────────────────────────────────
function SkillBarChart({ data }) {
  if (!data?.length) return <EmptyState message="No skill scores available"/>;

  const colored = data.map(d => ({
    ...d,
    fill: SKILL_COLORS[d.name] || '#6366f1',
  }));

  return (
    <div>
      <ChartTitle>Skill scores</ChartTitle>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={colored}
          layout="vertical"
          margin={{ top: 0, right: 48, bottom: 0, left: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid horizontal={false} {...GRID_STYLE}/>
          <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false}/>
          <YAxis type="category" dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false} width={130}/>
          <Tooltip content={<BarTooltip/>} cursor={{ fill: '#f8fafc' }}/>
          <Bar dataKey="score" radius={[0, 4, 4, 0]} maxBarSize={18}>
            {colored.map((entry, i) => (
              <Cell key={i} fill={entry.fill}/>
            ))}
            <LabelList
              dataKey="score"
              position="right"
              formatter={v => Math.round(v)}
              style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Test Bar Chart ────────────────────────────────────────────────
function TestBarChart({ data }) {
  if (!data?.length) return null; // silently hide — no test = no chart

  const colored = data.map(d => ({
    ...d,
    fill: TEST_COLORS[d.name] || '#6366f1',
  }));

  return (
    <div>
      <ChartTitle>Test performance</ChartTitle>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart
          data={colored}
          margin={{ top: 4, right: 24, bottom: 0, left: 0 }}
          barCategoryGap="40%"
        >
          <CartesianGrid vertical={false} {...GRID_STYLE}/>
          <XAxis dataKey="name" tick={AXIS_STYLE} tickLine={false} axisLine={false}/>
          <YAxis domain={[0, 100]} tick={AXIS_STYLE} tickLine={false} axisLine={false}/>
          <Tooltip content={<BarTooltip/>} cursor={{ fill: '#f8fafc' }}/>
          <Bar dataKey="score" radius={[4, 4, 0, 0]} maxBarSize={40}>
            {colored.map((entry, i) => (
              <Cell key={i} fill={entry.fill}/>
            ))}
            <LabelList
              dataKey="score"
              position="top"
              formatter={v => Math.round(v)}
              style={{ fontSize: 11, fontWeight: 700, fill: '#64748b' }}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────
export default function ScoreCharts({
  chartData,
  showPie      = true,
  showSkillBar = true,
  showTestBar  = true,
}) {
  if (!chartData) {
    return (
      <div style={{
        background: '#f8fafc', borderRadius: 12,
        padding: '32px 24px', textAlign: 'center',
        fontSize: 12, color: '#94a3b8',
        border: '1px solid #e2e8f0',
      }}>
        No chart data — run the evaluation pipeline first.
      </div>
    );
  }

  const hasTestData = Array.isArray(chartData.testBar) && chartData.testBar.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

      {/* Row 1: Pie + Skill Bar side-by-side */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: showPie && showSkillBar ? '1fr 1fr' : '1fr',
        gap: 20,
      }}>
        {showPie && (
          <div style={{
            background: '#fff', borderRadius: 12,
            border: '1px solid #e2e8f0', padding: '16px 20px',
          }}>
            <SourcePieChart data={chartData.pie}/>
          </div>
        )}
        {showSkillBar && (
          <div style={{
            background: '#fff', borderRadius: 12,
            border: '1px solid #e2e8f0', padding: '16px 20px',
          }}>
            <SkillBarChart data={chartData.skillBar}/>
          </div>
        )}
      </div>

      {/* Row 2: Test bar — only if data exists */}
      {showTestBar && hasTestData && (
        <div style={{
          background: '#fff', borderRadius: 12,
          border: '1px solid #e2e8f0', padding: '16px 20px',
        }}>
          <TestBarChart data={chartData.testBar}/>
        </div>
      )}
    </div>
  );
}