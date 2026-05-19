import React, { useState, useEffect, useRef } from 'react';

const API = ((typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_URL) || process.env.REACT_APP_API_URL || 'https://neuroassess-bzbfg9dfg7dyfggv.centralindia-01.azurewebsites.net/api') + '/api';
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
};

// ── Score Gauge ────────────────────────────────────────────────
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

// ── Skills Pie Chart ───────────────────────────────────────────
function SkillsPie({ skills }) {
  if (!skills || skills.length === 0) return null;
  const total  = skills.reduce((s, sk) => s + sk.value, 0);
  const colors = ['#2563eb','#7c3aed','#0891b2','#16a34a','#ea580c','#dc2626','#f59e0b','#8b5cf6'];
  let cumAngle = 0;
  const size   = 160;
  const cx     = size / 2;
  const cy     = size / 2;
  const r      = 62;

  const slices = skills.map((sk, i) => {
    const pct   = sk.value / total;
    const start = cumAngle;
    cumAngle   += pct * 2 * Math.PI;
    const end   = cumAngle;
    const x1    = cx + r * Math.sin(start);
    const y1    = cy - r * Math.cos(start);
    const x2    = cx + r * Math.sin(end);
    const y2    = cy - r * Math.cos(end);
    const large = pct > 0.5 ? 1 : 0;
    return { ...sk, path: `M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large} 1 ${x2},${y2} Z`, color: colors[i % colors.length] };
  });

  return (
    <div style={{ display:'flex', alignItems:'center', gap:24 }}>
      <svg width={size} height={size} style={{ flexShrink:0 }}>
        {slices.map((s, i) => <path key={i} d={s.path} fill={s.color} stroke={T.white} strokeWidth="2" />)}
        <circle cx={cx} cy={cy} r={32} fill={T.white} />
        <text x={cx} y={cy+4} textAnchor="middle" fontSize="11" fontWeight="700" fill={T.navy}>Skills</text>
      </svg>
      <div style={{ display:'flex', flexDirection:'column', gap:6, flex:1 }}>
        {slices.map((s, i) => (
          <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:10, height:10, borderRadius:3, background:s.color, flexShrink:0 }} />
            <span style={{ fontSize:11, color:T.text, fontWeight:600, flex:1 }}>{s.label}</span>
            <span style={{ fontSize:11, color:T.muted }}>{Math.round(s.value / total * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Mini Bar Chart ─────────────────────────────────────────────
function BarChart({ data, title }) {
  const max    = Math.max(...data.map(d => d.value), 1);
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

// ── Main Component ─────────────────────────────────────────────
export default function HiringReportModal({ studentId, studentName, onClose }) {
  const [loading, setLoading] = useState(true);
  const [raw,     setRaw]     = useState(null);
  const [tab,     setTab]     = useState('overview');
  const [error,   setError]   = useState(null);

  useEffect(() => {
    if (!studentId) return;
    setLoading(true); setError(null); setRaw(null);
    fetch(`${API}/hiring-report/student/${studentId}`, {
      headers: { Authorization: `Bearer ${getToken()}` },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(d => { setRaw(d); setLoading(false); })
      .catch(e => { setError('Failed to load report: ' + e.message); setLoading(false); });
  }, [studentId]);

  if (!studentId) return null;

  // ── Normalise API response ───────────────────────────────────
  const data = raw ? (() => {
    const ts   = raw.test_scores  || {};
    const gh   = raw.github_data  || {};
    const lc   = raw.leetcode_data|| {};
    const cand = raw.candidate    || {};
    const viva = raw.viva         || null;   // ← correct key from API

    const testScore  = ts.total ?? 0;
    const totalMarks = ts.max   ?? 100;
    const ghScore    = gh.coding_skill_score    ?? null;
    const lcScore    = lc.problem_solving_score ?? null;

    // ── LeetCode breakdown ──────────────────────────────────
    const lcEasy   = lc.easy   ?? 0;
    const lcMedium = lc.medium ?? 0;
    const lcHard   = lc.hard   ?? 0;
    const lcTotal  = lc.total_solved ?? (lcEasy + lcMedium + lcHard) ?? 0;
    const lcLangs  = lc.languages_used || lc.top_languages || [];   // array of {lang, count} or strings

    // ── GitHub details ──────────────────────────────────────
    const ghRepos   = gh.total_repos    ?? gh.public_repos   ?? null;
    const ghCommits = gh.total_commits  ?? gh.commit_count   ?? null;
    const ghStars   = gh.total_stars    ?? gh.starred        ?? null;
    const ghLangs   = gh.top_languages  || gh.languages_used || [];  // [{lang,count}] or strings
    const ghStreak  = gh.current_streak ?? gh.longest_streak ?? null;

    // ── Viva Q&A from raw.viva.answers ─────────────────────
    const vivaAnswers = viva?.answers || [];
    const vivaList = vivaAnswers.map(v => ({
      q:           v.question,
      a:           v.student_answer,
      score:       v.score      ?? 0,
      maxScore:    10,
      feedback:    v.feedback,
      strengths:   v.strengths,
      improvements:v.improvements,
      verdict:     v.verdict,
      type:        v.question_type,
      authScore:   v.authenticity_score,
      plagRisk:    v.plagiarism_risk,
      techAcc:     v.technical_accuracy,
      relevance:   v.relevance,
      completeness:v.completeness,
    }));

    // ── Skills for pie chart ────────────────────────────────
    const skillsRaw = gh.skill_breakdown || gh.skills || [];
    let skills = [];
    if (skillsRaw.length > 0) {
      skills = skillsRaw.slice(0, 6).map(s =>
        typeof s === 'string' ? { label: s, value: 1 } : { label: s.lang || s.skill || s.name, value: s.count || s.value || 1 }
      );
    } else if (ghLangs.length > 0) {
      skills = ghLangs.slice(0, 6).map(s =>
        typeof s === 'string' ? { label: s, value: 1 } : { label: s.lang || s.name || s, value: s.count || s.value || 1 }
      );
    } else if (lcLangs.length > 0) {
      skills = lcLangs.slice(0, 6).map(s =>
        typeof s === 'string' ? { label: s, value: 1 } : { label: s.lang || s.name || s, value: s.count || s.value || 1 }
      );
    } else {
      // fallback: infer from section scores
      if (ts.mcq    > 0) skills.push({ label:'MCQ / Theory',  value: ts.mcq    });
      if (ts.sql    > 0) skills.push({ label:'SQL / Database', value: ts.sql    });
      if (ts.coding > 0) skills.push({ label:'Coding / DSA',  value: ts.coding });
      if (viva?.overall_score > 0) skills.push({ label:'Communication', value: viva.overall_score });
    }

    return {
      name:           cand.name    || studentName || 'Student',
      email:          cand.email   || '',
      college:        cand.college || '',
      test_score:     testScore,
      total_marks:    totalMarks,
      github_score:   ghScore,
      leetcode_score: lcScore,
      viva_score:     viva?.overall_score      ?? null,
      auth_score:     viva?.auth_score         ?? null,
      final_verdict:  viva?.final_verdict      ?? null,
      ai_detect:      viva?.ai_detection_score ?? null,
      breakdown: {
        mcq:    { score: ts.mcq    ?? 0, max: 20 },
        sql:    { score: ts.sql    ?? 0, max: 30 },
        coding: { score: ts.coding ?? 0, max: 50 },
      },
      lc: { total: lcTotal, easy: lcEasy, medium: lcMedium, hard: lcHard, score: lcScore, langs: lcLangs },
      gh: { score: ghScore, repos: ghRepos, commits: ghCommits, stars: ghStars, langs: ghLangs, streak: ghStreak },
      skills,
      insights: raw.insights?.map(i => i.message).join(' · ') || 'No detailed insights available.',
      viva:     vivaList,
      vivaResult: viva,
    };
  })() : null;

  const TABS = [
    { id:'overview', label:'Overview'    },
    { id:'scores',   label:'Test Score'  },
    { id:'insights', label:'AI Insights' },
    { id:'viva',     label:'Viva'        },
  ];

  const name      = data?.name || studentName || 'Student';
  const testScore = data?.test_score  ?? 0;
  const totalMark = data?.total_marks ?? 100;
  const testPct   = totalMark > 0 ? Math.round(testScore / totalMark * 100) : 0;

  const scoreChartData = data ? [
    { label:'Test',     value: testScore },
    ...(data.github_score   != null ? [{ label:'GitHub',   value: data.github_score   }] : []),
    ...(data.leetcode_score != null ? [{ label:'LeetCode', value: data.leetcode_score }] : []),
    ...(data.viva_score     != null ? [{ label:'Viva',     value: data.viva_score     }] : []),
  ] : [];

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:3000, padding:16 }} onClick={onClose}>
      <div style={{ background:T.pageBg, borderRadius:16, width:'100%', maxWidth:860, maxHeight:'92vh', overflow:'hidden', display:'flex', flexDirection:'column', boxShadow:'0 24px 80px rgba(0,0,0,.22)' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'14px 20px', background:T.white, borderBottom:`1px solid ${T.border}`, display:'flex', alignItems:'center', gap:13, flexShrink:0 }}>
          <div style={{ width:42, height:42, borderRadius:'50%', background:T.accentSoft, border:`2px solid ${T.accent}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:800, color:T.accent }}>{name[0]?.toUpperCase()}</div>
          <div style={{ flex:1 }}>
            <div style={{ fontSize:15, fontWeight:800, color:T.navy }}>{name}</div>
            <div style={{ fontSize:11, color:T.dim }}>{data?.email || ''}{data?.college ? ` · ${data.college}` : ''}</div>
          </div>
          {data && !loading && (
            <div style={{ display:'flex', gap:8, alignItems:'center' }}>
              <div style={{ textAlign:'center', padding:'6px 12px', background:T.blueBg, borderRadius:8, border:'1px solid #bfdbfe' }}>
                <div style={{ fontSize:18, fontWeight:800, color:T.blue }}>{testScore}<span style={{ fontSize:11, color:T.dim }}>/{totalMark}</span></div>
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
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{ background:'none', border:'none', cursor:'pointer', padding:'10px 18px', fontSize:12, fontWeight:tab===t.id?700:500, color:tab===t.id?T.accent:T.muted, borderBottom:tab===t.id?`2px solid ${T.accent}`:'2px solid transparent', marginBottom:-1 }}>{t.label}</button>
          ))}
        </div>

        {/* Body */}
        <div style={{ flex:1, overflowY:'auto', padding:'18px 20px' }}>
          {loading && <div style={{ textAlign:'center', padding:'60px 0', color:T.muted }}>Loading report...</div>}
          {error   && <div style={{ textAlign:'center', padding:'60px 0', color:T.red }}>{error}</div>}

          {!loading && !error && data && (
            <>
              {/* ── OVERVIEW TAB ── */}
              {tab === 'overview' && (
                <div>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(100px,1fr))', gap:14, marginBottom:18 }}>
                    <ScoreGauge score={testScore} max={totalMark} label="Test Score" color={testPct>=70?T.green:testPct>=40?T.orange:T.red} />
                    {data.github_score   != null && <ScoreGauge score={data.github_score}   max={100} label="GitHub"   color={T.green}  />}
                    {data.leetcode_score != null && <ScoreGauge score={data.leetcode_score} max={100} label="LeetCode" color={T.orange} />}
                    {data.viva_score     != null && <ScoreGauge score={data.viva_score}     max={100} label="Viva"     color={T.purple} />}
                  </div>

                  {/* Section breakdown */}
                  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:12, fontFamily:'monospace' }}>SECTION-WISE SCORES</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                      {[
                        { label:'MCQ',    s: data.breakdown.mcq,    color:T.blue,   bg:T.blueBg   },
                        { label:'SQL',    s: data.breakdown.sql,    color:T.purple, bg:T.purpleBg },
                        { label:'CODING', s: data.breakdown.coding, color:T.orange, bg:T.orangeBg },
                      ].map(({ label, s, color, bg }) => (
                        <div key={label} style={{ textAlign:'center', padding:'10px', background:bg, borderRadius:9 }}>
                          <div style={{ fontSize:18, fontWeight:800, color }}>{s.score}<span style={{ fontSize:11, color:T.dim }}>/{s.max}</span></div>
                          <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>{label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LeetCode quick stats */}
                  {(data.lc.total > 0 || data.lc.easy > 0 || data.lc.medium > 0 || data.lc.hard > 0) && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>LEETCODE PROBLEMS SOLVED</div>
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8 }}>
                        {[
                          { label:'Total',  val: data.lc.total,  color:'#1e293b', bg:'#f1f5f9' },
                          { label:'Easy',   val: data.lc.easy,   color:T.green,   bg:T.greenBg },
                          { label:'Medium', val: data.lc.medium, color:T.orange,  bg:T.orangeBg },
                          { label:'Hard',   val: data.lc.hard,   color:T.red,     bg:T.redBg },
                        ].map(({ label, val, color, bg }) => (
                          <div key={label} style={{ textAlign:'center', padding:'10px 6px', background:bg, borderRadius:9 }}>
                            <div style={{ fontSize:20, fontWeight:800, color }}>{val}</div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>{label}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* GitHub quick stats */}
                  {(data.gh.repos != null || data.gh.commits != null) && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>GITHUB ACTIVITY</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        {data.gh.repos   != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:'#f0fdf4', borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:T.green }}>{data.gh.repos}</div><div style={{ fontSize:9, color:T.dim }}>REPOS</div></div>}
                        {data.gh.commits != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:T.blueBg,   borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:T.blue }}>{data.gh.commits}</div><div style={{ fontSize:9, color:T.dim }}>COMMITS</div></div>}
                        {data.gh.stars   != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:'#fefce8',   borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:'#ca8a04' }}>{data.gh.stars}</div><div style={{ fontSize:9, color:T.dim }}>STARS</div></div>}
                        {data.gh.streak  != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:T.purpleBg,  borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:T.purple }}>{data.gh.streak}</div><div style={{ fontSize:9, color:T.dim }}>STREAK</div></div>}
                      </div>
                    </div>
                  )}

                  {/* AI Integrity */}
                  {data.ai_detect != null && (
                    <div style={{ background:data.ai_detect>30?T.redBg:T.greenBg, border:`1px solid ${data.ai_detect>30?'#fecaca':T.greenBdr}`, borderRadius:10, padding:'12px 16px' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:data.ai_detect>30?T.red:T.green, marginBottom:4 }}>AI INTEGRITY CHECK</div>
                      <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <div style={{ fontSize:26, fontWeight:800, color:data.ai_detect>30?T.red:T.green }}>{data.ai_detect}%</div>
                        <div style={{ fontSize:12, color:data.ai_detect>30?'#7f1d1d':'#166534' }}>
                          {data.ai_detect>50 ? 'High AI-assisted content probability — review recommended' :
                           data.ai_detect>30 ? 'Moderate AI indicators detected' :
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
                  <BarChart data={scoreChartData} title="Score Comparison (out of 100)" />

                  {/* MCQ */}
                  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>MCQ SCORE</div>
                    <div style={{ textAlign:'center', padding:'12px', background:T.blueBg, borderRadius:9 }}>
                      <div style={{ fontSize:28, fontWeight:800, color:T.blue }}>{data.breakdown.mcq.score}<span style={{ fontSize:14, color:T.dim }}>/{data.breakdown.mcq.max}</span></div>
                      <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>Multiple Choice Questions</div>
                    </div>
                  </div>

                  {/* SQL */}
                  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>SQL SCORE</div>
                    <div style={{ textAlign:'center', padding:'12px', background:T.purpleBg, borderRadius:9 }}>
                      <div style={{ fontSize:28, fontWeight:800, color:T.purple }}>{data.breakdown.sql.score}<span style={{ fontSize:14, color:T.dim }}>/{data.breakdown.sql.max}</span></div>
                      <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>SQL & Database Queries</div>
                    </div>
                  </div>

                  {/* Coding */}
                  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>CODING SCORE</div>
                    <div style={{ textAlign:'center', padding:'12px', background:T.orangeBg, borderRadius:9 }}>
                      <div style={{ fontSize:28, fontWeight:800, color:T.orange }}>{data.breakdown.coding.score}<span style={{ fontSize:14, color:T.dim }}>/{data.breakdown.coding.max}</span></div>
                      <div style={{ fontSize:10, color:T.muted, marginTop:4 }}>Coding / DSA Challenges</div>
                    </div>
                  </div>

                  {/* LeetCode full breakdown */}
                  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>LEETCODE BREAKDOWN</div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:8, marginBottom: data.lc.langs.length ? 12 : 0 }}>
                      {[
                        { label:'Total Solved', val: data.lc.total,  color:'#1e293b', bg:'#f1f5f9' },
                        { label:'Easy',         val: data.lc.easy,   color:T.green,   bg:T.greenBg },
                        { label:'Medium',       val: data.lc.medium, color:T.orange,  bg:T.orangeBg },
                        { label:'Hard',         val: data.lc.hard,   color:T.red,     bg:T.redBg },
                      ].map(({ label, val, color, bg }) => (
                        <div key={label} style={{ textAlign:'center', padding:'10px 4px', background:bg, borderRadius:9 }}>
                          <div style={{ fontSize:22, fontWeight:800, color }}>{val}</div>
                          <div style={{ fontSize:8.5, color:T.dim, marginTop:2 }}>{label.toUpperCase()}</div>
                        </div>
                      ))}
                    </div>
                    {data.lc.langs.length > 0 && (
                      <>
                        <div style={{ fontSize:10, fontWeight:700, color:T.muted, marginBottom:8, fontFamily:'monospace' }}>MOST USED LANGUAGES</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {data.lc.langs.slice(0,6).map((l, i) => {
                            const tag = typeof l === 'string' ? l : (l.lang || l.name || l);
                            const cnt = typeof l === 'object' ? (l.count || l.value || '') : '';
                            return (
                              <span key={i} style={{ padding:'4px 10px', background:T.accentSoft, borderRadius:20, fontSize:11, fontWeight:600, color:T.accent }}>
                                {tag}{cnt ? ` · ${cnt}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>

                  {/* GitHub full breakdown */}
                  <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:10, fontFamily:'monospace' }}>GITHUB BREAKDOWN</div>
                    <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom: data.gh.langs.length ? 12 : 0 }}>
                      {data.gh.repos   != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:T.greenBg,  borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:T.green }}>{data.gh.repos}</div><div style={{ fontSize:9, color:T.dim }}>REPOSITORIES</div></div>}
                      {data.gh.commits != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:T.blueBg,   borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:T.blue }}>{data.gh.commits}</div><div style={{ fontSize:9, color:T.dim }}>COMMITS</div></div>}
                      {data.gh.stars   != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:'#fefce8',   borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:'#ca8a04' }}>{data.gh.stars}</div><div style={{ fontSize:9, color:T.dim }}>STARS</div></div>}
                      {data.gh.streak  != null && <div style={{ flex:1, minWidth:70, textAlign:'center', padding:'10px', background:T.purpleBg,  borderRadius:9 }}><div style={{ fontSize:20, fontWeight:800, color:T.purple }}>{data.gh.streak}</div><div style={{ fontSize:9, color:T.dim }}>DAY STREAK</div></div>}
                    </div>
                    {data.gh.langs.length > 0 && (
                      <>
                        <div style={{ fontSize:10, fontWeight:700, color:T.muted, marginBottom:8, fontFamily:'monospace' }}>TOP LANGUAGES</div>
                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                          {data.gh.langs.slice(0,6).map((l, i) => {
                            const tag = typeof l === 'string' ? l : (l.lang || l.name || l);
                            const cnt = typeof l === 'object' ? (l.count || l.value || '') : '';
                            return (
                              <span key={i} style={{ padding:'4px 10px', background:T.greenBg, border:`1px solid ${T.greenBdr}`, borderRadius:20, fontSize:11, fontWeight:600, color:T.green }}>
                                {tag}{cnt ? ` · ${cnt}` : ''}
                              </span>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {/* ── AI INSIGHTS TAB ── */}
              {tab === 'insights' && (
                <div>
                  {scoreChartData.length > 0 && (
                    <BarChart data={scoreChartData} title="Multi-Dimensional Score Comparison (out of 100)" />
                  )}

                  {/* Skills Pie Chart */}
                  {data.skills.length > 0 && (
                    <div style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 18px', marginBottom:14 }}>
                      <div style={{ fontSize:11, fontWeight:700, color:T.muted, marginBottom:14, fontFamily:'monospace' }}>SKILL DISTRIBUTION</div>
                      <SkillsPie skills={data.skills} />
                    </div>
                  )}

                  <div style={{ background:T.purpleBg, border:'1px solid #ddd6fe', borderRadius:12, padding:'14px 16px', marginBottom:14 }}>
                    <div style={{ fontSize:11, fontWeight:700, color:T.purple, marginBottom:8, fontFamily:'monospace' }}>AI CANDIDATE EVALUATION</div>
                    <div style={{ fontSize:13, color:'#3b1f72', lineHeight:1.8 }}>{data.insights}</div>
                  </div>

                  <div style={{ background:testScore>=70?T.greenBg:testScore>=50?T.orangeBg:T.redBg, border:`1px solid ${testScore>=70?T.greenBdr:testScore>=50?'#fed7aa':'#fecaca'}`, borderRadius:12, padding:'14px 16px' }}>
                    <div style={{ fontSize:11, fontWeight:700, color:testScore>=70?T.green:testScore>=50?T.orange:T.red, marginBottom:6, fontFamily:'monospace' }}>HIRING RECOMMENDATION</div>
                    <div style={{ fontSize:13, fontWeight:600, color:T.text }}>
                      {testScore>=70 ? '✅ Strongly Recommended — Proceed to final interview round' :
                       testScore>=50 ? '⚠ Conditionally Recommended — Additional technical round advised' :
                       '❌ Not Recommended — Score below minimum threshold'}
                    </div>
                  </div>
                </div>
              )}

              {/* ── VIVA TAB ── */}
              {tab === 'viva' && (
                <div>
                  {data.viva.length > 0 ? (
                    <>
                      {/* Viva summary cards */}
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:10, marginBottom:16 }}>
                        {data.viva_score != null && (
                          <div style={{ textAlign:'center', padding:'12px', background:T.purpleBg, borderRadius:10 }}>
                            <div style={{ fontSize:22, fontWeight:800, color:T.purple }}>{data.viva_score}<span style={{ fontSize:12, color:T.dim }}>/100</span></div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>OVERALL SCORE</div>
                          </div>
                        )}
                        {data.auth_score != null && (
                          <div style={{ textAlign:'center', padding:'12px', background:T.tealBg, borderRadius:10 }}>
                            <div style={{ fontSize:22, fontWeight:800, color:T.teal }}>{data.auth_score}<span style={{ fontSize:12, color:T.dim }}>/100</span></div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>AUTH SCORE</div>
                          </div>
                        )}
                        {data.final_verdict && (
                          <div style={{ textAlign:'center', padding:'12px', background:data.final_verdict==='Authentic'?T.greenBg:T.redBg, borderRadius:10 }}>
                            <div style={{ fontSize:14, fontWeight:800, color:data.final_verdict==='Authentic'?T.green:T.red, marginTop:4 }}>{data.final_verdict}</div>
                            <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>VERDICT</div>
                          </div>
                        )}
                        <div style={{ textAlign:'center', padding:'12px', background:'#f1f5f9', borderRadius:10 }}>
                          <div style={{ fontSize:22, fontWeight:800, color:T.navy }}>{data.viva.length}</div>
                          <div style={{ fontSize:9, color:T.dim, marginTop:2 }}>QUESTIONS</div>
                        </div>
                      </div>

                      {/* Q&A Cards */}
                      {data.viva.map((v, i) => {
                        const pct = v.maxScore > 0 ? v.score / v.maxScore : 0;
                        const scoreColor = pct >= 0.8 ? T.green : pct >= 0.6 ? T.orange : T.red;
                        const scoreBg    = pct >= 0.8 ? T.greenBg : pct >= 0.6 ? T.orangeBg : T.redBg;
                        return (
                          <div key={i} style={{ background:T.white, border:`1px solid ${T.border}`, borderRadius:12, padding:'14px 16px', marginBottom:12 }}>
                            {/* Q header */}
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ background:T.accentSoft, color:T.accent, fontWeight:800, fontSize:11, padding:'2px 8px', borderRadius:6 }}>Q{i+1}</span>
                                {v.type && <span style={{ background:'#f1f5f9', color:T.muted, fontSize:10, padding:'2px 7px', borderRadius:5 }}>{v.type}</span>}
                              </div>
                              <div style={{ textAlign:'center', background:scoreBg, borderRadius:8, padding:'4px 12px' }}>
                                <span style={{ fontSize:15, fontWeight:800, color:scoreColor }}>{v.score}</span>
                                <span style={{ fontSize:10, color:T.dim }}>/{v.maxScore}</span>
                              </div>
                            </div>

                            {/* Question */}
                            <div style={{ fontSize:13, fontWeight:700, color:T.navy, marginBottom:10, lineHeight:1.5 }}>{v.q}</div>

                            {/* Answer */}
                            <div style={{ background:'#f8fafc', border:`1px solid ${T.border}`, borderRadius:8, padding:'10px 12px', marginBottom:10 }}>
                              <div style={{ fontSize:10, fontWeight:700, color:T.muted, marginBottom:5, fontFamily:'monospace' }}>STUDENT ANSWER</div>
                              <div style={{ fontSize:12.5, color:T.text, lineHeight:1.75 }}>{v.a}</div>
                            </div>

                            {/* Score details */}
                            {(v.techAcc != null || v.relevance != null || v.completeness != null) && (
                              <div style={{ display:'flex', gap:6, marginBottom:8, flexWrap:'wrap' }}>
                                {[
                                  { label:'Technical', val: v.techAcc,     color:'#0891b2' },
                                  { label:'Relevance', val: v.relevance,   color:'#7c3aed' },
                                  { label:'Complete',  val: v.completeness, color:'#16a34a' },
                                ].filter(s => s.val != null).map(s => (
                                  <div key={s.label} style={{ flex:1, minWidth:80, textAlign:'center', padding:'6px 4px', background:'#f8fafc', borderRadius:7, border:`1px solid ${T.border}` }}>
                                    <div style={{ fontSize:13, fontWeight:800, color:s.color }}>{s.val}</div>
                                    <div style={{ fontSize:8.5, color:T.dim }}>{s.label.toUpperCase()}</div>
                                  </div>
                                ))}
                              </div>
                            )}

                            {/* Feedback */}
                            {v.feedback && (
                              <div style={{ background:T.blueBg, border:'1px solid #bfdbfe', borderRadius:7, padding:'8px 10px', marginBottom:6 }}>
                                <div style={{ fontSize:10, fontWeight:700, color:T.blue, marginBottom:3 }}>💡 FEEDBACK</div>
                                <div style={{ fontSize:12, color:'#1e40af', lineHeight:1.6 }}>{v.feedback}</div>
                              </div>
                            )}

                            {/* Strengths / Improvements */}
                            <div style={{ display:'flex', gap:6 }}>
                              {v.strengths && (
                                <div style={{ flex:1, background:T.greenBg, border:`1px solid ${T.greenBdr}`, borderRadius:7, padding:'7px 10px' }}>
                                  <div style={{ fontSize:9.5, fontWeight:700, color:T.green, marginBottom:3 }}>✅ STRENGTHS</div>
                                  <div style={{ fontSize:11, color:'#166534', lineHeight:1.5 }}>{v.strengths}</div>
                                </div>
                              )}
                              {v.improvements && (
                                <div style={{ flex:1, background:T.orangeBg, border:'1px solid #fed7aa', borderRadius:7, padding:'7px 10px' }}>
                                  <div style={{ fontSize:9.5, fontWeight:700, color:T.orange, marginBottom:3 }}>⚠ IMPROVE</div>
                                  <div style={{ fontSize:11, color:'#7c2d12', lineHeight:1.5 }}>{v.improvements}</div>
                                </div>
                              )}
                            </div>

                            {/* Auth / plagiarism */}
                            {(v.verdict || v.plagRisk) && (
                              <div style={{ display:'flex', gap:6, marginTop:6 }}>
                                {v.verdict && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:v.verdict==='Authentic'?T.greenBg:T.redBg, color:v.verdict==='Authentic'?T.green:T.red, fontWeight:600 }}>{v.verdict}</span>}
                                {v.plagRisk && <span style={{ fontSize:10, padding:'2px 8px', borderRadius:5, background:'#f1f5f9', color:T.muted, fontWeight:600 }}>Plagiarism: {v.plagRisk}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
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

