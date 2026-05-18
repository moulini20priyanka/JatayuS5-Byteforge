// ── agents/resumeParser.js ────────────────────────────────────────
const pdfParse   = require("pdf-parse");
const axios      = require("axios");
const fs         = require("fs");
const path       = require("path");
const os         = require("os");
const { trace }  = require("../utils/tracer");

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MIN_TEXT_LEN = 80;

// ── Canvas setup (unchanged) ──────────────────────────────────────
let napiCanvas = null;
let SafeCanvasFactory = null;

try {
  napiCanvas = require("@napi-rs/canvas");
  const testPath = new napiCanvas.Path2D();
  testPath.moveTo(0, 0);
  napiCanvas.createCanvas(1, 1);
  global.Path2D = napiCanvas.Path2D;

  SafeCanvasFactory = class SafeCanvasFactory {
    constructor(_opts = {}) {}
    create(width, height) {
      const canvas = napiCanvas.createCanvas(width, height);
      return { canvas, context: canvas.getContext("2d") };
    }
    reset(cc, w, h) { cc.canvas.width = w; cc.canvas.height = h; }
    destroy(cc) {
      cc.canvas.width = 0; cc.canvas.height = 0;
      cc.canvas = null;    cc.context = null;
    }
    _createCanvas(w, h) { return napiCanvas.createCanvas(w, h); }
  };

  console.log("[Resume] @napi-rs/canvas OK — SafeCanvasFactory ready");
} catch (e) {
  console.error("[Resume] ⚠️  @napi-rs/canvas failed:", e.message);
  console.error("[Resume] Fix: Stop server → Run as Admin:");
  console.error("[Resume]   Remove-Item -Recurse -Force node_modules\\@napi-rs");
  console.error("[Resume]   npm install --save-exact pdf-to-img@5.0.0");
  console.error("[Resume]   node server.js");
}

if (typeof DOMMatrix === "undefined") { global.DOMMatrix = class DOMMatrix {}; }

