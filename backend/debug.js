// Save this as backend/debug_qb.js and run: node debug_qb.js
// It will tell us EXACTLY why the route isn't mounting

const express = require('express');
const app = express();
app.use(express.json());

console.log('\n=== QuestionBank Route Debug ===\n');

// Step 1: Can we require it?
let qbRouter;
try {
  qbRouter = require('./routes/questionBank');
  console.log('✅ require() succeeded');
  console.log('   typeof:', typeof qbRouter);
  console.log('   constructor:', qbRouter?.constructor?.name);
  
  if (typeof qbRouter === 'function') {
    console.log('   ✅ Is a function (Express router) — should mount fine');
  } else if (typeof qbRouter === 'object') {
    console.log('   Keys:', Object.keys(qbRouter));
  }
} catch(e) {
  console.error('❌ require() FAILED:', e.message);
  process.exit(1);
}

// Step 2: Mount it
try {
  app.use('/api/question-bank', qbRouter);
  console.log('✅ app.use() succeeded');
} catch(e) {
  console.error('❌ app.use() FAILED:', e.message);
  process.exit(1);
}

// Step 3: List all registered routes
console.log('\n=== Registered routes ===');
app._router.stack.forEach(layer => {
  if (layer.handle?.stack) {
    layer.handle.stack.forEach(r => {
      if (r.route) {
        console.log('  ', Object.keys(r.route.methods).join(',').toUpperCase(), layer.regexp, r.route.path);
      }
    });
  }
});

// Step 4: Start a test server and hit it
const PORT = 5999;
app.listen(PORT, () => {
  console.log(`\n=== Test server on ${PORT} ===`);
  console.log('Testing GET /api/question-bank ...\n');
  
  const http = require('http');
  const options = { hostname: 'localhost', port: PORT, path: '/api/question-bank', method: 'GET', headers: { Authorization: 'Bearer test' } };
  
  const req = http.request(options, res => {
    console.log('STATUS:', res.statusCode);
    let body = '';
    res.on('data', d => body += d);
    res.on('end', () => {
      console.log('BODY (first 200):', body.substring(0, 200));
      process.exit(0);
    });
  });
  req.on('error', e => { console.error('Request error:', e.message); process.exit(1); });
  req.end();
});