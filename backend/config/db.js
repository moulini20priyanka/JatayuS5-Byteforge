const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host:     process.env.DB_HOST     || "localhost",
  user:     process.env.DB_USER     || "root",
  password: process.env.DB_PASS     || "Moul2005@",
  database: process.env.DB_NAME     || "neuroassess",
  password: process.env.DB_PASS     || "Varahi08@",
  database: process.env.DB_NAME     || "neuroassess",
  port:     process.env.DB_PORT     || 3306,
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = db;