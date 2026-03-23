const axios = require("axios");

async function fetchLeetCodeData(leetcodeUrl) {
  if (!leetcodeUrl) return null;

  const match = leetcodeUrl.match(/leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/);
  if (!match) return buildFailure(leetcodeUrl, "Could not extract username from URL");

  const username = match[1];

  const query = `
    query getUserProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile {
          realName
          ranking
          countryName
        }
        submitStats {
          acSubmissionNum {
            difficulty
            count
          }
        }
        languageProblemCount {
          languageName
          problemsSolved
        }
      }
    }
  `;

  try {
    const res = await axios.post(
      "https://leetcode.com/graphql",
      { query, variables: { username } },
      {
        headers: {
          "Content-Type": "application/json",
          Referer:        "https://leetcode.com",
          "User-Agent":   "Mozilla/5.0 (compatible; research-bot)",
        },
        timeout: 15000,
      }
    );

    const user = res.data?.data?.matchedUser;
    if (!user) return buildFailure(leetcodeUrl, "LeetCode profile not found or private");

    const submissionMap = {};
    (user.submitStats?.acSubmissionNum || []).forEach(({ difficulty, count }) => {
      submissionMap[difficulty] = count;
    });

    const easy   = submissionMap["Easy"]   || 0;
    const medium = submissionMap["Medium"] || 0;
    const hard   = submissionMap["Hard"]   || 0;
    const total  = submissionMap["All"]    || (easy + medium + hard);

    const languages = (user.languageProblemCount || [])
      .sort((a, b) => b.problemsSolved - a.problemsSolved)
      .slice(0, 3)
      .map(l => ({ name: l.languageName, count: l.problemsSolved }));

    const weightedScore         = (hard * 3) + (medium * 2) + (easy * 1);
    const problem_solving_score = Math.min(Math.round(weightedScore / 3), 100);

    // FIX 1 — consistency field was missing entirely from the return shape.
    // inferenceAgent.js reads leetcode_data.consistency.score — without this
    // field the consistency score was always 0 for LeetCode-only candidates.
    const consistencyScore = Math.min(
      Math.round(((medium + hard) / Math.max(total, 1)) * 100),
      100
    );

    return {
      username,
      real_name:    user.profile?.realName    || null,
      ranking:      user.profile?.ranking     || null,
      country:      user.profile?.countryName || null,
      total_solved: total,
      easy,
      medium,
      hard,
      top_languages:          languages,
      problem_solving_score,
      consistency: {
        score:  consistencyScore,
        source: "leetcode_difficulty_ratio",
      },
      sub_scores: {
        easy_ratio:   Math.round((easy   / (total || 1)) * 100),
        medium_ratio: Math.round((medium / (total || 1)) * 100),
        hard_ratio:   Math.round((hard   / (total || 1)) * 100),
      },
      data_source: "leetcode_graphql",
      fetched_at:  new Date().toISOString(),
    };

  } catch (err) {
    return buildFailure(leetcodeUrl, err.message);
  }
}

function buildFailure(url, error) {
  return {
    username: null, total_solved: 0, easy: 0, medium: 0, hard: 0,
    ranking: null, top_languages: [], problem_solving_score: 0,
    consistency: { score: 0, source: "none" },
    sub_scores: null, data_source: "failed", error,
    fetched_at: new Date().toISOString(),
  };
}

module.exports = { fetchLeetCodeData };