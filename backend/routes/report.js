// backend/routes/report.js
const express  = require("express");
const router   = express.Router();
const multer   = require("multer");
const db       = require("../config/db");
const { runEvaluation } = require("../orchestrator");
const { generateReport } = require('../agents/proctoringAgent');

const upload = multer({ storage: multer.memoryStorage() });

// ── HELPER FUNCTIONS ─────────────────────────────────────────────
// NOTE: safeJSON defined ONCE here (duplicate removed from line ~175)
function safeJSON(val, fallback) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fallback; }
}

const githubRepoFix = (githubRaw) => {
  return {
    github_total_repos:    githubRaw?.public_repos   || githubRaw?.total_repos   || 0,
    github_active_repos:   githubRaw?.active_repos   || 0,
    github_stars:          githubRaw?.total_stars     || 0,
    github_followers:      githubRaw?.followers       || 0,
    github_account_age:    githubRaw?.account_age_days|| 0,
    github_top_languages:  JSON.stringify(githubRaw?.top_languages || []),
    github_weekly_commits: githubRaw?.weekly_push_events    || 0,
    github_total_commits:  githubRaw?.total_commits_sampled || 0,
  };
};

const linkedinFix = (r) => {
  const linkedinRaw = safeJSON(r.linkedin_raw, {});
  const resumeRaw   = safeJSON(r.resume_raw, {});

  const name     = linkedinRaw?.name     || resumeRaw?.name         || r.name || null;
  const headline = linkedinRaw?.headline || resumeRaw?.current_role || resumeRaw?.title || null;
  const summary  = linkedinRaw?.summary  || resumeRaw?.summary      || resumeRaw?.objective || null;

  const linkedinSkills = linkedinRaw?.skills || [];
  const resumeSkills   = resumeRaw?.skills   || [];
  const mergedSkills   = Array.from(new Set([...linkedinSkills, ...resumeSkills])).slice(0, 15);
  const certs      = linkedinRaw?.certifications || resumeRaw?.certifications || [];
  const experience = linkedinRaw?.experience     || resumeRaw?.experience     || [];

  return {
    linkedin_name:           name,
    linkedin_headline:       headline,
    linkedin_summary:        summary,
    linkedin_skills:         JSON.stringify(mergedSkills),
    linkedin_certifications: JSON.stringify(certs),
    linkedin_experience:     JSON.stringify(experience),
    linkedin_skill_tags:     resumeSkills.slice(0, 3).join(', ') || mergedSkills.slice(0, 3).join(', '),
  };
};

const calcTotalScore = (r, unified) => {
  const github_s   = unified?.coding_skill?.score          || 0;
  const leetcode_s = unified?.problem_solving?.score       || 0;
  const linkedin_s = unified?.professional_presence?.score || 0;
  const test_s     = unified?.test_performance?.overall    || 0;

  const violCount = r.violation_count || 0;
  const trust_s   = Math.max(0, 100 - violCount * 5);

  const total = Math.round(
    github_s   * 0.20 +
    leetcode_s * 0.20 +
    linkedin_s * 0.15 +
    test_s     * 0.35 +
    trust_s    * 0.10
  );

  return {
    computed_total_score: total,
    trust_score:          trust_s,
    violation_penalty:    violCount * 5,
  };
};

