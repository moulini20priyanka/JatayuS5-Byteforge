require('dotenv').config();
const http = require('http');

const body = JSON.stringify({
  candidate_id: "student_001",
  github_url:   "https://github.com/moulini20priyanka",
  linkedin_url: "https://linkedin.com/in/moulini-srinivasan",
  leetcode_url: "https://leetcode.com/u/moulini_20/"
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/evaluate',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body)
  }
};

console.log('Sending evaluation request...');

const req = http.request(options, (res) => {
  console.log('Status:', res.statusCode);
  
  res.on('data', (chunk) => {
    const text = chunk.toString();
    // Print each SSE event on its own line
    text.split('\n').forEach(line => {
      if (line.startsWith('data:')) {
        try {
          const parsed = JSON.parse(line.replace('data:', '').trim());
          console.log(`[${parsed.agent}] ${parsed.status}: ${parsed.message}`);
        } catch {
          console.log(line);
        }
      }
    });
  });

  res.on('end', () => {
    console.log('\nDone!');
    process.exit(0);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
  process.exit(1);
});

// Timeout after 60 seconds
setTimeout(() => {
  console.log('Timeout — check server logs');
  process.exit(1);
}, 60000);

req.write(body);
req.end();