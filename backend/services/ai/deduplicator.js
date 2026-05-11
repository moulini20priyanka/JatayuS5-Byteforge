// services/ai/deduplicator.js
// Removes duplicate questions from AI-generated output before DB insert
// Deduplication is done by normalized question text similarity

/**
 * Normalize a question string for comparison:
 * lowercase, strip punctuation, collapse whitespace
 */
function normalizeText(str) {
  return (str || '')
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Jaccard similarity between two strings (word-set overlap).
 * Returns 0.0 (no overlap) to 1.0 (identical).
 */
function jaccardSimilarity(a, b) {
  const setA = new Set(a.split(' '));
  const setB = new Set(b.split(' '));
  if (setA.size === 0 && setB.size === 0) return 1.0;
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Deduplicate an array of question objects.
 *
 * Two questions are considered duplicates if:
 *  - Their normalized question text Jaccard similarity >= threshold (default 0.85)
 *  - AND they have the same type
 *
 * Keeps the FIRST occurrence, drops subsequent duplicates.
 *
 * @param {object[]} questions  - Raw questions from orchestrator
 * @param {number}   threshold  - Similarity threshold (0–1), default 0.85
 * @returns {{ unique: object[], duplicates: object[], stats: object }}
 */
function deduplicateQuestions(questions, threshold = 0.85) {
  const unique     = [];
  const duplicates = [];
  const seen       = []; // { type, normText } of already-kept questions

  for (const q of questions) {
    const type     = (q.type || q.agentType || 'mcq').toLowerCase();
    const rawText  = q.question || q.description || q.title || q.text || q.problem || '';
    const normText = normalizeText(rawText);

    if (!normText) {
      // Empty question — skip silently
      duplicates.push({ ...q, _dupReason: 'empty_text' });
      continue;
    }

    // Check against every already-kept question of the same type
    let isDuplicate = false;
    for (const s of seen) {
      if (s.type !== type) continue;
      const sim = jaccardSimilarity(normText, s.normText);
      if (sim >= threshold) {
        isDuplicate = true;
        duplicates.push({ ...q, _dupReason: `similarity_${sim.toFixed(2)}_with_"${s.normText.substring(0, 60)}"` });
        break;
      }
    }

    if (!isDuplicate) {
      seen.push({ type, normText });
      unique.push(q);
    }
  }

  const stats = {
    original:   questions.length,
    unique:     unique.length,
    removed:    duplicates.length,
    byType:     {},
  };

  for (const q of unique) {
    const t = (q.type || q.agentType || 'mcq').toLowerCase();
    stats.byType[t] = (stats.byType[t] || 0) + 1;
  }

  if (duplicates.length > 0) {
    console.log(`[Deduplicator] Removed ${duplicates.length} duplicates from ${questions.length} questions → ${unique.length} unique`);
    console.log('[Deduplicator] Duplicate reasons:', duplicates.map(d => d._dupReason));
  }

  return { unique, duplicates, stats };
}

module.exports = { deduplicateQuestions };