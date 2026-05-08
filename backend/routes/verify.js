// routes/verify.js
const express = require('express');
const multer  = require('multer');
const { runIDAgent }        = require('../agents/idAgent');
const { runFaceAgent }      = require('../agents/faceAgent');
const { runReasoningAgent } = require('../agents/reasoningAgent');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

router.post('/verify', upload.fields([
  { name: 'idImage',   maxCount: 1 },
  { name: 'liveImage', maxCount: 1 },
]), async (req, res) => {
  try {
    const idImageBuffer   = req.files?.idImage?.[0]?.buffer;
    const liveImageBuffer = req.files?.liveImage?.[0]?.buffer;
    const { studentName, examId, examName } = req.body;

    if (!idImageBuffer || !liveImageBuffer)
      return res.status(400).json({ error: 'Both idImage and liveImage are required.' });

    const [idState, faceState] = await Promise.all([
      runIDAgent({ idImageBuffer, studentName }),
      runFaceAgent({ idImageBuffer, liveImageBuffer }),
    ]);

    const finalState = await runReasoningAgent({
      idAgentResult:   idState.result,
      faceAgentResult: faceState.result,
      studentName,
      examContext: { examId, examName },
    });

    res.json(finalState.result);
  } catch (err) {
    console.error('[/verify]', err);
    res.status(500).json({ error: 'Verification pipeline failed.', message: err.message });
  }
});

module.exports = router;