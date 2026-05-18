// ── agents/resumeParser.js ────────────────────────────────────────


const pdfParse  = require("pdf-parse");
const axios     = require("axios");
const { trace } = require("../utils/tracer");
const fs       = require("fs");
const path     = require("path");
const os       = require("os");

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const LEETCODE_RESERVED = new Set(["problems","contest","discuss","explore","study-plan","tag","interview","company","assessment","store","subscribe"]);
const GITHUB_RESERVED   = new Set(["features","topics","collections","trending","marketplace","explore","login","signup","about","pricing","contact"]);

function isValidProfileUrl(url, platform) {
  if (!url) return false;
  try {
    const withProto = url.startsWith("http") ? url : `https://${url}`;
    const parsed    = new URL(withProto);
    const path      = parsed.pathname.replace(/\/+$/, "");
    if (platform === "leetcode") {
      const seg = path.replace(/^\/u\//, "/").replace(/^\//, "");
      if (!seg || seg.length < 2) return false;
      return !LEETCODE_RESERVED.has(seg.toLowerCase());
    }
    if (platform === "github") {
      const seg = path.replace(/^\//, "").split("/")[0];
      if (!seg || seg.length < 2 || seg.includes(".")) return false;
      return !GITHUB_RESERVED.has(seg.toLowerCase());
    }
    if (platform === "linkedin") return /\/in\/[a-zA-Z0-9_-]{2,}/.test(path);
    return path.length > 1;
  } catch { return false; }
}

async function extractWithLLM(resumeText) {
  if (!GROQ_API_KEY) { console.warn("[Resume] No GROQ_API_KEY — falling back to regex"); return null; }
  if (!resumeText || resumeText.trim().length < MIN_TEXT_LEN) {
    console.warn("[Resume] Text too short for LLM extraction:", resumeText?.trim().length ?? 0, "chars");
    return null;
  }
  const prompt = `You are a resume parser. Extract structured data from the resume text below.
Return ONLY a valid JSON object — no markdown, no explanation.
Extract: full_name, email, phone, github (full URL), leetcode (full URL), linkedin (full URL), skills (array), experience (array of {title,company,duration}), education (array of {institution,degree,year}), projects (array of {name,description}), certifications (array), summary.
CRITICAL: Never return bare domain URLs without username. Always reconstruct full profile URLs.
Resume:
---
${resumeText.slice(0, 4000)}
---
Return only the JSON:`;
  try {
    const res = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      { model: "llama-3.3-70b-versatile", messages: [{ role: "user", content: prompt }], temperature: 0.1, max_tokens: 1500 },
      { headers: { Authorization: `Bearer ${GROQ_API_KEY}`, "Content-Type": "application/json" }, timeout: 30000 }
    );
    const raw    = res.data.choices[0].message.content.trim();
    const parsed = JSON.parse(raw.replace(/^```json|^```|```$/gm, "").trim());
    console.log("[Resume] LLM extracted — GitHub:", parsed.github   ?? "null", "LeetCode:", parsed.leetcode ?? "null", "LinkedIn:", parsed.linkedin ?? "null");
    return parsed;
  } catch (err) {
    console.warn("[Resume] LLM extraction failed:", err.message, "— falling back to regex");
    return null;
  }
}
// ─────────────────────────────────────────────────────────────────
// D. Regex fallback (original + C++/C# fix)
// ─────────────────────────────────────────────────────────────────
function escapeRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); }

function extractWithRegex(text) {
  let t = text;
  for (let i = 0; i < 3; i++) t = t.replace(/([a-zA-Z0-9/._-])\n([a-zA-Z0-9/._-])/g, "$1$2");

  let githubUrl = null;
  const ghUrlMatch = t.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]{1,39})(?:\/[^\s]*)?/i);
  if (ghUrlMatch) { const u = ghUrlMatch[1]; if (!GITHUB_RESERVED.has(u.toLowerCase()) && !u.includes(".")) githubUrl = `https://github.com/${u}`; }
  if (!githubUrl) { const m = t.match(/github[:\s]+([a-zA-Z0-9_-]{3,39})/i); if (m) githubUrl = `https://github.com/${m[1].trim()}`; }

  let leetcodeUrl = null;
  const lcUrlMatch = t.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/u\/([a-zA-Z0-9_-]{2,})/i);
  if (lcUrlMatch) leetcodeUrl = `https://leetcode.com/u/${lcUrlMatch[1]}`;
  if (!leetcodeUrl) { const m = t.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/([a-zA-Z0-9_-]{2,})(?:\/|$|\s)/i); if (m && !LEETCODE_RESERVED.has(m[1].toLowerCase())) leetcodeUrl = `https://leetcode.com/u/${m[1]}`; }
  if (!leetcodeUrl) { const m = t.match(/([a-zA-Z0-9_-]{2,})\s*[-–]\s*LeetCode\s*Profile/i) || t.match(/LeetCode\s*(?:Profile|ID|Username)?\s*[:\-]\s*([a-zA-Z0-9_-]{2,})/i); if (m && !LEETCODE_RESERVED.has(m[1].toLowerCase())) leetcodeUrl = `https://leetcode.com/u/${m[1].trim()}`; }

  let linkedinUrl = null;
  const liUrlMatch = t.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
  if (liUrlMatch) linkedinUrl = `https://linkedin.com/in/${liUrlMatch[1]}`;
  if (!linkedinUrl) { const m = t.match(/linkedin[:\s]+([a-zA-Z0-9_-]{3,})/i); if (m) linkedinUrl = `https://linkedin.com/in/${m[1].trim()}`; }

  const emailMatch = t.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const lines      = text.split("\n").map(l => l.trim()).filter(Boolean);
  const skillKeywords = ["JavaScript","TypeScript","Python","Java","C++","C#","Go","Rust","PHP","Ruby","React","Angular","Vue","Node.js","Express","Django","Flask","Spring","MySQL","PostgreSQL","MongoDB","Redis","Firebase","AWS","Azure","GCP","Docker","Kubernetes","Git","Linux","Machine Learning","Deep Learning","TensorFlow","PyTorch","REST API","GraphQL","Microservices","CI/CD","Agile","Scrum"];
  const skills = skillKeywords.filter(kw => new RegExp(`\\b${kw.replace(/\./g, "\\.")}\\b`, "i").test(text));
  return { full_name: lines[0] || null, email: emailMatch ? emailMatch[0] : null, github: githubUrl, leetcode: leetcodeUrl, linkedin: linkedinUrl, skills, experience: [], education: [], projects: [], certifications: [], summary: null };
}

function normaliseAndValidate(url, platform) {
  if (!url) return null;
  url = url.trim().replace(/\s+/g, "");
  if (!url) return null;
  const withProto = url.startsWith("http") ? url : `https://${url}`;
  if (!isValidProfileUrl(withProto, platform)) { console.warn(`[Resume] Rejected invalid ${platform} URL: ${withProto}`); return null; }
  return withProto;
}

function buildFailure(error) {
  return { full_name: null, email: null, github: null, leetcode: null, linkedin: null, skills: [], certifications: [], experience: [], projects: [], inference_hints: { primary_tech_stack: [], flags: ["parse_failed"] }, raw_text: null, data_source: "failed", error, fetched_at: new Date().toISOString() };
}

// ─────────────────────────────────────────────────────────────────
// MAIN (original structure)
// ─────────────────────────────────────────────────────────────────
async function parseResume(buffer) {
  if (!buffer) return buildFailure("No buffer provided");
  return trace(
    {
      name:    "resume-parser",
      runType: "chain",
      inputs:  { buffer_size: buffer.length },
      tags:    ["resume-parser", "groq", "pdf"],
    },
    async () => {
      try {
        const buf  = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
        const text = await extractRawText(buf);

        console.log("[Resume] Final text length for extraction:", text.length);

        let extracted = await extractWithLLM(text);
        if (!extracted) extracted = extractWithRegex(text);

        const github   = normaliseAndValidate(extracted.github,   "github");
        const leetcode = normaliseAndValidate(extracted.leetcode, "leetcode");
        const linkedin = normaliseAndValidate(extracted.linkedin, "linkedin");

        console.log("[Resume] Final GitHub:", github   ?? "null", "LeetCode:", leetcode ?? "null", "LinkedIn:", linkedin ?? "null");

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
          page_count:     data.numpages,
          inference_hints: {
            primary_tech_stack: skills.slice(0, 5),
            flags: [skills.length === 0 && "no_skills_found", !github && "no_github_url", !linkedin && "no_linkedin_url"].filter(Boolean),
          },
          data_source: "pdf_parsed",
          fetched_at:  new Date().toISOString(),
        };
      } catch (err) {
        console.error("[Resume] Parse error:", err.message);
        return buildFailure(err.message);
      }
    }
  );
}

module.exports = { parseResume };
