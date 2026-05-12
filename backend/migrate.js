/**
 * Migration Script: Fix audit_logs and geo_sessions schema
 * This script applies the necessary database schema fixes
 */

const db = require('./config/db');

async function applyMigration() {
  try {
    console.log('🔄 Starting database migration...\n');

    // FIX 1: Change audit_logs.user_id from INT to VARCHAR
    console.log('📝 Fixing audit_logs.user_id column...');
    await db.query(`
      ALTER TABLE audit_logs 
      MODIFY COLUMN user_id VARCHAR(255) NULL
    `);
    console.log('✅ audit_logs.user_id updated to VARCHAR(255)\n');

    // FIX 2: Ensure entity_id in audit_logs is VARCHAR
    console.log('📝 Fixing audit_logs.entity_id column...');
    await db.query(`
      ALTER TABLE audit_logs 
      MODIFY COLUMN entity_id VARCHAR(100) NULL
    `);
    console.log('✅ audit_logs.entity_id updated to VARCHAR(100)\n');

    // FIX 3: Ensure geo_sessions has last_ping_at column
    // Check if column exists first, then add if needed
    console.log('📝 Checking geo_sessions.last_ping_at column...');
    try {
      await db.query(`
        ALTER TABLE geo_sessions 
        ADD COLUMN last_ping_at DATETIME DEFAULT NULL
      `);
      console.log('✅ geo_sessions.last_ping_at column added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') {
        console.log('✅ geo_sessions.last_ping_at column already exists\n');
      } else {
        throw err;
      }
    }

    console.log('✅✅✅ Migration completed successfully!\n');
    console.log('Database schema has been updated:');
    console.log('  - audit_logs.user_id: INT → VARCHAR(255)');
    console.log('  - audit_logs.entity_id: INT → VARCHAR(100)');
    console.log('  - geo_sessions.last_ping_at: ensured');

    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

applyMigration();
