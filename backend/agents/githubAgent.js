const axios = require("axios");

async function fetchGitHubData(githubUrl) {
  if (!githubUrl) return null;

  const match = githubUrl.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  if (!match) return buildFailure(githubUrl, "Could not extract username from URL");

  const username = match[1];
  const headers = {
    Accept: "application/vnd.github+json",
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  try {
    const [userRes, reposRes] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`, { headers, timeout: 10000 }),
      axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=updated`, { headers, timeout: 10000 }),
    ]);

    const user  = userRes.data;
    const repos = reposRes.data;

    const activeRepos = repos.filter(r => !r.fork && r.size > 0);

    const languageMap = {};
    for (const repo of activeRepos) {
      if (repo.language) {
        languageMap[repo.language] = (languageMap[repo.language] || 0) + 1;
      }
    }

    const topLanguages = Object.entries(languageMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    // FIX 1 — totalCommits was never reset per-run (declared with let but
    // accumulated across retries if called multiple times in same process).
    // Moved inside try block and explicitly initialised to 0 here.
    let totalCommits = 0;
    const recentRepos   = activeRepos.slice(0, 10);
    const commitCounts  = await Promise.allSettled(
      recentRepos.map(r =>
        axios.get(
          `https://api.github.com/repos/${username}/${r.name}/commits?per_page=1`,
          { headers, timeout: 8000 }
        ).then(res => {
          const link      = res.headers.link || "";
          const linkMatch = link.match(/page=(\d+)>; rel="last"/);
          return linkMatch ? parseInt(linkMatch[1]) : res.data.length;
        })
      )
    );
    commitCounts.forEach(r => { if (r.status === "fulfilled") totalCommits += r.value; });

    let weeklyActivity = 0; // FIX 2 — was initialised as [] (array) but used
                             // as a number below (weeklyActivity * 2, / 3).
                             // All arithmetic on [] gives 0 or NaN silently.
                             // Changed default to 0 (number).
    try {
      const activityRes = await axios.get(
        `https://api.github.com/users/${username}/events?per_page=100`,
        { headers, timeout: 8000 }
      );
      const pushEvents = activityRes.data.filter(e => e.type === "PushEvent");
      weeklyActivity   = pushEvents.length;
    } catch (_) {}

    const repoScore          = Math.min(activeRepos.length * 8, 60);
    const langScore          = Math.min(topLanguages.length * 8, 25);
    const activityScore      = Math.min(weeklyActivity * 2, 15);
    const coding_skill_score = Math.min(repoScore + langScore + activityScore, 100);
    const consistencyScore   = Math.min((weeklyActivity / 3) * 10, 100);

    // inference_hints expected by inferenceAgent.js
    const inference_hints = {
      primary_language:       topLanguages[0] || null,
      all_languages:          topLanguages,
      problem_solving_proxy:  Math.min(Math.round((totalCommits / 50) * 40 + (activeRepos.length / 10) * 30), 70),
      low_consistency:        consistencyScore < 30,
      flags: [
        activeRepos.length === 0 && "no_public_repos",
        topLanguages.length === 0 && "no_languages_detected",
      ].filter(Boolean),
    };

    return {
      username,
      name:          user.name,
      public_repos:  user.public_repos,
      followers:     user.followers,
      following:     user.following,
      active_repos:  activeRepos.length,
      top_languages: topLanguages,
      total_commits_sampled: totalCommits,
      weekly_push_events:    weeklyActivity,
      coding_skill_score,
      consistency: {
        score:  Math.round(consistencyScore),
        source: "github_events",
      },
      // keep flat consistency_score too for any direct reads
      consistency_score: Math.round(consistencyScore),

      repos: activeRepos.slice(0, 10).map(r => ({
        name:        r.name,
        description: r.description,
        language:    r.language,
        stars:       r.stargazers_count,
        forks:       r.forks_count,
        updated:     r.updated_at,
        url:         r.html_url,
      })),

      sub_scores: {
        repo_quality:    repoScore,
        language_spread: langScore,
        commit_activity: activityScore,
      },

      inference_hints,
      data_source: "github_api",
      fetched_at:  new Date().toISOString(),
    };

  } catch (err) {
    return buildFailure(
      githubUrl,
      err.response?.status === 404 ? "GitHub profile not found" : err.message
    );
  }
}

function buildFailure(url, error) {
  return {
    username: null, public_repos: 0, followers: 0,
    active_repos: 0, top_languages: [], coding_skill_score: 0,
    consistency: { score: 0, source: "none" },
    consistency_score: 0,
    repos: [], sub_scores: null,
    inference_hints: {
      primary_language: null, all_languages: [],
      problem_solving_proxy: 0, low_consistency: true,
      flags: ["fetch_failed"],
    },
    data_source: "failed", error, fetched_at: new Date().toISOString(),
  };
}

module.exports = { fetchGitHubData };