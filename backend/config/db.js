// backend/config/db.js
const sql = require("mssql");
require("dotenv").config();

const config = {
server: process.env.DB_HOST || process.env.AZURE_SQL_SERVER,
user:   process.env.DB_USER || process.env.AZURE_SQL_USERNAME,
password: process.env.DB_PASS || process.env.AZURE_SQL_PASSWORD,
database: process.env.DB_NAME || process.env.AZURE_SQL_DATABASE,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const poolPromise = new sql.ConnectionPool(config).connect();


const db = {
  query: async (queryStr, params = []) => {
    const pool = await poolPromise;
    const request = pool.request();

    // Replace ? with @p0, @p1, @p2... and bind params
    let i = 0;
    const converted = queryStr.replace(/\?/g, () => {
      const name = `p${i}`;
      request.input(name, params[i]);
      i++;
      return `@${name}`;
    });

    const result = await request.query(converted);
    
    return [result.recordset, []];
  }
};

module.exports = db;