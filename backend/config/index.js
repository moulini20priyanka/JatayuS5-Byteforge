// config/index.js — updated thresholds for better real-world accuracy
require('dotenv').config();

module.exports = {
  groq: {
    apiKey: process.env.GROQ_API_KEY,
    model:  process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
  },
  ocr: {
    language: process.env.OCR_LANGUAGE || 'eng',
  },
  thresholds: {
    faceConfidence: parseInt(process.env.FACE_CONFIDENCE_THRESHOLD) || 50,
    nameMatch: parseInt(process.env.NAME_MATCH_THRESHOLD) || 60,
  },
  server: {
    port: parseInt(process.env.PORT) || 5000,
  },
  db: {
    server:   process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port:     1433,
    options:  { encrypt: true, trustServerCertificate: false },
  },
};