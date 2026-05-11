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
    // Lowered from 65 → 50 for heuristic-based face comparison
    // Neural net systems score 85-99%, heuristics score 40-75% for same person
    faceConfidence: parseInt(process.env.FACE_CONFIDENCE_THRESHOLD) || 50,

    // Lowered from 70 → 60 — OCR often misreads names slightly
    nameMatch: parseInt(process.env.NAME_MATCH_THRESHOLD) || 60,
  },
  server: {
    port: parseInt(process.env.PORT) || 5000,
  },
  db: {
    host:     process.env.DB_HOST     || 'localhost',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME     || 'neuroassess',
  },
};