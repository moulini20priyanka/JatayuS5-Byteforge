// backend/routes/certReport.js
const express = require("express");
const router = express.Router();
const { generateReport } = require("../agents/proctoringAgent");

// POST /api/cert-report/generate
router.post("/generate", async (req, res) => {
  try {
    const { studentName, certName, score, totalQuestions, correct, violations, answers } = req.body;
    if (!certName || score === undefined) return res.status(400).json({ error: "Missing required fields" });

    const aiReport = await generateReport({ studentName, certName, score, totalQuestions, correct, violations });

    res.json({
      success: true,
      report: {
        studentName,
        certName,
        score,
        totalQuestions,
        correct,
        wrong: totalQuestions - correct,
        violations,
        aiSummary: aiReport.summary,
        integrityScore: aiReport.integrity_score,
        recommendation: aiReport.recommendation,
        details: aiReport.details,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
