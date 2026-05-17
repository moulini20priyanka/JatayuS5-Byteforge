// ── routes/execute.js ─────────────────────────────────────────────
// POST /api/execute — runs Python, Java, C++, JavaScript with test cases
// Mount in server.js:  app.use('/api/execute', require('./routes/execute'));
// ─────────────────────────────────────────────────────────────────

const express        = require("express");
const router         = express.Router();
const { exec }       = require("child_process");
const fs             = require("fs");
const path           = require("path");
const os             = require("os");
const { v4: uuidv4 } = require("uuid");

const TIMEOUT_MS = 10000;
const TEMP_DIR   = os.tmpdir();

function runCmd(cmd, timeoutMs = TIMEOUT_MS) {
  return new Promise((resolve) => {
    exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
      resolve({ stdout: stdout||"", stderr: stderr||"", error: error||null, timedOut: error?.killed||false });
    });
  });
}

function writeTemp(ext, content) {
  const id   = uuidv4().replace(/-/g,"").slice(0,12);
  const file = path.join(TEMP_DIR, `na_${id}.${ext}`);
  fs.writeFileSync(file, content, "utf8");
  return { file, id };
}

function cleanup(...files) {
  for (const f of files) {
    try { if (f && fs.existsSync(f)) fs.unlinkSync(f); } catch {}
  }
}

function norm(str) {
  return (str||"").trim().replace(/\r\n/g,"\n").replace(/\s+$/gm,"");
}

