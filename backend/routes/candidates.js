const express = require('express');
const router  = express.Router();
const db      = require('../config/db');
const { authenticateToken, authorizeAdmin, authorizeRecruiter } = require('../middleware/auth');

console.log('✅ CANDIDATES.JS LOADED - Using correct column names (batch, not batch_year)');

router.get('/debug', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, college, branch, batch, status FROM candidates LIMIT 20'
    );
    res.json({ success: true, count: rows.length, candidates: rows });
  } catch (err) {
    console.error('[DEBUG] Error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});


router.get('/colleges', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    console.log('🎯 GET /colleges called');

    const [rows] = await db.query(`
      SELECT 
        college,
        COUNT(*) as total
      FROM candidates 
      WHERE college IS NOT NULL AND college != ''
      GROUP BY college
      ORDER BY college
    `);

    const evalStats = await Promise.all(
      rows.map(async (row) => {
        try {
          const [[evalCount]] = await db.query(`
            SELECT COUNT(DISTINCT e.candidate_id) as count 
            FROM evaluations e
            INNER JOIN candidates c ON c.id = e.candidate_id
            WHERE c.college = ?
          `, [row.college]);

          const [[hireCount]] = await db.query(`
            SELECT COUNT(DISTINCT e.candidate_id) as count 
            FROM evaluations e
            INNER JOIN candidates c ON c.id = e.candidate_id
            WHERE c.college = ? AND e.decision = 'Hire'
          `, [row.college]);

          const [[scoreData]] = await db.query(`
            SELECT ROUND(AVG(e.overall_score), 1) as avg_score
            FROM evaluations e
            INNER JOIN candidates c ON c.id = e.candidate_id
            WHERE c.college = ? AND e.overall_score > 0
          `, [row.college]);

          const [[highRisk]] = await db.query(`
            SELECT COUNT(DISTINCT e.candidate_id) as count
            FROM evaluations e
            INNER JOIN candidates c ON c.id = e.candidate_id
            WHERE c.college = ? AND e.overall_score < 40
          `, [row.college]);

          return {
            college:    row.college,
            evaluated:  evalCount?.count  || 0,
            hire_count: hireCount?.count  || 0,
            avg_score:  scoreData?.avg_score || null,
            high_risk:  highRisk?.count   || 0,
          };
        } catch (evalErr) {
          console.warn(`[colleges] Eval stats failed for ${row.college}:`, evalErr.message);
          return {
            college:    row.college,
            evaluated:  0,
            hire_count: 0,
            avg_score:  null,
            high_risk:  0,
          };
        }
      })
    );

    const evalMap = new Map(evalStats.map(e => [e.college, e]));
    const result  = rows.map(r => ({
      college:    r.college,
      total:      r.total,
      evaluated:  evalMap.get(r.college)?.evaluated  || 0,
      hire_count: evalMap.get(r.college)?.hire_count || 0,
      avg_score:  evalMap.get(r.college)?.avg_score  || null,
      high_risk:  evalMap.get(r.college)?.high_risk  || 0,
    }));

    console.log(`✅ /colleges returning ${result.length} colleges`);
    res.json(result);
  } catch (err) {
    console.error('[Candidates] GET /colleges error:', err);
    res.status(500).json({ error: 'Failed to fetch college stats', details: err.message });
  }
});


router.get('/filters/colleges', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT college FROM candidates WHERE college IS NOT NULL AND college != "" ORDER BY college'
    );
    res.json(rows.map(r => r.college));
  } catch (err) {
    console.error('[filters/colleges] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/filters/batches', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT batch FROM candidates WHERE batch IS NOT NULL ORDER BY batch DESC'
    );
    res.json(rows.map(r => r.batch));
  } catch (err) {
    console.error('[filters/batches] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/filters/branches', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT DISTINCT branch FROM candidates WHERE branch IS NOT NULL AND branch != "" ORDER BY branch'
    );
    res.json(rows.map(r => r.branch));
  } catch (err) {
    console.error('[filters/branches] Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const { college, batch, branch, status, search } = req.query;

    let query = `
      SELECT id, name, email, college, branch, batch, cgpa, status,
             tenth_percentage, twelfth_percentage, backlogs,
             github_url, linkedin_url, leetcode_url, created_at, last_login_at
      FROM candidates WHERE 1=1`;

    const params = [];
    if (college && college !== 'All') { query += ' AND college = ?'; params.push(college); }
    if (batch   && batch   !== 'All') { query += ' AND batch = ?';   params.push(batch);   }
    if (branch  && branch  !== 'All') { query += ' AND branch = ?';  params.push(branch);  }
    if (status  && status  !== 'All') { query += ' AND status = ?';  params.push(status.toLowerCase()); }
    if (search) {
      query += ' AND (name LIKE ? OR email LIKE ? OR college LIKE ?)';
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    query += ' ORDER BY created_at DESC';

    const [rows] = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    console.error('[Candidates] GET / error:', err);
    res.status(500).json({ error: 'Failed to fetch candidates', details: err.message });
  }
});

