const express = require("express");
const router  = express.Router();
const db      = require("../config/db");

function safeJSON(val, fb = null) {
  if (!val) return fb;
  if (typeof val === "object") return val;
  try { return JSON.parse(val); } catch { return fb; }
}

// -- GET /api/hiring-report/exam/:examId/students -----------------
router.get("/exam/:examId/students", async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT
         c.id            AS student_id,
         c.name,
         c.email,
         c.college,
         c.github_url,
         c.leetcode_url,
         c.linkedin_url,
         c.status        AS candidate_status,
         ea.id           AS assignment_id,
         ea.status       AS assignment_status,
         ea.score,
         ea.score_mcq,
         ea.score_sql,
         ea.score_coding,
         ea.submitted_at,
         ea.started_at,
         e.total_marks,
         (ca.github_fetched_at   IS NOT NULL) AS has_github,
         (ca.leetcode_fetched_at IS NOT NULL) AS has_leetcode,
         ca.github_data,
         ca.leetcode_data,
         ca.updated_at   AS agent_updated_at
       FROM exam_assignments ea
       JOIN candidates c  ON c.id  = ea.student_id
       JOIN exams e       ON e.id  = ea.exam_id
       LEFT JOIN candidate_agent_cache ca ON ca.candidate_id = c.id
       WHERE ea.exam_id = ?
       ORDER BY ea.submitted_at DESC, c.name ASC`,
      [req.params.examId]
    );

    res.json({
      exam_id: req.params.examId,
      students: rows.map(r => {
        const gh  = safeJSON(r.github_data);
        const lc  = safeJSON(r.leetcode_data);
        const pct = (r.total_marks && r.score != null)
          ? Math.round((r.score / r.total_marks) * 100) : null;

        return {
          student_id:        r.student_id,
          name:              r.name          || "-",
          email:             r.email         || "-",
          college:           r.college       || "-",
          assignment_id:     r.assignment_id,
          assignment_status: r.assignment_status,
          score:             r.score,
          score_mcq:         r.score_mcq,
          score_sql:         r.score_sql,
          score_coding:      r.score_coding,
          total_marks:       r.total_marks,
          pct,
          submitted_at:      r.submitted_at,
          started_at:        r.started_at,
          has_github:        !!r.has_github,
          has_leetcode:      !!r.has_leetcode,
          github_url:        r.github_url,
          leetcode_url:      r.leetcode_url,
          agent_updated_at:  r.agent_updated_at,
          github_score:      gh?.coding_skill_score    ?? null,
          leetcode_score:    lc?.problem_solving_score ?? null,
          lc_solved:         lc?.total_solved          ?? null,
        };
      }),
    });
  } catch (err) {
    console.error("[hiringReport]", err);
    res.status(500).json({ error: err.message });
  }
});

// -- GET /api/hiring-report/student/:studentId --------------------
router.get("/student/:studentId", async (req, res) => {
  try {
    const id = req.params.studentId;

    // Candidate + agent cache
    const [cRows] = await db.query(
      `SELECT
         c.id, c.name, c.email, c.college, c.status,
         c.github_url, c.leetcode_url, c.linkedin_url,
         c.created_at,
         ca.github_data, ca.leetcode_data, ca.report_data,
         ca.github_fetched_at, ca.leetcode_fetched_at,
         ca.report_generated_at
       FROM candidates c
       LEFT JOIN candidate_agent_cache ca ON ca.candidate_id = c.id
       WHERE c.id = ?`, [id]
    );
    if (!cRows.length) return res.status(404).json({ error: "Candidate not found" });
    const c = cRows[0];

    // All exam assignments
    const [assignments] = await db.query(
      `SELECT
         ea.id             AS assignment_id,
         ea.exam_id,
         ea.status         AS assignment_status,
         ea.score,
         ea.score_mcq,
         ea.score_sql,
         ea.score_coding,
         ea.answers,
         ea.submitted_at,
         ea.started_at,
         e.title           AS exam_title,
         e.exam_type,
         e.total_marks,
         e.duration_minutes,
         e.sections
       FROM exam_assignments ea
       JOIN exams e ON e.id = ea.exam_id
       WHERE ea.student_id = ?
         AND e.exam_type IN ('hiring','placement','general','corporate','recruitment')
       ORDER BY ea.submitted_at DESC, ea.id DESC`,
      [id]
    );

    const submitted  = assignments.find(a => a.assignment_status === "submitted");
    const inProgress = assignments.find(a => a.assignment_status === "started");
    const latest     = submitted || inProgress || assignments[0] || null;

    let testScores = null;
    if (submitted) {
      testScores = {
        total:      submitted.score,
        max:        submitted.total_marks || 100,
        pct:        submitted.total_marks
          ? Math.round((submitted.score / submitted.total_marks) * 100) : null,
        exam_title: submitted.exam_title,
        mcq:        submitted.score_mcq    ?? 0,
        sql:        submitted.score_sql    ?? 0,
        coding:     submitted.score_coding ?? 0,
      };
    }

    // ── Viva results + answers ────────────────────────────────────
    let vivaResult  = null;
    let vivaAnswers = [];

    if (latest?.assignment_id) {
      const [vrRows] = await db.query(
        `SELECT id, student_name, problem_name, overall_score, auth_score,
                coding_score, ai_detection_score, final_verdict, completed_at
         FROM viva_results
         WHERE assignment_id = ?
         ORDER BY id DESC
         LIMIT 1`,
        [latest.assignment_id]
      );

      if (vrRows.length) {
        vivaResult = vrRows[0];

        const [vaRows] = await db.query(
          `SELECT
             id, question_number, question_type, question,
             student_answer, duration_secs,
             score, technical_accuracy, relevance, completeness,
             authenticity_score, verdict, feedback,
             strengths, improvements, authenticity_reason,
             plagiarism_risk, was_voice_answer,
             humanized_score, human_signals, ai_signals
           FROM viva_answers
           WHERE viva_result_id = ?
           ORDER BY question_number ASC`,
          [vivaResult.id]
        );
        vivaAnswers = vaRows;
      }
    }
    // ─────────────────────────────────────────────────────────────

    const githubData   = safeJSON(c.github_data);
    const leetcodeData = safeJSON(c.leetcode_data);
    const reportData   = safeJSON(c.report_data);

    const insights = [];
    if (githubData?.coding_skill_score > 70)
      insights.push({ type: "positive", section: "GitHub",   message: `Strong GitHub activity - score ${githubData.coding_skill_score}/100` });
    else if (githubData?.coding_skill_score > 0)
      insights.push({ type: "info",    section: "GitHub",   message: `GitHub score ${githubData.coding_skill_score}/100` });
    else if (c.github_url && !githubData)
      insights.push({ type: "warning", section: "GitHub",   message: "GitHub URL found - agent processing pending" });

    if (leetcodeData?.total_solved > 50)
      insights.push({ type: "positive", section: "LeetCode", message: `${leetcodeData.total_solved} problems solved (Hard: ${leetcodeData.hard})` });
    else if (leetcodeData?.total_solved > 0)
      insights.push({ type: "info",    section: "LeetCode", message: `${leetcodeData.total_solved} solved (Easy:${leetcodeData.easy} Med:${leetcodeData.medium} Hard:${leetcodeData.hard})` });

    if (testScores?.pct >= 70)
      insights.push({ type: "positive", section: "Test", message: `Test score ${testScores.total}/${testScores.max} (${testScores.pct}%)` });
    else if (testScores?.pct != null)
      insights.push({ type: "warning",  section: "Test", message: `Test score ${testScores.total}/${testScores.max} (${testScores.pct}%)` });

    if (githubData?.inference_hints?.flags?.includes("no_public_repos"))
      insights.push({ type: "warning", section: "GitHub", message: "No public repositories found" });

    res.json({
      candidate: {
        id:      c.id,
        name:    c.name,
        email:   c.email,
        college: c.college,
        status:  c.status,
        joined:  c.created_at,
      },
      urls: {
        github:   c.github_url,
        leetcode: c.leetcode_url,
        linkedin: c.linkedin_url,
      },
      exam: latest ? {
        assignment_id:    latest.assignment_id,
        exam_id:          latest.exam_id,
        title:            latest.exam_title,
        type:             latest.exam_type,
        status:           latest.assignment_status,
        started_at:       latest.started_at,
        submitted_at:     latest.submitted_at,
        duration_minutes: latest.duration_minutes,
        total_marks:      latest.total_marks,
      } : null,
      all_assignments: assignments.map(a => ({
        assignment_id: a.assignment_id,
        exam_title:    a.exam_title,
        status:        a.assignment_status,
        score:         a.score,
        score_mcq:     a.score_mcq,
        score_sql:     a.score_sql,
        score_coding:  a.score_coding,
        total_marks:   a.total_marks,
        submitted_at:  a.submitted_at,
      })),
      test_scores:   testScores,
      github_data:   githubData,
      leetcode_data: leetcodeData,
      report_data:   reportData,
      insights,
      // ── Viva ──────────────────────────────────────────────────
      viva: vivaResult ? {
        overall_score:      vivaResult.overall_score,
        auth_score:         vivaResult.auth_score,
        coding_score:       vivaResult.coding_score,
        ai_detection_score: vivaResult.ai_detection_score,
        final_verdict:      vivaResult.final_verdict,
        problem_name:       vivaResult.problem_name,
        completed_at:       vivaResult.completed_at,
        answers: vivaAnswers.map(a => ({
          id:                  a.id,
          question_number:     a.question_number,
          question_type:       a.question_type,
          question:            a.question,
          student_answer:      a.student_answer,
          duration_secs:       a.duration_secs,
          score:               a.score,
          technical_accuracy:  a.technical_accuracy,
          relevance:           a.relevance,
          completeness:        a.completeness,
          authenticity_score:  a.authenticity_score,
          verdict:             a.verdict,
          feedback:            a.feedback,
          strengths:           a.strengths,
          improvements:        a.improvements,
          authenticity_reason: a.authenticity_reason,
          plagiarism_risk:     a.plagiarism_risk,
          was_voice_answer:    !!a.was_voice_answer,
          humanized_score:     a.humanized_score,
          human_signals:       safeJSON(a.human_signals, []),
          ai_signals:          safeJSON(a.ai_signals, []),
        })),
      } : null,
      // ─────────────────────────────────────────────────────────
      agent_status: {
        github_fetched:   !!c.github_fetched_at,
        leetcode_fetched: !!c.leetcode_fetched_at,
        github_at:        c.github_fetched_at,
        leetcode_at:      c.leetcode_fetched_at,
        report_at:        c.report_generated_at,
      },
    });
  } catch (err) {
    console.error("[hiringReport/student]", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;