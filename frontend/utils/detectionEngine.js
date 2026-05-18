// frontend/src/utils/detectionEngine.js
// ─── SINGLE SOURCE OF TRUTH ───────────────────────────────────────────────────
// Both CodeExam.jsx and AIDetectionPage.jsx import from here.
// This guarantees the AI score shown in AIDetectionPage is IDENTICAL
// to what was computed when the student submitted in CodeExam.

// ─── Java-focused AI patterns ─────────────────────────────────────────────────
export const AI_PATTERNS = [
  { re: /HashMap<|new\s+HashMap/,           label: 'HashMap pattern',          weight: 15, explanation: 'Classic AI-suggested optimal approach using Java HashMap' },
  { re: /Integer\.parseInt|Long\.parseLong/, label: 'Integer.parseInt idiom',  weight: 8,  explanation: 'Boilerplate parsing pattern common in AI-generated Java' },
  { re: /Arrays\.sort|Collections\.sort/,   label: 'Sort API call',            weight: 8,  explanation: 'Standard library sort — heavily used in AI completions' },
  { re: /System\.out\.println/,             label: 'System.out.println',       weight: 5,  explanation: 'Debug/output pattern frequently inserted by AI' },
  { re: /Scanner\s+sc\s*=|Scanner\s+scanner/,label:'Scanner boilerplate',      weight: 7,  explanation: 'AI-generated Scanner input boilerplate' },
  { re: /BufferedReader|InputStreamReader/,  label: 'BufferedReader pattern',  weight: 8,  explanation: 'Fast-IO pattern almost always AI-suggested in competitive Java' },
  { re: /Map\.Entry|entrySet\(\)/,          label: 'Map.Entry iteration',      weight: 10, explanation: 'Verbose iteration pattern typical of AI code generation' },
  { re: /import\s+java\.util\.\*\s*;/,      label: 'Wildcard import',         weight: 5,  explanation: 'Wildcard imports are AI-preferred over specific imports' },
  { re: /\bfor\s*\(\s*int\s+i\s*=\s*0\s*;/, label: 'Standard for-loop idiom', weight: 6,  explanation: 'Formulaic indexed loop structure preferred by code generators' },
  { re: /new\s+ArrayList<>|new\s+LinkedList<>/,label:'Collection init',        weight: 6,  explanation: 'Generic collection initialization common in AI Java code' },
];

// Reference Java solutions used for structural similarity
export const JAVA_REF_SOLUTIONS = [
  `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        HashMap<Integer,Integer> map = new HashMap<>();
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        for (int i = 0; i < n; i++) {
            int x = sc.nextInt();
            System.out.println(map.getOrDefault(x, 0));
            map.put(x, map.getOrDefault(x, 0) + 1);
        }
    }
}`,
  `import java.util.*;
import java.io.*;
public class Solution {
    public static void main(String[] args) throws Exception {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        int n = Integer.parseInt(br.readLine().trim());
        int[] arr = Arrays.stream(br.readLine().trim().split(" "))
            .mapToInt(Integer::parseInt).toArray();
        Arrays.sort(arr);
        System.out.println(arr[0] + " " + arr[n-1]);
    }
}`,
  `import java.util.*;
public class Solution {
    public static void main(String[] args) {
        Scanner sc = new Scanner(System.in);
        int n = sc.nextInt();
        List<Integer> list = new ArrayList<>();
        for (int i = 0; i < n; i++) list.add(sc.nextInt());
        Collections.sort(list);
        for (int x : list) System.out.print(x + " ");
    }
}`,
];

// ─── Tokenize (strip comments + whitespace) ───────────────────────────────────
export function tokenize(code) {
  return code
    .replace(/\/\/.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(/\b/)
    .filter(t => t.trim().length > 0);
}

// ─── Jaccard similarity ───────────────────────────────────────────────────────
export function jaccard(a, b) {
  const sa = new Set(tokenize(a));
  const sb = new Set(tokenize(b));
  const inter = [...sa].filter(t => sb.has(t)).length;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : Math.round((inter / union) * 100);
}

// ─── MAIN DETECTION FUNCTION ──────────────────────────────────────────────────
// Returns { aiScore, simScore, verdict, patternsFound, refSimilarities }
export function analyzeCode(code) {
  if (!code || code.trim().length < 10) {
    return { aiScore: 0, simScore: 0, verdict: 'Human Written', patternsFound: [], refSimilarities: [] };
  }

  // 1. AI pattern matching
  const patternsFound = [];
  let weightTotal = 0;
  for (const p of AI_PATTERNS) {
    if (p.re.test(code)) {
      patternsFound.push({ label: p.label, explanation: p.explanation, weight: p.weight });
      weightTotal += p.weight;
    }
  }
  const aiScore = Math.min(100, Math.round(weightTotal * 2));

  // 2. Structural similarity vs reference solutions
  const refSimilarities = JAVA_REF_SOLUTIONS.map((ref, i) => ({
    label: `Java Reference ${i + 1}`,
    similarity: jaccard(code, ref),
  }));
  const maxRefSim = Math.max(0, ...refSimilarities.map(r => r.similarity));

  // 3. Final combined score
  const simScore = Math.min(100, Math.round(aiScore * 0.6 + maxRefSim * 0.4));

  // 4. Verdict
  let verdict = 'Human Written';
  if      (aiScore >= 70 || simScore >= 70) verdict = 'AI Generated';
  else if (aiScore >= 50 || simScore >= 50) verdict = 'Likely AI';
  else if (aiScore >= 30 || simScore >= 30) verdict = 'Possibly AI';

  return { aiScore, simScore, verdict, patternsFound, refSimilarities };
}

// ─── Code stats ───────────────────────────────────────────────────────────────
export function getCodeStats(code) {
  return {
    lines:         code.split('\n').filter(l => l.trim()).length,
    hasComments:   /\/\/|\/\*/.test(code),
    hasConsoleLog: /System\.out\.print|console\.log/.test(code),
    charCount:     code.length,
  };
}

// ─── Build a detection record ─────────────────────────────────────────────────
export function buildDetectionRecord({ studentId, studentName, email, branch, batch, college, code, tcResults = [], totalCases = 0, examId, examName }) {
  const { aiScore, simScore, verdict, patternsFound, refSimilarities } = analyzeCode(code);
  const codeStats = getCodeStats(code);
  const passed = tcResults.filter(r => r.passed).length;

  return {
    student_id:       String(studentId || 'unknown'),
    name:             studentName || 'Student',
    email:            email || '',
    branch:           branch || '',
    batch:            batch || '',
    college:          college || '',
    ai_score:         aiScore,
    similarity_score: simScore,
    verdict,
    viva_result:      aiScore >= 50 ? 'AI Text' : 'Humanized Text',
    matched_with:     null,
    patterns_found:   patternsFound,
    ref_similarities: refSimilarities,
    code_stats:       codeStats,
    test_passed:      passed,
    test_total:       totalCases,
    exam_id:          String(examId || 'unknown'),
    exam_name:        examName || String(examId || 'unknown'),
    language:         'java',
    submitted_at:     new Date().toISOString(),
    code_snippet:     code.slice(0, 500),
    live:             true,
    // Fingerprint: hash of exam_id + student_id for exact lookup
    record_key:       `${String(examId || 'unknown')}__${String(studentId || 'unknown')}`,
  };
}

// ─── Persist to localStorage ──────────────────────────────────────────────────
export function persistDetectionRecord(record) {
  try {
    // Main list: keyed by record_key for exact replacement
    const existing = (() => {
      try { return JSON.parse(localStorage.getItem('ai_detection_records') || '[]'); }
      catch { return []; }
    })();
    const idx = existing.findIndex(r => r.record_key === record.record_key);
    if (idx >= 0) existing[idx] = record;
    else existing.push(record);

    localStorage.setItem('ai_detection_records', JSON.stringify(existing));

    // Per-key lookups for exact fetch by exam+student
    localStorage.setItem(`detect__${record.record_key}`, JSON.stringify(record));
    localStorage.setItem('last_detection_record', JSON.stringify(record));

    // Ping for cross-tab update
    localStorage.setItem('detection_ping', Date.now().toString());
  } catch (e) {
    console.warn('Detection persist failed:', e);
  }
}

// ─── Read all records (optionally filter by examId) ───────────────────────────
export function readDetectionRecords(filterExamId = '') {
  try {
    const all = JSON.parse(localStorage.getItem('ai_detection_records') || '[]');
    if (!filterExamId) return all;
    return all.filter(r => String(r.exam_id) === String(filterExamId));
  } catch { return []; }
}

// ─── Read one record by examId + studentId ────────────────────────────────────
export function readOneRecord(examId, studentId) {
  try {
    const key = `detect__${String(examId)}__${String(studentId)}`;
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}