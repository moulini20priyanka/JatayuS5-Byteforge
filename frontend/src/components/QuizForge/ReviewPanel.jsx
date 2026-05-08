// src/components/QuizForge/ReviewPanel.jsx
// FIXED: "Generate PDF" replaced with "Save to Question Bank"
// Questions are saved to MySQL DB (question_bank table), NOT exported as PDF
import React, { useState, useMemo } from 'react';

const DIFF_COLOR = {
  easy:   { bg: '#dcfce7', color: '#16a34a' },
  medium: { bg: '#fef9c3', color: '#ca8a04' },
  hard:   { bg: '#fee2e2', color: '#dc2626' },
};
const TYPE_COLOR = {
  mcq:      { bg: '#ede9fe', color: '#7c3aed' },
  sql:      { bg: '#cffafe', color: '#0891b2' },
  coding:   { bg: '#fef3c7', color: '#d97706' },
  aptitude: { bg: '#f0fdf4', color: '#15803d' },
  verbal:   { bg: '#fce7f3', color: '#be185d' },
};

function Badge({ children, style }) {
  return (
    <span style={{
      padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 700,
      display: 'inline-block', ...style,
    }}>{children}</span>
  );
}

function QuestionRow({ q, selected, onToggle, index }) {
  const [expanded, setExpanded] = useState(false);
  const diff  = (q.difficulty || 'medium').toLowerCase();
  const type  = (q.type || 'mcq').toLowerCase();
  const dm    = DIFF_COLOR[diff] || DIFF_COLOR.medium;
  const tm    = TYPE_COLOR[type] || TYPE_COLOR.mcq;

  const options = q.options || [
    q.option_a && { key: 'A', text: q.option_a },
    q.option_b && { key: 'B', text: q.option_b },
    q.option_c && { key: 'C', text: q.option_c },
    q.option_d && { key: 'D', text: q.option_d },
  ].filter(Boolean);

  return (
    <div style={{
      background: selected ? 'rgba(112,85,200,0.03)' : '#fff',
      border: `1.5px solid ${selected ? 'rgba(112,85,200,0.25)' : '#f0f0f0'}`,
      borderRadius: 10, marginBottom: 10, overflow: 'hidden',
      transition: 'border-color .2s',
    }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12,
        padding: '14px 16px', cursor: 'pointer',
      }} onClick={() => onToggle(q)}>
        {/* Checkbox */}
        <div onClick={e => { e.stopPropagation(); onToggle(q); }} style={{
          width: 20, height: 20, borderRadius: 5, flexShrink: 0, marginTop: 1,
          border: `2px solid ${selected ? '#7055C8' : '#d1d5db'}`,
          background: selected ? '#7055C8' : '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'all .15s',
        }}>
          {selected && (
            <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
              <path d="M2 5.5L4.5 8L9 3" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </div>

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: '#94a3b8' }}>#{index + 1}</span>
            <Badge style={{ ...tm }}>{type.toUpperCase()}</Badge>
            <Badge style={{ ...dm }}>{diff}</Badge>
            {q.topic_tag && (
              <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>{q.topic_tag}</span>
            )}
          </div>
          <div style={{ fontSize: 13.5, color: '#1e293b', fontWeight: 500, lineHeight: 1.5 }}>
            {q.question || q.question_text || q.topic || '—'}
          </div>
        </div>

        {/* Expand toggle */}
        <button
          onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: '#94a3b8', padding: 4, flexShrink: 0,
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d={expanded ? 'M4 10L8 6L12 10' : 'M4 6L8 10L12 6'}
              stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>

      {/* Expanded: show options + answer */}
      {expanded && options.length > 0 && (
        <div style={{ borderTop: '1px solid #f8f8f8', padding: '12px 16px 14px 48px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            {options.map(opt => {
              const isCorrect = (q.correct_ans || q.answer || '').toUpperCase() === opt.key;
              return (
                <div key={opt.key} style={{
                  display: 'flex', alignItems: 'flex-start', gap: 8,
                  padding: '8px 12px', borderRadius: 8,
                  background: isCorrect ? '#dcfce7' : '#fafafa',
                  border: `1px solid ${isCorrect ? '#86efac' : '#f0f0f0'}`,
                }}>
                  <span style={{
                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                    background: isCorrect ? '#22c55e' : '#e2e8f0',
                    color: isCorrect ? '#fff' : '#64748b',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 11, fontWeight: 700,
                  }}>{opt.key}</span>
                  <span style={{ fontSize: 12.5, color: '#374151', lineHeight: 1.4 }}>{opt.text}</span>
                </div>
              );
            })}
          </div>
          {q.explanation && (
            <div style={{ fontSize: 12, color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: 7 }}>
              <strong>Explanation:</strong> {q.explanation}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ReviewPanel({ questions = [], stats, onFinalize, onRegenerate }) {
  const [selected, setSelected]   = useState(() => new Set(questions.map((_, i) => i)));
  const [search,   setSearch]     = useState('');
  const [typeF,    setTypeF]      = useState('All');
  const [diffF,    setDiffF]      = useState('All');
  const [saving,   setSaving]     = useState(false);
  const [saved,    setSaved]      = useState(false);

  const types = ['All', 'MCQ', 'SQL', 'Coding', 'Aptitude', 'Verbal'];
  const diffs = ['All', 'Easy', 'Medium', 'Hard'];

  const filtered = useMemo(() => {
    return questions.filter((q, i) => {
      const qt    = (q.type || '').toLowerCase();
      const qd    = (q.difficulty || '').toLowerCase();
      const qtext = (q.question || q.question_text || q.topic || '').toLowerCase();
      const matchType   = typeF === 'All' || qt === typeF.toLowerCase();
      const matchDiff   = diffF === 'All' || qd === diffF.toLowerCase();
      const matchSearch = !search || qtext.includes(search.toLowerCase());
      return matchType && matchDiff && matchSearch;
    });
  }, [questions, typeF, diffF, search]);

  function toggle(q) {
    const idx = questions.indexOf(q);
    setSelected(prev => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function toggleAll() {
    const filteredIdxs = filtered.map(q => questions.indexOf(q));
    const allSelected  = filteredIdxs.every(i => selected.has(i));
    setSelected(prev => {
      const next = new Set(prev);
      filteredIdxs.forEach(i => allSelected ? next.delete(i) : next.add(i));
      return next;
    });
  }

  const selectedQuestions = questions.filter((_, i) => selected.has(i));

  async function handleSaveToDB() {
    if (selectedQuestions.length === 0) return alert('Select at least one question');
    setSaving(true);
    try {
      // onFinalize saves to DB (handled in QuizForgePanel → QuestionBank.jsx)
      await onFinalize(selectedQuestions);
      setSaved(true);
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredAllSelected = filtered.every(q => selected.has(questions.indexOf(q)));

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 20px 60px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1a1060', marginBottom: 4 }}>
            Review & Select
          </h2>
          <p style={{ fontSize: 13, color: '#94a3b8' }}>
            {questions.length} question{questions.length !== 1 ? 's' : ''} generated
            · <strong style={{ color: '#7055C8' }}>{selectedQuestions.length} selected</strong>
          </p>

          {/* Type breakdown */}
          {stats && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              {Object.entries(stats.byAgent || stats.byType || {}).map(([key, count]) =>
                count > 0 ? (
                  <span key={key} style={{
                    padding: '2px 10px', borderRadius: 99, fontSize: 12,
                    background: '#f0ecfc', border: '1px solid rgba(112,85,200,0.2)',
                    color: '#7055C8', fontWeight: 600,
                  }}>{count} {key}</span>
                ) : null
              )}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={onRegenerate}
            style={{
              padding: '9px 18px', border: '1.5px solid #e2e8f0',
              background: '#fff', borderRadius: 8, fontSize: 13,
              fontWeight: 600, color: '#475569', cursor: 'pointer',
            }}
          >Regenerate</button>

          {/* ✅ CHANGED: Save to DB, NOT Export PDF */}
          <button
            onClick={handleSaveToDB}
            disabled={saving || saved || selectedQuestions.length === 0}
            style={{
              padding: '9px 22px', borderRadius: 8,
              background: saved
                ? 'linear-gradient(135deg,#22c55e,#16a34a)'
                : saving
                  ? '#a5b4fc'
                  : 'linear-gradient(135deg,#7055C8,#C060C0)',
              border: 'none', color: '#fff', fontSize: 13,
              fontWeight: 700, cursor: saving || saved ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 10px rgba(112,85,200,0.3)',
              display: 'flex', alignItems: 'center', gap: 8,
              minWidth: 160,
            }}
          >
            {saved ? (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7L5.5 10.5L12 4" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Saved to Bank!
              </>
            ) : saving ? (
              <>
                <div style={{
                  width: 14, height: 14, borderRadius: '50%',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderTopColor: '#fff',
                  animation: 'spin 0.8s linear infinite',
                }} />
                Saving…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M2 10V12H12V10M7 2V9M7 9L4.5 6.5M7 9L9.5 6.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Save to Question Bank ({selectedQuestions.length})
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center',
      }}>
        {/* Search */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: '#fff', border: '1.5px solid #e2e8f0', borderRadius: 8,
          padding: '7px 12px', flex: 1, minWidth: 180,
        }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#94a3b8" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search questions…"
            style={{ border: 'none', outline: 'none', fontSize: 13, color: '#374151', flex: 1, background: 'transparent' }}
          />
        </div>

        {/* Type pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {types.map(t => (
            <button key={t} onClick={() => setTypeF(t)} style={{
              padding: '5px 12px', border: 'none', borderRadius: 99,
              background: typeF === t ? '#7055C8' : '#f1f5f9',
              color: typeF === t ? '#fff' : '#64748b',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{t}</button>
          ))}
        </div>

        {/* Difficulty pills */}
        <div style={{ display: 'flex', gap: 4 }}>
          {diffs.map(d => (
            <button key={d} onClick={() => setDiffF(d)} style={{
              padding: '5px 12px', border: 'none', borderRadius: 99,
              background: diffF === d ? '#1e293b' : '#f1f5f9',
              color: diffF === d ? '#fff' : '#64748b',
              fontSize: 12, fontWeight: 600, cursor: 'pointer',
            }}>{d}</button>
          ))}
        </div>

        {/* Select all */}
        <button onClick={toggleAll} style={{
          padding: '5px 12px', border: '1.5px solid #e2e8f0',
          background: '#fff', borderRadius: 99, fontSize: 12,
          fontWeight: 600, color: '#64748b', cursor: 'pointer',
        }}>
          {filteredAllSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Questions list */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8', fontSize: 14 }}>
          No questions match your filters.
        </div>
      ) : (
        filtered.map((q, i) => (
          <QuestionRow
            key={i}
            q={q}
            index={questions.indexOf(q)}
            selected={selected.has(questions.indexOf(q))}
            onToggle={toggle}
          />
        ))
      )}

      {/* Sticky bottom bar */}
      {selectedQuestions.length > 0 && !saved && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'rgba(255,255,255,0.95)', backdropFilter: 'blur(10px)',
          borderTop: '1px solid #e8e4f8',
          padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          zIndex: 100,
        }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: '#374151' }}>
            <strong style={{ color: '#7055C8' }}>{selectedQuestions.length}</strong> questions selected
          </span>
          <button
            onClick={handleSaveToDB}
            disabled={saving}
            style={{
              padding: '10px 28px', borderRadius: 8,
              background: saving
                ? '#a5b4fc'
                : 'linear-gradient(135deg,#7055C8,#C060C0)',
              border: 'none', color: '#fff', fontSize: 14,
              fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer',
              boxShadow: '0 2px 12px rgba(112,85,200,0.35)',
              display: 'flex', alignItems: 'center', gap: 8,
            }}
          >
            {saving ? 'Saving to Database…' : `💾 Save ${selectedQuestions.length} Questions to Bank`}
          </button>
        </div>
      )}

      {saved && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          background: 'linear-gradient(135deg,#059669,#10b981)',
          padding: '14px 32px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
          zIndex: 100, color: '#fff', fontSize: 14, fontWeight: 700,
        }}>
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M4 10L8 14L16 6" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {selectedQuestions.length} questions saved to Question Bank successfully!
        </div>
      )}

      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}