async function runOne(lang, code, input, expected) {
  const inp = String(input  ?? "");
  const exp = String(expected ?? "");

  // ── Python ──────────────────────────────────────────────────────
  if (lang === "python") {
    const { file, id } = writeTemp("py", code);
    const inpFile = path.join(TEMP_DIR, `na_${id}_in.txt`);
    fs.writeFileSync(inpFile, inp, "utf8");
    const r = await runCmd(`python3 "${file}" < "${inpFile}"`, TIMEOUT_MS);
    cleanup(file, inpFile);
    if (r.timedOut) return { passed:false, actual:"Time Limit Exceeded", error:"TLE" };
    if (r.error && !r.stdout) return { passed:false, actual:null, error: (r.stderr||r.error.message).split("\n").slice(-3).join(" ").trim() };
    const actual = norm(r.stdout);
    return { passed: norm(actual)===norm(exp), actual, error: r.stderr?.trim()||null };
  }

  // ── JavaScript ──────────────────────────────────────────────────
  if (lang === "javascript") {
    const { id } = writeTemp("js", ""); // just get id
    const inpFile  = path.join(TEMP_DIR, `na_${id}_in.txt`);
    const wrapFile = path.join(TEMP_DIR, `na_${id}_wrap.js`);
    fs.writeFileSync(inpFile, inp, "utf8");
    const wrapper = `
const fs=require('fs');
const _lines=fs.readFileSync('${inpFile.replace(/\\/g,"/")}','utf8').trim().split('\\n');
let _li=0;
const readline=()=>_lines[_li++]||'';
${code}
`;
    fs.writeFileSync(wrapFile, wrapper, "utf8");
    const r = await runCmd(`node "${wrapFile}"`, TIMEOUT_MS);
    cleanup(inpFile, wrapFile);
    if (r.timedOut) return { passed:false, actual:"Time Limit Exceeded", error:"TLE" };
    if (r.error && !r.stdout) return { passed:false, actual:null, error: (r.stderr||r.error.message).split("\n").slice(-2).join(" ").trim() };
    const actual = norm(r.stdout);
    return { passed: norm(actual)===norm(exp), actual, error: r.stderr?.trim()||null };
  }

  // ── C++ ─────────────────────────────────────────────────────────
  if (lang === "cpp") {
    const { file, id } = writeTemp("cpp", code);
    const outFile = path.join(TEMP_DIR, `na_${id}_bin`);
    const inpFile = path.join(TEMP_DIR, `na_${id}_in.txt`);
    fs.writeFileSync(inpFile, inp, "utf8");

    const compile = await runCmd(`g++ -O2 -o "${outFile}" "${file}" 2>&1`, 20000);
    if (compile.error || (compile.stdout && compile.stdout.includes("error:"))) {
      cleanup(file, outFile, inpFile);
      return { passed:false, actual:null, error:"Compile Error: " + (compile.stdout||compile.stderr||"").split("\n").slice(0,4).join(" ").trim() };
    }

    const r = await runCmd(`"${outFile}" < "${inpFile}"`, TIMEOUT_MS);
    cleanup(file, outFile, inpFile);
    if (r.timedOut) return { passed:false, actual:"Time Limit Exceeded", error:"TLE" };
    if (r.error && !r.stdout) return { passed:false, actual:null, error: (r.stderr||r.error.message).split("\n").slice(-2).join(" ").trim() };
    const actual = norm(r.stdout);
    return { passed: norm(actual)===norm(exp), actual, error: r.stderr?.trim()||null };
  }

  // ── Java ────────────────────────────────────────────────────────
  if (lang === "java") {
    const javaCheck = await runCmd("java -version 2>&1");
    if (javaCheck.error && !(javaCheck.stderr||"").includes("version")) {
      return { passed:false, actual:null, error:"Java not installed. Run: winget install Microsoft.OpenJDK.21" };
    }

    const id      = uuidv4().replace(/-/g,"").slice(0,8);
    const dir     = path.join(TEMP_DIR, `na_java_${id}`);
    const inpFile = path.join(TEMP_DIR, `na_${id}_in.txt`);
    fs.mkdirSync(dir, { recursive:true });
    fs.writeFileSync(inpFile, inp, "utf8");

    const classMatch = code.match(/public\s+class\s+(\w+)/);
    const className  = classMatch ? classMatch[1] : "Solution";
    const javaFile   = path.join(dir, `${className}.java`);
    fs.writeFileSync(javaFile, code, "utf8");

    const compile = await runCmd(`javac "${javaFile}" -d "${dir}" 2>&1`, 20000);
    if (compile.error || (compile.stdout && compile.stdout.includes("error:"))) {
      cleanup(inpFile);
      try { fs.rmSync(dir, { recursive:true }); } catch {}
      return { passed:false, actual:null, error:"Compile Error: " + (compile.stdout||compile.stderr||"").split("\n").slice(0,4).join(" ").trim() };
    }

    const r = await runCmd(`java -cp "${dir}" ${className} < "${inpFile}"`, TIMEOUT_MS);
    cleanup(inpFile);
    try { fs.rmSync(dir, { recursive:true }); } catch {}
    if (r.timedOut) return { passed:false, actual:"Time Limit Exceeded", error:"TLE" };
    if (r.error && !r.stdout) return { passed:false, actual:null, error: (r.stderr||r.error.message).split("\n").slice(-2).join(" ").trim() };
    const actual = norm(r.stdout);
    return { passed: norm(actual)===norm(exp), actual, error: r.stderr?.trim()||null };
  }

  return { passed:false, actual:null, error:`Unsupported language: ${lang}` };
}

// ── POST /api/execute ─────────────────────────────────────────────
router.post("/", async (req, res) => {
  const { language, code, test_cases=[], input="" } = req.body;
  if (!language || !code) return res.status(400).json({ error:"language and code required" });

  const lang = language.toLowerCase();

  try {
    // No test cases — raw run
    if (!test_cases || test_cases.length === 0) {
      const r = await runOne(lang, code, input, "");
      return res.json({ output: r.actual||r.error||"(no output)", error: r.error||null });
    }

    // Run each test case sequentially
    const results = [];
    for (const tc of test_cases) {
      const r = await runOne(lang, code, tc.input, tc.expected);
      results.push({ passed: r.passed, actual: r.actual, error: r.error });
    }

    const passed = results.filter(r => r.passed).length;
    return res.json({
      results,
      summary: `${passed}/${results.length} test cases passed`,
      output:  `${passed}/${results.length} test cases passed`,
    });

  } catch (err) {
    console.error("[execute]", err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
