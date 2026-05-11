// utils/groqClient.js
// npm install groq-sdk
// .env: GROQ_API_KEY=gsk_...

const Groq = require('groq-sdk');

if (!process.env.GROQ_API_KEY) {
  console.warn('[GroqClient] WARNING: GROQ_API_KEY is not set in .env');
}

const groqClient = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

module.exports = groqClient;