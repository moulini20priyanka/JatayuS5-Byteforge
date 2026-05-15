// frontend/src/pages/AIDetectionDashboard.jsx
// ─────────────────────────────────────────────────────────────────────────────
// FULLY DYNAMIC — zero static/demo data
//  • Fetches only placement/hiring exams from GET /api/exams
//  • Click "View Students" → fetches real students from GET /api/ai-detection/:examId
//  • Click student → drawer fetches real viva answers from GET /api/viva-results?exam_id=
//  • Shows empty states when no data exists yet
//  • Navbar + Sidebar included
// ─────────────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';

const API = (() => {
  try { return import.meta.env?.VITE_API_URL || 'http://localhost:5000'; }
  catch { return 'http://localhost:5000'; }
})();

const getToken = () =>
  localStorage.getItem('admin_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') || '';

const authFetch = (url, opts = {}) =>
  fetch(url, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(opts.headers || {}),
    },
  });

// ─── Helpers ──────────────────────────────────────────────────────────────────
const verdictStyle = (v) => {
  if (!v)                          return { bg: '#f3f4f6', color: '#6b7280', border: '#d1d5db', icon: '—' };
  if (v === 'Likely AI-Generated') return { bg: '#fee2e2', color: '#dc2626', border: '#fca5a5', icon: '🤖' };
  if (v === 'Suspicious')          return { bg: '#fef3c7', color: '#b45309', border: '#fcd34d', icon: '⚠️' };
  return                                  { bg: '#d9f5ec', color: '#0a8f5c', border: '#6ee7b7', icon: '✅' };
};

const scoreColor  = (s) => (s ?? 0) >= 8 ? '#16a34a' : (s ?? 0) >= 5 ? '#d97706' : '#dc2626';
const riskColor   = (r) => r === 'High' ? '#dc2626' : r === 'Medium' ? '#d97706' : '#16a34a';
const riskBg      = (r) => r === 'High' ? '#fee2e2' : r === 'Medium' ? '#fef3c7' : '#d9f5ec';
const riskBorder  = (r) => r === 'High' ? '#fca5a5' : r === 'Medium' ? '#fcd34d' : '#6ee7b7';

const worstRisk = (answers = []) =>
  answers.reduce((m, a) => {
    const r = a.plagiarism_risk || a.plagiarismRisk || 'Low';
    return r === 'High' ? 'High' : r === 'Medium' && m !== 'High' ? 'Medium' : m;
  }, 'Low');

const avg = (arr) =>
  arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

const safeJSON = (val, fallback = []) => {
  if (Array.isArray(val)) return val;
  try { return JSON.parse(val) || fallback; } catch { return fallback; }
};

// detect placement exam type
const isPlacement = (exam) => {
  const t = (exam.exam_type || exam.type || '').toLowerCase();
  return t === 'placement' || t === 'hiring' || t === 'corporate' || t === 'recruitment' || t === 'general' || t === '';
};

// ─── Ring Chart ───────────────────────────────────────────────────────────────
function RingChart({ value, max = 10, color, size = 72, label }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const filled = Math.min((value ?? 0) / max, 1) * circ;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dasharray .5s ease' }} />
        <text x="50%" y="47%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontSize: 13, fontWeight: 800, fill: '#111827', fontFamily: 'monospace' }}>
          {value ?? '—'}
        </text>
        <text x="50%" y="67%" dominantBaseline="middle" textAnchor="middle"
          style={{ fontSize: 8, fill: '#9ca3af', fontFamily: 'monospace' }}>/{max}</text>
      </svg>
      <div style={{ fontSize: 9, fontWeight: 700, color: '#6b7280', fontFamily: 'monospace', textAlign: 'center' }}>
        {label}
      </div>
    </div>
  );
}

