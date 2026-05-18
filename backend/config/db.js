// backend/config/db.js
const mysql = require("mysql2/promise");
require("dotenv").config();

const db = mysql.createPool({
  host:             process.env.DB_HOST || "localhost",
  user:             process.env.DB_USER || "root",
  password:         process.env.DB_PASS || "Moul2005@",
  database:         process.env.DB_NAME || "neuroassess",
  port:             parseInt(process.env.DB_PORT || "3306", 10),
  waitForConnections: true,
  connectionLimit:  10,
  
  charset:          "utf8mb4_unicode_ci",   
  
});


db.on("connection", function (connection) {
  connection.query("SET NAMES 'utf8mb4' COLLATE 'utf8mb4_unicode_ci'");
});

module.exports = db;