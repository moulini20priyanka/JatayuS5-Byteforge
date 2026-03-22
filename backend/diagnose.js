const G=(s)=>`\x1b[32m${s}\x1b[0m`;
const R=(s)=>`\x1b[31m${s}\x1b[0m`;
const Y=(s)=>`\x1b[33m${s}\x1b[0m`;
const B=(s)=>`\x1b[36m${s}\x1b[0m`;
const pass=(l)=>console.log(G("  PASS")+"  "+l);
const fail=(l,r)=>console.log(R("  FAIL")+"  "+l+(r?"\n         "+Y(r):""));
const info=(l,v)=>console.log("         "+B(l)+": "+v);
require("dotenv").config();
async function run(){
  console.log("\n=== NeuroAssess Diagnostic ===\n");
  
  console.log("1. DATABASE");
  let db;
  try{
    db=require("./config/db");
    const [r]=await db.query("SELECT COUNT(*) AS c FROM candidate_reports");
    pass("DB connected. candidate_reports rows: "+r[0].c);
    if(r[0].c>0){
      const [latest]=await db.query("SELECT student_id,github_url,linkedin_url,leetcode_url,status FROM candidate_reports ORDER BY created_at DESC LIMIT 1");
      const x=latest[0];
      info("student_id",x.student_id);
      info("github_url",x.github_url||R("NULL"));
      info("linkedin_url",x.linkedin_url||R("NULL"));
      info("leetcode_url",x.leetcode_url||R("NULL"));
      info("status",x.status);
    }
  }catch(e){fail("DB",e.message);process.exit(1);}

  console.log("\n2. EVALUATIONS TABLE");
  try{
    const [r]=await db.query("SELECT COUNT(*) AS c FROM evaluations");
    pass("evaluations rows: "+r[0].c);
  }catch(e){fail("evaluations",e.message);}

  console.log("\n3. PACKAGES");
  for(const p of["pdf-parse","multer","axios","mysql2","puppeteer"]){
    try{require(p);pass(p+" installed");}
    catch(e){fail(p+" NOT installed","npm install "+p);}
  }

  console.log("\n4. AGENT FILES");
  for(const a of["./agents/resumeParser","./agents/githubAgent","./agents/leetcodeAgent","./agents/linkedinAgent","./orchestrator","./routes/upload","./routes/report"]){
    try{require(a);pass(a+" loads OK");}
    catch(e){fail(a,e.message);}
  }

  console.log("\n5. GITHUB API TEST");
  try{
    const {fetchGitHubData}=require("./agents/githubAgent");
    const r=await fetchGitHubData("https://github.com/octocat");
    if(r&&r.data_source==="github_api")pass("GitHub API works. repos:"+r.public_repos+", langs:"+r.top_languages.join(","));
    else fail("GitHub returned: "+JSON.stringify(r).slice(0,100));
  }catch(e){fail("GitHub API",e.message);}

  console.log("\n6. LEETCODE API TEST");
  try{
    const {fetchLeetCodeData}=require("./agents/leetcodeAgent");
    const r=await fetchLeetCodeData("https://leetcode.com/neal_wu/");
    if(r&&r.data_source==="leetcode_graphql")pass("LeetCode API works. total:"+r.total_solved+" easy:"+r.easy+" med:"+r.medium+" hard:"+r.hard);
    else fail("LeetCode returned: "+JSON.stringify(r).slice(0,100));
  }catch(e){fail("LeetCode API",e.message);}

  console.log("\n7. ENV VARS");
  info("ANTHROPIC_API_KEY",process.env.ANTHROPIC_API_KEY?"SET":"NOT SET");
  info("GITHUB_TOKEN",process.env.GITHUB_TOKEN?"SET":"not set (60req/hr limit)");
  info("DB_HOST",process.env.DB_HOST||"not set");
  info("DB_NAME",process.env.DB_NAME||"not set");

  console.log("\n=== DONE — paste all output above ===\n");
  process.exit(0);
}
run().catch(e=>{console.error("Fatal:",e.message);process.exit(1);});