function getPdfToImgVersion() {
  try {
    const p = path.join(require.resolve("pdf-to-img"), "../../package.json");
    return JSON.parse(fs.readFileSync(p, "utf8")).version || null;
  } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────
// A. Extract raw text from PDF
// ─────────────────────────────────────────────────────────────────
async function extractRawText(buffer) {
  try {
    const data = await pdfParse(buffer);
    const text = (data.text || "").trim();
    console.log("[Resume] pdf-parse extracted text length:", text.length);
    if (text.length >= MIN_TEXT_LEN) return text;
  } catch (e) {
    console.warn("[Resume] pdf-parse failed:", e.message);
  }

  console.log("[Resume] Text too short — PDF likely image-based. Trying Groq Vision...");
  return await extractWithVision(buffer);
}

// ─────────────────────────────────────────────────────────────────
// B. Groq Vision — traced so tokens show in LangSmith
// ─────────────────────────────────────────────────────────────────
async function extractWithVision(buffer) {
  if (!GROQ_API_KEY) {
    console.warn("[Resume] No GROQ_API_KEY — cannot use Groq Vision");
    return "";
  }
  if (!SafeCanvasFactory) {
    console.error("[Resume] Canvas not ready — see startup errors above");
    return "";
  }

  const ver = getPdfToImgVersion();
  if (!ver || parseInt(ver.split(".")[0], 10) !== 5) {
    console.error("[Resume] Wrong pdf-to-img version. Run: npm remove pdf-to-img && npm install --save-exact pdf-to-img@5.0.0");
    return "";
  }

  let pdfRender;
  try {
    pdfRender = await import("pdf-to-img");
  } catch (e) {
    console.warn("[Resume] Failed to import pdf-to-img:", e.message);
    return "";
  }

  const tmpPdf = path.join(os.tmpdir(), `resume-${Date.now()}.pdf`);
  try {
    fs.writeFileSync(tmpPdf, Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer));

    const doc = await pdfRender.pdf(tmpPdf, {
      scale: 2.0,
      docInitParams: { CanvasFactory: SafeCanvasFactory },
    });

    const pageCount = Math.min(doc.length, 3);
    const images    = [];
    for (let i = 1; i <= pageCount; i++) {
      const imgData = await doc.getPage(i);
      images.push(Buffer.from(imgData).toString("base64"));
    }
    console.log(`[Resume] pdf-to-img rendered ${images.length} page(s) for Groq Vision`);

    // ── Traced Groq Vision call ───────────────────────────────────
    const extractedText = await trace(
      {
        name:    "resume-parser-vision",
        runType: "llm",
        inputs:  { model: "llama-4-scout", pages: images.length },
        tags:    ["resume-parser", "groq", "vision"],
      },
      async () => {
        const content = [
          ...images.map((b64) => ({
            type:      "image_url",
            image_url: { url: `data:image/png;base64,${b64}` },
          })),
          {
            type: "text",
            text: `This is a resume. Extract ALL visible text exactly as it appears.
Include: full name, email, phone, GitHub URL, LeetCode URL, LinkedIn URL,
skills, education, experience, projects, certifications, and summary.
Return ONLY the raw text content — preserve the layout, no commentary.`,
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

        const text  = (res.data.choices[0].message.content || "").trim();
        const usage = res.data.usage
          ? {
              prompt_tokens:     res.data.usage.prompt_tokens     || 0,
              completion_tokens: res.data.usage.completion_tokens || 0,
              total_tokens:      res.data.usage.total_tokens      || 0,
            }
          : null;

        console.log(`[Resume] Groq Vision extracted text length: ${text.length}`);
        console.log("[Resume] Vision tokens:", usage);

        return { __result: text, __usage: usage };
      }
    );

    return extractedText || "";

  } catch (e) {
    const msg = e.response?.data?.error?.message || e.message;
    console.warn("[Resume] Groq Vision failed:", msg);
    return "";
  } finally {
    try { fs.unlinkSync(tmpPdf); } catch {}
  }
}

// ─────────────────────────────────────────────────────────────────
// C. LLM structured extraction — traced
// ─────────────────────────────────────────────────────────────────
async function extractWithLLM(resumeText) {
  if (!GROQ_API_KEY) {
    console.warn("[Resume] No GROQ_API_KEY — falling back to regex only");
    return null;
  }
  if (!resumeText || resumeText.trim().length < MIN_TEXT_LEN) {
    console.warn("[Resume] Text too short for LLM extraction:", resumeText?.trim().length ?? 0, "chars");
    return null;
  }

  const prompt = `You are a resume parser. Extract structured data from the resume text below.

Return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Extract these fields:
- full_name: candidate's full name (usually first line)
- email: email address
- phone: phone number if present
- github: full GitHub profile URL (e.g. https://github.com/username)
- leetcode: full LeetCode profile URL (e.g. https://leetcode.com/u/username)
- linkedin: full LinkedIn profile URL (e.g. https://linkedin.com/in/username)
- skills: array of technical skills found
- experience: array of {title, company, duration} objects
- education: array of {institution, degree, year} objects
- projects: array of {name, description} objects
- certifications: array of certification strings
- summary: professional summary if present

CRITICAL RULES for URLs:
- URLs may be broken across multiple lines — reconstruct them fully
- For LeetCode: "kamala vasanthi - LeetCode Profile" → https://leetcode.com/u/kamala_vasanthi
- For GitHub: "github.com/KAMALA2004" → https://github.com/KAMALA2004
- For LinkedIn: "linkedin.com/in/kamala-vasanthi-srinivasan" → https://linkedin.com/in/kamala-vasanthi-srinivasan
- NEVER return just the bare domain (not "https://leetcode.com" alone)
- Always return complete URLs starting with https://

Resume text:
---
${resumeText.slice(0, 4000)}
---

Return only the JSON object:`;

  try {
    // ── Traced LLM extraction call ────────────────────────────────
    const parsed = await trace(
      {
        name:    "resume-parser-llm",
        runType: "llm",
        inputs:  { model: "llama-3.3-70b-versatile", textLength: resumeText.length },
        tags:    ["resume-parser", "groq", "llm"],
      },
      async () => {
        const res = await axios.post(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            model:       "llama-3.3-70b-versatile",
            messages:    [{ role: "user", content: prompt }],
            temperature: 0.1,
            max_tokens:  1500,
          },
          {
            headers: {
              Authorization:  `Bearer ${GROQ_API_KEY}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        const usage = res.data.usage
          ? {
              prompt_tokens:     res.data.usage.prompt_tokens     || 0,
              completion_tokens: res.data.usage.completion_tokens || 0,
              total_tokens:      res.data.usage.total_tokens      || 0,
            }
          : null;

        const raw    = res.data.choices[0].message.content.trim();
        const clean  = raw.replace(/^```json|^```|```$/gm, "").trim();
        const parsed = JSON.parse(clean);

        console.log("[Resume] LLM tokens:", usage);
        console.log("[Resume] LLM extracted — GitHub:",   parsed.github   ?? "null");
        console.log("[Resume] LLM extracted — LeetCode:", parsed.leetcode ?? "null");
        console.log("[Resume] LLM extracted — LinkedIn:", parsed.linkedin ?? "null");

        return { __result: parsed, __usage: usage };
      }
    );

    return parsed;
  } catch (err) {
    console.warn("[Resume] LLM extraction failed:", err.message, "— falling back to regex");
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────
// D. Regex fallback (unchanged)
// ─────────────────────────────────────────────────────────────────
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function extractWithRegex(text) {
  let t = text;
  for (let i = 0; i < 3; i++) {
    t = t.replace(/([a-zA-Z0-9/._-])\n([a-zA-Z0-9/._-])/g, "$1$2");
  }

  const githubMatch =
    t.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i) ||
    t.match(/github[:\s]+([a-zA-Z0-9_-]{3,39})/i);
  const githubUrl = githubMatch
    ? githubMatch[0].startsWith("http") ? githubMatch[0].trim()
    : `https://github.com/${githubMatch[1].trim()}` : null;

  const leetcodeMatch =
    t.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/u\/([a-zA-Z0-9_-]+)/i)  ||
    t.match(/([a-zA-Z0-9_-]{2,})\s*[-–]\s*LeetCode\s*Profile/i)               ||
    t.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/([a-zA-Z0-9_-]+)/i)     ||
    t.match(/leetcode[:\s]+([a-zA-Z0-9_@-]{3,})/i);
  const leetcodeUrl = leetcodeMatch
    ? leetcodeMatch[0].startsWith("http") ? leetcodeMatch[0].trim()
    : `https://leetcode.com/u/${leetcodeMatch[1].trim()}` : null;

  const linkedinMatch =
    t.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i) ||
    t.match(/linkedin\.com\/([a-zA-Z0-9_-]+)/i)                               ||
    t.match(/linkedin[:\s]+([a-zA-Z0-9_-]{3,})/i);
  const linkedinUrl = linkedinMatch
    ? linkedinMatch[0].startsWith("http") ? linkedinMatch[0].trim()
    : `https://linkedin.com/in/${linkedinMatch[1].trim()}` : null;

  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const lines      = text.split("\n").map((l) => l.trim()).filter(Boolean);

  const skillKeywords = [
    "JavaScript", "TypeScript", "Python", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby",
    "React", "Angular", "Vue", "Node.js", "Express", "Django", "Flask", "Spring",
    "MySQL", "PostgreSQL", "MongoDB", "Redis", "Firebase",
    "AWS", "Azure", "GCP", "Docker", "Kubernetes", "Git", "Linux",
    "Machine Learning", "Deep Learning", "TensorFlow", "PyTorch",
    "REST API", "GraphQL", "Microservices", "CI/CD", "Agile", "Scrum",
  ];
  const skills = skillKeywords.filter((kw) => {
    try {
      return new RegExp(`(?:^|[^a-zA-Z0-9])${escapeRegex(kw)}(?:[^a-zA-Z0-9]|$)`, "i").test(t);
    } catch { return t.toLowerCase().includes(kw.toLowerCase()); }
  });

  return {
    full_name: lines[0] || null,
    email:     emailMatch ? emailMatch[0] : null,
    github:    githubUrl,
    leetcode:  leetcodeUrl,
    linkedin:  linkedinUrl,
    skills,
    experience: [], education: [], projects: [], certifications: [], summary: null,
  };
}

// ─────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────
async function parseResume(buffer) {
  if (!buffer) return buildFailure("No buffer provided");
  try {
    const buf  = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    const text = await extractRawText(buf);

    console.log("[Resume] Final text length for extraction:", text.length);

    let extracted = await extractWithLLM(text);
    if (!extracted) extracted = extractWithRegex(text);

    const github   = normaliseUrl(extracted.github,   "github.com");
    const leetcode = normaliseUrl(extracted.leetcode, "leetcode.com");
    const linkedin = normaliseUrl(extracted.linkedin, "linkedin.com");

    console.log("[Resume] Final GitHub URL:",   github   ?? "null");
    console.log("[Resume] Final LeetCode URL:", leetcode ?? "null");
    console.log("[Resume] Final LinkedIn URL:", linkedin ?? "null");

    const skills = Array.isArray(extracted.skills) ? extracted.skills : [];

    return {
      full_name:      extracted.full_name || null,
      email:          extracted.email     || null,
      github, leetcode, linkedin, skills,
      certifications: extracted.certifications || [],
      experience:     extracted.experience     || [],
      projects:       extracted.projects       || [],
      education:      extracted.education      || [],
      summary:        extracted.summary        || null,
      raw_text:       text,
      inference_hints: {
        primary_tech_stack: skills.slice(0, 5),
        flags: [
          skills.length === 0 && "no_skills_found",
          !github             && "no_github_url",
          !linkedin           && "no_linkedin_url",
        ].filter(Boolean),
      },
      data_source: "pdf_parsed",
      fetched_at:  new Date().toISOString(),
    };
  } catch (err) {
    console.error("[Resume] Parse error:", err.message);
    return buildFailure(err.message);
  }
}

function normaliseUrl(url, domain) {
  if (!url) return null;
  url = url.trim().replace(/\s+/g, "");
  if (url.startsWith("http")) return url;
  if (url.includes(domain)) return `https://${url}`;
  return null;
}

function buildFailure(error) {
  return {
    full_name: null, email: null, github: null, leetcode: null, linkedin: null,
    skills: [], certifications: [], experience: [], projects: [],
    inference_hints: { primary_tech_stack: [], flags: ["parse_failed"] },
    raw_text: null, data_source: "failed", error,
    fetched_at: new Date().toISOString(),
  };
}

module.exports = { parseResume };