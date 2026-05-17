

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import ToastContainer from '../components/Toast';
import { useApp } from '../context/AppContext';

const API = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// ── Design tokens (same as CreateExam) ───────────────────────────────────────
const P = {
  bg: '#f8fafc', white: '#ffffff',
  border: '#e2e8f0', text: '#0f172a', muted: '#64748b', dim: '#94a3b8',
  accent: '#7c3aed', accentDark: '#6d28d9', accentLight: '#f5f3ff', accentBorder: '#ddd6fe',
  green: '#059669', greenBg: '#ecfdf5', greenBorder: '#6ee7b7',
  red: '#dc2626', redBg: '#fef2f2', redBorder: '#fca5a5',
  blue: '#2563eb', blueBg: '#eff6ff', blueBorder: '#bfdbfe',
  orange: '#d97706', orangeBg: '#fffbeb', orangeBorder: '#fcd34d',
};

const LANGUAGES = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'SQL',
  'Java', 'Python', 'C', 'C++', 'Go', 'Kotlin', 'React',
  'Node', 'General', 'Aptitude', 'Behavioral',
];

const SECTION_TYPES = [
  { value: 'mcq',    label: 'MCQ',    color: P.blue,   bg: P.blueBg,    border: P.blueBorder },
  { value: 'sql',    label: 'SQL',    color: P.accent, bg: P.accentLight, border: P.accentBorder },
  { value: 'coding', label: 'Coding', color: P.green,  bg: P.greenBg,   border: P.greenBorder },
];

