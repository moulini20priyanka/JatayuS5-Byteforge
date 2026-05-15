/**
 * resumeParser.js
 *
 * Pipeline:
 *  1. pdf-parse              → text-layer PDFs (fast)
 *  2. pdf-to-img@5 + Groq Vision → design-tool PDFs (Canva/Figma/Word with no text layer)
 *
 * One-time setup:
 *   npm install --ignore-scripts pdf-to-img@5
 */

const pdfParse = require("pdf-parse");
const axios    = require("axios");
const fs       = require("fs");
const path     = require("path");
const os       = require("os");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MIN_TEXT_LEN = 80;

const LEETCODE_RESERVED = new Set([
  "problems","contest","discuss","explore","study-plan","tag",
  "interview","company","assessment","store","subscribe",
]);
const GITHUB_RESERVED = new Set([
  "features","topics","collections","trending","marketplace",
  "explore","login","signup","about","pricing","contact",
]);

function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

// ── Strategy 1: pdf-parse ─────────────────────────────────────────
async function tryPdfParse(buf) {
  try {
    const data = await pdfParse(buf, { max: 0 });
    const text = (data.text || "").trim();
    console.log(`[Resume] pdf-parse -> ${text.length} chars`);
    return text;
  } catch (e) {
    console.warn("[Resume] pdf-parse failed:", e.message);
    return "";
  }
}

// ── Strategy 2: pdf-to-img@5 (WASM) + Groq Vision ────────────────
async function tryVisionOCR(buf) {
  if (!GROQ_API_KEY) {
    console.warn("[Resume] No GROQ_API_KEY — cannot use vision");
    return "";
  }

  let pdfRender;
  try {
    pdfRender = require("pdf-to-img");
  } catch (e) {
    console.warn("[Resume] pdf-to-img not installed. Run: npm install --ignore-scripts pdf-to-img@5");
    return "";
  }

  const tmpPdf = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`);
  try {
    fs.writeFileSync(tmpPdf, buf);

    const doc       = await pdfRender.pdf(tmpPdf, { scale: 2.0 });
    const pageCount = Math.min(doc.length, 3);

    const images = [];
    for (let i = 1; i <= pageCount; i++) {
      const imgData = await doc.getPage(i);
      images.push(Buffer.from(imgData).toString("base64"));
    }
    console.log(`[Resume] pdf-to-img rendered ${images.length} page(s)`);

    // Send pages to Groq Vision for text extraction
    const content = [
      ...images.map(b64 => ({
        type: "image_url",
        image_url: { url: `data:image/png;base64,${b64}` },
      })),
      {
        type: "text",
        text: `This is a resume. Extract ALL visible text exactly as it appears.
Include name, email, phone, GitHub URL, LeetCode URL, LinkedIn URL,
skills, education, experience, projects, certifications, and summary.
Return ONLY the raw extracted text — no commentary.`,
      },
    ];

    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model:       "meta-llama/llama-4-scout-17b-16e-instruct",
        messages:    [{ role: "user", content }],
        temperature: 0.1,
        max_tokens:  3000,
      },
      {
        headers: {
          Authorization:  `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 60000,
      }
    );

    const text = (res.data.choices[0].message.content || "").trim();
    console.log(`[Resume] Groq vision -> ${text.length} chars`);
    return text;

  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.warn("[Resume] Vision OCR failed:", msg);
    return "";
  } finally {
    try { fs.unlinkSync(tmpPdf); } catch {}
  }
}

