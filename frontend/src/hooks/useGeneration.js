// src/hooks/useGeneration.js
import { useState, useCallback } from "react";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function getAuthToken() {
  return localStorage.getItem("admin_token") || localStorage.getItem("token") || "";
}

export function useGeneration() {
  const [state, setState] = useState("idle");
  const [progress, setProgress] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  const generate = useCallback(async (params) => {
    setState("generating");
    setProgress([]);
    setQuestions([]);
    setStats(null);
    setError(null);

    const token = getAuthToken();

    try {
      const res = await fetch(`${API}/api/ai/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...params,
          // Pass QB identity fields so backend saves questions under correct session
          examName:      params.examName      || null,
          sessionCode:   params.sessionCode   || null,
          examType:      params.examType      || 'placement',
          examRequestId: params.examRequestId || null,
        }),
      });

      // If the server rejected before opening the SSE stream (e.g. 401, 429, 500)
      // Read body text ONCE — never call both res.json() and res.text(),
      // the body stream can only be consumed once.
      if (!res.ok) {
        let errMsg = `Server error ${res.status}`;
        try {
          const rawText = await res.text();
          try {
            const errBody = JSON.parse(rawText);
            errMsg = errBody.error || errBody.message || rawText || errMsg;
          } catch {
            errMsg = rawText || errMsg;
          }
        } catch {
          // body unreadable — keep the generic message
        }
        setError(errMsg);
        setState("error");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop(); // keep the incomplete trailing chunk

        for (const part of parts) {
          if (!part.trim()) continue;
          const lines = part.split("\n");
          let event = "message";
          let data = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) event = line.slice(7).trim();
            if (line.startsWith("data: "))  data  = line.slice(6).trim();
          }

          if (!data) continue;

          try {
            const payload = JSON.parse(data);
            if (event === "progress") {
              setProgress((prev) => [...prev, payload]);
            } else if (event === "complete") {
              const qs = payload.questions || [];
              setQuestions(qs);
              setStats(payload.stats || null);
              // Only move to "done" when we actually have questions
              setState(qs.length > 0 ? "done" : "error");
              if (qs.length === 0) {
                setError(
                  "Generation finished but returned 0 questions. " +
                  "Check that your AI agents are running and returning valid JSON arrays."
                );
              }
            } else if (event === "error") {
              setError(payload.message || "Unknown error from server");
              setState("error");
            }
          } catch {
            // Malformed JSON in SSE chunk — skip and continue
          }
        }
      }

      // Stream ended without a "complete" event — treat as error
      setState((prev) => {
        if (prev === "generating") {
          setError("Stream closed unexpectedly without a complete event.");
          return "error";
        }
        return prev;
      });

    } catch (err) {
      setError(err.message);
      setState("error");
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setProgress([]);
    setQuestions([]);
    setStats(null);
    setError(null);
  }, []);

  // ── Extract options from any shape the backend might return ───────────────
  function extractOptions(q) {
    // Shape 1: array of objects [{ key:'A', text:'...' }, ...]
    if (Array.isArray(q.options) && q.options.length > 0) {
      return q.options
        .map((o, i) => ({
          key:  o.key || o.label || String.fromCharCode(65 + i),
          text: o.text || o.value || o.content || String(o),
        }))
        .filter((o) => o.text && o.text.trim());
    }

    // Shape 2: array of strings ['text1','text2',...]
    if (Array.isArray(q.choices) && q.choices.length > 0) {
      return q.choices
        .map((c, i) => ({
          key:  String.fromCharCode(65 + i),
          text: typeof c === "string" ? c : c.text || c.value || String(c),
        }))
        .filter((o) => o.text && o.text.trim());
    }

    // Shape 3: flat fields option_a / option_b / option_c / option_d
    const flat = [
      { key: "A", text: q.option_a },
      { key: "B", text: q.option_b },
      { key: "C", text: q.option_c },
      { key: "D", text: q.option_d },
    ].filter((o) => o.text && String(o.text).trim());
    if (flat.length > 0) return flat;

    // Shape 4: object { A:'text', B:'text' }
    if (q.options && typeof q.options === "object" && !Array.isArray(q.options)) {
      return Object.entries(q.options)
        .map(([key, text]) => ({ key: key.toUpperCase(), text: String(text) }))
        .filter((o) => o.text.trim());
    }

    return [];
  }

  // ── Normalize sample test cases from any shape the backend might return ─────
  function extractSampleCases(q) {
    if (Array.isArray(q.sample_cases) && q.sample_cases.length > 0) {
      return q.sample_cases.map((c) => ({
        input:  c.input  ?? c.stdin   ?? "",
        output: c.output ?? c.stdout  ?? c.expected ?? "",
      }));
    }
    if (Array.isArray(q.test_cases) && q.test_cases.length > 0) {
      return q.test_cases
        .filter((c) => c.sample || c.is_sample || true)
        .slice(0, 3)
        .map((c) => ({
          input:  c.input  ?? c.stdin  ?? "",
          output: c.output ?? c.stdout ?? c.expected ?? "",
        }));
    }
    if (Array.isArray(q.examples) && q.examples.length > 0) {
      return q.examples.map((c) => ({ input: c.input ?? "", output: c.output ?? "" }));
    }
    if (Array.isArray(q.sample_inputs) && q.sample_inputs.length > 0) {
      return q.sample_inputs.map((inp, i) => ({
        input:  inp,
        output: (q.sample_outputs || q.expected_outputs || [])[i] ?? "",
      }));
    }
    if (q.sample_input !== undefined || q.sample_output !== undefined) {
      return [{ input: q.sample_input ?? "", output: q.sample_output ?? "" }];
    }
    return [];
  }

  // ── Build plain-text content (parser-compatible format) ───────────────────
  function buildPlainText(selectedQuestions) {
    const lines = [];

    selectedQuestions.forEach((q, idx) => {
      const num  = idx + 1;
      const type = (q.type || "mcq").toLowerCase();

      const questionText = (
        q.question || q.question_text || q.text ||
        q.problem  || q.title        || q.prompt || ""
      ).trim();

      lines.push(`${num}. ${questionText}`);

      if (type === "coding") {
        const desc = (q.description || q.problem_statement || "").trim();
        if (desc) lines.push(`Description: ${desc}`);

        const constraints = (q.constraints || q.constraints_text || "").trim();
        if (constraints) lines.push(`Constraints: ${constraints}`);

        const cases = extractSampleCases(q);
        if (cases.length > 0) {
          cases.forEach((tc, i) => {
            const label = cases.length > 1 ? ` ${i + 1}` : "";
            lines.push(`Sample Input${label}:`);
            String(tc.input).split("\n").forEach((l) => lines.push(`  ${l}`));
            lines.push(`Sample Output${label}:`);
            String(tc.output).split("\n").forEach((l) => lines.push(`  ${l}`));
          });
        } else {
          lines.push("Sample Input:");
          lines.push("  (see problem statement)");
          lines.push("Sample Output:");
          lines.push("  (see problem statement)");
        }

        const hint = (q.explanation || q.hint || q.approach || "").trim();
        if (hint) lines.push(`Explanation: ${hint}`);

        const platform  = q.platform ? `Platform: ${q.platform}` : "";
        const diff      = q.difficulty || "Medium";
        const diffLabel = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
        lines.push([platform, `Difficulty: ${diffLabel}`].filter(Boolean).join("   |   "));

        if (q.starter_code) lines.push(`Starter Code: ${q.starter_code}`);
      } else {
        const opts = extractOptions(q);
        opts.forEach((o) => lines.push(`${o.key}) ${o.text}`));

        const answer = (
          q.answer || q.correct_ans || q.correctAnswer ||
          q.correct_answer || q.correct || ""
        ).toString().trim();
        if (answer) lines.push(`Answer: ${answer.charAt(0).toUpperCase()}`);

        const diff2 = q.difficulty || "medium";
        lines.push(`Difficulty: ${diff2.charAt(0).toUpperCase() + diff2.slice(1).toLowerCase()}`);

        const explanation = (q.explanation || q.reason || q.rationale || "").trim();
        if (explanation) lines.push(`Explanation: ${explanation}`);
      }

      lines.push("");
    });

    return lines.join("\n");
  }

  // ── Download PDF — client-side via jsPDF ──────────────────────────────────
  const downloadPDF = useCallback(async (selectedQuestions, metadata) => {
    if (!window.jspdf) {
      await new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
      });
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: "pt", format: "a4" });

    const pageWidth  = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin     = 50;
    const maxWidth   = pageWidth - margin * 2;
    const lineHeight = 16;
    const smallLine  = 14;

    let y = margin;

    function checkPage(neededHeight = lineHeight) {
      if (y + neededHeight > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
    }

    function writeLine(text, opts = {}) {
      const {
        fontSize   = 11,
        fontStyle  = "normal",
        fontFamily = "helvetica",
        color      = [30, 30, 30],
        indent     = 0,
        lh         = lineHeight,
      } = opts;
      doc.setFont(fontFamily, fontStyle);
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      const wrapped = doc.splitTextToSize(text, maxWidth - indent);
      for (const wl of wrapped) {
        checkPage(lh);
        doc.text(wl, margin + indent, y);
        y += lh;
      }
    }

    function writeLabel(label) {
      writeLine(label, {
        fontSize: 9.5, fontStyle: "bold", color: [90, 60, 160], lh: smallLine,
      });
    }

    function writeCodeBlock(lines_) {
      const blockLines = lines_.flatMap((l) =>
        doc.splitTextToSize(String(l), maxWidth - 24)
      );
      const blockH = blockLines.length * smallLine + 10;
      checkPage(blockH + 4);

      doc.setFillColor(245, 242, 255);
      doc.setDrawColor(190, 170, 230);
      doc.roundedRect(margin, y - smallLine + 2, maxWidth, blockH, 3, 3, "FD");

      doc.setFont("courier", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(40, 20, 80);

      for (const bl of blockLines) {
        doc.text(bl, margin + 8, y + 2);
        y += smallLine;
      }
      y += 6;
    }

    function writeDivider() {
      checkPage(8);
      doc.setDrawColor(200, 185, 240);
      doc.setLineWidth(0.5);
      doc.line(margin, y, margin + maxWidth, y);
      y += 10;
    }

    // Document title
    const docTitle = metadata?.title || "Quiz Paper";
    writeLine(docTitle, { fontSize: 16, fontStyle: "bold", color: [60, 20, 130] });
    const diffLabel = metadata?.difficulty || "";
    if (diffLabel) writeLine(diffLabel, { fontSize: 10, color: [120, 100, 160], lh: 14 });
    y += 8;
    writeDivider();

    // Render each question
    selectedQuestions.forEach((q, idx) => {
      const num  = idx + 1;
      const type = (q.type || "mcq").toLowerCase();

      const questionText = (
        q.question || q.question_text || q.text ||
        q.problem  || q.title        || q.prompt || ""
      ).trim();

      writeLine(`${num}. ${questionText}`, {
        fontSize: 11, fontStyle: "bold", color: [20, 20, 20],
      });

      if (type === "coding") {
        const desc = (q.description || q.problem_statement || "").trim();
        if (desc) {
          y += 4;
          writeLine(desc, { fontSize: 10, color: [50, 50, 50], lh: 14 });
        }

        const constraints = (q.constraints || q.constraints_text || "").trim();
        if (constraints) {
          y += 6;
          writeLabel("CONSTRAINTS");
          writeLine(constraints, {
            fontSize: 10, fontFamily: "courier", color: [60, 40, 100], lh: 13,
          });
        }

        const cases = extractSampleCases(q);
        if (cases.length > 0) {
          cases.forEach((tc, i) => {
            const label = cases.length > 1 ? ` ${i + 1}` : "";
            y += 6;
            writeLabel(`SAMPLE INPUT${label}`);
            writeCodeBlock(String(tc.input).split("\n"));
            writeLabel(`SAMPLE OUTPUT${label}`);
            writeCodeBlock(String(tc.output).split("\n"));
          });
        } else {
          y += 6;
          writeLabel("SAMPLE INPUT");
          writeCodeBlock(["(see problem statement)"]);
          writeLabel("SAMPLE OUTPUT");
          writeCodeBlock(["(see problem statement)"]);
        }

        const hint = (q.explanation || q.hint || q.approach || "").trim();
        if (hint) {
          y += 4;
          writeLabel("EXPLANATION");
          writeLine(hint, { fontSize: 10, color: [60, 60, 60], lh: 13 });
        }

        y += 6;
        const platform  = q.platform ? `Platform: ${q.platform}` : "";
        const diff      = q.difficulty || "Medium";
        const dLabel    = diff.charAt(0).toUpperCase() + diff.slice(1).toLowerCase();
        const metaStr   = [platform, `Difficulty: ${dLabel}`].filter(Boolean).join("   |   ");
        writeLine(metaStr, { fontSize: 9.5, fontStyle: "italic", color: [120, 100, 160], lh: 13 });

        if (q.starter_code) {
          y += 6;
          writeLabel("STARTER CODE");
          writeCodeBlock(q.starter_code.split("\n"));
        }
      } else {
        const opts = extractOptions(q);
        if (opts.length > 0) {
          y += 4;
          opts.forEach((o) => {
            writeLine(`  ${o.key})  ${o.text}`, { fontSize: 10, color: [40, 40, 40], lh: 14 });
          });
        }

        const answer = (
          q.answer || q.correct_ans || q.correctAnswer ||
          q.correct_answer || q.correct || ""
        ).toString().trim();
        if (answer) {
          y += 4;
          writeLine(`Answer: ${answer.charAt(0).toUpperCase()}`, {
            fontSize: 10, fontStyle: "bold", color: [20, 120, 60], lh: 13,
          });
        }

        const diff2   = q.difficulty || "medium";
        const dLabel2 = diff2.charAt(0).toUpperCase() + diff2.slice(1).toLowerCase();
        writeLine(`Difficulty: ${dLabel2}`, {
          fontSize: 9.5, fontStyle: "italic", color: [120, 100, 160], lh: 13,
        });

        const explanation = (q.explanation || q.reason || q.rationale || "").trim();
        if (explanation) {
          y += 2;
          writeLine(`Explanation: ${explanation}`, { fontSize: 9.5, color: [80, 80, 80], lh: 13 });
        }
      }

      y += 6;
      writeDivider();
    });

    const title = (metadata?.title || "quiz").replace(/\s+/g, "_");
    doc.save(`${title}_${Date.now()}.pdf`);
  }, []);

  return { state, progress, questions, stats, error, generate, reset, downloadPDF };
}