const Ic = ({ d, size = 14, color = 'currentColor', sw = 1.8 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    <path d={d} />
  </svg>
);

const IC = {
  upload:   'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
  file:     'M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9zM13 2v7h7',
  check:    'M20 6L9 17L4 12',
  trash:    'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  back:     'M19 12H5M12 19l-7-7 7-7',
  info:     'M12 16v-4M12 8h.01M22 12A10 10 0 1 1 2 12a10 10 0 0 1 20 0z',
  database: 'M12 2C6.48 2 2 4.24 2 7s4.48 5 10 5 10-2.24 10-5-4.48-5-10-5zM2 7v5c0 2.76 4.48 5 10 5s10-2.24 10-5V7M2 12v5c0 2.76 4.48 5 10 5s10-2.24 10-5v-5',
  layers:   'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5',
  refresh:  'M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15',
};

function inp(hasError) {
  return {
    width: '100%', padding: '9px 12px',
    border: `1px solid ${hasError ? P.redBorder : P.border}`,
    borderRadius: 7, fontSize: 13, color: P.text,
    background: P.white, outline: 'none',
    fontFamily: 'inherit', boxSizing: 'border-box',
  };
}

// ── Stats panel ───────────────────────────────────────────────────────────────
function BankStats({ refresh }) {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
    fetch(`${API}/api/question-bank/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, [refresh]);

  if (!stats) return null;

  // Group by type
  const grouped = {};
  for (const row of stats.breakdown || []) {
    if (!grouped[row.type]) grouped[row.type] = [];
    grouped[row.type].push(row);
  }

  return (
    <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, padding: '18px', marginBottom: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Ic d={IC.database} size={15} color={P.accent} />
        <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Question Bank — {stats.total} total questions</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
        {SECTION_TYPES.map(st => {
          const rows = grouped[st.value] || [];
          const total = rows.reduce((s, r) => s + Number(r.count), 0);
          return (
            <div key={st.value} style={{ background: st.bg, border: `1px solid ${st.border}`, borderRadius: 8, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: st.color, marginBottom: 6 }}>{st.label}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: st.color, marginBottom: 6 }}>{total}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {rows.map(r => (
                  <div key={r.language_tag || 'generic'} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: P.muted }}>
                    <span>{r.language_tag || 'Generic'}</span>
                    <span style={{ fontWeight: 600, color: st.color }}>{r.count}</span>
                  </div>
                ))}
                {rows.length === 0 && (
                  <div style={{ fontSize: 11, color: P.dim }}>No questions yet</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function QuestionBankUpload() {
  const navigate      = useNavigate();
  const { showToast } = useApp();
  const fileRef       = useRef(null);

  const [form, setForm] = useState({
    type:               'mcq',
    language_tag:       'HTML',
    topic_tag:          '',
    difficulty_override: '',
  });
  const [file,       setFile]       = useState(null);
  const [uploading,  setUploading]  = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [statsKey,   setStatsKey]   = useState(0);
  const [errors,     setErrors]     = useState({});

  const setF = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const selectedType = SECTION_TYPES.find(s => s.value === form.type);

  const validate = () => {
    const e = {};
    if (!file)            e.file     = 'Please select a PDF file';
    if (!form.type)       e.type     = 'Select a question type';
    if (!form.language_tag) e.language = 'Select a language/topic tag';
    return e;
  };

  const handleUpload = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setErrors({});
    setUploading(true);

    try {
      const token = localStorage.getItem('admin_token') || localStorage.getItem('token');
      const fd = new FormData();
      fd.append('pdf',          file);
      fd.append('type',         form.type);
      fd.append('language_tag', form.language_tag);
      if (form.topic_tag)           fd.append('topic_tag',           form.topic_tag);
      if (form.difficulty_override) fd.append('difficulty_override', form.difficulty_override);

      const res  = await fetch(`${API}/api/question-bank/upload-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || data.hint || `Server error ${res.status}`);

      setLastResult(data);
      setFile(null);
      if (fileRef.current) fileRef.current.value = '';
      setStatsKey(k => k + 1);
      showToast(`${data.imported} questions imported successfully!`, 'success');
    } catch (err) {
      console.error('[BankUpload]', err);
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ marginLeft: '230px', display: 'flex', flexDirection: 'column', minHeight: '100vh', background: P.bg }}>
      <Sidebar />
      <Navbar />

      <main style={{ flex: 1, padding: '28px 32px', maxWidth: 860, width: '100%' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <button onClick={() => navigate(-1)}
            style={{ width: 36, height: 36, borderRadius: 9, border: `1px solid ${P.border}`, background: P.white, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Ic d={IC.back} size={15} color={P.muted} />
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: P.text }}>Question Bank</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, color: P.muted }}>
              Upload PDFs to populate the bank — used as fallback when no PDF is uploaded during exam creation
            </p>
          </div>
        </div>

        {/* Stats */}
        <BankStats refresh={statsKey} />

        {/* How it works */}
        <div style={{ background: P.blueBg, border: `1px solid ${P.blueBorder}`, borderRadius: 10, padding: '14px 18px', marginBottom: 20 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: P.blue, marginBottom: 8 }}>HOW THE FALLBACK WORKS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
            {[
              { step: '1', text: 'Admin creates exam, selects languages (e.g. HTML, Java)' },
              { step: '2', text: 'If no PDF uploaded for a section → system checks this bank' },
              { step: '3', text: 'Bank questions matching that language are randomly assigned' },
            ].map(s => (
              <div key={s.step} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: P.blue, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {s.step}
                </div>
                <span style={{ fontSize: 12, color: P.blue, lineHeight: 1.5 }}>{s.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upload form */}
        <div style={{ background: P.white, border: `1px solid ${P.border}`, borderRadius: 12, overflow: 'hidden', marginBottom: 20 }}>
          <div style={{ padding: '12px 18px', borderBottom: `1px solid ${P.border}`, background: 'linear-gradient(135deg, #f8fafc, #f5f3ff)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 24, height: 24, borderRadius: '50%', background: P.accent, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>1</span>
            <span style={{ fontSize: 13, fontWeight: 700, color: P.text }}>Configure &amp; Upload</span>
          </div>
          <div style={{ padding: 20 }}>

            {/* Row 1: Type + Language */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 5 }}>
                  Question Type <span style={{ color: P.red }}>*</span>
                </label>
                <div style={{ display: 'flex', gap: 6 }}>
                  {SECTION_TYPES.map(st => (
                    <button key={st.value} onClick={() => setF('type', st.value)}
                      style={{
                        flex: 1, padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                        border: `1.5px solid ${form.type === st.value ? st.color : P.border}`,
                        background: form.type === st.value ? st.bg : P.bg,
                        color: form.type === st.value ? st.color : P.muted,
                        transition: 'all 0.15s',
                      }}>
                      {st.label}
                    </button>
                  ))}
                </div>
                {errors.type && <div style={{ fontSize: 11, color: P.red, marginTop: 4 }}>{errors.type}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 5 }}>
                  Language / Tag <span style={{ color: P.red }}>*</span>
                </label>
                <select value={form.language_tag} onChange={e => setF('language_tag', e.target.value)} style={inp(errors.language)}>
                  <option value="">Select...</option>
                  {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                {errors.language && <div style={{ fontSize: 11, color: P.red, marginTop: 4 }}>{errors.language}</div>}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 5 }}>
                  Topic Tag <span style={{ color: P.dim, fontWeight: 400 }}>(optional)</span>
                </label>
                <input value={form.topic_tag} onChange={e => setF('topic_tag', e.target.value)}
                  placeholder="e.g. React Hooks, Sorting, OOP"
                  style={inp()} />
              </div>
            </div>

            {/* Row 2: Difficulty override */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 5 }}>
                Override Difficulty <span style={{ color: P.dim, fontWeight: 400 }}>(optional — if blank, auto-detected from PDF)</span>
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                {[
                  { v: '',       label: 'Auto-detect' },
                  { v: 'easy',   label: 'All Easy' },
                  { v: 'medium', label: 'All Medium' },
                  { v: 'hard',   label: 'All Hard' },
                ].map(opt => (
                  <button key={opt.v} onClick={() => setF('difficulty_override', opt.v)}
                    style={{
                      padding: '7px 16px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600,
                      border: `1px solid ${form.difficulty_override === opt.v ? P.accent : P.border}`,
                      background: form.difficulty_override === opt.v ? P.accentLight : P.bg,
                      color: form.difficulty_override === opt.v ? P.accent : P.muted,
                      transition: 'all 0.15s',
                    }}>
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* PDF drop zone */}
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: P.text, marginBottom: 5 }}>
                PDF File <span style={{ color: P.red }}>*</span>
              </label>
              {file ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: selectedType?.bg, border: `1px solid ${selectedType?.border}`, borderRadius: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: 8, background: P.white, border: `1px solid ${selectedType?.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Ic d={IC.file} size={18} color={selectedType?.color} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: P.text }}>{file.name}</div>
                      <div style={{ fontSize: 11, color: P.muted }}>{(file.size / 1024).toFixed(1)} KB</div>
                    </div>
                  </div>
                  <button onClick={() => { setFile(null); if (fileRef.current) fileRef.current.value = ''; }}
                    style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${P.redBorder}`, background: P.redBg, color: P.red, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
                    Remove
                  </button>
                </div>
              ) : (
                <label style={{ display: 'block', cursor: 'pointer' }}>
                  <div
                    style={{
                      border: `2px dashed ${errors.file ? P.redBorder : selectedType?.border || P.accentBorder}`,
                      borderRadius: 10, padding: '28px', textAlign: 'center',
                      background: errors.file ? P.redBg : (selectedType?.bg || P.accentLight) + '66',
                      transition: 'all 0.15s',
                    }}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f?.type === 'application/pdf') setFile(f); }}
                  >
                    <div style={{ width: 44, height: 44, borderRadius: 10, background: selectedType?.bg || P.accentLight, border: `1px solid ${selectedType?.border || P.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                      <Ic d={IC.upload} size={20} color={errors.file ? P.red : selectedType?.color || P.accent} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: errors.file ? P.red : selectedType?.color || P.accent, marginBottom: 4 }}>
                      Drop your question bank PDF here or click to browse
                    </div>
                    <div style={{ fontSize: 11, color: P.dim }}>
                      Max 20 MB · PDF format only
                    </div>
                  </div>
                  <input ref={fileRef} type="file" accept="application/pdf" style={{ display: 'none' }}
                    onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]); }} />
                </label>
              )}
              {errors.file && <div style={{ fontSize: 11, color: P.red, marginTop: 4 }}>{errors.file}</div>}
            </div>

            {/* Submit */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
              <button onClick={handleUpload} disabled={uploading}
                style={{
                  padding: '10px 28px', borderRadius: 8, border: 'none',
                  background: uploading ? P.border : `linear-gradient(135deg, ${P.accent}, ${P.accentDark})`,
                  color: uploading ? P.dim : '#fff',
                  fontSize: 13, fontWeight: 700,
                  cursor: uploading ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', gap: 8,
                  boxShadow: uploading ? 'none' : '0 4px 12px rgba(124,58,237,0.35)',
                }}>
                <Ic d={IC.upload} size={14} color="currentColor" />
                {uploading ? 'Importing...' : 'Import to Question Bank'}
              </button>
            </div>
          </div>
        </div>

        {/* Success result */}
        {lastResult && (
          <div style={{ background: P.greenBg, border: `1px solid ${P.greenBorder}`, borderRadius: 10, padding: '16px 20px', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: P.green + '22', border: `1px solid ${P.green}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ic d={IC.check} size={14} color={P.green} sw={2.5} />
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: P.green }}>
                {lastResult.imported} questions imported successfully
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontSize: 12 }}>
              {[
                ['Type',     lastResult.type?.toUpperCase()],
                ['Language', lastResult.language_tag || '—'],
                ['Topic',    lastResult.topic_tag    || '—'],
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ color: P.dim, fontSize: 10, fontWeight: 600 }}>{k}</div>
                  <div style={{ color: P.green, fontWeight: 700 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
      <ToastContainer />
    </div>
  );
}