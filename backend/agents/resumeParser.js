const pdfParse = require("pdf-parse");
const axios    = require("axios");

if (typeof DOMMatrix === "undefined") { global.DOMMatrix = class DOMMatrix {}; }

const GROQ_API_KEY = process.env.GROQ_API_KEY;

const LEETCODE_RESERVED = new Set([
  'problems','contest','discuss','explore','study-plan','tag',
  'interview','company','assessment','store','subscribe',
]);
const GITHUB_RESERVED = new Set([
  'features','topics','collections','trending','marketplace',
  'explore','login','signup','about','pricing','contact',
]);

function isValidProfileUrl(url, platform) {
  if (!url) return false;
  try {
    const withProto = url.startsWith("http") ? url : `https://${url}`;
    const parsed    = new URL(withProto);
    const path      = parsed.pathname.replace(/\/+$/, ""); // strip trailing slashes

    if (platform === "leetcode") {
      if (!path || path.length < 2) return false;
      const seg = path.replace(/^\/u\//, "/").replace(/^\//, "");
      if (!seg || seg.length < 2) return false;
      if (LEETCODE_RESERVED.has(seg.toLowerCase())) return false;
      return true;
    }

    if (platform === "github") {
      if (!path || path.length < 2) return false;
      const seg = path.replace(/^\//, "").split("/")[0];
      if (!seg || seg.length < 2) return false;
      if (GITHUB_RESERVED.has(seg.toLowerCase())) return false;
      // GitHub usernames can't contain dots
      if (seg.includes(".")) return false;
      return true;
    }

    if (platform === "linkedin") {
      // Must contain /in/something
      return /\/in\/[a-zA-Z0-9_-]{2,}/.test(path);
    }

    return path.length > 1;
  } catch {
    return false;
  }
}


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
- For LeetCode: the resume may say "username - LeetCode Profile" or "leetcode.com/u/username"
  → ALWAYS return the full URL: https://leetcode.com/u/USERNAME
  → If you only find the bare domain "leetcode.com" with NO username, return null
- For GitHub: return https://github.com/USERNAME — if no username found, return null
- For LinkedIn: return https://linkedin.com/in/SLUG — if no /in/slug found, return null
- NEVER return just https://leetcode.com or https://github.com or https://linkedin.com
- URLs may be broken across multiple lines in the PDF — reconstruct them fully
- LinkedIn slugs often contain hyphens like "john-doe-80b9ba262" — include the full slug

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

    const raw    = res.data.choices[0].message.content.trim();
    const clean  = raw.replace(/^```json|^```|```$/gm, "").trim();
    const parsed = JSON.parse(clean);

    console.log("[Resume] LLM extracted — GitHub:",   parsed.github);
    console.log("[Resume] LLM extracted — LeetCode:", parsed.leetcode);
    console.log("[Resume] LLM extracted — LinkedIn:", parsed.linkedin);

    return parsed;
  } catch (err) {
    console.warn("[Resume] LLM extraction failed:", err.message, "— falling back to regex");
    return null;
  }
}


function extractWithRegex(text) {
  // Collapse multiline URLs — run 3 times for deeply split URLs
  let t = text;
  for (let i = 0; i < 3; i++) {
    t = t.replace(/([a-zA-Z0-9/._-])\n([a-zA-Z0-9/._-])/g, "$1$2");
  }

  
  let githubUrl = null;
  const ghUrlMatch = t.match(
    /(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]{1,39})(?:\/[^\s]*)?/i
  );
  if (ghUrlMatch) {
    const username = ghUrlMatch[1];
    if (!GITHUB_RESERVED.has(username.toLowerCase()) && !username.includes(".")) {
      githubUrl = `https://github.com/${username}`;
    }
  }
  if (!githubUrl) {
    const ghTextMatch = t.match(/github[:\s]+([a-zA-Z0-9_-]{3,39})/i);
    if (ghTextMatch) githubUrl = `https://github.com/${ghTextMatch[1].trim()}`;
  }

  let leetcodeUrl = null;
  const lcUrlMatch = t.match(
    /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/u\/([a-zA-Z0-9_-]{2,})/i
  );
  if (lcUrlMatch) {
    leetcodeUrl = `https://leetcode.com/u/${lcUrlMatch[1]}`;
  }
  if (!leetcodeUrl) {
    const lcOldMatch = t.match(
      /(?:https?:\/\/)?(?:www\.)?leetcode\.com\/([a-zA-Z0-9_-]{2,})(?:\/|$|\s)/i
    );
    if (lcOldMatch && !LEETCODE_RESERVED.has(lcOldMatch[1].toLowerCase())) {
      leetcodeUrl = `https://leetcode.com/u/${lcOldMatch[1]}`;
    }
  }
  if (!leetcodeUrl) {
    const lcTextMatch =
      t.match(/([a-zA-Z0-9_-]{2,})\s*[-–]\s*LeetCode\s*Profile/i) ||
      t.match(/LeetCode\s*(?:Profile|ID|Username|Handle)?\s*[:\-]\s*([a-zA-Z0-9_-]{2,})/i) ||
      t.match(/leetcode[:\s]+([a-zA-Z0-9_@-]{3,})/i);
    if (lcTextMatch) {
      const username = lcTextMatch[1].trim();
      if (!LEETCODE_RESERVED.has(username.toLowerCase())) {
        leetcodeUrl = `https://leetcode.com/u/${username}`;
      }
    }
  }
  if (leetcodeUrl === "https://leetcode.com" || leetcodeUrl === "https://leetcode.com/") {
    leetcodeUrl = null;
  }

  let linkedinUrl = null;
  const liUrlMatch = t.match(
    /(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i
  );
  if (liUrlMatch) {
    linkedinUrl = `https://linkedin.com/in/${liUrlMatch[1]}`;
  }
  if (!linkedinUrl) {
    const liTextMatch = t.match(/linkedin[:\s]+([a-zA-Z0-9_-]{3,})/i);
    if (liTextMatch) linkedinUrl = `https://linkedin.com/in/${liTextMatch[1].trim()}`;
  }

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

async function parseResume(buffer) {
  if (!buffer) return buildFailure("No buffer provided");

  try {
    const data = await pdfParse(buffer);
    const text = data.text;
    console.log("[Resume] Extracted text length:", text.length);

    let extracted = await extractWithLLM(text);
    if (!extracted) extracted = extractWithRegex(text);

    
    const github   = normaliseAndValidate(extracted.github,   "github");
    const leetcode = normaliseAndValidate(extracted.leetcode, "leetcode");
    const linkedin = normaliseAndValidate(extracted.linkedin, "linkedin");

    console.log("[Resume] Final GitHub URL:",   github);
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

function normaliseAndValidate(url, platform) {
  if (!url) return null;

  
  url = url.trim().replace(/\s+/g, "");
  if (!url) return null;
  const withProto = url.startsWith("http") ? url : `https://${url}`;
  if (!isValidProfileUrl(withProto, platform)) {
    console.warn(`[Resume] Rejected invalid ${platform} URL: ${withProto}`);
    return null;
  }

  return withProto;
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