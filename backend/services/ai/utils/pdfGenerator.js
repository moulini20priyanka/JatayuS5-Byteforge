// utils/pdfGenerator.js
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

export async function generateQuizPDF(selectedQuestions, metadata = {}) {
  const pdfDoc   = await PDFDocument.create();
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const monoFont = await pdfDoc.embedFont(StandardFonts.Courier);

  const PAGE_W    = 595;
  const PAGE_H    = 842;
  const MARGIN    = 48;
  const CONTENT_W = PAGE_W - MARGIN * 2;

  let page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  let y    = PAGE_H - MARGIN;

  function newPage() {
    page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  }

  function gap(n = 8) { y -= n; }

  function need(n) { if (y - n < MARGIN + 20) newPage(); }

  // Word-wrapped text
  function drawText(text, opts = {}) {
    const {
      font    = bodyFont,
      size    = 11,
      color   = rgb(0.1, 0.1, 0.1),
      indent  = 0,
      lineH   = 15,
      maxW    = CONTENT_W,
    } = opts;
    const avail = maxW - indent;
    const words = String(text || "").split(" ");
    const lines = [];
    let   line  = "";
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > avail && line) {
        lines.push(line); line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    for (const l of lines) {
      need(lineH);
      page.drawText(l, { x: MARGIN + indent, y, size, font, color });
      y -= lineH;
    }
    return lines.length * lineH;
  }

  // Section heading — bold label + underline, like HackerRank tabs
  function drawSectionHeading(label) {
    gap(12);
    need(24);
    page.drawText(label, {
      x: MARGIN, y,
      size: 13, font: boldFont, color: rgb(0.05, 0.1, 0.3),
    });
    y -= 16;
    page.drawLine({
      start: { x: MARGIN, y },
      end:   { x: PAGE_W - MARGIN, y },
      thickness: 0.6, color: rgb(0.72, 0.76, 0.88),
    });
    y -= 9;
  }

  // Mono code block with background
  function drawCodeBlock(text) {
    if (!text) return;
    const raw   = String(text).replace(/\\n/g, "\n").replace(/\\t/g, "  ");
    const lines = raw.split("\n").slice(0, 12);
    const bH    = lines.length * 13 + 14;
    need(bH + 4);
    page.drawRectangle({
      x: MARGIN, y: y - bH + 13, width: CONTENT_W, height: bH,
      color: rgb(0.95, 0.95, 0.97),
      borderColor: rgb(0.78, 0.78, 0.86), borderWidth: 0.5,
    });
    for (const ln of lines) {
      page.drawText(ln.substring(0, 88), {
        x: MARGIN + 10, y, size: 8.5, font: monoFont, color: rgb(0.1, 0.1, 0.3),
      });
      y -= 13;
    }
    gap(6);
  }

  // Coloured badge rectangle
  function drawBadge(label, x, yy, bg) {
    const w = boldFont.widthOfTextAtSize(label, 9) + 14;
    page.drawRectangle({ x, y: yy - 2, width: w, height: 16, color: bg });
    page.drawText(label, { x: x + 7, y: yy, size: 9, font: boldFont, color: rgb(1, 1, 1) });
    return w;
  }

  // Example box — dynamic height
  function drawExampleBox(ex) {
    const inputLines  = String(ex.input  || "").match(/.{1,72}/g) || [""];
    const outputLines = String(ex.output || "").match(/.{1,72}/g) || [""];
    const noteLines   = ex.explanation
      ? String(ex.explanation).match(/.{1,80}/g) || []
      : [];

    const rows = 2 + inputLines.length + outputLines.length + (noteLines.length > 0 ? noteLines.length + 0.5 : 0);
    const bH   = Math.ceil(rows * 13) + 16;

    need(bH + 6);

    page.drawRectangle({
      x: MARGIN, y: y - bH + 13, width: CONTENT_W, height: bH,
      color: rgb(0.97, 0.98, 1),
      borderColor: rgb(0.76, 0.82, 0.94), borderWidth: 0.5,
    });

    // Label
    page.drawText(ex.label || "Example", {
      x: MARGIN + 10, y: y - 2,
      size: 9, font: boldFont, color: rgb(0.12, 0.28, 0.65),
    });
    let ey = y - 14;

    // Input lines
    page.drawText("Input:", { x: MARGIN + 10, y: ey, size: 9, font: boldFont, color: rgb(0.2, 0.2, 0.3) });
    for (const ln of inputLines) {
      page.drawText(ln, { x: MARGIN + 50, y: ey, size: 9, font: monoFont, color: rgb(0.1, 0.1, 0.25) });
      ey -= 13;
    }

    // Output lines
    page.drawText("Output:", { x: MARGIN + 10, y: ey, size: 9, font: boldFont, color: rgb(0.2, 0.2, 0.3) });
    for (const ln of outputLines) {
      page.drawText(ln, { x: MARGIN + 50, y: ey, size: 9, font: monoFont, color: rgb(0.04, 0.38, 0.1) });
      ey -= 13;
    }

    // Explanation / Note
    if (noteLines.length > 0) {
      ey -= 3;
      for (const ln of noteLines) {
        page.drawText(`Note: ${ln}`, { x: MARGIN + 10, y: ey, size: 8, font: bodyFont, color: rgb(0.38, 0.38, 0.5) });
        ey -= 12;
      }
    }

    y -= bH + 8;
  }

  // ── COVER PAGE ───────────────────────────────────────────────────────────────
  page.drawRectangle({ x: 0, y: PAGE_H - 130, width: PAGE_W, height: 130, color: rgb(0.06, 0.09, 0.18) });
  page.drawText("QUIZ PAPER", { x: MARGIN, y: PAGE_H - 58,  size: 34, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText(metadata.title || "Generated Quiz", { x: MARGIN, y: PAGE_H - 88,  size: 15, font: bodyFont, color: rgb(0.72, 0.82, 1) });
  page.drawText(`Generated: ${new Date().toLocaleDateString()}`, { x: MARGIN, y: PAGE_H - 112, size: 9,  font: bodyFont, color: rgb(0.55, 0.65, 0.85) });

  y = PAGE_H - 150;
  page.drawRectangle({ x: MARGIN, y: y - 44, width: CONTENT_W, height: 44, color: rgb(0.95, 0.97, 1), borderColor: rgb(0.8, 0.85, 0.94), borderWidth: 0.8 });
  page.drawText(
    `Total Questions: ${selectedQuestions.length}   |   Difficulty: ${metadata.difficulty || "Mixed"}`,
    { x: MARGIN + 14, y: y - 20, size: 11, font: bodyFont, color: rgb(0.2, 0.3, 0.5) }
  );
  y -= 62;

  // ── TYPE COLOURS ─────────────────────────────────────────────────────────────
  const TYPE_COLOR = {
    mcq:      rgb(0.13, 0.55, 0.33),
    sql:      rgb(0.15, 0.35, 0.75),
    coding:   rgb(0.65, 0.28, 0.08),
    aptitude: rgb(0.45, 0.08, 0.58),
    verbal:   rgb(0.75, 0.45, 0.05),
  };

  // ── QUESTIONS ────────────────────────────────────────────────────────────────
  selectedQuestions.forEach((q, idx) => {
    need(60);
    gap(6);

    // Number badge
    page.drawRectangle({ x: MARGIN, y: y - 2, width: 26, height: 18, color: rgb(0.06, 0.09, 0.18) });
    page.drawText(`${idx + 1}`, {
      x: MARGIN + (idx + 1 < 10 ? 9 : 5), y,
      size: 11, font: boldFont, color: rgb(1, 1, 1),
    });
    // Type badge
    const tc = TYPE_COLOR[q.type] || rgb(0.35, 0.35, 0.35);
    drawBadge((q.type || "Q").toUpperCase(), MARGIN + 32, y, tc);
    y -= 4;

    // ══════════════════════════════════════════════════════════════════════════
    if (q.type === "coding") {
    // ── CODING — structured like HackerRank / LeetCode ───────────────────────

      // Problem title (large)
      gap(6);
      need(22);
      drawText(q.question || "Coding Problem", {
        font: boldFont, size: 14, indent: 0,
        color: rgb(0.05, 0.05, 0.18), lineH: 20,
      });

      // Platform pill
      if (q.platform) {
        gap(4);
        need(16);
        const pw = bodyFont.widthOfTextAtSize(q.platform, 9) + 14;
        page.drawRectangle({ x: MARGIN, y: y - 2, width: pw, height: 14, color: rgb(0.88, 0.92, 1), borderColor: rgb(0.58, 0.68, 0.9), borderWidth: 0.5 });
        page.drawText(q.platform, { x: MARGIN + 7, y, size: 9, font: bodyFont, color: rgb(0.18, 0.28, 0.7) });
        y -= 18;
      }

      // ── Problem ──────────────────────────────────────────────────────────────
      drawSectionHeading("Problem");
      drawText(q.description || q.question || "", {
        font: bodyFont, size: 11, color: rgb(0.08, 0.08, 0.14), lineH: 16,
      });
      if (q.functionalRequirements) {
        gap(6);
        drawText(q.functionalRequirements, {
          font: bodyFont, size: 11, color: rgb(0.08, 0.08, 0.14), lineH: 16,
        });
      }

      // ── Example ──────────────────────────────────────────────────────────────
      drawSectionHeading("Example");
      if (q.inputFormat) {
        drawText(`The first line / parameter contains: ${q.inputFormat}`, {
          font: bodyFont, size: 10, color: rgb(0.28, 0.28, 0.4), lineH: 14,
        });
        gap(2);
      }
      if (q.outputFormat) {
        drawText(`Expected output: ${q.outputFormat}`, {
          font: bodyFont, size: 10, color: rgb(0.28, 0.28, 0.4), lineH: 14,
        });
        gap(8);
      }
      if (q.examples && q.examples.length > 0) {
        for (const ex of q.examples) {
          drawExampleBox(ex);
        }
      }

      // ── Function Description ──────────────────────────────────────────────────
      drawSectionHeading("Function Description");
      drawText("Complete the function in the editor below.", {
        font: bodyFont, size: 11, color: rgb(0.12, 0.12, 0.2), lineH: 16,
      });
      gap(5);
      if (q.functionalRequirements) {
        drawText(q.functionalRequirements, {
          font: bodyFont, size: 11, color: rgb(0.12, 0.12, 0.2), lineH: 16,
        });
      }
      if (q.inputFormat) {
        gap(6);
        need(18);
        page.drawText("Parameters:", { x: MARGIN, y, size: 10, font: boldFont, color: rgb(0.12, 0.12, 0.25) });
        y -= 14;
        drawText(q.inputFormat, {
          font: bodyFont, size: 10, indent: 16, color: rgb(0.18, 0.18, 0.35), lineH: 14,
        });
      }

      // ── Returns ──────────────────────────────────────────────────────────────
      drawSectionHeading("Returns");
      drawText(q.outputFormat || "See problem description.", {
        font: bodyFont, size: 11, color: rgb(0.12, 0.12, 0.2), lineH: 16,
      });

      // ── Constraints ──────────────────────────────────────────────────────────
      if (q.constraints) {
        drawSectionHeading("Constraints");
        const parts = q.constraints.split("|");
        for (const c of parts) {
          need(14);
          drawText(`• ${c.trim()}`, {
            font: monoFont, size: 9.5, indent: 8,
            color: rgb(0.22, 0.1, 0.04), lineH: 13,
          });
        }
      }

      // ── Starter Code ─────────────────────────────────────────────────────────
      drawSectionHeading("Starter Code");
      drawCodeBlock(q.starterCode || "function solve() {\n  // your code here\n}");

    // ══════════════════════════════════════════════════════════════════════════
    } else if (q.type === "verbal") {
    // ── VERBAL ───────────────────────────────────────────────────────────────

      // subType pill
      if (q.subType) {
        gap(4);
        need(16);
        const sw = bodyFont.widthOfTextAtSize(q.subType, 9) + 14;
        page.drawRectangle({ x: MARGIN, y: y - 2, width: sw, height: 14, color: rgb(0.99, 0.94, 0.84), borderColor: rgb(0.84, 0.68, 0.28), borderWidth: 0.5 });
        page.drawText(q.subType, { x: MARGIN + 7, y, size: 9, font: bodyFont, color: rgb(0.48, 0.28, 0.04) });
        y -= 18;
      }

      gap(4);
      drawText(q.question || "", { font: bodyFont, size: 11, indent: 4, color: rgb(0.05, 0.05, 0.15), lineH: 16 });

      if (q.hint) {
        gap(5);
        need(16);
        page.drawRectangle({ x: MARGIN + 4, y: y - 3, width: 4, height: 14, color: rgb(0.75, 0.52, 0.08) });
        drawText(`Hint: ${q.hint}`, { font: bodyFont, size: 9.5, indent: 14, color: rgb(0.48, 0.32, 0.04), lineH: 14 });
      }

      gap(6);
      (q.options || []).forEach((opt, oi) => {
        need(16);
        const isAns = q.answer?.startsWith(["A","B","C","D"][oi] + ")");
        drawText(opt, {
          font: isAns ? boldFont : bodyFont,
          size: 10.5, indent: 14,
          color: isAns ? rgb(0.06, 0.42, 0.16) : rgb(0.16, 0.16, 0.26),
          lineH: 15,
        });
      });

      if (q.explanation) {
        gap(5);
        need(20);
        page.drawRectangle({ x: MARGIN + 6, y: y - 2, width: 3, height: 14, color: rgb(0.25, 0.55, 0.85) });
        drawText(`Explanation: ${q.explanation}`, {
          font: bodyFont, size: 9.5, indent: 16, color: rgb(0.28, 0.38, 0.58), lineH: 14,
        });
      }

    // ══════════════════════════════════════════════════════════════════════════
    } else {
    // ── MCQ / SQL / APTITUDE ─────────────────────────────────────────────────

      gap(4);
      drawText(q.question || "", {
        font: bodyFont, size: 11, indent: 92,
        color: rgb(0.05, 0.05, 0.15), lineH: 16,
      });
      gap(5);

      if (q.codeSnippet) drawCodeBlock(q.codeSnippet);

      (q.options || []).forEach((opt, oi) => {
        need(16);
        const isAns = q.answer?.startsWith(["A","B","C","D"][oi] + ")");
        drawText(opt, {
          font: isAns ? boldFont : bodyFont,
          size: 10.5, indent: 18,
          color: isAns ? rgb(0.06, 0.42, 0.16) : rgb(0.16, 0.16, 0.26),
          lineH: 15,
        });
      });

      if (q.explanation) {
        gap(5);
        need(20);
        page.drawRectangle({ x: MARGIN + 6, y: y - 2, width: 3, height: 14, color: rgb(0.25, 0.55, 0.85) });
        drawText(`Explanation: ${q.explanation}`, {
          font: bodyFont, size: 9.5, indent: 16, color: rgb(0.28, 0.38, 0.58), lineH: 14,
        });
      }
    }

    gap(14);
    if (idx < selectedQuestions.length - 1) {
      need(8);
      page.drawLine({
        start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
        thickness: 0.5, color: rgb(0.82, 0.84, 0.9),
      });
      gap(12);
    }
  });

  // ── ANSWER KEY ────────────────────────────────────────────────────────────────
  newPage();
  page.drawRectangle({ x: 0, y: PAGE_H - 80, width: PAGE_W, height: 80, color: rgb(0.06, 0.09, 0.18) });
  page.drawText("ANSWER KEY", { x: MARGIN, y: PAGE_H - 48, size: 24, font: boldFont, color: rgb(1, 1, 1) });
  y = PAGE_H - 108;

  const cols = 3;
  const colW = CONTENT_W / cols;
  selectedQuestions.forEach((q, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const cx  = MARGIN + col * colW;
    const cy  = y - row * 26;
    if (cy < MARGIN + 20) return;
    if (q.type === "coding") {
      page.drawText(`${idx + 1}. [Coding — see problem]`, {
        x: cx, y: cy, size: 9, font: bodyFont, color: rgb(0.58, 0.26, 0.04),
      });
    } else {
      page.drawText(`${idx + 1}. ${(q.answer || "—").substring(0, 34)}`, {
        x: cx, y: cy, size: 9.5, font: bodyFont, color: rgb(0.06, 0.36, 0.16),
      });
    }
  });

  // ── PAGE NUMBERS ─────────────────────────────────────────────────────────────
  pdfDoc.getPages().forEach((p, i) => {
    p.drawText(`${i + 1} / ${pdfDoc.getPageCount()}`, {
      x: PAGE_W / 2 - 18, y: 18,
      size: 9, font: bodyFont, color: rgb(0.52, 0.52, 0.62),
    });
  });

  return pdfDoc.save();
}