router.get('/by-college', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const { college } = req.query;
    console.log(`🎯 GET /by-college called for: ${college}`);

    if (!college) {
      return res.status(400).json({ error: 'college parameter required' });
    }

    const [students] = await db.query(`
      SELECT 
        id, name, email, college, branch, batch, cgpa,
        tenth_percentage, twelfth_percentage, backlogs,
        github_url, linkedin_url, leetcode_url,
        status, has_login, created_at
      FROM candidates 
      WHERE college = ? 
      ORDER BY name ASC
    `, [college]);

    console.log(`✅ Found ${students.length} students for ${college}`);

    const enriched = await Promise.all(
      students.map(async (s) => {
        const student = { ...s };

        // Fetch candidate report scores (uses student_id)
        try {
          const [reports] = await db.query(`
            SELECT total_score, github_score, leetcode_score, linkedin_score, test_score, 
                   mcq_score, sql_score, coding_score, decision, confidence, risk
            FROM candidate_reports 
            WHERE student_id = ?
            ORDER BY created_at DESC LIMIT 1
          `, [s.id]);

          if (reports[0]) {
            student.github_score   = reports[0].github_score;
            student.leetcode_score = reports[0].leetcode_score;
            student.linkedin_score = reports[0].linkedin_score;
            student.test_score     = reports[0].test_score;
            student.overall_score  = reports[0].total_score;
            student.total_score    = reports[0].total_score;
            if (reports[0].decision) {
              student.__evaluation = {
                decision:   reports[0].decision,
                confidence: reports[0].confidence,
                risk:       reports[0].risk,
              };
            }
          }
        } catch (e) {
          // 
        }
        if (!student.__evaluation) {
          try {
            const [evals] = await db.query(`
              SELECT decision, confidence, risk, recommendation, overall_score as score
              FROM evaluations 
              WHERE candidate_id = ?
              ORDER BY created_at DESC LIMIT 1
            `, [s.id]);

            if (evals[0]) {
              student.__evaluation = {
                decision:       evals[0].decision,
                confidence:     evals[0].confidence,
                risk:           evals[0].risk,
                recommendation: evals[0].recommendation,
              };
            }
          } catch (e) {
            // 
          }
        }
        try {
          const [assignments] = await db.query(`
            SELECT ea.id, ea.exam_id, ea.status, ea.assigned_at, ea.completed_at, ea.score,
                   e.title as exam_name, e.company_name, e.exam_type
            FROM exam_assignments ea
            JOIN exams e ON e.id = ea.exam_id
            WHERE ea.student_id = ?
            ORDER BY ea.assigned_at DESC LIMIT 5
          `, [s.id]);
          student.exams = assignments || [];
        } catch (e) {
          student.exams = [];
        }

        return student;
      })
    );

    console.log(`✅ /by-college returning ${enriched.length} enriched students`);
    res.json(enriched);
  } catch (err) {
    console.error('[Candidates] GET /by-college ERROR:', {
      message: err.message,
      code:    err.code,
      sql:     err.sql,
    });
    res.status(500).json({
      error:   'Failed to fetch college candidates',
      details: err.message,
      code:    err.code,
    });
  }
});

router.get('/:id', authenticateToken, authorizeRecruiter, async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`🎯 GET /:id called for: ${id}`);

    const [rows] = await db.query(`
      SELECT id, name, email, college, branch, batch, cgpa,
             github_url, linkedin_url, leetcode_url, status,
             last_login_at, created_at, updated_at,
             tenth_percentage, twelfth_percentage, backlogs
      FROM candidates WHERE id = ?
    `, [id]);

    if (!rows.length) return res.status(404).json({ error: 'Candidate not found' });
    const candidate = rows[0];
    try {
      const [evals] = await db.query(`
        SELECT id as evaluation_id, decision, confidence, risk, recommendation,
               overall_score as score, created_at
        FROM evaluations 
        WHERE candidate_id = ?
        ORDER BY created_at DESC LIMIT 1
      `, [id]);
      candidate.evaluation = evals[0] || null;
    } catch (e) {
      console.warn(`[candidate/:id] Evaluation fetch failed: ${e.message}`);
      candidate.evaluation = null;
    }
    try {
      const [assignments] = await db.query(`
        SELECT ea.id, ea.exam_id, ea.status, ea.assigned_at, ea.completed_at, ea.score,
               e.title as exam_name, e.company_name, e.exam_type
        FROM exam_assignments ea
        JOIN exams e ON e.id = ea.exam_id
        WHERE ea.student_id = ?
        ORDER BY ea.assigned_at DESC LIMIT 10
      `, [id]);
      candidate.exams = assignments || [];
    } catch (e) {
      console.warn(`[candidate/:id] Exams fetch failed: ${e.message}`);
      candidate.exams = [];
    }
    try {
      const [reports] = await db.query(`
        SELECT total_score, github_score, leetcode_score, linkedin_score, test_score, 
               mcq_score, sql_score, coding_score, decision, confidence, risk
        FROM candidate_reports 
        WHERE student_id = ?
        ORDER BY created_at DESC LIMIT 1
      `, [id]);

      if (reports[0]) {
        candidate.github_score   = reports[0].github_score;
        candidate.leetcode_score = reports[0].leetcode_score;
        candidate.linkedin_score = reports[0].linkedin_score;
        candidate.test_score     = reports[0].test_score;
        candidate.overall_score  = reports[0].total_score;
        candidate.total_score    = reports[0].total_score;
        if (!candidate.evaluation?.decision && reports[0].decision) {
          candidate.__evaluation = {
            decision:   reports[0].decision,
            confidence: reports[0].confidence,
            risk:       reports[0].risk,
          };
        }
      }
    } catch (e) {
      console.warn(`[candidate/:id] Reports fetch failed: ${e.message}`);
    }

    res.json(candidate);
  } catch (err) {
    console.error('[Candidates] GET /:id error:', err);
    res.status(500).json({ error: 'Failed to fetch candidate details', details: err.message });
  }
});

router.post('/', authenticateToken, authorizeAdmin, async (req, res) => {
  res.status(501).json({ error: 'Not implemented - admin only' });
});

router.put('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  res.status(501).json({ error: 'Not implemented - admin only' });
});

router.delete('/:id', authenticateToken, authorizeAdmin, async (req, res) => {
  res.status(501).json({ error: 'Not implemented - admin only' });
});

module.exports = router;