// ── GET /api/reports/all ─────────────────────────────────────────
router.get("/reports/all", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        c.id            AS student_id,
        c.name,
        c.email,
        c.college,
        c.github_url,
        c.linkedin_url,
        c.leetcode_url,
        c.violation_count,
        c.resume_raw,
        e.overall_score AS total_score,
        e.decision,
        e.confidence,
        e.risk,
        e.method,
        e.scores,
        e.insights,
        e.chart_data,
        e.github_raw,
        e.leetcode_raw,
        e.linkedin_raw,
        e.created_at,
        COALESCE(e.overall_score, 0) AS total_score,
        JSON_UNQUOTE(JSON_EXTRACT(e.scores, '$.unified.coding_skill.score'))             AS github_score,
        JSON_UNQUOTE(JSON_EXTRACT(e.scores, '$.unified.problem_solving.score'))          AS leetcode_score,
        JSON_UNQUOTE(JSON_EXTRACT(e.scores, '$.unified.professional_presence.score'))    AS linkedin_score,
        JSON_UNQUOTE(JSON_EXTRACT(e.scores, '$.unified.test_performance.overall'))       AS test_score,
        JSON_UNQUOTE(JSON_EXTRACT(e.scores, '$.unified.test_performance.mcq'))           AS mcq_score,
        JSON_UNQUOTE(JSON_EXTRACT(e.scores, '$.unified.test_performance.sql'))           AS sql_score,
        JSON_UNQUOTE(JSON_EXTRACT(e.scores, '$.unified.test_performance.coding'))        AS coding_score,
        COALESCE(e.decision, 'pending') AS status
      FROM candidates c
      LEFT JOIN evaluations e ON e.candidate_id = c.id
        AND e.created_at = (
          SELECT MAX(e2.created_at) FROM evaluations e2 WHERE e2.candidate_id = c.id
        )
      ORDER BY e.created_at DESC
    `);

    res.json(rows.map(r => {
      const githubRaw   = safeJSON(r.github_raw,   {});
      const leetcodeRaw = safeJSON(r.leetcode_raw, {});
      const resumeRaw   = safeJSON(r.resume_raw,   {});
      const scores      = safeJSON(r.scores,       {});
      const unified     = scores?.unified || {};

      const githubLangs = githubRaw?.top_languages || [];
      const lcLangs = (leetcodeRaw?.top_languages || []).map(l =>
        typeof l === "string" ? l : l.name
      );

      const ghConsistency = githubRaw?.consistency?.score   ?? githubRaw?.consistency_score ?? null;
      const lcConsistency = leetcodeRaw?.consistency?.score ?? null;
      let consistencyScore = null;
      if (ghConsistency !== null && lcConsistency !== null) {
        consistencyScore = Math.round((ghConsistency + lcConsistency) / 2);
      } else if (ghConsistency !== null) {
        consistencyScore = ghConsistency;
      } else if (lcConsistency !== null) {
        consistencyScore = lcConsistency;
      }

      const resumeSkills = resumeRaw?.skills || [];
      const allSkills = Array.from(new Set([
        ...githubLangs,
        ...lcLangs,
        ...resumeSkills,
      ])).slice(0, 15);

      const mcq    = r.mcq_score    ?? unified?.test_performance?.mcq    ?? null;
      const sql    = r.sql_score    ?? unified?.test_performance?.sql    ?? null;
      const coding = r.coding_score ?? unified?.test_performance?.coding ?? null;

      return {
        student_id:   r.student_id,
        name:         r.name,
        email:        r.email,
        college:      r.college,
        github_url:   r.github_url,
        linkedin_url: r.linkedin_url,
        leetcode_url: r.leetcode_url,
        total_score:  r.total_score,
        decision:     r.decision,
        confidence:   r.confidence,
        risk:         r.risk,
        method:       r.method,
        created_at:   r.created_at,
        status:       r.status,
        violation_count: r.violation_count || 0,

        github_score:   r.github_score   ? Math.round(r.github_score)   : 0,
        leetcode_score: r.leetcode_score ? Math.round(r.leetcode_score) : 0,
        linkedin_score: r.linkedin_score ? Math.round(r.linkedin_score) : 0,
        test_score:     r.test_score     ? Math.round(r.test_score)     : 0,

        mcq_score:    mcq    !== null ? Math.round(mcq)    : null,
        sql_score:    sql    !== null ? Math.round(sql)    : null,
        coding_score: coding !== null ? Math.round(coding) : null,

        consistency_score: consistencyScore,

        ...githubRepoFix(githubRaw),

        leetcode_total_solved: leetcodeRaw?.total_solved || 0,
        leetcode_easy:         leetcodeRaw?.easy         || 0,
        leetcode_medium:       leetcodeRaw?.medium       || 0,
        leetcode_hard:         leetcodeRaw?.hard         || 0,
        leetcode_ranking:      leetcodeRaw?.ranking      || null,
        leetcode_languages:    JSON.stringify(lcLangs),

        ...linkedinFix(r),

        all_skills:        JSON.stringify(allSkills),
        resume_skills:     JSON.stringify(resumeSkills),
        resume_experience: JSON.stringify(resumeRaw?.experience || []),
        resume_projects:   JSON.stringify(resumeRaw?.projects   || []),
        resume_education:  JSON.stringify(resumeRaw?.education  || []),

        ...calcTotalScore(r, unified),

        scores:       safeJSON(r.scores,     {}),
        insights:     safeJSON(r.insights,   []),
        chart_data:   safeJSON(r.chart_data, {}),
        github_raw:   githubRaw,
        leetcode_raw: leetcodeRaw,
        linkedin_raw: safeJSON(r.linkedin_raw, {}),
        resume_raw:   resumeRaw,
      };
    }));
  } catch (err) {
    console.error("/reports/all error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/report/evaluate/:candidateId ────────────────────────
router.get("/report/evaluate/:candidateId", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT e.*, c.name AS candidate_name, c.email
      FROM evaluations e
      LEFT JOIN candidates c ON c.id = e.candidate_id
      WHERE e.candidate_id = ?
      ORDER BY e.created_at DESC
      LIMIT 1
    `, [req.params.candidateId]);

    if (!rows.length) return res.status(404).json({ error: "No evaluation found" });

    const r       = rows[0];
    const scores  = safeJSON(r.scores, {});
    const unified = scores?.unified || {};

    const dimScores = {
      coding_skill:          unified?.coding_skill?.score          ?? scores?.dimensions?.coding_skill          ?? null,
      problem_solving:       unified?.problem_solving?.score       ?? scores?.dimensions?.problem_solving       ?? null,
      consistency:           unified?.consistency?.score           ?? scores?.dimensions?.consistency           ?? null,
      professional_presence: unified?.professional_presence?.score ?? scores?.dimensions?.professional_presence ?? null,
      test_performance:      unified?.test_performance?.overall    ?? scores?.dimensions?.test_performance      ?? null,
    };

    res.json({
      candidate_id:      r.candidate_id,
      candidate_name:    r.candidate_name,
      decision:          r.decision,
      confidence:        r.confidence,
      risk:              r.risk,
      overall_score:     r.overall_score,
      recommendation:    r.recommendation,
      method:            r.method,
      evaluated_at:      r.created_at,
      dimension_scores:  dimScores,
      unified_scores:    unified,
      insights:          safeJSON(r.insights,          []),
      decision_insights: safeJSON(r.decision_insights, []),
      cross_check_flags: safeJSON(r.errors,            []),
      missing_sources:   [],
      chart_data:        safeJSON(r.chart_data, {}),
      source_status:     scores?.source_status || {},
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/evaluate ───────────────────────────────────────────
router.post("/evaluate", upload.single("resume"), async (req, res) => {
  res.setHeader("Content-Type",  "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection",    "keep-alive");
  res.flushHeaders();

  const emit = (data) => {
    try { res.write(`data: ${JSON.stringify(data)}\n\n`); } catch (_) {}
  };

  try {
    const testScoresRaw = req.body.test_scores;
    const input = {
      candidate_id:    req.body.candidate_id,
      github_url:      req.body.github_url      || null,
      linkedin_url:    req.body.linkedin_url    || null,
      leetcode_url:    req.body.leetcode_url    || null,
      pasted_linkedin: req.body.pasted_linkedin || null,
      test_scores:     testScoresRaw ? safeJSON(testScoresRaw, null) : null,
      resume_buffer:   req.file ? req.file.buffer : null,
      __emit:          emit,
    };

    const report = await runEvaluation(input);
    emit({ type: "complete", report });
  } catch (err) {
    emit({ type: "error", message: err.message });
  } finally {
    res.end();
  }
});

// ── GET /api/report/:candidateId/pdf ────────────────────────────
router.get("/report/:candidateId/pdf", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT e.*, c.name AS candidate_name, c.email
       FROM evaluations e LEFT JOIN candidates c ON c.id = e.candidate_id
       WHERE e.candidate_id = ? ORDER BY e.created_at DESC LIMIT 1`,
      [req.params.candidateId]
    );
    if (!rows.length) return res.status(404).json({ error: "Not found" });

    const r        = rows[0];
    const scores   = safeJSON(r.scores,   {});
    const insights = safeJSON(r.insights, []);
    const github   = safeJSON(r.github_raw,   null);
    const lc       = safeJSON(r.leetcode_raw, null);

    const puppeteer = require("puppeteer");
    const browser   = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    const page      = await browser.newPage();
    await page.setContent(buildPDFHtml(r, scores, insights, github, lc), { waitUntil: "networkidle0" });
    const pdf = await page.pdf({ format: "A4", printBackground: true, margin: { top:"20mm", bottom:"20mm", left:"20mm", right:"20mm" } });
    await browser.close();

    res.setHeader("Content-Type",        "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="report-${r.candidate_id}.pdf"`);
    res.send(pdf);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/reports — filtered ──────────────────────────────────
router.get("/reports", async (req, res) => {
  try {
    const { decision, min_score, max_score, sort_by = "created_at", order = "DESC" } = req.query;
    let sql    = `SELECT e.*, c.name, c.email FROM evaluations e LEFT JOIN candidates c ON c.id = e.candidate_id WHERE 1=1`;
    const params = [];
    if (decision)  { sql += " AND e.decision = ?";       params.push(decision); }
    if (min_score) { sql += " AND e.overall_score >= ?"; params.push(+min_score); }
    if (max_score) { sql += " AND e.overall_score <= ?"; params.push(+max_score); }
    const safe = ["overall_score", "created_at"].includes(sort_by) ? sort_by : "created_at";
    sql += ` ORDER BY ${safe} ${order === "ASC" ? "ASC" : "DESC"}`;
    const [rows] = await db.query(sql, params);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/candidates/colleges ────────────────────────────────
router.get("/candidates/colleges", async (req, res) => {
  const COLLEGES = ["RMKEC", "RMDEC", "RMKCET"];
  try {
    const [rows] = await db.query(`
      SELECT
        c.college,
        COUNT(c.id)                                               AS total,
        SUM(CASE WHEN e.decision IS NOT NULL THEN 1 ELSE 0 END)  AS evaluated,
        SUM(CASE WHEN e.decision = 'Hire'    THEN 1 ELSE 0 END)  AS hire_count,
        SUM(CASE WHEN e.decision = 'Reject'  THEN 1 ELSE 0 END)  AS reject_count,
        SUM(CASE WHEN e.decision = 'Maybe'   THEN 1 ELSE 0 END)  AS maybe_count,
        SUM(CASE WHEN e.risk = 'High'        THEN 1 ELSE 0 END)  AS high_risk,
        ROUND(AVG(e.overall_score), 1)                            AS avg_score
      FROM candidates c
      LEFT JOIN evaluations e ON e.candidate_id = c.id
        AND e.created_at = (
          SELECT MAX(e2.created_at) FROM evaluations e2 WHERE e2.candidate_id = c.id
        )
      WHERE c.college IN (?)
      GROUP BY c.college
      ORDER BY FIELD(c.college, 'RMKEC', 'RMDEC', 'RMKCET')
    `, [COLLEGES]);

    const map = {};
    rows.forEach(r => { map[r.college] = r; });
    const result = COLLEGES.map(col => map[col] || {
      college:      col,
      total:        0,
      evaluated:    0,
      hire_count:   0,
      reject_count: 0,
      maybe_count:  0,
      high_risk:    0,
      avg_score:    null,
    });
    res.json(result);
  } catch (err) {
    console.error("/candidates/colleges error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/candidates/by-college ───────────────────────────────
router.get("/candidates/by-college", async (req, res) => {
  const { college } = req.query;
  if (!college) return res.status(400).json({ error: "college param required" });
  try {
    const [rows] = await db.query(`
      SELECT
        c.id          AS student_id,
        c.name,
        c.email,
        c.college,
        c.cgpa,
        c.branch,
        c.batch,
        e.overall_score,
        e.decision,
        e.confidence,
        e.risk,
        e.created_at  AS evaluated_at,
        (SELECT COUNT(*) FROM candidates WHERE id = c.id AND password_hash IS NOT NULL) AS has_login
      FROM candidates c
      LEFT JOIN evaluations e ON e.candidate_id = c.id
        AND e.created_at = (
          SELECT MAX(e2.created_at) FROM evaluations e2 WHERE e2.candidate_id = c.id
        )
      WHERE c.college = ?
      ORDER BY e.overall_score DESC, c.name ASC
    `, [college]);
    res.json(rows);
  } catch (err) {
    console.error("/candidates/by-college error:", err);
    res.status(500).json({ error: err.message });
  }
});

// ── PDF HELPER ───────────────────────────────────────────────────
function buildPDFHtml(r, scores, insights, github, lc) {
  const dims = scores.dimensions || scores.unified || {};
  return `<!DOCTYPE html><html><head><style>
    body{font-family:Arial,sans-serif;padding:0;margin:0;color:#1a1a1a;font-size:13px}
    h1{font-size:22px;margin:0 0 4px} h2{font-size:15px;color:#444;border-bottom:1px solid #eee;padding-bottom:6px;margin:20px 0 10px}
    .header{background:#f0f9ff;padding:24px 32px;border-bottom:2px solid #0284c7}
    .body{padding:24px 32px}
    .badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:12px;font-weight:700}
    .hire{background:#d1fae5;color:#065f46}.reject{background:#fee2e2;color:#991b1b}.maybe{background:#fef3c7;color:#92400e}
    .score{font-size:42px;font-weight:700;color:#0284c7}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:12px 0}
    .card{background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px}
    .bar-bg{background:#e5e7eb;border-radius:4px;height:6px;margin-top:4px}
    .bar-fill{height:6px;border-radius:4px;background:#0284c7}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:8px}
    td,th{padding:7px 10px;text-align:left;border-bottom:1px solid #f0f0f0}
    th{background:#f9fafb;font-weight:600;color:#555}
    .insight{padding:8px 12px;border-radius:6px;margin-bottom:6px;font-size:12px}
    .insight-w{background:#fffbeb;border-left:3px solid #f59e0b}
    .insight-i{background:#eff6ff;border-left:3px solid #3b82f6}
    .insight-p{background:#f0fdf4;border-left:3px solid #16a34a}
  </style></head><body>
    <div class="header">
      <h1>${r.candidate_name || "Candidate"}</h1>
      <p style="color:#555;margin:4px 0 12px">${r.email || ""} &nbsp;·&nbsp; Evaluated ${new Date(r.created_at).toLocaleDateString()}</p>
      <div class="score">${r.overall_score ?? 0}/100</div>
      <span class="badge ${(r.decision||"").toLowerCase()}">${r.decision || "—"}</span>
      <span style="margin-left:8px;font-size:12px;color:#555">Confidence: ${r.confidence || "—"} &nbsp;|&nbsp; Risk: ${r.risk || "—"}</span>
    </div>
    <div class="body">
      ${r.recommendation ? `<p style="color:#374151;line-height:1.7;margin-bottom:16px">${r.recommendation}</p>` : ""}
      <h2>Dimension Scores</h2>
      <div class="grid">
        ${Object.entries(dims).map(([k, v]) => {
          const score = typeof v === "object" ? (v?.score ?? null) : v;
          if (score === null) return "";
          return `<div class="card">
            <div style="display:flex;justify-content:space-between">
              <span style="font-size:12px;color:#64748b">${k.replace(/_/g," ")}</span>
              <strong style="color:#0284c7">${Math.round(score)}</strong>
            </div>
            <div class="bar-bg"><div class="bar-fill" style="width:${Math.min(score||0,100)}%"></div></div>
          </div>`;
        }).join("")}
      </div>
      ${github && github.data_source !== "failed" ? `
        <h2>GitHub</h2>
        <table><tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Active repos</td><td>${github.active_repos || 0}</td></tr>
          <tr><td>Languages</td><td>${(github.top_languages||[]).join(", ") || "—"}</td></tr>
          <tr><td>Consistency</td><td>${github.consistency?.score || 0}/100</td></tr>
        </table>` : ""}
      ${lc && lc.data_source !== "failed" ? `
        <h2>LeetCode</h2>
        <table><tr><th>Metric</th><th>Value</th></tr>
          <tr><td>Easy / Medium / Hard</td><td>${lc.easy||0} / ${lc.medium||0} / ${lc.hard||0}</td></tr>
          <tr><td>Ranking</td><td>${lc.ranking || "N/A"}</td></tr>
          <tr><td>Top language</td><td>${lc.top_languages?.[0]?.name || lc.top_languages?.[0] || "N/A"}</td></tr>
        </table>` : ""}
      ${insights.length ? `
        <h2>Insights</h2>
        ${insights.slice(0, 8).map(i => `
          <div class="insight insight-${i.type==="warning"?"w":i.type==="positive"?"p":"i"}">
            <strong>${i.section || ""}</strong> ${i.message}
          </div>`).join("")}` : ""}
    </div>
  </body></html>`;
}

module.exports = router;