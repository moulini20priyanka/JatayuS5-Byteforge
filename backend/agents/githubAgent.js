
const axios = require("axios");

async function fetchGitHubData(githubUrl) {
  if (!githubUrl) return buildFailure(githubUrl, "No GitHub URL provided");

  const match = githubUrl.match(/github\.com\/([a-zA-Z0-9_-]+)/);
  if (!match) return buildFailure(githubUrl, "Could not extract username from URL");

  const username = match[1];
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "NeuroAssess/1.0",
    ...(process.env.GITHUB_TOKEN && { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }),
  };

  try {
    const [userRes, reposRes] = await Promise.all([
      axios.get(`https://api.github.com/users/${username}`,
        { headers, timeout: 10000 }),
      axios.get(`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`,
        { headers, timeout: 10000 }),
    ]);

    const userData  = userRes.data;
    const reposData = reposRes.data;
    const repos     = Array.isArray(reposData) ? reposData : [];

    if (userData.message === "Not Found") {
      return buildFailure(githubUrl, "User not found");
    }

    
    const sixMonthsAgo = Date.now() - 180 * 24 * 60 * 60 * 1000;
    const activeRepos  = repos.filter(
      r => new Date(r.pushed_at).getTime() > sixMonthsAgo && !r.fork && r.size > 0
    );

    
    const langCount = {};
    repos.forEach(r => {
      if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
    });

    const topLanguages = Object.entries(langCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lang]) => lang);

    const totalStars = repos.reduce((s, r) => s + (r.stargazers_count || 0), 0);

    let totalCommits = 0;
    const recentRepos = activeRepos.slice(0, 10);
    const commitCounts = await Promise.allSettled(
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

    let weeklyActivity = 0;
    try {
      const activityRes = await axios.get(
        `https://api.github.com/users/${username}/events?per_page=100`,
        { headers, timeout: 8000 }
      );
      weeklyActivity = activityRes.data.filter(e => e.type === "PushEvent").length;
    } catch (_) {}

    const repoScore       = Math.min(activeRepos.length * 8, 60);
    const langScore       = Math.min(topLanguages.length  * 8, 25);
    const activityScore   = Math.min(weeklyActivity       * 2, 15);
    const coding_skill_score = Math.min(repoScore + langScore + activityScore, 100);
    const consistencyScore   = Math.min((weeklyActivity / 3) * 10, 100);

    const inference_hints = {
      primary_language:        topLanguages[0] || null,
      all_languages:           topLanguages,
      problem_solving_proxy:   Math.min(
        Math.round((totalCommits / 50) * 40 + (activeRepos.length / 10) * 30),
        70
      ),
      has_recent_activity:     activeRepos.length > 0,
      low_consistency:         consistencyScore < 30,
      skill_list:              topLanguages,
      seniority_signal:        null,
      flags: [
        activeRepos.length === 0  && "no_public_repos",
        topLanguages.length === 0 && "no_languages_detected",
      ].filter(Boolean),
    };

    return {
      
      data_source: "github_api",

      username,
      name:                  userData.name || null,
      public_repos:          userData.public_repos || 0,   
      active_repos:          activeRepos.length,         
      total_repos:           repos.length,                 
      total_stars:           totalStars,
      followers:             userData.followers || 0,
      following:             userData.following || 0,
      
      top_languages:         topLanguages,
      account_age_days:      Math.floor(
        (Date.now() - new Date(userData.created_at)) / 86400000
      ),
      bio:     userData.bio     || "",
      company: userData.company || "",
      blog:    userData.blog    || "",

      total_commits_sampled: totalCommits,
      weekly_push_events:    weeklyActivity,
      coding_skill_score,
      consistency: {
        score:  Math.round(consistencyScore),
        source: "github_events",
      },
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
      fetched_at: new Date().toISOString(),
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
    data_source:           "failed",
    username:              null,
    public_repos:          0,
    total_repos:           0,
    active_repos:          0,
    followers:             0,
    total_stars:           0,
    top_languages:         [],
    account_age_days:      0,
    bio:                   "",
    company:               "",
    blog:                  "",
    total_commits_sampled: 0,
    weekly_push_events:    0,
    coding_skill_score:    0,
    consistency:           { score: 0, source: "none" },
    consistency_score:     0,
    repos:                 [],
    sub_scores:            null,
    inference_hints: {
      primary_language:      null,
      all_languages:         [],
      problem_solving_proxy: 0,
      has_recent_activity:   false,
      low_consistency:       true,
      skill_list:            null,
      seniority_signal:      null,
      flags:                 ["fetch_failed"],
    },
    error,
    fetched_at: new Date().toISOString(),
  };
}
module.exports = { fetchGitHubData };