// ── LLM structured extraction ─────────────────────────────────────
async function extractWithLLM(text) {
  if (!GROQ_API_KEY || text.trim().length < MIN_TEXT_LEN) {
    console.warn("[Resume] Skipping LLM — no key or text too short:", text.trim().length);
    return null;
  }

  const prompt = `You are a resume parser. Extract structured data from the resume text below.
Return ONLY valid JSON — no markdown, no explanation.

Fields:
- full_name, email, phone
- github:   full URL https://github.com/USERNAME   (null if not found)
- leetcode: full URL https://leetcode.com/u/USERNAME (null if not found)
- linkedin: full URL https://linkedin.com/in/SLUG  (null if not found)
- skills: string[]
- experience: {title, company, duration}[]
- education:  {institution, degree, year}[]
- projects:   {name, description}[]
- certifications: string[]
- summary: string or null

URL RULES — always reconstruct full URLs:
- "kamala vasanthi - LeetCode Profile" → https://leetcode.com/u/kamala_vasanthi
- "github.com/KAMALA2004"              → https://github.com/KAMALA2004
- "linkedin.com/in/kamala-vasanthi-srinivasan" → https://linkedin.com/in/kamala-vasanthi-srinivasan
- NEVER return a bare domain with no path (not just "https://leetcode.com")

Resume:
---
${text.slice(0, 4500)}
---`;

  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.3-70b-versatile",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1500,
      },
      {
        headers: {
          Authorization: `Bearer ${GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );
    const raw    = res.data.choices[0].message.content.trim();
    const clean  = raw.replace(/^```json\s*|^```\s*|```\s*$/gm, "").trim();
    const parsed = JSON.parse(clean);
    console.log("[Resume] LLM github:",   parsed.github   ?? "null");
    console.log("[Resume] LLM leetcode:", parsed.leetcode ?? "null");
    console.log("[Resume] LLM linkedin:", parsed.linkedin ?? "null");
    return parsed;
  } catch (e) {
    console.warn("[Resume] LLM failed:", e.message);
    return null;
  }
}

// ── Regex fallback ────────────────────────────────────────────────
function extractWithRegex(text) {
  let t = text;
  for (let i = 0; i < 4; i++) {
    t = t.replace(/([a-zA-Z0-9/._-])\n([a-zA-Z0-9/._-])/g, "$1$2");
  }

  let github = null;
  const ghM = t.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]{1,39})/i);
  if (ghM && !GITHUB_RESERVED.has(ghM[1].toLowerCase()) && !ghM[1].includes("."))
    github = `https://github.com/${ghM[1]}`;

  let leetcode = null;
  const lcM = t.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/u\/([a-zA-Z0-9_-]{2,})/i)
           || t.match(/([a-zA-Z0-9_-]{2,})\s*[-–]\s*LeetCode\s*Profile/i)
           || t.match(/leetcode\.com\/([a-zA-Z0-9_-]{2,})(?:\/|$|\s)/i);
  if (lcM && !LEETCODE_RESERVED.has(lcM[1].toLowerCase()))
    leetcode = `https://leetcode.com/u/${lcM[1].trim()}`;

  let linkedin = null;
  const liM = t.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (liM) linkedin = `https://linkedin.com/in/${liM[1]}`;

  const emailM = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const lines  = text.split("\n").map(l => l.trim()).filter(Boolean);

  const SKILLS = [
    "JavaScript","TypeScript","Python","Java","C++","C#","Go","Rust","PHP","Ruby",
    "React","Angular","Vue","Node.js","Express.js","Express","Django","Flask","Spring",
    "MySQL","PostgreSQL","MongoDB","Redis","Firebase","SQL","HTML","CSS","Bootstrap","Tailwind",
    "AWS","Azure","GCP","Docker","Kubernetes","Git","Linux",
    "Machine Learning","Deep Learning","TensorFlow","PyTorch","NLP",
    "REST API","GraphQL","Microservices","CI/CD","Agile","Scrum",
  ];
  const skills = SKILLS.filter(kw => {
    try {
      return new RegExp(`(?:^|[^a-zA-Z0-9])${escapeRegex(kw)}(?:[^a-zA-Z0-9]|$)`, "i").test(t);
    } catch { return t.toLowerCase().includes(kw.toLowerCase()); }
  });

  return {
    full_name: lines[0] || null,
    email: emailM?.[0] || null,
    github, leetcode, linkedin, skills,
    experience: [], education: [], projects: [], certifications: [], summary: null,
  };
}

