import React, { useState, useEffect, useRef } from 'react';

const API = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000') + '/api';
const SAMPLE_API = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || 'http://localhost:5000') + '/api/sample';
const SAMPLE_IDS = [9001, 9002, 9003, 9004];

function getToken() { return localStorage.getItem('token') || ''; }

const T = {
  navy:'#0f172a', text:'#1e293b', muted:'#64748b', dim:'#94a3b8',
  accent:'#2563eb', accentSoft:'#eff6ff',
  green:'#16a34a', greenBg:'#f0fdf4', greenBdr:'#bbf7d0',
  red:'#dc2626', redBg:'#fef2f2',
  orange:'#ea580c', orangeBg:'#fff7ed',
  purple:'#7c3aed', purpleBg:'#f5f3ff',
  blue:'#2563eb', blueBg:'#eff6ff',
  teal:'#0891b2', tealBg:'#f0f9ff',
  border:'#e8edf2', white:'#ffffff', pageBg:'#f4f8fb',
  shadow:'0 1px 4px rgba(0,0,0,0.06)',
};

// ── Mini Bar Chart ────────────────────────────────────────────
function BarChart({ data, title }) {
  const max = Math.max(...data.map(d => d.value), 1);
  const colors = ['#2563eb','#7c3aed','#0891b2','#16a34a','#ea580c','#dc2626'];
  return (
    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'16px 18px', marginBottom:14 }}>
      {title && <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:'.8px', marginBottom:14 }}>{title.toUpperCase()}</div>}
      <div style={{ display:'flex', alignItems:'flex-end', gap:8, height:120 }}>
        {data.map((d, i) => (
          <div key={d.label} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
            <span style={{ fontSize:10, fontWeight:700, color:colors[i % colors.length] }}>{d.value}</span>
            <div style={{ width:'100%', borderRadius:'4px 4px 0 0', background:colors[i % colors.length], opacity:.85, height:`${Math.round((d.value / max) * 100)}px`, transition:'height .4s', minHeight:4 }} />
            <span style={{ fontSize:9.5, color:T.muted, textAlign:'center', lineHeight:1.2 }}>{d.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Radar / Spider Chart (SVG) ────────────────────────────────
function RadarChart({ skills, title }) {
  const size   = 200;
  const center = size / 2;
  const radius = 80;
  const n      = skills.length;
  if (!n) return null;

  const angle = (i) => (i / n) * 2 * Math.PI - Math.PI / 2;
  const point = (i, r) => ({
    x: center + r * Math.cos(angle(i)),
    y: center + r * Math.sin(angle(i)),
  });

  const gridLevels = [0.25, 0.5, 0.75, 1];
  const dataPath   = skills.map((s, i) => { const p = point(i, radius * (s.level / 100)); return `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`; }).join(' ') + ' Z';

  return (
    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'16px 18px', marginBottom:14 }}>
      {title && <div style={{ fontSize:11, fontWeight:700, color:T.muted, letterSpacing:'.8px', marginBottom:10 }}>{title.toUpperCase()}</div>}
      <div style={{ display:'flex', alignItems:'center', gap:16, flexWrap:'wrap' }}>
        <svg width={size} height={size} style={{ flexShrink:0 }}>
          {/* Grid */}
          {gridLevels.map((lvl, gi) => (
            <polygon key={gi}
              points={skills.map((_, i) => { const p = point(i, radius * lvl); return `${p.x},${p.y}`; }).join(' ')}
              fill="none" stroke="#e2e8f0" strokeWidth="1"
            />
          ))}
          {/* Axes */}
          {skills.map((_, i) => { const p = point(i, radius); return <line key={i} x1={center} y1={center} x2={p.x} y2={p.y} stroke="#e2e8f0" strokeWidth="1" />; })}
          {/* Data polygon */}
          <path d={dataPath} fill="rgba(37,99,235,0.15)" stroke="#2563eb" strokeWidth="2" strokeLinejoin="round" />
          {/* Data points */}
          {skills.map((s, i) => { const p = point(i, radius * (s.level / 100)); return <circle key={i} cx={p.x} cy={p.y} r="4" fill="#2563eb" />; })}
          {/* Labels */}
          {skills.map((s, i) => {
            const p  = point(i, radius + 16);
            const ta = p.x < center - 5 ? 'end' : p.x > center + 5 ? 'start' : 'middle';
            return <text key={i} x={p.x} y={p.y + 4} textAnchor={ta} fontSize="10" fill="#334155" fontWeight="600">{s.name}</text>;
          })}
        </svg>
        {/* Legend */}
        <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
          {skills.map(s => (
            <div key={s.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ width:28, height:6, borderRadius:3, background:`linear-gradient(90deg, #2563eb ${s.level}%, #e2e8f0 ${s.level}%)` }} />
              <span style={{ fontSize:11, color:T.text }}>{s.name}</span>
              <span style={{ fontSize:11, fontWeight:700, color:T.accent, marginLeft:'auto' }}>{s.level}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Score Gauge ───────────────────────────────────────────────
function ScoreGauge({ score, max, label, color = T.accent, size = 80 }) {
  const pct  = max > 0 ? Math.min(score / max, 1) : 0;
  const r    = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  return (
    <div style={{ textAlign:'center' }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={`${pct * circ} ${circ}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`} />
        <text x={size/2} y={size/2 - 3} textAnchor="middle" fontSize="13" fontWeight="800" fill={T.navy}>{Math.round(score)}</text>
        <text x={size/2} y={size/2 + 10} textAnchor="middle" fontSize="9" fill={T.dim}>/{max}</text>
      </svg>
      <div style={{ fontSize:10, fontWeight:700, color:T.muted, marginTop:2 }}>{label}</div>
    </div>
  );
}

// ── Violation Badge ───────────────────────────────────────────
function ViolBadge({ count, label }) {
  const c = count > 2 ? T.red : count > 0 ? T.orange : T.green;
  const bg = count > 2 ? T.redBg : count > 0 ? T.orangeBg : T.greenBg;
  return (
    <div style={{ textAlign:'center', padding:'8px 12px', background:bg, borderRadius:8 }}>
      <div style={{ fontSize:20, fontWeight:800, color:c }}>{count}</div>
      <div style={{ fontSize:9, color:T.muted, fontFamily:'monospace' }}>{label}</div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────
export default function HiringReportModal({ studentId, studentName, onClose }) {
  const [loading, setLoading]   = useState(true);
  const [data,    setData]      = useState(null);
  const [tab,     setTab]       = useState('overview');
  const [error,   setError]     = useState(null);

  const isSample = SAMPLE_IDS.includes(parseInt(studentId));

  useEffect(() => {
    if (!studentId) return;
    setLoading(true);

    const fetchData = async () => {
      // Try sample endpoint first for sample IDs
      if (isSample) {
        try {
          const res = await fetch(`${SAMPLE_API}/report/${studentId}`, { headers:{ Authorization:`Bearer ${getToken()}` } });
          if (res.ok) {
            const d = await res.json();
            setData(d);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Try real backend
      try {
        const res = await fetch(`${API}/hiring-report/${studentId}`, { headers:{ Authorization:`Bearer ${getToken()}` } });
        if (res.ok) { const d = await res.json(); setData(d); setLoading(false); return; }
      } catch {}

      // Fallback: pull from exam_assignments + candidate data
      try {
        const [candRes, examRes] = await Promise.all([
          fetch(`${API}/candidates/${studentId}`, { headers:{ Authorization:`Bearer ${getToken()}` } }),
          fetch(`${API}/exams?student_id=${studentId}`, { headers:{ Authorization:`Bearer ${getToken()}` } }),
        ]);
        const cand = candRes.ok ? await candRes.json() : {};
        const exam = examRes.ok ? await examRes.json() : {};
        setData({
          name:         cand.name         || studentName || 'Student',
          email:        cand.email        || '',
          college:      cand.college      || '',
          github_score: cand.github_score || 0,
          leetcode_score:cand.leetcode_score || 0,
          test_score:   cand.test_score   || 0,
          total_marks:  100,
          skills:       [],
          insights:     'No detailed insights available for this candidate.',
          breakdown:    { mcq:{correct:0,wrong:0,skipped:0,score:0,max:0}, sql:{score:0,max:0}, coding:{score:0,max:0} },
          viva:         [],
        });
      } catch (e) {
        setError('Failed to load report data.');
      }
      setLoading(false);
    };

    fetchData();
  }, [studentId]);

  if (!studentId) return null;

  const TABS = [
    { id:'overview',  label:'Overview'    },
    { id:'scores',    label:'Test Score'  },
    { id:'insights',  label:'AI Insights' },
    { id:'viva',      label:'Viva'        },
  ];

  const name = data?.name || studentName || 'Student';

  // Score comparison bar chart data
  const scoreChartData = data ? [
    { label:'Test Score',     value: data.test_score     || 0 },
    { label:'GitHub',         value: data.github_score   || 0 },
    { label:'LeetCode',       value: data.leetcode_score || 0 },
    ...(data.viva_score ? [{ label:'Viva', value: data.viva_score }] : []),
    ...(data.linkedin_score ? [{ label:'LinkedIn', value: data.linkedin_score }] : []),
  ] : [];

  const totalTest = data?.test_score || 0;
  const totalMark = data?.total_marks || 100;
  const testPct   = totalMark > 0 ? Math.round(totalTest / totalMark * 100) : 0;

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:16 }} onClick={onClose}>
      <div style={{ background:T.pageBg, borderRadius:16, width:'100%', maxWidth:860, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,.22)' }} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'14px 20px', background:T.white, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:13, flexShrink:0 }}>
          <div style={{ width:42,height:42,borderRadius:'50%',background:T.accentSoft,border:`2px solid ${T.accent}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800,color:T.accent }}>{name[0]?.toUpperCase()}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:T.navy }}>{name}</div>
            <div style={{ fontSize:11, color:T.dim }}>{data?.email||''}{data?.college?` · ${data.college}`:''}</div>
          </div>
          {data && !loading && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ textAlign:'center', padding:'6px 12px', background:T.blueBg, borderRadius:8, border:'1px solid #bfdbfe' }}>
                <div style={{ fontSize:18, fontWeight:800, color:T.blue }}>{data.test_score ?? '—'}<span style={{ fontSize:11, color:T.dim }}>/{data.total_marks||100}</span></div>
                <div style={{ fontSize:8.5, color:T.dim, fontFamily:'monospace' }}>TEST</div>
              </div>
              {data.github_score != null && (
                <div style={{ textAlign:'center', padding:'6px 12px', background:T.greenBg, borderRadius:8, border:`1px solid ${T.greenBdr}` }}>
                  <div style={{ fontSize:18, fontWeight:800, color:T.green }}>{data.github_score}</div>
                  <div style={{ fontSize:8.5, color:T.dim, fontFamily:'monospace' }}>GITHUB</div>
                </div>
              )}
              {data.leetcode_score != null && (
                <div style={{ textAlign:'center', padding:'6px 12px', background:T.orangeBg, borderRadius:8, border:'1px solid #fed7aa' }}>
                  <div style={{ fontSize:18, fontWeight:800, color:T.orange }}>{data.leetcode_score}</div>
                  <div style={{ fontSize:8.5, color:T.dim, fontFamily:'monospace' }}>LEETCODE</div>
                </div>
              )}
            </div>
          )}
          <button onClick={onClose} style={{ background:'none', border:`1px solid ${T.border}`, borderRadius:7, width:28, height:28, cursor:'pointer', fontSize:15, color:T.muted }}>×</button>
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', background:T.white, borderBottom:`1px solid ${T.border}`, paddingLeft:14, flexShrink:0 }}>
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 18px', fontSize:12, fontWeight:tab===t.id?700:500, color:tab===t.id?T.accent:T.muted, borderBottom:tab===t.id?`2px solid ${T.accent}`:'2px solid transparent', marginBottom:-1 }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
          {loading && <div style={{ textAlign:'center', padding:'60px 0', color:T.muted }}>Loading report…</div>}
          {error   && <div style={{ textAlign:'center', padding:'60px 0', color:T.red }}>{error}</div>}

          {!loading && !error && data && (
            <>
              {/* ── OVERVIEW TAB ── */}
              {tab === 'overview' && (
                <div>
                  {/* Score gauges — no pass mark shown */}
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:14, marginBottom:18 }}>
                    <ScoreGauge score={data.test_score||0}     max={data.total_marks||100} label="Test Score"  color={testPct>=70?T.green:testPct>=40?T.orange:T.red} />
                    {data.github_score   != null && <ScoreGauge score={data.github_score}   max={100} label="GitHub"     color={T.green}  />}
                    {data.leetcode_score != null && <ScoreGauge score={data.leetcode_score} max={100} label="LeetCode"   color={T.orange} />}
                    {data.viva_score     != null && <ScoreGauge score={data.viva_score}     max={100} label="Viva"       color={T.purple} />}
                  </div>

                  {/* Section breakdown — no pass mark */}
                  {data.breakdown && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:12, fontFamily:'monospace' }}>SECTION-WISE SCORES</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:10 }}>
                        {data.breakdown.mcq && (
                          <div style={{ textAlign:'center', padding:'10px', background:T.blueBg, borderRadius:9 }}>
                            <div style={{ fontSize:18, fontWeight:800, color:T.blue }}>{data.breakdown.mcq.score}<span style={{ fontSize:11, color:T.dim }}>/{data.breakdown.mcq.max||20}</span></div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>MCQ</div>
                            {data.breakdown.mcq.correct != null && (
                              <div style={{ fontSize:9, color:T.muted, marginTop:4 }}>✓{data.breakdown.mcq.correct} ✕{data.breakdown.mcq.wrong} —{data.breakdown.mcq.skipped||0}</div>
                            )}
                          </div>
                        )}
                        {data.breakdown.sql && (
                          <div style={{ textAlign:'center', padding:'10px', background:T.purpleBg, borderRadius:9 }}>
                            <div style={{ fontSize:18, fontWeight:800, color:T.purple }}>{data.breakdown.sql.score}<span style={{ fontSize:11, color:T.dim }}>/{data.breakdown.sql.max||10}</span></div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>SQL</div>
                          </div>
                        )}
                        {data.breakdown.coding && (
                          <div style={{ textAlign:'center', padding:'10px', background:T.orangeBg, borderRadius:9 }}>
                            <div style={{ fontSize:18, fontWeight:800, color:T.orange }}>{data.breakdown.coding.score}<span style={{ fontSize:11, color:T.dim }}>/{data.breakdown.coding.max||60}</span></div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>CODING</div>
                            {data.breakdown.coding.testCasesPassed != null && (
                              <div style={{ fontSize:9, color:T.muted, marginTop:4 }}>{data.breakdown.coding.testCasesPassed}/{data.breakdown.coding.testCases} test cases</div>
                            )}
                          </div>
                        )}
                        {data.breakdown.theory && (
                          <div style={{ textAlign:'center', padding:'10px', background:T.tealBg, borderRadius:9 }}>
                            <div style={{ fontSize:18, fontWeight:800, color:T.teal }}>{data.breakdown.theory.score}<span style={{ fontSize:11, color:T.dim }}>/{data.breakdown.theory.max||30}</span></div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>THEORY</div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* AI Integrity */}
                  {data.ai_detection_score != null && (
                    <div style={{ background: data.ai_detection_score>30?T.redBg:T.greenBg, border:`1px solid ${data.ai_detection_score>30?'#fecaca':T.greenBdr}`, borderRadius:10, padding:'12px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:data.ai_detection_score>30?T.red:T.green, marginBottom:4 }}>AI INTEGRITY CHECK</div>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ fontSize:26, fontWeight:800, color:data.ai_detection_score>30?T.red:T.green }}>{data.ai_detection_score}%</div>
                        <div style={{ fontSize:12, color:data.ai_detection_score>30?'#7f1d1d':'#166534' }}>
                          {data.ai_detection_score>50 ? 'High AI-assisted content probability — review recommended' :
                           data.ai_detection_score>30 ? 'Moderate AI indicators detected' :
                           'Response appears authentic and human-generated'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── SCORES TAB ── */}
              {tab === 'scores' && (
                <div>
                  {/* Score comparison bar chart */}
                  <BarChart data={scoreChartData} title="Score Comparison (out of 100)" />

                  {/* MCQ breakdown */}
                  {data.breakdown?.mcq && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>MCQ BREAKDOWN</div>
                      <div style={{ display:'flex', gap:10 }}>
                        {[
                          { label:'Correct', val:data.breakdown.mcq.correct??0, color:T.green, bg:T.greenBg },
                          { label:'Wrong',   val:data.breakdown.mcq.wrong??0,   color:T.red,   bg:T.redBg   },
                          { label:'Skipped', val:data.breakdown.mcq.skipped??0, color:T.muted, bg:'#f1f5f9'  },
                          { label:'Score',   val:`${data.breakdown.mcq.score}/${data.breakdown.mcq.max||20}`, color:T.blue, bg:T.blueBg },
                        ].map(s=>(
                          <div key={s.label} style={{ flex:1, textAlign:'center', padding:'10px', background:s.bg, borderRadius:9 }}>
                            <div style={{ fontSize:20, fontWeight:800, color:s.color }}>{s.val}</div>
                            <div style={{ fontSize:9, color:T.dim, fontFamily:'monospace', marginTop:2 }}>{s.label.toUpperCase()}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* SQL breakdown */}
                  {data.breakdown?.sql && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>SQL BREAKDOWN</div>
                      <div style={{ display:'flex', gap:10 }}>
                        <div style={{ flex:1, textAlign:'center', padding:'10px', background:T.purpleBg, borderRadius:9 }}>
                          <div style={{ fontSize:22, fontWeight:800, color:T.purple }}>{data.breakdown.sql.score}<span style={{ fontSize:12, color:T.dim }}>/{data.breakdown.sql.max||10}</span></div>
                          <div style={{ fontSize:9, color:T.dim }}>SQL SCORE</div>
                        </div>
                        <div style={{ flex:2, padding:'10px', background:'#f8fafc', borderRadius:9 }}>
                          {data.breakdown.sql_breakdown?.map((q,i)=>(
                            <div key={i} style={{ marginBottom:6, fontSize:12 }}>
                              <div style={{ fontWeight:600, color:T.text, marginBottom:2 }}>Q{i+1}: {q.score}/{q.max} marks</div>
                              {q.studentAnswer&&<div style={{ fontSize:11, color:T.muted, fontFamily:'monospace', background:'#f1f5f9', padding:'3px 7px', borderRadius:4, marginTop:2 }}>{q.studentAnswer.slice(0,80)}{q.studentAnswer.length>80?'…':''}</div>}
                            </div>
                          ))}
                          {!data.breakdown.sql_breakdown?.length && <div style={{ fontSize:12, color:T.muted }}>SQL queries submitted and graded</div>}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Coding breakdown */}
                  {data.breakdown?.coding && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>CODING BREAKDOWN</div>
                      <div style={{ display:'flex', gap:10 }}>
                        <div style={{ flex:1, textAlign:'center', padding:'10px', background:T.orangeBg, borderRadius:9 }}>
                          <div style={{ fontSize:22, fontWeight:800, color:T.orange }}>{data.breakdown.coding.score}<span style={{ fontSize:12, color:T.dim }}>/{data.breakdown.coding.max||60}</span></div>
                          <div style={{ fontSize:9, color:T.dim }}>CODING SCORE</div>
                          {data.breakdown.coding.testCasesPassed!=null&&(
                            <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>{data.breakdown.coding.testCasesPassed}/{data.breakdown.coding.testCases} test cases passed</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── AI INSIGHTS TAB ── */}
              {tab === 'insights' && (
                <div>
                  {/* Skills radar chart */}
                  {data.skills?.length > 0 && (
                    <RadarChart skills={data.skills} title="Skill Proficiency Analysis" />
                  )}

                  {/* Score comparison bar chart */}
                  {scoreChartData.length > 0 && (
                    <BarChart data={scoreChartData} title="Multi-Dimensional Score Comparison (out of 100)" />
                  )}

                  {/* Skills bar chart */}
                  {data.skills?.length > 0 && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:12, fontFamily:'monospace' }}>SKILL STRENGTH BREAKDOWN</div>
                      {data.skills.map(s => (
                        <div key={s.name} style={{ marginBottom:9 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                            <span style={{ fontSize:12, fontWeight:600, color:T.text }}>{s.name}</span>
                            <span style={{ fontSize:12, fontWeight:700, color:s.level>=80?T.green:s.level>=60?T.orange:T.red }}>{s.level}%</span>
                          </div>
                          <div style={{ height:8, background:'#e2e8f0', borderRadius:4, overflow:'hidden' }}>
                            <div style={{ height:'100%', borderRadius:4, background:s.level>=80?T.green:s.level>=60?T.orange:T.red, width:`${s.level}%`, transition:'width .5s' }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AI Insights text */}
                  {data.insights && (
                    <div style={{ background:T.purpleBg, border:'1px solid #ddd6fe', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.purple, marginBottom:8, fontFamily:'monospace' }}>AI CANDIDATE EVALUATION</div>
                      <div style={{ fontSize:13, color:'#3b1f72', lineHeight:1.8 }}>{data.insights}</div>
                    </div>
                  )}

                  {/* Recommendation */}
                  {data.test_score != null && (
                    <div style={{ background: data.test_score>=70?T.greenBg:data.test_score>=50?T.orangeBg:T.redBg, border:`1px solid ${data.test_score>=70?T.greenBdr:data.test_score>=50?'#fed7aa':'#fecaca'}`, borderRadius:12, padding:'14px 16px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:data.test_score>=70?T.green:data.test_score>=50?T.orange:T.red, marginBottom:6, fontFamily:'monospace' }}>HIRING RECOMMENDATION</div>
                      <div style={{ fontSize:13, fontWeight:600, color:T.text }}>
                        {data.test_score>=70 ? '✅ Strongly Recommended — Proceed to final interview round' :
                         data.test_score>=50 ? '⚠ Conditionally Recommended — Additional technical round advised' :
                         '❌ Not Recommended — Score below minimum threshold'}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── VIVA TAB ── */}
              {tab === 'viva' && (
                <div>
                  {data.viva?.length > 0 ? (
                    <>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
                        <div style={{ textAlign:'center', padding:'12px', background:T.purpleBg, borderRadius:10 }}>
                          <div style={{ fontSize:22, fontWeight:800, color:T.purple }}>{data.viva.reduce((s,v)=>s+v.score,0)}<span style={{ fontSize:12, color:T.dim }}>/{data.viva.reduce((s,v)=>s+v.max,0)}</span></div>
                          <div style={{ fontSize:9, color:T.dim }}>VIVA TOTAL</div>
                        </div>
                        {data.viva_score != null && (
                          <div style={{ textAlign:'center', padding:'12px', background:T.blueBg, borderRadius:10 }}>
                            <div style={{ fontSize:22, fontWeight:800, color:T.blue }}>{data.viva_score}/100</div>
                            <div style={{ fontSize:9, color:T.dim }}>VIVA SCORE</div>
                          </div>
                        )}
                        {data.ai_detection_score != null && (
                          <div style={{ textAlign:'center', padding:'12px', background:data.ai_detection_score>30?T.redBg:T.greenBg, borderRadius:10 }}>
                            <div style={{ fontSize:22, fontWeight:800, color:data.ai_detection_score>30?T.red:T.green }}>{data.ai_detection_score}%</div>
                            <div style={{ fontSize:9, color:T.dim }}>AI DETECT</div>
                          </div>
                        )}
                      </div>
                      {data.viva.map((v, i) => (
                        <div key={i} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:10, padding:'12px 14px', marginBottom:10 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                            <span style={{ fontSize:10, fontFamily:'monospace', color:T.dim }}>Q{i+1}</span>
                            <span style={{ fontSize:13, fontWeight:800, color:v.score/v.max>=0.8?T.green:v.score/v.max>=0.6?T.orange:T.red }}>{v.score}/{v.max}</span>
                          </div>
                          <div style={{ fontSize:13, fontWeight:600, color:T.text, marginBottom:6 }}>{v.q}</div>
                          <div style={{ fontSize:12, color:T.muted, lineHeight:1.7, background:'#f8fafc', borderRadius:7, padding:'8px 10px', marginBottom:6 }}>{v.a}</div>
                          {v.feedback && <div style={{ fontSize:11, color:T.blue, background:T.blueBg, borderRadius:6, padding:'5px 9px' }}>💡 {v.feedback}</div>}
                        </div>
                      ))}
                    </>
                  ) : (
                    <div style={{ textAlign:'center', padding:'48px 0', color:T.muted }}>
                      <div style={{ fontSize:32, marginBottom:12 }}>🎙️</div>
                      <div>No viva data recorded for this candidate</div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}