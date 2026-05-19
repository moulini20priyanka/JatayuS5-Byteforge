// backend/config/db.js
const sql = require("mssql");
require("dotenv").config();

const config = {
  server:   process.env.DB_HOST     || process.env.AZURE_SQL_SERVER,
  user:     process.env.DB_USER     || process.env.AZURE_SQL_USERNAME,
  password: process.env.DB_PASS     || process.env.AZURE_SQL_PASSWORD,
  database: process.env.DB_NAME     || process.env.AZURE_SQL_DATABASE,
  port: 1433,
  options: {
    encrypt: true,
    trustServerCertificate: false,
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 },
};

const poolPromise = new sql.ConnectionPool(config)
  .connect()
  .then(pool => {
    console.log("✅ Connected to Azure SQL Server");
    return pool;
  })
  .catch(err => {
    console.error("❌ DB Connection failed:", err.message);
  });

// ── Replace ? with @p0, @p1… and bind params ─────────────────────────────────
function bindParams(request, queryStr, params = []) {
  let i = 0;
  const converted = queryStr.replace(/\?/g, () => {
    const name = `p${i}`;
    const val  = params[i];
    request.input(name, val === undefined ? null : val);
    i++;
    return `@${name}`;
  });
  return converted;
}

// ── Normalize MSSQL result → [recordset, meta] ────────────────────────────────
// Works for SELECT, INSERT ... OUTPUT INSERTED.id, UPDATE, DELETE
function normalizeResult(result) {
  const recordset = result.recordset ?? [];
  const meta = {
    affectedRows: result.rowsAffected?.[0] ?? 0,
    insertId:     recordset[0]?.id ?? null,
  };
  return [recordset, meta];
}

const db = {
  // ── Simple (non-transaction) query ────────────────────────────────────────
  query: async (queryStr, params = []) => {
    const pool      = await poolPromise;
    const request   = pool.request();
    const converted = bindParams(request, queryStr, params);
    const result    = await request.query(converted);
    return normalizeResult(result);
  },

  // ── Transaction connection (mimics mysql2 getConnection) ──────────────────
  getConnection: async () => {
    const pool        = await poolPromise;
    const transaction = new sql.Transaction(pool);

    const conn = {
      _transaction: transaction,
      _started:     false,

      beginTransaction: async () => {
        await transaction.begin();
        conn._started = true;
      },

      query: async (queryStr, params = []) => {
        const request   = new sql.Request(transaction);
        const converted = bindParams(request, queryStr, params);
        const result    = await request.query(converted);
        return normalizeResult(result);
      },

      commit: async () => {
        await transaction.commit();
        conn._started = false;
      },

      rollback: async () => {
        if (conn._started) {
          try { await transaction.rollback(); } catch (_) {}
          conn._started = false;
        }
      },

      release: () => {},
    };

    return conn;
  },
};

module.exports = db;