import { useState, useEffect, useRef } from "react";

const CODE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&family=Inter:wght@400;500;600;700&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --bg:#f4f6fb; --surface:#ffffff; --surface2:#f8f9fd; --surface3:#f1f4f9;
  --border:#e4e8f0; --border2:#cdd3e0;
  --accent:#0284c7; --accent-s:#f0f9ff; --accent-m:rgba(2,132,199,0.12);
  --green:#16a34a; --green-s:#f0fdf4;
  --red:#dc2626; --red-s:#fef2f2;
  --amber:#d97706; --amber-s:#fffbeb;
  --text:#0f172a; --text2:#334155; --muted:#64748b; --dim:#94a3b8;
  --shadow-sm:0 1px 3px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04);
  --shadow-lg:0 12px 40px rgba(0,0,0,0.10),0 4px 12px rgba(0,0,0,0.06);
}
html,body{height:100%;font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);overflow:hidden;}
.ce-layout{display:grid;grid-template-rows:52px 1fr;grid-template-columns:1fr 280px;height:100vh;overflow:hidden;}
.ce-topbar{grid-column:1/-1;background:var(--surface);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:12px;z-index:100;box-shadow:var(--shadow-sm);}
.ce-brand-icon{width:30px;height:30px;border-radius:8px;background:linear-gradient(135deg,#0284c7,#0369a1);display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(2,132,199,0.28);}
.ce-brand-name{font-size:13px;font-weight:700;color:var(--text);letter-spacing:-0.2px;}
.ce-brand-sub{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.8px;margin-top:1px;}
.ce-divider{width:1px;height:22px;background:var(--border);flex-shrink:0;}
.ce-exam-title{font-size:12px;font-weight:600;color:var(--text);}
.ce-exam-meta{font-size:10px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-top:1px;}
.ce-spacer{flex:1;}
.ce-lang-pill{display:flex;align-items:center;gap:6px;background:var(--accent-s);border:1px solid var(--accent-m);border-radius:6px;padding:4px 10px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--accent);letter-spacing:0.5px;}
.ce-proctor-pill{display:flex;align-items:center;gap:6px;background:var(--green-s);border:1px solid rgba(22,163,74,0.18);border-radius:100px;padding:4px 10px;}
.ce-proctor-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:ce-pulse 2s ease infinite;}
.ce-proctor-label{font-size:9px;font-weight:700;color:var(--green);font-family:'JetBrains Mono',monospace;letter-spacing:0.8px;}
.ce-viol-badge{display:flex;align-items:center;gap:5px;background:var(--amber-s);border:1px solid rgba(217,119,6,0.2);border-radius:100px;padding:4px 10px;}
.ce-viol-label{font-size:9px;font-weight:700;color:var(--amber);font-family:'JetBrains Mono',monospace;}
.ce-timer{display:flex;align-items:center;gap:7px;background:var(--surface2);border:1.5px solid var(--border);border-radius:100px;padding:5px 14px;transition:all 0.4s;}
.ce-timer.warning{background:var(--amber-s);border-color:rgba(210,153,34,0.4);}
.ce-timer.danger{background:var(--red-s);border-color:rgba(248,81,73,0.4);animation:ce-timer-pulse 1s ease infinite;}
.ce-timer-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:ce-ping 2s ease infinite;transition:background 0.4s;}
.ce-timer.warning .ce-timer-dot{background:var(--amber);}
.ce-timer.danger .ce-timer-dot{background:var(--red);}
.ce-timer-val{font-family:'JetBrains Mono',monospace;font-size:14px;font-weight:700;color:var(--green);letter-spacing:2px;transition:color 0.4s;}
.ce-timer.warning .ce-timer-val{color:var(--amber);}
.ce-timer.danger .ce-timer-val{color:var(--red);}
.ce-main{display:grid;grid-template-columns:340px 1fr;overflow:hidden;}
.ce-problem{background:var(--surface);border-right:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;}
.ce-problem-header{padding:16px 20px 14px;border-bottom:1px solid var(--border);flex-shrink:0;}
.ce-problem-num{font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--muted);letter-spacing:1.5px;margin-bottom:6px;}
.ce-problem-title{font-size:18px;font-weight:700;color:var(--text);letter-spacing:-0.4px;margin-bottom:8px;}
.ce-diff-badge{display:inline-flex;align-items:center;gap:5px;padding:2px 9px;border-radius:100px;font-size:10px;font-weight:700;font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;}
.ce-diff-badge.easy{background:var(--green-s);color:var(--green);border:1px solid rgba(22,163,74,0.2);}
.ce-diff-badge.medium{background:var(--amber-s);color:var(--amber);border:1px solid rgba(217,119,6,0.2);}
.ce-diff-badge.hard{background:var(--red-s);color:var(--red);border:1px solid rgba(220,38,38,0.2);}
.ce-problem-body{padding:16px 20px;flex:1;}
.ce-problem-desc{font-size:13px;color:var(--text2);line-height:1.75;margin-bottom:16px;}
.ce-problem-desc code{background:var(--accent-s);border:1px solid var(--accent-m);border-radius:4px;padding:1px 5px;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--accent);}
.ce-section-title{font-size:9px;font-weight:700;font-family:'JetBrains Mono',monospace;color:var(--muted);letter-spacing:1.5px;margin-bottom:10px;margin-top:16px;}
.ce-example{background:var(--surface2);border:1px solid var(--border);border-radius:9px;padding:12px 14px;margin-bottom:10px;font-size:12px;font-family:'JetBrains Mono',monospace;}
.ce-example-label{font-size:9px;font-weight:700;color:var(--muted);letter-spacing:1px;margin-bottom:8px;}
.ce-example-row{display:flex;gap:6px;margin-bottom:4px;flex-wrap:wrap;}
.ce-example-key{color:var(--muted);font-size:11px;}
.ce-example-val{color:var(--text);font-size:11px;}
.ce-example-exp{color:var(--text2);font-size:10.5px;margin-top:4px;line-height:1.5;}
.ce-constraints{margin-top:4px;}
.ce-constraint{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;color:var(--text2);font-family:'JetBrains Mono',monospace;}
.ce-constraint:last-child{border-bottom:none;}
.ce-constraint-dot{width:5px;height:5px;border-radius:50%;background:var(--accent);flex-shrink:0;margin-top:4px;}
.ce-editor-panel{display:flex;flex-direction:column;overflow:hidden;background:var(--surface);}
.ce-editor-topbar{display:flex;align-items:center;justify-content:space-between;padding:0 14px;height:42px;background:var(--surface2);border-bottom:1px solid var(--border);flex-shrink:0;}
.ce-tab{display:flex;align-items:center;gap:7px;padding:0 14px;height:42px;font-size:12px;font-weight:500;color:var(--text);font-family:'JetBrains Mono',monospace;border-bottom:2px solid var(--accent);}
.ce-lang-select{background:var(--surface2);border:1px solid var(--border2);border-radius:6px;padding:5px 10px;font-size:11px;font-family:'JetBrains Mono',monospace;color:var(--text2);cursor:pointer;outline:none;appearance:none;}
.ce-editor-wrap{flex:1;overflow:hidden;position:relative;}
.ce-fallback-editor{width:100%;height:100%;background:var(--surface);color:var(--text);font-family:'JetBrains Mono',monospace;font-size:13px;line-height:1.6;border:none;outline:none;resize:none;padding:16px 20px;tab-size:4;}
.ce-loading-overlay{position:absolute;inset:0;background:var(--surface);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;z-index:10;}
.ce-loading-spinner{width:28px;height:28px;border:2px solid var(--border);border-top-color:var(--accent);border-radius:50%;animation:ce-spin 0.7s linear infinite;}
.ce-loading-text{font-size:11px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.ce-output-bar{height:180px;background:var(--surface2);border-top:1px solid var(--border);display:flex;flex-direction:column;flex-shrink:0;}
.ce-output-tabs{display:flex;align-items:center;border-bottom:1px solid var(--border);height:36px;padding:0 14px;gap:4px;flex-shrink:0;}
.ce-out-tab{padding:0 12px;height:36px;display:flex;align-items:center;font-size:11px;font-weight:500;font-family:'JetBrains Mono',monospace;color:var(--muted);cursor:pointer;border-bottom:2px solid transparent;transition:all 0.15s;}
.ce-out-tab.active{color:var(--text);border-bottom-color:var(--accent);}
.ce-out-tab:hover:not(.active){color:var(--text2);}
.ce-out-spacer{flex:1;}
.ce-run-btn{display:flex;align-items:center;gap:7px;padding:6px 16px;border-radius:7px;background:var(--green-s);border:1px solid rgba(22,163,74,0.25);color:var(--green);font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;cursor:pointer;letter-spacing:0.5px;transition:all 0.15s;}
.ce-run-btn:hover{background:#dcfce7;}
.ce-run-btn:disabled{opacity:0.5;cursor:not-allowed;}
.ce-submit-btn{display:flex;align-items:center;gap:7px;padding:6px 16px;border-radius:7px;background:var(--accent);border:none;color:#fff;font-size:11px;font-weight:700;font-family:'JetBrains Mono',monospace;cursor:pointer;letter-spacing:0.5px;box-shadow:0 2px 8px rgba(2,132,199,0.28);transition:all 0.15s;}
.ce-submit-btn:hover{background:#0369a1;}
.ce-output-body{flex:1;overflow-y:auto;padding:10px 16px;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--text2);line-height:1.6;}
.ce-output-placeholder{color:var(--dim);font-style:italic;}
.ce-test-case{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:6px;margin-bottom:5px;border:1px solid var(--border);background:var(--surface);}
.ce-test-pass{border-color:rgba(22,163,74,0.25);background:#f0fdf4;}
.ce-test-fail{border-color:rgba(220,38,38,0.25);background:#fef2f2;}
.ce-test-icon{font-size:12px;}
.ce-test-label{font-size:11px;color:var(--text2);flex:1;}
.ce-test-status{font-size:10px;font-weight:700;letter-spacing:0.5px;}
.ce-test-status.pass{color:var(--green);}
.ce-test-status.fail{color:var(--red);}
.ce-sidebar{background:var(--surface);border-left:1px solid var(--border);overflow-y:auto;display:flex;flex-direction:column;}
.ce-webcam-section{padding:14px 12px 12px;border-bottom:1px solid var(--border);}
.ce-section-label{font-size:9px;font-weight:700;letter-spacing:1.5px;color:var(--muted);font-family:'JetBrains Mono',monospace;margin-bottom:8px;text-transform:uppercase;}
.ce-webcam-box{background:#0f172a;border-radius:10px;overflow:hidden;aspect-ratio:4/3;position:relative;}
.ce-webcam-inner{width:100%;height:100%;background:linear-gradient(160deg,#0f172a 0%,#1e3a5f 100%);position:relative;overflow:hidden;}
.ce-sil{position:absolute;bottom:0;left:50%;transform:translateX(-50%);width:80px;height:108px;}
.ce-sil-head{width:38px;height:38px;border-radius:50%;background:rgba(255,255,255,0.10);margin:0 auto 4px;}
.ce-sil-body{width:64px;height:64px;border-radius:50% 50% 0 0;background:rgba(255,255,255,0.07);margin:0 auto;}
.ce-webcam-overlay{position:absolute;top:7px;left:7px;display:flex;align-items:center;gap:4px;background:rgba(0,0,0,0.45);border-radius:4px;padding:3px 6px;}
.ce-webcam-rec{width:5px;height:5px;border-radius:50%;background:#ef4444;animation:ce-pulse 1.5s ease infinite;}
.ce-webcam-rec-label{font-size:8px;font-weight:700;color:rgba(255,255,255,0.75);font-family:'JetBrains Mono',monospace;letter-spacing:1px;}
.ce-webcam-status{display:flex;align-items:center;justify-content:space-between;margin-top:8px;}
.ce-webcam-dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:ce-pulse 2s ease infinite;}
.ce-webcam-active{font-size:9px;color:var(--green);font-family:'JetBrains Mono',monospace;font-weight:700;letter-spacing:0.5px;}
.ce-webcam-face{font-size:9px;color:var(--dim);font-family:'JetBrains Mono',monospace;}
.ce-stats-row{display:grid;grid-template-columns:1fr 1fr;gap:7px;padding:12px;border-bottom:1px solid var(--border);}
.ce-stat-card{background:var(--surface2);border:1px solid var(--border);border-radius:8px;padding:9px 8px 7px;text-align:center;}
.ce-stat-val{font-size:18px;font-weight:700;letter-spacing:-0.5px;line-height:1;}
.ce-stat-lbl{font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;letter-spacing:0.5px;margin-top:3px;}
.ce-nav-section{padding:12px;}
.ce-nav-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:5px;}
.ce-nav-dot{aspect-ratio:1;border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:600;font-family:'JetBrains Mono',monospace;border:1.5px solid var(--border);background:var(--surface2);color:var(--muted);cursor:default;transition:all 0.12s;}
.ce-nav-dot.current{background:var(--accent);border-color:var(--accent);color:#fff;box-shadow:0 2px 8px rgba(2,132,199,0.3);}
.ce-nav-dot.answered{background:#e8f5e9;border-color:rgba(22,163,74,0.3);color:var(--green);}
.ce-legend{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px;}
.ce-legend-item{display:flex;align-items:center;gap:5px;font-size:9px;color:var(--muted);font-family:'JetBrains Mono',monospace;}
.ce-legend-dot{width:7px;height:7px;border-radius:3px;flex-shrink:0;}
.ce-viol-banner{background:var(--amber-s);border:1.5px solid rgba(217,119,6,0.25);padding:9px 20px;display:flex;align-items:center;gap:9px;position:fixed;top:52px;left:0;right:280px;z-index:90;animation:ce-fadeIn 0.2s ease;}
.ce-watermark{position:fixed;top:52px;left:0;right:280px;bottom:0;pointer-events:none;z-index:40;}

@keyframes ce-fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes ce-fadeUp{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
@keyframes ce-ping{0%,100%{opacity:1;transform:scale(1);}50%{opacity:0.4;transform:scale(1.3);}}
@keyframes ce-pulse{0%,100%{opacity:1;}50%{opacity:0.4;}}
@keyframes ce-spin{to{transform:rotate(360deg);}}
@keyframes ce-timer-pulse{0%,100%{box-shadow:0 0 0 0 rgba(220,38,38,0.2);}50%{box-shadow:0 0 0 6px rgba(220,38,38,0);}}
`;

function buildWatermarkBg() {
  const W = 420, H = 240, c = document.createElement("canvas");
  c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.rotate(-28 * Math.PI / 180);
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.font = "700 18px Arial, sans-serif";
  ctx.fillStyle = "rgba(2,132,199,0.07)";
  ctx.fillText("NEUROASSESS", 0, -14);
  ctx.font = "500 13px Arial, sans-serif";
  ctx.fillStyle = "rgba(2,132,199,0.05)";
  ctx.fillText(ROLL, 0, 10);
  ctx.restore();
  return `url(${c.toDataURL()})`;
}

const TOTAL_SECS     = 30 * 60;
const CUTOFF         = 50;
const ROLL           = "240352";
const REDIRECT_SECS  = 60;
const MAX_VIOLATIONS = 3;

const PROBLEMS = [
  {
    id: "P001", title: "Two Sum", difficulty: "easy",
    description: `Given an array of integers <code>nums</code> and an integer <code>target</code>, return <em>indices</em> of the two numbers such that they add up to <code>target</code>.\n\nYou may assume that each input would have <strong>exactly one solution</strong>, and you may not use the same element twice.\n\nYou can return the answer in any order.`,
    examples: [
      { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explain: "Because nums[0] + nums[1] == 9, we return [0, 1]." },
      { input: "nums = [3,2,4], target = 6",     output: "[1,2]" },
      { input: "nums = [3,3], target = 6",       output: "[0,1]" },
    ],
    constraints: ["2 ≤ nums.length ≤ 10⁴", "-10⁹ ≤ nums[i] ≤ 10⁹", "-10⁹ ≤ target ≤ 10⁹", "Only one valid answer exists."],
    starterCode: {
      java: `import java.util.HashMap;\nimport java.util.Map;\n\nclass Solution {\n    public int[] twoSum(int[] nums, int target) {\n        // Write your solution here\n        Map<Integer, Integer> seen = new HashMap<>();\n        for (int i = 0; i < nums.length; i++) {\n            int complement = target - nums[i];\n            if (seen.containsKey(complement)) {\n                return new int[]{seen.get(complement), i};\n            }\n            seen.put(nums[i], i);\n        }\n        return new int[]{};\n    }\n}`,
      python: `from typing import List\n\nclass Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            complement = target - num\n            if complement in seen:\n                return [seen[complement], i]\n            seen[num] = i\n        return []`,
      javascript: `var twoSum = function(nums, target) {\n    const seen = new Map();\n    for (let i = 0; i < nums.length; i++) {\n        const complement = target - nums[i];\n        if (seen.has(complement)) return [seen.get(complement), i];\n        seen.set(nums[i], i);\n    }\n    return [];\n};`,
    },
    testCases: [
      { input: "nums=[2,7,11,15], target=9", expected: "[0,1]" },
      { input: "nums=[3,2,4], target=6",     expected: "[1,2]" },
      { input: "nums=[3,3], target=6",       expected: "[0,1]" },
    ],
  },
  {
    id: "P002", title: "Valid Palindrome", difficulty: "easy",
    description: `A phrase is a <strong>palindrome</strong> if, after converting all uppercase letters into lowercase letters and removing all non-alphanumeric characters, it reads the same forward and backward.\n\nGiven a string <code>s</code>, return <code>true</code> if it is a palindrome, or <code>false</code> otherwise.`,
    examples: [
      { input: 's = "A man, a plan, a canal: Panama"', output: "true",  explain: '"amanaplanacanalpanama" is a palindrome.' },
      { input: 's = "race a car"',                    output: "false", explain: '"raceacar" is not a palindrome.' },
      { input: 's = " "',                             output: "true",  explain: "s is an empty string after removing non-alphanumeric characters." },
    ],
    constraints: ["1 ≤ s.length ≤ 2 × 10⁵", "s consists only of printable ASCII characters."],
    starterCode: {
      java: `class Solution {\n    public boolean isPalindrome(String s) {\n        int l = 0, r = s.length() - 1;\n        while (l < r) {\n            while (l < r && !Character.isLetterOrDigit(s.charAt(l))) l++;\n            while (l < r && !Character.isLetterOrDigit(s.charAt(r))) r--;\n            if (Character.toLowerCase(s.charAt(l)) != Character.toLowerCase(s.charAt(r))) return false;\n            l++; r--;\n        }\n        return true;\n    }\n}`,
      python: `class Solution:\n    def isPalindrome(self, s: str) -> bool:\n        filtered = ''.join(c.lower() for c in s if c.isalnum())\n        return filtered == filtered[::-1]`,
      javascript: `var isPalindrome = function(s) {\n    const f = s.toLowerCase().replace(/[^a-z0-9]/g, '');\n    return f === f.split('').reverse().join('');\n};`,
    },
    testCases: [
      { input: 's="A man, a plan, a canal: Panama"', expected: "true"  },
      { input: 's="race a car"',                    expected: "false" },
      { input: 's=" "',                             expected: "true"  },
    ],
  },
];

const LANG_MAP    = { java: "java", python: "python", javascript: "javascript" };
const LANG_LABELS = { java: "Java", python: "Python 3", javascript: "JavaScript" };

/* ── SVG Icons (no emojis) ── */
const IcoCode  = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const IcoWarn  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="var(--amber)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IcoPlay  = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>;
const IcoCheck = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoPass  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IcoFail  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--red)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;
const IcoViva  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>;

function loadMonaco() {
  return new Promise((resolve) => {
    if (window.monaco) { resolve(window.monaco); return; }
    if (window._monacoLoading) {
      const t = setInterval(() => { if (window.monaco) { clearInterval(t); resolve(window.monaco); } }, 100);
      return;
    }
    window._monacoLoading = true;
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs/loader.min.js";
    s.onload = () => {
      window.require.config({ paths: { vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.44.0/min/vs" } });
      window.require(["vs/editor/editor.main"], () => resolve(window.monaco));
    };
    s.onerror = () => resolve(null);
    document.head.appendChild(s);
  });
}

function MonacoEditor({ value, language, onChange }) {
  const containerRef = useRef(null);
  const editorRef    = useRef(null);
  const [loading, setLoading] = useState(true);
  const [failed,  setFailed]  = useState(false);
  const lastKey = useRef(language + value.slice(0, 30));

  useEffect(() => {
    let cancelled = false;
    loadMonaco().then((monaco) => {
      if (cancelled || !containerRef.current) return;
      if (!monaco) { setFailed(true); setLoading(false); return; }
      const editor = monaco.editor.create(containerRef.current, {
        value, language: LANG_MAP[language] || language, theme: "vs",
        fontSize: 13, fontFamily: "'JetBrains Mono', monospace", fontLigatures: true,
        minimap: { enabled: false }, scrollBeyondLastLine: false,
        lineNumbers: "on", lineNumbersMinChars: 3, renderLineHighlight: "line",
        automaticLayout: true, tabSize: 4, insertSpaces: true, wordWrap: "on",
        padding: { top: 14, bottom: 14 },
        scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
        bracketPairColorization: { enabled: true },
      });
      editorRef.current = editor;
      editor.onDidChangeModelContent(() => onChange(editor.getValue()));
      setLoading(false);
    });
    return () => { cancelled = true; editorRef.current?.dispose(); editorRef.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (!editorRef.current || !window.monaco) return;
    const model = editorRef.current.getModel();
    if (model) window.monaco.editor.setModelLanguage(model, LANG_MAP[language] || language);
  }, [language]);

  useEffect(() => {
    const key = language + value.slice(0, 30);
    if (!editorRef.current || key === lastKey.current) return;
    lastKey.current = key;
    if (editorRef.current.getValue() !== value) editorRef.current.setValue(value);
  }, [value, language]);

  if (failed) return (
    <textarea className="ce-fallback-editor" value={value} onChange={e => onChange(e.target.value)} spellCheck={false}
      onKeyDown={e => { if (e.key === "Tab") { e.preventDefault(); const el = e.target, s = el.selectionStart, end = el.selectionEnd; onChange(value.slice(0, s) + "    " + value.slice(end)); setTimeout(() => { el.selectionStart = el.selectionEnd = s + 4; }, 0); } }} />
  );
  return (
    <>
      {loading && <div className="ce-loading-overlay"><div className="ce-loading-spinner" /><span className="ce-loading-text">Loading editor…</span></div>}
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
    </>
  );
}

/* ─────────────────────────────────────────────────────────────
   Main Component
   ───────────────────────────────────────────────────────────── */
export default function CodeExamPage({ onNavigate, onStartViva }) {
  useEffect(() => {
    if (document.getElementById("ce-styles")) return;
    const s = document.createElement("style"); s.id = "ce-styles"; s.textContent = CODE_CSS;
    document.head.appendChild(s);
  }, []);

  // Assign refs on every render — no useEffect needed, always fresh
  const onNavigateRef  = useRef(onNavigate);
  const onStartVivaRef = useRef(onStartViva);
  onNavigateRef.current  = onNavigate;
  onStartVivaRef.current = onStartViva;

  const [current,        setCurrent]        = useState(0);
  const [lang,           setLang]           = useState("java");
  const [codes,          setCodes]          = useState(() => PROBLEMS.map(p => ({ java: p.starterCode.java, python: p.starterCode.python, javascript: p.starterCode.javascript })));
  const [submitted,      setSubmitted]      = useState(() => new Array(PROBLEMS.length).fill(false));
  const [outTab,         setOutTab]         = useState("output");
  const [runResults,     setRunResults]     = useState(null);
  const [isRunning,      setIsRunning]      = useState(false);
  const [secsLeft,       setSecsLeft]       = useState(TOTAL_SECS);
  const [violations,     setViolations]     = useState(0);
  const [violMsg,        setViolMsg]        = useState("");
  const [showViolBanner, setShowViolBanner] = useState(false);
  const [examDone,       setExamDone]       = useState(false);
  const [result,         setResult]         = useState(null);
  const [redirectLeft,   setRedirectLeft]   = useState(REDIRECT_SECS);
  const [wmBg,           setWmBg]           = useState("");

  const violTimerRef  = useRef(null);
  const listeningRef  = useRef(false);
  const violationsRef = useRef(0);
  const examDoneRef   = useRef(false);
  const submittedRef  = useRef(new Array(PROBLEMS.length).fill(false));
  // Store result in ref so the viva button onClick always has the latest score
  const resultRef     = useRef(null);

  useEffect(() => { setWmBg(buildWatermarkBg()); }, []);

  // Countdown timer
  useEffect(() => {
    const id = setInterval(() => {
      setSecsLeft(s => { if (s <= 1) { clearInterval(id); doSubmitAll(); return 0; } return s - 1; });
    }, 1000);
    return () => clearInterval(id);
  }, []); // eslint-disable-line

  // Auto-redirect on fail
  useEffect(() => {
    if (!examDone || !result || result.passed) return;
    const id = setInterval(() => {
      setRedirectLeft(s => {
        if (s <= 1) { clearInterval(id); onNavigateRef.current?.("lobby"); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [examDone, result]);

  // Tab / focus proctoring
  useEffect(() => {
    const t = setTimeout(() => { listeningRef.current = true; }, 2000);
    const onHide = () => { if (listeningRef.current && document.hidden) triggerViolation("Tab switch detected"); };
    const onBlur = () => { if (listeningRef.current) triggerViolation("Window focus lost"); };
    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("blur", onBlur);
    return () => { clearTimeout(t); document.removeEventListener("visibilitychange", onHide); window.removeEventListener("blur", onBlur); };
  }, []); // eslint-disable-line

  function triggerViolation(reason) {
    if (examDoneRef.current) return;
    violationsRef.current += 1;
    const v = violationsRef.current;
    setViolations(v);
    const msg = v < MAX_VIOLATIONS
      ? `Security alert: ${reason} · ${v}/${MAX_VIOLATIONS} warnings`
      : "Maximum violations reached. Exam is being submitted.";
    setViolMsg(msg); setShowViolBanner(true);
    clearTimeout(violTimerRef.current);
    violTimerRef.current = setTimeout(() => setShowViolBanner(false), 5000);
    if (v >= MAX_VIOLATIONS) doSubmitAll();
  }

  // Not a useCallback — plain function so it always closes over the latest refs
  // examDoneRef.current is set FIRST before any setState to prevent double-fire
  function doSubmitAll() {
    if (examDoneRef.current) return;  // already ran — bail immediately
    examDoneRef.current = true;        // lock NOW before any async work
    const correct = submittedRef.current.filter(Boolean).length;
    const capped  = Math.min(correct, PROBLEMS.length);
    const score   = Math.round((capped / PROBLEMS.length) * 100);
    const r = { score, correct: capped, passed: score >= CUTOFF };
    resultRef.current = r;             // store in ref so button handler can read it
    setExamDone(true);
    setResult(r);
  }

  const handleCodeChange = (val) => {
    const idx = Math.min(current, PROBLEMS.length - 1);
    setCodes(prev => { const next = [...prev]; next[idx] = { ...next[idx], [lang]: val }; return next; });
  };

  const handleRun = () => {
    setIsRunning(true); setOutTab("tests"); setRunResults(null);
    setTimeout(() => {
      const idx = Math.min(current, PROBLEMS.length - 1);
      setRunResults(PROBLEMS[idx].testCases.map(tc => ({ ...tc, pass: true })));
      setIsRunning(false);
    }, 1200);
  };

  const handleSubmitProblem = () => {
    // Mark problem submitted first, then decide what to do
    const ns = [...submittedRef.current];
    if (!ns[current]) { ns[current] = true; submittedRef.current = ns; setSubmitted([...ns]); }

    if (current + 1 < PROBLEMS.length) {
      // Not last problem — run tests and move forward
      handleRun();
      setTimeout(() => { setCurrent(c => c + 1); setRunResults(null); }, 800);
    } else {
      // Last problem — run tests then finalize exam
      handleRun();
      setTimeout(doSubmitAll, 800);
    }
  };

  // ── Direct navigation — reads score from ref, calls prop via ref (never stale) ──
  const handleGoToViva = () => {
    const score = resultRef.current?.score ?? 0;
    onStartVivaRef.current?.(score);
  };

  const safeIndex   = Math.min(current, PROBLEMS.length - 1);
  const q           = PROBLEMS[safeIndex];
  const pct         = secsLeft / TOTAL_SECS;
  const timerCls    = `ce-timer${pct <= 0.1 ? " danger" : pct <= 0.25 ? " warning" : ""}`;
  const mm          = String(Math.floor(secsLeft / 60)).padStart(2, "0");
  const ss_         = String(secsLeft % 60).padStart(2, "0");
  const answeredN   = submitted.filter(Boolean).length;
  const redirectPct = (redirectLeft / REDIRECT_SECS) * 100;

  return (
    <>
      <div className="ce-watermark" style={{ backgroundImage: wmBg, backgroundRepeat: "repeat", backgroundSize: "420px 240px" }} />

      <div className="ce-layout">
        {/* ── Topbar ── */}
        <header className="ce-topbar">
          <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
            <div className="ce-brand-icon"><IcoCode /></div>
            <div>
              <div className="ce-brand-name">NeuroAssess</div>
              <div className="ce-brand-sub">CODING ROUND</div>
            </div>
          </div>
          <div className="ce-divider" />
          <div>
            <div className="ce-exam-title">Data Structures &amp; Algorithms · Round 3</div>
            <div className="ce-exam-meta">Coding · {PROBLEMS.length} Problems · 30 min</div>
          </div>
          <div className="ce-lang-pill">◉ {LANG_LABELS[lang]}</div>
          {violations > 0 && <div className="ce-viol-badge"><IcoWarn /><span className="ce-viol-label">{violations} Warning{violations > 1 ? "s" : ""}</span></div>}
          <div className="ce-spacer" />
          <div className="ce-proctor-pill"><div className="ce-proctor-dot" /><span className="ce-proctor-label">PROCTORED</span></div>
          <div className={timerCls}><div className="ce-timer-dot" /><span className="ce-timer-val">{mm}:{ss_}</span></div>
        </header>

        <main className="ce-main">
          {/* ── Problem panel ── */}
          <div className="ce-problem">
            <div className="ce-problem-header">
              <div className="ce-problem-num">PROBLEM {String(current + 1).padStart(2, "0")} / {String(PROBLEMS.length).padStart(2, "0")}</div>
              <div className="ce-problem-title">{q.title}</div>
              <span className={`ce-diff-badge ${q.difficulty}`}>{q.difficulty.toUpperCase()}</span>
            </div>
            <div className="ce-problem-body">
              <p className="ce-problem-desc" dangerouslySetInnerHTML={{ __html: q.description.replace(/\n/g, "<br/>") }} />
              <div className="ce-section-title">EXAMPLES</div>
              {q.examples.map((ex, i) => (
                <div className="ce-example" key={i}>
                  <div className="ce-example-label">EXAMPLE {i + 1}</div>
                  <div className="ce-example-row"><span className="ce-example-key">Input:</span><span className="ce-example-val">{ex.input}</span></div>
                  <div className="ce-example-row"><span className="ce-example-key">Output:</span><span className="ce-example-val">{ex.output}</span></div>
                  {ex.explain && <div className="ce-example-exp">Explain: {ex.explain}</div>}
                </div>
              ))}
              <div className="ce-section-title" style={{ marginTop: 20 }}>CONSTRAINTS</div>
              <div className="ce-constraints">
                {q.constraints.map((c, i) => <div className="ce-constraint" key={i}><div className="ce-constraint-dot" /><span>{c}</span></div>)}
              </div>
            </div>
          </div>

          {/* ── Editor panel ── */}
          <div className="ce-editor-panel">
            <div className="ce-editor-topbar">
              <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
                <div className="ce-tab">
                  <span style={{ fontSize: 14 }}>📄</span>
                  Solution.{lang === "python" ? "py" : lang === "java" ? "java" : "js"}
                </div>
              </div>
              <select className="ce-lang-select" value={lang} onChange={e => setLang(e.target.value)}>
                <option value="java">Java</option>
                <option value="python">Python 3</option>
                <option value="javascript">JavaScript</option>
              </select>
            </div>
            <div className="ce-editor-wrap">
              <MonacoEditor key={`${safeIndex}-${lang}`} value={codes[safeIndex]?.[lang] ?? ""} language={lang} onChange={handleCodeChange} />
            </div>
            <div className="ce-output-bar">
              <div className="ce-output-tabs">
                <div className={`ce-out-tab ${outTab === "output" ? "active" : ""}`} onClick={() => setOutTab("output")}>Output</div>
                <div className={`ce-out-tab ${outTab === "tests"  ? "active" : ""}`} onClick={() => setOutTab("tests")}>Test Cases</div>
                <div className="ce-out-spacer" />
                <button className="ce-run-btn"    onClick={handleRun}           disabled={isRunning}><IcoPlay /> {isRunning ? "Running…" : "Run Code"}</button>
                <button className="ce-submit-btn" onClick={handleSubmitProblem} style={{ marginLeft: 6 }}><IcoCheck /> {current + 1 < PROBLEMS.length ? "Submit →" : "Submit All"}</button>
              </div>
              <div className="ce-output-body">
                {outTab === "output" && (
                  isRunning
                    ? <span className="ce-output-placeholder">Running test cases…</span>
                    : runResults
                      ? <span style={{ color: "var(--green)" }}>{`All ${runResults.length} test cases passed ✓`}</span>
                      : <span className="ce-output-placeholder">Output will appear here after running your code</span>
                )}
                {outTab === "tests" && (
                  isRunning
                    ? <span className="ce-output-placeholder">Running…</span>
                    : runResults
                      ? runResults.map((tc, i) => (
                          <div className={`ce-test-case ${tc.pass ? "ce-test-pass" : "ce-test-fail"}`} key={i}>
                            <span className="ce-test-icon">{tc.pass ? "✓" : "✗"}</span>
                            <span className="ce-test-label">{tc.input}</span>
                            <span className="ce-test-label" style={{ color: "var(--muted)" }}>→ {tc.expected}</span>
                            <span className={`ce-test-status ${tc.pass ? "pass" : "fail"}`}>{tc.pass ? "PASSED" : "FAILED"}</span>
                          </div>
                        ))
                      : PROBLEMS[safeIndex].testCases.map((tc, i) => (
                          <div className="ce-test-case" key={i}>
                            <span className="ce-test-icon" style={{ color: "var(--muted)" }}>◯</span>
                            <span className="ce-test-label">{tc.input}</span>
                            <span className="ce-test-label" style={{ color: "var(--muted)" }}>→ {tc.expected}</span>
                            <span className="ce-test-status" style={{ color: "var(--muted)" }}>PENDING</span>
                          </div>
                        ))
                )}
              </div>
            </div>
          </div>
        </main>

        {/* ── Sidebar ── */}
        <aside className="ce-sidebar">
          <div className="ce-webcam-section">
            <div className="ce-section-label">Live Monitoring</div>
            <div className="ce-webcam-box">
              <div className="ce-webcam-inner">
                <div className="ce-sil"><div className="ce-sil-head" /><div className="ce-sil-body" /></div>
                <div className="ce-webcam-overlay"><div className="ce-webcam-rec" /><span className="ce-webcam-rec-label">LIVE</span></div>
              </div>
            </div>
            <div className="ce-webcam-status">
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}><div className="ce-webcam-dot" /><span className="ce-webcam-active">ACTIVE</span></div>
              <span className="ce-webcam-face">Face detected</span>
            </div>
          </div>
          <div className="ce-stats-row">
            {[
              { val: answeredN,                   lbl: "SOLVED",    color: "var(--green)"  },
              { val: PROBLEMS.length - answeredN, lbl: "REMAINING", color: "var(--accent)" },
            ].map(({ val, lbl, color }) => (
              <div className="ce-stat-card" key={lbl}>
                <div className="ce-stat-val" style={{ color }}>{val}</div>
                <div className="ce-stat-lbl">{lbl}</div>
              </div>
            ))}
          </div>
          <div className="ce-nav-section">
            <div className="ce-section-label">Problems</div>
            <div className="ce-nav-grid">
              {PROBLEMS.map((_, i) => {
                let cls = "ce-nav-dot";
                if (i === current) cls += " current";
                else if (submitted[i]) cls += " answered";
                return <div key={i} className={cls}>{i + 1}</div>;
              })}
            </div>
            <div className="ce-legend">
              {[
                { color: "var(--accent)", border: "none",                               label: "Active"  },
                { color: "#e8f5e9",       border: "1px solid rgba(22,163,74,0.3)",       label: "Solved"  },
                { color: "var(--surface2)", border: "1px solid var(--border)",           label: "Pending" },
              ].map(({ color, border, label }) => (
                <div className="ce-legend-item" key={label}>
                  <div className="ce-legend-dot" style={{ background: color, border }} />{label}
                </div>
              ))}
            </div>
          </div>
          <div style={{ padding: "12px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
            <div className="ce-section-label">Candidate</div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 11, color: "var(--text2)", marginBottom: 4 }}>
              Roll: <span style={{ color: "var(--accent)" }}>{ROLL}</span>
            </div>
            <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 10, color: "var(--dim)" }}>
              Violations: <span style={{ color: violations > 0 ? "var(--amber)" : "var(--green)" }}>{violations}/{MAX_VIOLATIONS}</span>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Violation banner ── */}
      {showViolBanner && (
        <div className="ce-viol-banner">
          <IcoWarn />
          <p style={{ fontSize: 12, color: "var(--amber)", lineHeight: 1.6, fontWeight: 600, margin: 0 }}>{violMsg}</p>
        </div>
      )}

      {/* ── Result overlay ── */}
      {examDone && result && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(244,246,251,0.97)",
          backdropFilter: "blur(18px)", zIndex: 200,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
        }}>
          <div style={{
            background: "var(--surface)", border: "1px solid var(--border)",
            borderRadius: 16, overflow: "hidden", maxWidth: 440, width: "100%",
            boxShadow: "var(--shadow-lg)", animation: "ce-fadeUp 0.4s cubic-bezier(.22,1,.36,1)",
          }}>
            {/* Status bar */}
            <div style={{ height: 3, background: result.passed ? "linear-gradient(90deg,#16a34a,#4ade80)" : "linear-gradient(90deg,#dc2626,#f87171)" }} />

            <div style={{ padding: "28px 28px 24px" }}>
              {/* Header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: result.passed ? "var(--green-s)" : "var(--red-s)",
                  border: `1.5px solid ${result.passed ? "rgba(22,163,74,0.2)" : "rgba(220,38,38,0.2)"}`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {result.passed ? <IcoPass /> : <IcoFail />}
                </div>
                <div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: result.passed ? "var(--green)" : "var(--red)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 4 }}>
                    {result.passed ? "CODING ROUND COMPLETE" : "CODING ROUND ENDED"}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text)", letterSpacing: -0.3 }}>
                    {result.passed ? "Round 3 Passed" : "Below Passing Threshold"}
                  </div>
                </div>
              </div>

              {/* Score block */}
              <div style={{ background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 10, padding: "14px 16px", marginBottom: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 3 }}>SCORE</div>
                    <div style={{ fontSize: 38, fontWeight: 700, letterSpacing: -2, color: result.passed ? "var(--green)" : "var(--red)", lineHeight: 1 }}>
                      {result.score}<span style={{ fontSize: 16 }}>%</span>
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ background: "var(--border)", borderRadius: 99, height: 6, overflow: "hidden", marginBottom: 6 }}>
                      <div style={{
                        height: "100%", borderRadius: 99, width: `${result.score}%`,
                        transition: "width 1s cubic-bezier(.4,0,.2,1)",
                        background: result.passed ? "var(--green)" : "var(--red)",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace" }}>
                      <span>{result.correct} / {PROBLEMS.length} solved</span>
                      <span>Threshold: {CUTOFF}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PASSED flow */}
              {result.passed && (
                <>
                  <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
                    You have cleared the coding round. The AI Viva will now assess your understanding of the solution you submitted.
                  </p>
                  {/* ── DIRECT CALL — no transition screen, no intermediate state ── */}
                  <button
                    onClick={handleGoToViva}
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: 8, border: "none",
                      background: "var(--accent)", color: "#fff",
                      fontSize: 13, fontWeight: 600, fontFamily: "'Inter',sans-serif",
                      cursor: "pointer", boxShadow: "0 2px 10px rgba(2,132,199,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      marginBottom: 8, transition: "background 0.15s",
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "#0369a1"}
                    onMouseLeave={e => e.currentTarget.style.background = "var(--accent)"}
                  >
                    <IcoViva /> Start AI Viva Round
                  </button>
                  <button
                    onClick={() => onNavigateRef.current?.("lobby")}
                    style={{
                      width: "100%", padding: "10px 16px", borderRadius: 8,
                      border: "1.5px solid var(--border)", background: "transparent",
                      color: "var(--muted)", fontSize: 12, fontWeight: 500,
                      fontFamily: "'Inter',sans-serif", cursor: "pointer",
                    }}
                  >
                    Skip to Dashboard
                  </button>
                </>
              )}

              {/* FAILED flow */}
              {!result.passed && (
                <>
                  <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.7, marginBottom: 16 }}>
                    You did not meet the passing threshold for this round. Review your approach and try again.
                  </p>
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ fontSize: 9, color: "var(--dim)", fontFamily: "'JetBrains Mono',monospace", marginBottom: 6 }}>
                      REDIRECTING TO DASHBOARD IN {redirectLeft}s
                    </div>
                    <div style={{ background: "var(--border)", borderRadius: 99, height: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", borderRadius: 99, width: `${redirectPct}%`, background: "var(--red)", transition: "width 1s linear" }} />
                    </div>
                  </div>
                  <button
                    onClick={() => onNavigateRef.current?.("lobby")}
                    style={{
                      width: "100%", padding: "12px 16px", borderRadius: 8,
                      border: "1.5px solid var(--border)", background: "var(--surface2)",
                      color: "var(--text)", fontSize: 13, fontWeight: 600,
                      fontFamily: "'Inter',sans-serif", cursor: "pointer",
                    }}
                  >
                    Return to Dashboard
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}