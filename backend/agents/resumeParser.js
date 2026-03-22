const pdfParse = require("pdf-parse");
const axios    = require("axios");

if (typeof DOMMatrix === "undefined") { global.DOMMatrix = class DOMMatrix {}; }

const GROQ_API_KEY = process.env.GROQ_API_KEY;

// ── LLM extraction via Groq ───────────────────────────────────────
// Sends raw resume text to LLM and gets back clean structured JSON.
// Much more reliable than regex for URLs split across lines,
// unusual formats, or non-standard resume layouts.
async function extractWithLLM(resumeText) {
  if (!GROQ_API_KEY) {
    console.warn("[Resume] No GROQ_API_KEY — falling back to regex only");
    return null;
  }

  const prompt = `You are a resume parser. Extract structured data from the resume text below.

Return ONLY a valid JSON object — no markdown, no explanation, no extra text.

Extract these fields:
- full_name: candidate's full name (usually first line)
- email: email address
- phone: phone number if present
- github: full GitHub URL (e.g. https://github.com/username) — look carefully, may be split across lines
- leetcode: full LeetCode URL (e.g. https://leetcode.com/u/username) — look carefully
- linkedin: full LinkedIn URL (e.g. https://linkedin.com/in/username) — look carefully, may be split across lines
- skills: array of technical skills found
- experience: array of {title, company, duration} objects
- education: array of {institution, degree, year} objects  
- projects: array of {name, description} objects
- certifications: array of certification strings
- summary: professional summary if present

IMPORTANT for URLs:
- URLs may be broken across multiple lines in the PDF — reconstruct them fully
- LinkedIn slugs often contain hyphens and numbers like "john-doe-80b9ba262" — include the full slug
- If a URL is partially on one line and continues on next, join them
- Always return complete URLs starting with https://

Resume text:
---
${resumeText.slice(0, 4000)}
---

Return only the JSON object:`;

  try {
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

    const raw   = res.data.choices[0].message.content.trim();
    const clean = raw.replace(/^```json|^```|```$/gm, "").trim();
    const parsed = JSON.parse(clean);

    console.log("[Resume] LLM extracted — GitHub:", parsed.github);
    console.log("[Resume] LLM extracted — LeetCode:", parsed.leetcode);
    console.log("[Resume] LLM extracted — LinkedIn:", parsed.linkedin);

    return parsed;
  } catch (err) {
    console.warn("[Resume] LLM extraction failed:", err.message, "— falling back to regex");
    return null;
  }
}

// ── Regex fallback (used if Groq is down) ────────────────────────
function extractWithRegex(text) {
  // Collapse multiline URLs — run 3 times for deeply split URLs
  let t = text;
  for (let i = 0; i < 3; i++) {
    t = t.replace(/([a-zA-Z0-9/._-])\n([a-zA-Z0-9/._-])/g, "$1$2");
  }

  const githubMatch =
    t.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i) ||
    t.match(/github[:\s]+([a-zA-Z0-9_-]{3,39})/i);
  const githubUrl = githubMatch
    ? githubMatch[0].startsWith("http")
      ? githubMatch[0].trim()
      : `https://github.com/${githubMatch[1].trim()}`
    : null;

  const leetcodeMatch =
    t.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/i) ||
    t.match(/leetcode[:\s]+([a-zA-Z0-9_@-]{3,})/i);
  const leetcodeUrl = leetcodeMatch
    ? leetcodeMatch[0].startsWith("http")
      ? leetcodeMatch[0].trim()
      : `https://leetcode.com/u/${leetcodeMatch[1].trim()}`
    : null;

  const linkedinMatch =
    t.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i) ||
    t.match(/linkedin\.com\/([a-zA-Z0-9_-]+)/i) ||
    t.match(/linkedin[:\s]+([a-zA-Z0-9_-]{3,})/i);
  const linkedinUrl = linkedinMatch
    ? linkedinMatch[0].startsWith("http")
      ? linkedinMatch[0].trim()
      : `https://linkedin.com/in/${linkedinMatch[1].trim()}`
    : null;

  const emailMatch = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const lines      = text.split("\n").map(l => l.trim()).filter(Boolean);

  const skillKeywords = [
    "JavaScript","TypeScript","Python","Java","C++","C#","Go","Rust","PHP","Ruby",
    "React","Angular","Vue","Node.js","Express","Django","Flask","Spring",
    "MySQL","PostgreSQL","MongoDB","Redis","Firebase",
    "AWS","Azure","GCP","Docker","Kubernetes","Git","Linux",
    "Machine Learning","Deep Learning","TensorFlow","PyTorch",
    "REST API","GraphQL","Microservices","CI/CD","Agile","Scrum",
  ];
  const skills = skillKeywords.filter(kw =>
    new RegExp(`\\b${kw.replace(/\./g, "\\.")}\\b`, "i").test(text)
  );

  return {
    full_name:      lines[0] || null,
    email:          emailMatch ? emailMatch[0] : null,
    github:         githubUrl,
    leetcode:       leetcodeUrl,
    linkedin:       linkedinUrl,
    skills,
    experience:     [],
    education:      [],
    projects:       [],
    certifications: [],
    summary:        null,
  };
}

// ── MAIN ──────────────────────────────────────────────────────────
async function parseResume(buffer) {
  if (!buffer) return buildFailure("No buffer provided");

  try {
    const data = await pdfParse(buffer);
    const text = data.text;
    console.log("[Resume] Extracted text length:", text.length);

    // Try LLM first, fall back to regex
    let extracted = await extractWithLLM(text);
    if (!extracted) extracted = extractWithRegex(text);

    // Normalise URLs — ensure they start with https://
    const github   = normaliseUrl(extracted.github,   "github.com");
    const leetcode = normaliseUrl(extracted.leetcode, "leetcode.com");
    const linkedin = normaliseUrl(extracted.linkedin, "linkedin.com");

    console.log("[Resume] Final GitHub URL:", github);
    console.log("[Resume] Final LeetCode URL:", leetcode);
    console.log("[Resume] Final LinkedIn URL:", linkedin);

    const skills = Array.isArray(extracted.skills) ? extracted.skills : [];

    return {
      full_name:      extracted.full_name      || null,
      email:          extracted.email          || null,
      github,
      leetcode,
      linkedin,
      skills,
      certifications: extracted.certifications || [],
      experience:     extracted.experience     || [],
      projects:       extracted.projects       || [],
      education:      extracted.education      || [],
      summary:        extracted.summary        || null,
      raw_text:       text,
      page_count:     data.numpages,
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

// ── Normalise URL helper ──────────────────────────────────────────
function normaliseUrl(url, domain) {
  if (!url) return null;
  url = url.trim().replace(/\s+/g, ""); // remove any spaces inside URL
  if (url.startsWith("http")) return url;
  if (url.includes(domain)) return `https://${url}`;
  return null;
}

function buildFailure(error) {
  return {
    full_name: null, email: null,
    github: null, leetcode: null, linkedin: null,
    skills: [], certifications: [], experience: [], projects: [],
    inference_hints: { primary_tech_stack: [], flags: ["parse_failed"] },
    raw_text: null, data_source: "failed", error,
    fetched_at: new Date().toISOString(),
  };
}

module.exports = { parseResume };