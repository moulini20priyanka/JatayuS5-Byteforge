// AIDetectionPage.jsx — Standalone page at /ai-detection route
import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import StatCard from '../components/StatCard';
import ToastContainer from '../components/Toast';

const API = 'http://localhost:5000/api';

const getToken = () =>
  localStorage.getItem('admin_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') ||
  sessionStorage.getItem('token') || '';

const authHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`,
});

const authFetch = (url, options = {}) =>
  fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

/* ═══════════════════════════════════════════════════════════════
   DEMO DATA — shown immediately without any API call
   ═══════════════════════════════════════════════════════════════ */
const DEMO_STUDENTS = [
  { student_id: 'S001', name: 'Moulini S',              email: 'mou122058.it@rmkec.ac.in', college: 'RMKEC', branch: 'IT',  batch: '2026', similarity_score: 65, ai_score: 58, verdict: 'Human Written', matched_with: 'S003', viva_result: 'Humanized Text', exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S002', name: 'Shreya S',               email: 'sshr22084.it@rmkec.ac.in', college: 'RMKEC', branch: 'IT',  batch: '2026', similarity_score: 12, ai_score: 18, verdict: 'Human Written', matched_with: null,   viva_result: 'Humanized Text', exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S003', name: 'Lokshana Dharshini D V', email: 'loks22053.it@rmkec.ac.in', college: 'RMKEC', branch: 'IT',  batch: '2026', similarity_score: 71, ai_score: 63, verdict: 'Likely AI',    matched_with: 'S001', viva_result: 'AI Text',        exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S004', name: 'Kavithaa K A',           email: 'kavi22116.it@rmkec.ac.in', college: 'RMKEC', branch: 'IT',  batch: '2026', similarity_score: 88, ai_score: 92, verdict: 'AI Generated',  matched_with: 'S006', viva_result: 'AI Text',        exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S005', name: 'Anusha P M',             email: 'pman22068.it@rmkec.ac.in', college: 'RMKEC', branch: 'IT',  batch: '2026', similarity_score: 22, ai_score: 19, verdict: 'Human Written', matched_with: null,   viva_result: 'Humanized Text', exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S006', name: 'Priya R',                email: 'priy22031.it@rmkec.ac.in', college: 'RMKEC', branch: 'IT',  batch: '2026', similarity_score: 83, ai_score: 79, verdict: 'AI Generated',  matched_with: 'S004', viva_result: 'AI Text',        exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S007', name: 'Divya K',                email: 'divy22045.it@rmkec.ac.in', college: 'RMKEC', branch: 'CSE', batch: '2026', similarity_score: 35, ai_score: 42, verdict: 'Possibly AI',   matched_with: null,   viva_result: 'Humanized Text', exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S008', name: 'Harini S',               email: 'hari22077.it@rmkec.ac.in', college: 'RMKEC', branch: 'CSE', batch: '2026', similarity_score: 9,  ai_score: 11, verdict: 'Human Written', matched_with: null,   viva_result: 'Humanized Text', exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S009', name: 'Keerthana M',            email: 'keer22092.it@rmkec.ac.in', college: 'RMKEC', branch: 'ECE', batch: '2026', similarity_score: 54, ai_score: 61, verdict: 'Likely AI',    matched_with: 'S010', viva_result: 'AI Text',        exam_name: 'Virtusa - Full Stack Developer' },
  { student_id: 'S010', name: 'Nandhini V',             email: 'nand22103.it@rmkec.ac.in', college: 'RMKEC', branch: 'ECE', batch: '2026', similarity_score: 58, ai_score: 55, verdict: 'Likely AI',    matched_with: 'S009', viva_result: 'AI Text',        exam_name: 'Virtusa - Full Stack Developer' },
];

/* ── Colour helpers ── */
const similarityColor = (score) => {
  if (score == null) return '#94a3b8';
  if (score >= 70)   return '#dc2626';
  if (score >= 40)   return '#f59e0b';
  return '#10b981';
};
const aiColor = (score) => {
  if (score == null) return '#94a3b8';
  if (score >= 70)   return '#dc2626';
  if (score >= 40)   return '#f59e0b';
  return '#10b981';
};
const aiLabel = (verdict) => {
  if (!verdict)                    return { text: '—',            color: '#6b7280', bg: '#f3f4f6', border: '#d1d5db' };
  if (verdict === 'AI Generated')  return { text: 'AI Generated', color: '#dc2626', bg: '#fee2e2', border: '#fca5a5' };
  if (verdict === 'Likely AI')     return { text: 'Likely AI',    color: '#b45309', bg: '#fef3c7', border: '#fcd34d' };
  if (verdict === 'Possibly AI')   return { text: 'Possibly AI',  color: '#0369a1', bg: '#e0f2fe', border: '#7dd3fc' };
  return                                  { text: 'Human',        color: '#0a8f5c', bg: '#d9f5ec', border: '#6ee7b7' };
};

/* ── Circular ring ── */
function ScoreRing({ value, color, size = 46 }) {
  const r     = (size - 6) / 2;
  const circ  = 2 * Math.PI * r;
  const filled = ((value ?? 0) / 100) * circ;
  return (
    <svg width={size} height={size} style={{ flexShrink: 0 }}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={4}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={4}
        strokeLinecap="round" strokeDasharray={`${filled} ${circ}`}
        transform={`rotate(-90 ${size/2} ${size/2})`}/>
      <text x="50%" y="50%" dominantBaseline="middle" textAnchor="middle"
        style={{ fontSize: 11, fontWeight: 700, fill: '#111827' }}>
        {value ?? '—'}
      </text>
    </svg>
  );
}

const pageStyles = `
  .aid-page-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 24px;
  }
  .aid-page-header h1 {
    font-size: 22px;
    font-weight: 800;
    color: #1e3a8a;
    margin: 0 0 4px;
  }
  .aid-page-header p {
    font-size: 13px;
    color: #60a5fa;
    margin: 0;
  }
  .aid-panel {
    background: #fff;
    border: 1px solid #dbeafe;
    border-radius: 14px;
    overflow: hidden;
    box-shadow: 0 2px 12px rgba(37,99,235,0.06);
  }
  .aid-panel-header {
    padding: 16px 20px;
    border-bottom: 1px solid #eff6ff;
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: linear-gradient(to right, #f0f9ff, #fff);
  }
  .aid-panel-title { font-size: 14px; font-weight: 700; color: #1e3a8a; }
  .aid-load-bar {
    background: #fff;
    border: 1px solid #dbeafe;
    border-radius: 12px;
    padding: 14px 18px;
    margin-bottom: 24px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
    box-shadow: 0 2px 8px rgba(37,99,235,0.06);
  }
  .aid-input {
    padding: 8px 12px;
    border: 1.5px solid #dbeafe;
    border-radius: 8px;
    font-size: 13px;
    width: 200px;
    outline: none;
    font-family: inherit;
    color: #1e3a8a;
    transition: border-color 0.15s;
  }
  .aid-input:focus { border-color: #3b82f6; }
  .aid-load-btn {
    padding: 9px 18px;
    background: linear-gradient(135deg, #2563eb, #1d4ed8);
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.18s ease;
  }
  .aid-load-btn:hover:not(:disabled) {
    background: linear-gradient(135deg, #1d4ed8, #1e40af);
    transform: translateY(-1px);
    box-shadow: 0 4px 14px rgba(37,99,235,0.3);
  }
  .aid-load-btn:disabled { background: #cbd5e1; cursor: not-allowed; }
  .aid-table-wrap { overflow-x: auto; }
  .aid-table-wrap table { width: 100%; border-collapse: collapse; font-size: 13px; }
  .aid-table-wrap thead tr { border-bottom: 1.5px solid #e5e7eb; background: transparent; }
  .aid-table-wrap th {
    padding: 10px 16px;
    text-align: left;
    font-size: 10px;
    font-weight: 700;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    background: #f0f9ff;
  }
  .aid-table-wrap tbody tr {
    border-bottom: 1px solid #f3f4f6;
    transition: background 0.12s;
  }
  .aid-table-wrap tbody tr:hover { background: #f9fafb; }
  .aid-table-wrap td { padding: 14px 16px; vertical-align: middle; }
  .ring-score-cell { display: flex; align-items: center; gap: 10px; }
  .ring-labels { display: flex; flex-direction: column; gap: 1px; font-size: 12px; font-weight: 600; }
`;

export default function AIDetectionPage() {
  const [input,    setInput]    = useState('exam_001');
  const [examId,   setExamId]   = useState('exam_001');
  const [students, setStudents] = useState(DEMO_STUDENTS);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  const fetchReport = async (id) => {
    const eid = id || examId;
    setLoading(true); setError('');
    try {
      const res  = await authFetch(`${API}/ai-detection/${eid}`);
      const data = await res.json();
      if (data.students && data.students.length > 0) {
        setStudents(data.students);
      } else {
        setStudents(DEMO_STUDENTS);
        setError('No live data found — showing demo results.');
      }
    } catch {
      setStudents(DEMO_STUDENTS);
      setError('Backend unavailable — showing demo results.');
    } finally {
      setLoading(false);
    }
  };

  const aiCount     = students.filter(s => s.verdict === 'AI Generated').length;
  const likelyCount = students.filter(s => s.verdict === 'Likely AI').length;
  const humanCount  = students.filter(s => s.verdict === 'Human Written').length;

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: '#f0f7ff' }}>
      <style>{pageStyles}</style>
      <Sidebar />
      <Navbar />
      <main style={{ flex: 1, overflow: 'auto', padding: '24px' }}>

        {/* Page Header */}
        <div className="aid-page-header">
          <div>
            <h1>AI Code Detection</h1>
            <p>AST-based analysis to detect ChatGPT / Copilot generated code — students are never notified</p>
          </div>
        </div>

        {/* Load Bar */}
        <div className="aid-load-bar">
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1e3a8a' }}>🤖 Load AI Detection Report</div>
          <span style={{ fontSize: 11, color: '#60a5fa' }}>— shows similarity &amp; AI scores per student</span>
          <input
            className="aid-input"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { setExamId(input); fetchReport(input); } }}
            placeholder="Exam ID e.g. exam_001"
          />
          <button className="aid-load-btn" onClick={() => { setExamId(input); fetchReport(input); }} disabled={loading}>
            {loading ? 'Loading…' : 'Load Report'}
          </button>
          <div style={{ display: 'flex', gap: 10, marginLeft: 'auto' }}>
            <span style={{ fontSize: 11, color: '#60a5fa' }}>Showing: <strong>{students.length}</strong> students</span>
            {aiCount     > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fee2e2', color: '#dc2626', fontWeight: 700, border: '1px solid #fca5a5' }}>⚠ {aiCount} AI Generated</span>}
            {likelyCount > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309', fontWeight: 700, border: '1px solid #fcd34d' }}>{likelyCount} Likely AI</span>}
            {humanCount  > 0 && <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#d9f5ec', color: '#0a8f5c', fontWeight: 700, border: '1px solid #6ee7b7' }}>{humanCount} Human</span>}
          </div>
          {error && <span style={{ fontSize: 12, color: '#b45309' }}>{error}</span>}
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Total Students', value: students.length, description: 'Analyzed',           accent: 'blue'  },
            { label: 'AI Generated',   value: aiCount,         description: 'High confidence AI',  accent: 'red'   },
            { label: 'Likely AI',      value: likelyCount,     description: 'Medium confidence',   accent: 'red'   },
            { label: 'Human Written',  value: humanCount,      description: 'Looks genuine',        accent: 'green' },
          ].map(c => <StatCard key={c.label} label={c.label} value={c.value} description={c.description} accent={c.accent} />)}
        </div>

        {/* Results Table */}
        <div className="aid-panel">
          <div className="aid-panel-header">
            <span className="aid-panel-title">AI Detection Results — {students.length} students (Exam: {examId})</span>
          </div>
          <div className="aid-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Candidate</th>
                  <th>College</th>
                  <th>Branch</th>
                  <th>Batch</th>
                  <th>Similarity</th>
                  <th>AI</th>
                  <th>AI Viva</th>
                  <th>Exam</th>
                </tr>
              </thead>
              <tbody>
                {students.map((s) => {
                  const simScore = s.similarity_score ?? s.plagiarism_score ?? null;
                  const aiScore  = s.ai_score ?? null;
                  const simCol   = similarityColor(simScore);
                  const aiCol    = aiColor(aiScore);
                  const aiLbl    = aiLabel(s.verdict);

                  return (
                    <tr key={s.student_id}>
                      {/* CANDIDATE */}
                      <td>
                        <div style={{ fontWeight: 600, color: '#111827', fontSize: 13 }}>
                          {s.name || s.student_name || s.student_id}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                          {s.email || s.student_id}
                        </div>
                      </td>

                      {/* COLLEGE */}
                      <td style={{ color: '#374151', fontSize: 13 }}>
                        {s.college || s.institution || '—'}
                      </td>

                      {/* BRANCH */}
                      <td>
                        <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 6, fontSize: 12, fontWeight: 600, background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe' }}>
                          {s.branch || s.department || '—'}
                        </span>
                      </td>

                      {/* BATCH */}
                      <td style={{ color: '#374151', fontSize: 13 }}>
                        {s.batch || s.year || '—'}
                      </td>

                      {/* SIMILARITY — ring + labels */}
                      <td>
                        <div className="ring-score-cell">
                          <ScoreRing value={simScore} color={simCol} />
                          <div className="ring-labels">
                            <span style={{ color: simCol }}>Sim: <strong>{simScore ?? '—'}</strong></span>
                            <span style={{ color: '#6b7280', fontSize: 11 }}>
                              {s.matched_with ? `↔ ${s.matched_with}` : 'No match'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* AI — ring + verdict badge */}
                      <td>
                        <div className="ring-score-cell">
                          <ScoreRing value={aiScore} color={aiCol} />
                          <div className="ring-labels">
                            <span style={{ color: aiCol }}>AI: <strong>{aiScore ?? '—'}</strong></span>
                            <span style={{
                              display: 'inline-block', marginTop: 2,
                              padding: '2px 8px', borderRadius: 20, fontSize: 10, fontWeight: 600,
                              background: aiLbl.bg, color: aiLbl.color, border: `1px solid ${aiLbl.border}`,
                              whiteSpace: 'nowrap',
                            }}>
                              {aiLbl.text}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* AI VIVA */}
                      <td>
                        {(() => {
                          const viva = s.viva_result;
                          const isAI = viva === 'AI Text';
                          return (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                              <span style={{
                                display: 'inline-flex', alignItems: 'center', gap: 5,
                                padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: isAI ? '#fee2e2' : '#d9f5ec',
                                color: isAI ? '#dc2626' : '#0a8f5c',
                                border: `1px solid ${isAI ? '#fca5a5' : '#6ee7b7'}`,
                                whiteSpace: 'nowrap',
                              }}>
                                {isAI ? '🤖' : '✍️'} {viva || '—'}
                              </span>
                              <span style={{ fontSize: 10, color: '#9ca3af', paddingLeft: 2 }}>
                                {isAI ? 'AI Generated' : 'own words detected'}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* EXAM */}
                      <td style={{ color: '#374151', fontSize: 13 }}>
                        {s.exam_name || examId}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      </main>
      <ToastContainer />
    </div>
  );
}