// ─── CSS ──────────────────────────────────────────────────────────────────────
const CSS = `
.aid-wrap { margin-left: 230px; display: flex; flex-direction: column; min-height: 100vh; background: #f0f7ff; }
.aid-inner { flex: 1; padding: 24px; overflow: auto; }

.aid-ph { margin-bottom: 20px; }
.aid-ph h1 { font-size: 22px; font-weight: 800; color: #1e3a8a; margin: 0 0 4px; }
.aid-ph p  { font-size: 13px; color: #60a5fa; margin: 0; }

/* stat strip */
.aid-stats { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 20px; }
.aid-stat  { background: #fff; border: 1px solid #dbeafe; border-radius: 12px; padding: 14px 16px; box-shadow: 0 1px 6px rgba(37,99,235,.04); }
.aid-stat-v { font-size: 26px; font-weight: 800; font-family: monospace; line-height: 1; margin-bottom: 4px; }
.aid-stat-l { font-size: 10px; font-weight: 700; letter-spacing: .8px; color: #6b7280; font-family: monospace; }
.aid-stat-d { font-size: 11px; color: #9ca3af; margin-top: 2px; }

/* search */
.aid-sr { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.aid-search { padding: 8px 14px; border: 1.5px solid #dbeafe; border-radius: 8px; font-size: 13px;
  outline: none; width: 280px; color: #1e3a8a; background: #fff; font-family: inherit; }
.aid-search:focus { border-color: #93c5fd; }
.aid-res { font-size: 11px; color: #6b7280; font-family: monospace; }

/* panel */
.aid-panel { background: #fff; border: 1px solid #dbeafe; border-radius: 12px; overflow: hidden;
  box-shadow: 0 2px 10px rgba(37,99,235,.05); margin-bottom: 24px; }

/* main table */
.aid-tbl { width: 100%; border-collapse: collapse; font-size: 13px; }
.aid-tbl thead { background: #f8faff; }
.aid-tbl th { padding: 10px 16px; text-align: left; font-size: 10px; font-weight: 700; color: #6b7280;
  letter-spacing: .8px; font-family: monospace; text-transform: uppercase;
  border-bottom: 1.5px solid #e5e7eb; white-space: nowrap; }
.aid-tbl td { padding: 14px 16px; vertical-align: middle; border-bottom: 1px solid #f3f4f6; }
.aid-tbl tbody tr.exam-row { transition: background .12s; cursor: pointer; }
.aid-tbl tbody tr.exam-row:hover { background: #f8faff; }
.aid-tbl tbody tr.exam-row.expanded { background: #eff6ff; }

/* type badge */
.tp { display: inline-block; padding: 3px 11px; border-radius: 6px; font-size: 11px;
  font-weight: 700; font-family: monospace; background: #eff6ff; color: #1d4ed8; }

/* status */
.aid-st { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700; font-family: monospace; }
.dot { width: 7px; height: 7px; border-radius: 50%; display: inline-block; flex-shrink: 0; }
.dot-a { background: #4ade80; animation: dpulse 2s ease infinite; }
.dot-s { background: #93c5fd; }
@keyframes dpulse { 0%,100%{opacity:1} 50%{opacity:.4} }

/* action btn */
.aid-btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 13px; border-radius: 7px;
  border: 1.5px solid #dbeafe; background: #fff; color: #2563eb; font-size: 11px; font-weight: 700;
  cursor: pointer; transition: all .14s; font-family: monospace; white-space: nowrap; }
.aid-btn:hover { background: #eff6ff; border-color: #93c5fd; }
.aid-btn.on { background: #1e3a8a; color: #fff; border-color: #1e3a8a; }

/* expanded row */
.exp-row td { padding: 0; background: #f0f7ff; border-bottom: 2px solid #bfdbfe; }
.exp-inner { padding: 16px 20px 20px; }

/* pill strip */
.pill-strip { display: flex; gap: 7px; flex-wrap: wrap; margin-bottom: 10px; }
.pill { font-size: 10px; padding: 3px 10px; border-radius: 20px; font-family: monospace; font-weight: 700; border: 1px solid; }

/* filter */
.fstrip { display: flex; gap: 5px; flex-wrap: wrap; margin-bottom: 12px; }

/* sub table */
.sub-tbl { width: 100%; border-collapse: collapse; font-size: 12px; background: #fff;
  border: 1px solid #dbeafe; border-radius: 10px; overflow: hidden; }
.sub-tbl thead { background: #f0f9ff; }
.sub-tbl th { padding: 8px 14px; text-align: left; font-size: 9px; font-weight: 700; color: #6b7280;
  letter-spacing: .8px; font-family: monospace; text-transform: uppercase; border-bottom: 1px solid #dbeafe; }
.sub-tbl td { padding: 11px 14px; vertical-align: middle; border-bottom: 1px solid #f0f7ff; }
.sub-tbl tbody tr { transition: background .12s; cursor: pointer; }
.sub-tbl tbody tr:hover { background: #f0f9ff; }
.sub-tbl tbody tr.sel { background: #eff6ff; }
.sub-tbl tbody tr:last-child td { border-bottom: none; }

/* bar */
.bar-w { display: flex; align-items: center; gap: 8px; }
.bar { height: 5px; border-radius: 99px; background: #e5e7eb; overflow: hidden; width: 55px; flex-shrink: 0; }
.bar-f { height: 100%; border-radius: 99px; transition: width .4s ease; }

/* badges */
.vd  { display: inline-flex; align-items: center; gap: 5px; padding: 3px 9px; border-radius: 20px;
  font-size: 9px; font-weight: 700; font-family: monospace; white-space: nowrap; }
.rk  { display: inline-block; padding: 2px 7px; border-radius: 10px; font-size: 9px; font-weight: 700; font-family: monospace; }

/* ── Drawer ── */
.aid-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.3); z-index: 400;
  display: flex; justify-content: flex-end; animation: ovfade .18s ease; }
@keyframes ovfade { from{opacity:0} to{opacity:1} }
.aid-drawer { width: min(680px,95vw); height: 100vh; background: #fff; overflow-y: auto;
  box-shadow: -8px 0 40px rgba(0,0,0,.13); animation: dslide .22s cubic-bezier(.22,1,.36,1); }
@keyframes dslide { from{transform:translateX(100%)} to{transform:translateX(0)} }
.drw-hd { padding: 18px 22px; border-bottom: 1px solid #e5e7eb; position: sticky; top: 0;
  background: #fff; z-index: 10; display: flex; align-items: flex-start; justify-content: space-between; }
.drw-close { width: 30px; height: 30px; border-radius: 7px; border: 1.5px solid #e5e7eb;
  background: transparent; cursor: pointer; font-size: 14px; color: #6b7280;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.drw-close:hover { background: #f3f4f6; }
.drw-body { padding: 18px 22px; }
.ring-row { display: flex; gap: 20px; justify-content: center; padding: 18px 16px;
  background: #f8faff; border-radius: 10px; border: 1px solid #dbeafe; margin-bottom: 16px; flex-wrap: wrap; }
.vd-card { border-radius: 10px; padding: 14px 16px; margin-bottom: 14px; border: 2px solid; }
.vd-title { font-size: 9px; font-weight: 700; letter-spacing: 1.2px; font-family: monospace; margin-bottom: 6px; }
.vd-val { font-size: 20px; font-weight: 800; margin-bottom: 4px; }
.vd-reason { font-size: 11px; line-height: 1.6; opacity: .85; }
.int-blk { background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 14px; }
.int-hd { font-size: 9px; font-weight: 700; letter-spacing: 1.2px; color: #6b7280; font-family: monospace; margin-bottom: 10px; }
.int-row { display: flex; align-items: center; justify-content: space-between;
  padding: 7px 0; border-bottom: 1px solid #f3f4f6; font-size: 12px; }
.int-row:last-child { border-bottom: none; }
.q-sec-lbl { font-size: 9px; font-weight: 700; letter-spacing: 1.2px; color: #6b7280; font-family: monospace; margin-bottom: 10px; }
.q-card { border: 1px solid #e5e7eb; border-radius: 10px; overflow: hidden; margin-bottom: 10px; }
.q-hd { padding: 10px 14px; display: flex; align-items: center; justify-content: space-between;
  background: #f8faff; border-bottom: 1px solid #e5e7eb; }
.q-num { font-size: 9px; font-weight: 700; color: #1e3a8a; font-family: monospace; }
.q-type { font-size: 8px; padding: 2px 8px; border-radius: 10px; font-weight: 700; font-family: monospace; }
.q-body { padding: 13px 14px; }
.q-txt { font-size: 12px; font-weight: 600; color: #374151; margin-bottom: 8px; line-height: 1.5; }
.q-ans { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 7px; padding: 10px 12px;
  font-size: 12px; color: #374151; line-height: 1.7; max-height: 120px; overflow-y: auto; margin-bottom: 10px; }
.q-scores { display: grid; grid-template-columns: repeat(4,1fr); gap: 7px; margin-bottom: 8px; }
.q-sc { background: #fff; border: 1px solid #e5e7eb; border-radius: 7px; padding: 7px 5px; text-align: center; }
.q-sv { font-size: 15px; font-weight: 700; font-family: monospace; line-height: 1; margin-bottom: 2px; }
.q-sl { font-size: 7px; font-weight: 700; letter-spacing: .8px; color: #9ca3af; font-family: monospace; }
.q-fb { font-size: 11px; color: #6b7280; line-height: 1.6; padding: 7px 9px;
  background: #fffbeb; border-radius: 6px; border-left: 3px solid #fcd34d; }
.voice-tag { font-size: 8px; padding: 2px 7px; border-radius: 10px; background: #f0fdfc;
  color: #0f766e; border: 1px solid #99f6e4; font-family: monospace; font-weight: 700; }

/* loading spinner */
.spin { width: 28px; height: 28px; border: 3px solid #dbeafe; border-top-color: #2563eb;
  border-radius: 50%; animation: spin .7s linear infinite; margin: 0 auto; }
@keyframes spin { to{transform:rotate(360deg)} }

/* empty state */
.aid-empty { text-align: center; padding: 48px 24px; color: #9ca3af; }
.aid-empty-icon { font-size: 36px; margin-bottom: 10px; }
.aid-empty-txt { font-size: 14px; font-weight: 600; color: #6b7280; margin-bottom: 4px; }
.aid-empty-sub { font-size: 12px; color: #9ca3af; }

/* error */
.aid-err { background: #fee2e2; border: 1px solid #fca5a5; border-radius: 8px;
  padding: 10px 14px; font-size: 12px; color: #dc2626; margin-bottom: 14px; }
`;

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function AIDetectionDashboard() {
  const [exams,          setExams]          = useState([]);
  const [studentsMap,    setStudentsMap]    = useState({});   // { examId: [...students] }
  const [expandedId,     setExpandedId]     = useState(null);
  const [loadingExams,   setLoadingExams]   = useState(true);
  const [loadingMap,     setLoadingMap]     = useState({});   // { examId: bool }
  const [errorExams,     setErrorExams]     = useState('');
  const [errorStudents,  setErrorStudents]  = useState('');
  const [selStudent,     setSelStudent]     = useState(null);
  const [search,         setSearch]         = useState('');
  const [filterVerdict,  setFilterVerdict]  = useState('all');

  // ── 1. Load placement exams only ─────────────────────────────────────────
  useEffect(() => {
    setLoadingExams(true);
    setErrorExams('');

    authFetch(`${API}/api/exams`)
      .then(r => {
        if (!r.ok) throw new Error(`Server error ${r.status}`);
        return r.json();
      })
      .then(data => {
        const all   = data.exams || data || [];
        // Filter: placement / hiring only (exclude university / academic)
        const hiring = all.filter(isPlacement);
        setExams(hiring);
      })
      .catch(err => {
        setErrorExams(`Failed to load exams: ${err.message}`);
        setExams([]);
      })
      .finally(() => setLoadingExams(false));
  }, []);

  // ── 2. Toggle exam row — load students on demand ──────────────────────────
  const toggleExam = useCallback(async (exam) => {
    // Collapse if already open
    if (expandedId == exam.id) {
      setExpandedId(null);
      setSelStudent(null);
      return;
    }

    setExpandedId(exam.id);
    setSelStudent(null);
    setFilterVerdict('all');
    setErrorStudents('');

    // Already fetched
    if (studentsMap[exam.id]) return;

    setLoadingMap(p => ({ ...p, [exam.id]: true }));

    try {
      // Primary: AI detection endpoint (has viva verdict, scores, answers)
      const r    = await authFetch(`${API}/api/ai-detection/${exam.id}`);
      if (!r.ok) throw new Error(`Server error ${r.status}`);
      const data = await r.json();
      const list = data.students || (Array.isArray(data) ? data : []);
      setStudentsMap(p => ({ ...p, [exam.id]: list }));
    } catch (err) {
      // Fallback: load from exam_assignments + viva_results join
      try {
        const r2   = await authFetch(`${API}/api/exams/${exam.id}/students`);
        const data2 = await r2.json();
        const baseList = data2.students || [];

        // Enrich each student with their viva result if available
        const enriched = await Promise.all(
          baseList.map(async (s) => {
            try {
              const rv = await authFetch(
                `${API}/api/viva-results?exam_id=${exam.id}&student_id=${s.student_id || s.id}`
              );
              const vd = await rv.json();
              const vivaResult = Array.isArray(vd) ? vd[0] : vd;
              if (vivaResult && vivaResult.id) {
                return {
                  ...s,
                  overall_score:  vivaResult.overall_score,
                  auth_score:     vivaResult.auth_score,
                  final_verdict:  vivaResult.final_verdict,
                  viva_completed: true,
                  viva_answers:   (vivaResult.vivaAnswers || []).map(a => ({
                    ...a,
                    plagiarism_risk:    a.plagiarism_risk || a.plagiarismRisk,
                    was_voice_answer:   a.was_voice_answer || a.wasVoiceAnswer,
                    authenticity_score: a.authenticity_score || a.authenticityScore,
                    technical_accuracy: a.technical_accuracy || a.technicalAccuracy,
                    student_answer:     a.student_answer || a.studentAnswer,
                    question_number:    a.question_number || a.questionNumber,
                    question_type:      a.question_type || a.questionType,
                  })),
                };
              }
              return { ...s, viva_completed: false, viva_answers: [] };
            } catch {
              return { ...s, viva_completed: false, viva_answers: [] };
            }
          })
        );
        setStudentsMap(p => ({ ...p, [exam.id]: enriched }));
      } catch (err2) {
        setErrorStudents(`Could not load students: ${err2.message}`);
        setStudentsMap(p => ({ ...p, [exam.id]: [] }));
      }
    } finally {
      setLoadingMap(p => ({ ...p, [exam.id]: false }));
    }
  }, [expandedId, studentsMap]);

  // ── Derived stats ─────────────────────────────────────────────────────────
  const allStudents  = Object.values(studentsMap).flat();
  const totalAI      = allStudents.filter(s => s.final_verdict === 'Likely AI-Generated').length;
  const totalSusp    = allStudents.filter(s => s.final_verdict === 'Suspicious').length;
  const totalGenuine = allStudents.filter(s => s.final_verdict === 'Genuine').length;

  const filteredExams = exams.filter(e =>
    !search ||
    (e.title || e.exam_name || e.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (e.college || '').toLowerCase().includes(search.toLowerCase())
  );

  const expandedStudents  = expandedId ? (studentsMap[expandedId] || []) : [];
  const aiCt    = expandedStudents.filter(s => s.final_verdict === 'Likely AI-Generated').length;
  const spCt    = expandedStudents.filter(s => s.final_verdict === 'Suspicious').length;
  const gnCt    = expandedStudents.filter(s => s.final_verdict === 'Genuine').length;
  const vnCt    = expandedStudents.filter(s => s.viva_completed || s.viva_answers?.length > 0).length;

  const filteredStudents = expandedStudents.filter(s => {
    if (filterVerdict === 'ai')         return s.final_verdict === 'Likely AI-Generated';
    if (filterVerdict === 'suspicious') return s.final_verdict === 'Suspicious';
    if (filterVerdict === 'genuine')    return s.final_verdict === 'Genuine';
    if (filterVerdict === 'pending')    return !(s.viva_completed || s.viva_answers?.length > 0);
    return true;
  });

  // ── Drawer student data ───────────────────────────────────────────────────
  const sv = selStudent;
  const sVerdict = sv?.final_verdict || (
    (sv?.viva_answers?.filter(a => a.verdict === 'Likely AI-Generated').length > 1) ? 'Likely AI-Generated' :
    (sv?.viva_answers?.filter(a => a.verdict === 'Suspicious').length > 0) ? 'Suspicious' : 'Genuine'
  );
  const svs   = verdictStyle(sVerdict);
  const avgVS = sv?.overall_score ?? avg((sv?.viva_answers || []).map(a => a.score).filter(x => x != null));
  const authS = sv?.auth_score    ?? avg((sv?.viva_answers || []).map(a => a.authenticity_score || a.authenticityScore).filter(x => x != null));
  const aiPrb = authS != null ? Math.max(0, 10 - authS) : null;

  return (
    <div className="aid-wrap">
      <style>{CSS}</style>
      <Sidebar />
      <Navbar />

      <div className="aid-inner">

        {/* Page header */}
        <div className="aid-ph">
          <h1>🤖 AI Viva Detection Dashboard</h1>
          <p>Hiring exams only · Voice authenticity · AI text probability · Per-answer breakdown</p>
        </div>

        {/* Stat strip */}
        <div className="aid-stats">
          {[
            { v: exams.length,  l: 'HIRING EXAMS',  d: 'Placement only',   color: '#2563eb' },
            { v: totalAI,       l: 'AI GENERATED',  d: 'High confidence',  color: '#dc2626' },
            { v: totalSusp,     l: 'SUSPICIOUS',    d: 'Needs review',     color: '#d97706' },
            { v: totalGenuine,  l: 'GENUINE',       d: 'Human responses',  color: '#16a34a' },
          ].map(({ v, l, d, color }) => (
            <div className="aid-stat" key={l}>
              <div className="aid-stat-v" style={{ color }}>{v}</div>
              <div className="aid-stat-l">{l}</div>
              <div className="aid-stat-d">{d}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="aid-sr">
          <input
            className="aid-search"
            placeholder="🔍  Search exam name, college…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className="aid-res">{filteredExams.length} results</span>
          <button
            className="aid-btn"
            style={{ marginLeft: 'auto' }}
            onClick={() => {
              setExams([]);
              setStudentsMap({});
              setExpandedId(null);
              setSelStudent(null);
              setLoadingExams(true);
              authFetch(`${API}/api/exams`)
                .then(r => r.json())
                .then(data => setExams((data.exams || data || []).filter(isPlacement)))
                .catch(() => setExams([]))
                .finally(() => setLoadingExams(false));
            }}
          >
            ⟳ Refresh
          </button>
        </div>

        {/* Error */}
        {errorExams && <div className="aid-err">⚠ {errorExams}</div>}

        {/* Exams table */}
        <div className="aid-panel">
          <table className="aid-tbl">
            <thead>
              <tr>
                <th>Exam Name</th>
                <th>Type</th>
                <th>College / Batch</th>
                <th>Students</th>
                <th>Questions</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>

              {/* Loading */}
              {loadingExams && (
                <tr>
                  <td colSpan={7} style={{ padding: 40 }}>
                    <div className="spin" />
                    <div style={{ textAlign: 'center', marginTop: 10, color: '#9ca3af', fontSize: 12, fontFamily: 'monospace' }}>
                      Loading hiring exams…
                    </div>
                  </td>
                </tr>
              )}

              {/* No exams */}
              {!loadingExams && filteredExams.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="aid-empty">
                      <div className="aid-empty-icon">📋</div>
                      <div className="aid-empty-txt">No hiring exams found</div>
                      <div className="aid-empty-sub">Create a placement exam first, then it will appear here</div>
                    </div>
                  </td>
                </tr>
              )}

              {/* Exam rows */}
              {!loadingExams && filteredExams.map(exam => {
                const isExp  = expandedId == exam.id;
                const isLoad = loadingMap[exam.id];
                const studs  = studentsMap[exam.id] || [];
                const aiFlag = studs.filter(s => s.final_verdict === 'Likely AI-Generated').length;
                const isAct  = (exam.status || '').toLowerCase() === 'active' || (exam.status || '').toLowerCase() === 'live';
                const title  = exam.title || exam.exam_name || exam.name || `Exam #${exam.id}`;

                return (
                  <React.Fragment key={exam.id}>

                    {/* ── Exam row ── */}
                    <tr
                      className={`exam-row${isExp ? ' expanded' : ''}`}
                      onClick={() => toggleExam(exam)}
                    >
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{title}</span>
                          {aiFlag > 0 && (
                            <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontWeight: 700, fontFamily: 'monospace', border: '1px solid #fca5a5' }}>
                              {aiFlag} AI
                            </span>
                          )}
                        </div>
                      </td>
                      <td><span className="tp">Placement</span></td>
                      <td>
                        <div style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>{exam.college || '—'}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontFamily: 'monospace' }}>Batch {exam.batch_year || exam.batch || '—'}</div>
                      </td>
                      <td>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#2563eb', fontFamily: 'monospace' }}>
                          {exam.student_count ?? exam.candidates ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span style={{ fontSize: 18, fontWeight: 800, color: '#0f766e', fontFamily: 'monospace' }}>
                          {exam.question_count ?? exam.questions ?? '—'}
                        </span>
                      </td>
                      <td>
                        <span className="aid-st" style={{ color: isAct ? '#16a34a' : '#2563eb' }}>
                          <span className={`dot ${isAct ? 'dot-a' : 'dot-s'}`} />
                          {exam.status || 'scheduled'}
                        </span>
                      </td>
                      <td>
                        <button
                          className={`aid-btn${isExp ? ' on' : ''}`}
                          onClick={e => { e.stopPropagation(); toggleExam(exam); }}
                        >
                          {isLoad ? 'Loading…' : isExp ? '▲ Hide Students' : '▼ View Students'}
                        </button>
                      </td>
                    </tr>

                    {/* ── Expanded: students sub-table ── */}
                    {isExp && (
                      <tr className="exp-row">
                        <td colSpan={7}>
                          <div className="exp-inner">

                            {errorStudents && <div className="aid-err">⚠ {errorStudents}</div>}

                            {/* Summary pills */}
                            {expandedStudents.length > 0 && (
                              <div className="pill-strip">
                                {[
                                  { t: `${expandedStudents.length} Total`,  bg: '#eff6ff', co: '#1d4ed8', bd: '#bfdbfe' },
                                  { t: `${vnCt} Viva Done`,                 bg: '#f0fdf4', co: '#15803d', bd: '#86efac' },
                                  { t: `${aiCt} AI Generated`,             bg: '#fee2e2', co: '#dc2626', bd: '#fca5a5' },
                                  { t: `${spCt} Suspicious`,               bg: '#fef3c7', co: '#b45309', bd: '#fcd34d' },
                                  { t: `${gnCt} Genuine`,                  bg: '#d9f5ec', co: '#0a8f5c', bd: '#6ee7b7' },
                                ].map(p => (
                                  <span key={p.t} className="pill" style={{ background: p.bg, color: p.co, borderColor: p.bd }}>
                                    {p.t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Filter strip */}
                            <div className="fstrip">
                              {[
                                { k: 'all',        l: 'All' },
                                { k: 'ai',         l: '🤖 AI Generated' },
                                { k: 'suspicious', l: '⚠️ Suspicious' },
                                { k: 'genuine',    l: '✅ Genuine' },
                                { k: 'pending',    l: '⏳ Pending Viva' },
                              ].map(f => (
                                <button
                                  key={f.k}
                                  className={`aid-btn${filterVerdict === f.k ? ' on' : ''}`}
                                  style={{ fontSize: 10, padding: '4px 10px' }}
                                  onClick={e => { e.stopPropagation(); setFilterVerdict(f.k); }}
                                >
                                  {f.l}
                                </button>
                              ))}
                            </div>

                            {/* Loading students */}
                            {isLoad && (
                              <div style={{ padding: 28 }}>
                                <div className="spin" />
                                <div style={{ textAlign: 'center', marginTop: 10, color: '#9ca3af', fontSize: 12, fontFamily: 'monospace' }}>
                                  Loading students & viva results…
                                </div>
                              </div>
                            )}

                            {/* No students yet */}
                            {!isLoad && expandedStudents.length === 0 && (
                              <div className="aid-empty">
                                <div className="aid-empty-icon">👥</div>
                                <div className="aid-empty-txt">No students found for this exam</div>
                                <div className="aid-empty-sub">Students appear here once they are assigned to this exam</div>
                              </div>
                            )}

                            {/* No viva data yet */}
                            {!isLoad && expandedStudents.length > 0 && vnCt === 0 && filterVerdict === 'all' && (
                              <div style={{ padding: '8px 0 10px', fontSize: 12, color: '#d97706', fontFamily: 'monospace' }}>
                                ⏳ {expandedStudents.length} student(s) assigned — no viva results yet. Results appear after students complete the AI Viva round.
                              </div>
                            )}

                            {/* Students table */}
                            {!isLoad && filteredStudents.length > 0 && (
                              <table className="sub-tbl">
                                <thead>
                                  <tr>
                                    <th>Candidate</th>
                                    <th>Branch</th>
                                    <th>Viva Score</th>
                                    <th>Auth Score</th>
                                    <th>AI Verdict</th>
                                    <th>Risk</th>
                                    <th>Voice</th>
                                    <th>Detail</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {filteredStudents.map(s => {
                                    const verdict = s.final_verdict || null;
                                    const vsR     = verdictStyle(verdict);
                                    const vscore  = s.overall_score ?? avg((s.viva_answers || []).map(a => a.score).filter(x => x != null));
                                    const ascore  = s.auth_score    ?? avg((s.viva_answers || []).map(a => a.authenticity_score || a.authenticityScore).filter(x => x != null));
                                    const done    = s.viva_completed || (s.viva_answers?.length > 0);
                                    const risk    = worstRisk(s.viva_answers || []);
                                    const vc      = (s.viva_answers || []).filter(a => a.was_voice_answer || a.wasVoiceAnswer).length;
                                    const isSel   = selStudent?.student_id === (s.student_id || s.id);

                                    return (
                                      <tr
                                        key={s.student_id || s.id}
                                        className={isSel ? 'sel' : ''}
                                        onClick={e => { e.stopPropagation(); setSelStudent(s); }}
                                      >
                                        <td>
                                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 12 }}>
                                            {s.name || s.student_name || s.candidate_name || '—'}
                                          </div>
                                          <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>
                                            {s.email || s.student_email || s.student_id || '—'}
                                          </div>
                                        </td>
                                        <td>
                                          <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: '#eff6ff', color: '#1d4ed8', fontWeight: 700, border: '1px solid #bfdbfe' }}>
                                            {s.branch || s.department || '—'}
                                          </span>
                                        </td>
                                        <td>
                                          {done && vscore != null ? (
                                            <div className="bar-w">
                                              <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(vscore), fontFamily: 'monospace', minWidth: 22 }}>
                                                {vscore}
                                              </span>
                                              <div className="bar">
                                                <div className="bar-f" style={{ width: `${vscore * 10}%`, background: scoreColor(vscore) }} />
                                              </div>
                                            </div>
                                          ) : (
                                            <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
                                              {done ? '—' : 'Pending'}
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          {ascore != null ? (
                                            <div className="bar-w">
                                              <span style={{ fontSize: 14, fontWeight: 800, color: scoreColor(ascore), fontFamily: 'monospace', minWidth: 22 }}>
                                                {ascore}
                                              </span>
                                              <div className="bar">
                                                <div className="bar-f" style={{ width: `${ascore * 10}%`, background: scoreColor(ascore) }} />
                                              </div>
                                            </div>
                                          ) : <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td>
                                          {done && verdict ? (
                                            <span className="vd" style={{ background: vsR.bg, color: vsR.color, border: `1px solid ${vsR.border}` }}>
                                              {vsR.icon} {verdict}
                                            </span>
                                          ) : (
                                            <span style={{ fontSize: 10, color: '#9ca3af', fontFamily: 'monospace' }}>
                                              {done ? 'No verdict' : '⏳ Not taken'}
                                            </span>
                                          )}
                                        </td>
                                        <td>
                                          {done ? (
                                            <span className="rk" style={{ background: riskBg(risk), color: riskColor(risk), border: `1px solid ${riskBorder(risk)}` }}>
                                              {risk}
                                            </span>
                                          ) : <span style={{ fontSize: 10, color: '#9ca3af' }}>—</span>}
                                        </td>
                                        <td style={{ fontSize: 11, fontFamily: 'monospace', color: '#374151' }}>
                                          {done ? `🎤 ${vc}/${s.viva_answers?.length || 0}` : '—'}
                                        </td>
                                        <td>
                                          <button
                                            className="aid-btn"
                                            style={{ fontSize: 10, padding: '4px 10px' }}
                                            onClick={e => { e.stopPropagation(); setSelStudent(s); }}
                                          >
                                            View →
                                          </button>
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            )}

                            {/* No match for filter */}
                            {!isLoad && expandedStudents.length > 0 && filteredStudents.length === 0 && (
                              <div className="aid-empty" style={{ padding: '24px 0' }}>
                                <div className="aid-empty-icon">🔍</div>
                                <div className="aid-empty-txt">No students match this filter</div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Student Detail Drawer ── */}
      {sv && (
        <div className="aid-overlay" onClick={() => setSelStudent(null)}>
          <div className="aid-drawer" onClick={e => e.stopPropagation()}>

            <div className="drw-hd">
              <div>
                <div style={{ fontSize: 17, fontWeight: 800, color: '#1e3a8a', marginBottom: 3 }}>
                  {sv.name || sv.student_name || sv.candidate_name}
                </div>
                <div style={{ fontSize: 11, color: '#6b7280', fontFamily: 'monospace' }}>
                  {sv.email || sv.student_email} · {sv.branch || sv.department} · {sv.student_id || sv.id}
                </div>
              </div>
              <button className="drw-close" onClick={() => setSelStudent(null)}>✕</button>
            </div>

            <div className="drw-body">

              {/* Ring charts */}
              <div className="ring-row">
                <RingChart value={avgVS}  max={10} color={scoreColor(avgVS ?? 0)} label="VIVA SCORE" />
                <RingChart value={authS}  max={10} color="#16a34a"                 label="HUMAN SCORE" />
                <RingChart value={aiPrb}  max={10} color="#dc2626"                 label="AI PROBABILITY" />
              </div>

              {/* No viva yet */}
              {!(sv.viva_answers?.length > 0) && (
                <div className="aid-empty">
                  <div className="aid-empty-icon">🎤</div>
                  <div className="aid-empty-txt">Viva not completed yet</div>
                  <div className="aid-empty-sub">Results will appear here after the student completes the AI Viva round</div>
                </div>
              )}

              {sv.viva_answers?.length > 0 && (
                <>
                  {/* Verdict card */}
                  <div className="vd-card" style={{ background: svs.bg, borderColor: svs.border }}>
                    <div className="vd-title" style={{ color: svs.color }}>AI DETECTION VERDICT</div>
                    <div className="vd-val"   style={{ color: svs.color }}>{svs.icon} {sVerdict || '—'}</div>
                    <div className="vd-reason" style={{ color: svs.color }}>
                      {sVerdict === 'Likely AI-Generated'
                        ? 'Multiple answers show high-confidence AI signals: formal language, perfect structure, no natural hesitations.'
                        : sVerdict === 'Suspicious'
                        ? 'Some answers show AI-like phrasing patterns. Manual review recommended before final decision.'
                        : 'Answers appear in natural student voice with expected hesitations and personal code references.'}
                    </div>
                  </div>

                  {/* Integrity signals */}
                  <div className="int-blk">
                    <div className="int-hd">INTEGRITY SIGNALS</div>
                    {[
                      {
                        label: 'Voice Answers',
                        val: `${(sv.viva_answers || []).filter(a => a.was_voice_answer || a.wasVoiceAnswer).length} / ${sv.viva_answers?.length || 3} questions`,
                        color: '#2563eb',
                      },
                      {
                        label: 'Avg Replays',
                        val: sv.viva_answers?.length
                          ? ((sv.viva_answers.reduce((s, a) => s + (a.replay_count || 0), 0) / sv.viva_answers.length).toFixed(1) + ' / 2 max')
                          : '—',
                        color: '#6b7280',
                      },
                      { label: 'Plagiarism Risk', val: worstRisk(sv.viva_answers || []), color: riskColor(worstRisk(sv.viva_answers || [])) },
                      { label: 'Final Verdict',   val: sVerdict || '—',                  color: svs.color },
                    ].map(({ label, val, color }) => (
                      <div className="int-row" key={label}>
                        <span style={{ color: '#374151' }}>{label}</span>
                        <span style={{ fontWeight: 700, color, fontFamily: 'monospace', fontSize: 11 }}>{val}</span>
                      </div>
                    ))}
                  </div>

                  {/* Q&A breakdown */}
                  <div className="q-sec-lbl">VIVA ANSWERS — DETAILED ANALYSIS</div>
                  {sv.viva_answers.map((ans, i) => {
                    const av = verdictStyle(ans.verdict);
                    const qt = ans.question_type || ans.questionType || '';
                    const ts = {
                      LOGIC:       { bg: '#eff6ff', co: '#1d4ed8' },
                      COMPLEXITY:  { bg: '#f5f3ff', co: '#6d28d9' },
                      'EDGE CASES':{ bg: '#fff7ed', co: '#9a3412' },
                    }[qt] || { bg: '#f3f4f6', co: '#6b7280' };

                    const qNum    = ans.question_number || ans.questionNumber || (i + 1);
                    const qText   = ans.question || '—';
                    const aText   = ans.student_answer || ans.studentAnswer || '';
                    const score   = ans.score;
                    const accur   = ans.technical_accuracy || ans.technicalAccuracy;
                    const relev   = ans.relevance;
                    const auth    = ans.authenticity_score || ans.authenticityScore;
                    const risk    = ans.plagiarism_risk || ans.plagiarismRisk || 'Low';
                    const isVoice = ans.was_voice_answer || ans.wasVoiceAnswer;
                    const replays = ans.replay_count || 0;

                    return (
                      <div className="q-card" key={i}>
                        <div className="q-hd">
                          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                            <span className="q-num">Q{qNum}</span>
                            <span className="q-type" style={{ background: ts.bg, color: ts.co, border: `1px solid ${ts.co}40` }}>
                              {qt || 'GENERAL'}
                            </span>
                            {isVoice && <span className="voice-tag">🎤 Voice</span>}
                            {replays > 0 && (
                              <span style={{ fontSize: 9, color: '#6b7280', fontFamily: 'monospace' }}>
                                replayed {replays}×
                              </span>
                            )}
                          </div>
                          <span className="vd" style={{ background: av.bg, color: av.color, border: `1px solid ${av.border}`, fontSize: 9 }}>
                            {av.icon} {ans.verdict || '—'}
                          </span>
                        </div>

                        <div className="q-body">
                          <div className="q-txt">❓ {qText}</div>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1, color: '#9ca3af', fontFamily: 'monospace', marginBottom: 5 }}>
                            STUDENT ANSWER
                          </div>
                          <div className="q-ans">
                            {aText || <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>No answer recorded</span>}
                          </div>

                          <div className="q-scores">
                            {[
                              { l: 'SCORE',    v: score },
                              { l: 'ACCURACY', v: accur },
                              { l: 'RELEVANCE',v: relev },
                              { l: 'AUTH',     v: auth  },
                            ].map(({ l, v }) => (
                              <div className="q-sc" key={l}>
                                <div className="q-sv" style={{ color: scoreColor(v ?? 0) }}>{v ?? '—'}</div>
                                <div className="q-sl">{l}</div>
                              </div>
                            ))}
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
                            <span style={{ fontSize: 10, color: '#6b7280', fontFamily: 'monospace' }}>Plagiarism Risk:</span>
                            <span className="rk" style={{ background: riskBg(risk), color: riskColor(risk), border: `1px solid ${riskBorder(risk)}` }}>
                              {risk}
                            </span>
                          </div>

                          {ans.feedback && (
                            <div className="q-fb">💬 {ans.feedback}</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}