// ── URL normalisation ─────────────────────────────────────────────
function normalise(url, platform) {
  if (!url) return null;
  const u    = url.trim().replace(/\s+/g, "");
  const full = u.startsWith("http") ? u : `https://${u}`;
  try {
    const p = new URL(full).pathname.replace(/\/+$/, "");
    if (platform === "leetcode") {
      const seg = p.replace(/^\/u\//, "/").replace(/^\//, "");
      if (seg.length < 2 || LEETCODE_RESERVED.has(seg.toLowerCase())) { console.warn("[Resume] Rejected leetcode:", full); return null; }
    } else if (platform === "github") {
      const seg = p.replace(/^\//, "").split("/")[0];
      if (seg.length < 2 || GITHUB_RESERVED.has(seg.toLowerCase()) || seg.includes(".")) { console.warn("[Resume] Rejected github:", full); return null; }
    } else if (platform === "linkedin") {
      if (!/\/in\/[a-zA-Z0-9_-]{2,}/.test(p)) { console.warn("[Resume] Rejected linkedin:", full); return null; }
    }
  } catch { return null; }
  return full;
}

// ── Main ──────────────────────────────────────────────────────────
async function parseResume(buffer) {
  if (!buffer) return buildFailure("No buffer provided");

  try {
    const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    console.log(`[Resume] size=${buf.length}B  header="${buf.slice(0,5).toString("ascii")}"`);

    let text = await tryPdfParse(buf);

    if (text.length < MIN_TEXT_LEN) {
      console.log("[Resume] No text layer — switching to Groq Vision pipeline");
      const vision = await tryVisionOCR(buf);
      if (vision && vision.length > text.length) text = vision;
    }

    if (text.length < MIN_TEXT_LEN) {
      console.warn("[Resume] WARNING: could not extract text from PDF");
    }

    let extracted = await extractWithLLM(text);
    if (!extracted) extracted = extractWithRegex(text);

    const github   = normalise(extracted.github,   "github");
    const leetcode = normalise(extracted.leetcode, "leetcode");
    const linkedin = normalise(extracted.linkedin, "linkedin");

    console.log("[Resume] FINAL github:",   github   ?? "null");
    console.log("[Resume] FINAL leetcode:", leetcode ?? "null");
    console.log("[Resume] FINAL linkedin:", linkedin ?? "null");

    const skills = Array.isArray(extracted.skills) ? extracted.skills : [];

    return {
      full_name:      extracted.full_name      || null,
      email:          extracted.email          || null,
      github, leetcode, linkedin, skills,
      certifications: extracted.certifications || [],
      experience:     extracted.experience     || [],
      projects:       extracted.projects       || [],
      education:      extracted.education      || [],
      summary:        extracted.summary        || null,
      raw_text:       text,
      inference_hints: {
        primary_tech_stack: skills.slice(0, 5),
        text_length: text.length,
        flags: [
          text.length < MIN_TEXT_LEN && "text_extraction_failed",
          skills.length === 0        && "no_skills_found",
          !github                    && "no_github_url",
          !linkedin                  && "no_linkedin_url",
        ].filter(Boolean),
      },
      data_source: "pdf_parsed",
      fetched_at:  new Date().toISOString(),
    };

  } catch (err) {
    console.error("[Resume] Fatal:", err.message);
    return buildFailure(err.message);
  }
}

function buildFailure(error) {
  return {
    full_name: null, email: null,
    github: null, leetcode: null, linkedin: null,
    skills: [], certifications: [], experience: [], projects: [],
    inference_hints: { primary_tech_stack: [], flags: ["parse_failed"], text_length: 0 },
    raw_text: null, data_source: "failed", error,
    fetched_at: new Date().toISOString(),
  };
}

module.exports = { parseResume };