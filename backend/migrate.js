

const db = require('./config/db');

async function applyMigration() {
  try {
    console.log(' Starting database migration...\n');

   

    console.log(' Fixing audit_logs.user_id column...');
    await db.query(`ALTER TABLE audit_logs MODIFY COLUMN user_id VARCHAR(255) NULL`);
    console.log(' audit_logs.user_id updated to VARCHAR(255)\n');


    console.log(' Fixing audit_logs.entity_id column...');
    await db.query(`ALTER TABLE audit_logs MODIFY COLUMN entity_id VARCHAR(100) NULL`);
    console.log(' audit_logs.entity_id updated to VARCHAR(100)\n');

    // FIX 3: geo_sessions.last_ping_at (your existing fix)
    console.log(' Checking geo_sessions.last_ping_at column...');
    try {
      await db.query(`ALTER TABLE geo_sessions ADD COLUMN last_ping_at DATETIME DEFAULT NULL`);
      console.log(' geo_sessions.last_ping_at column added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log(' geo_sessions.last_ping_at already exists\n');
      else throw err;
    }

    
    console.log(' Adding geo_sessions.location_changed column...');
    try {
      await db.query(`
        ALTER TABLE geo_sessions
        ADD COLUMN location_changed TINYINT(1) DEFAULT 0
      `);
      console.log('geo_sessions.location_changed added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log(' geo_sessions.location_changed already exists\n');
      else throw err;
    }

    
    console.log(' Adding geo_sessions.exam_name column...');
    try {
      await db.query(`
        ALTER TABLE geo_sessions
        ADD COLUMN exam_name VARCHAR(255) DEFAULT NULL
      `);
      console.log(' geo_sessions.exam_name added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log(' geo_sessions.exam_name already exists\n');
      else throw err;
    }

  
    console.log(' Adding geo_sessions.student_name column...');
    try {
      await db.query(`
        ALTER TABLE geo_sessions
        ADD COLUMN student_name VARCHAR(255) DEFAULT NULL
      `);
      console.log(' geo_sessions.student_name added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log(' geo_sessions.student_name already exists\n');
      else throw err;
    }

    // FIX 7: geo_sessions.roll_number (student roll no for the table)
    console.log('📝 Adding geo_sessions.roll_number column...');
    try {
      await db.query(`
        ALTER TABLE geo_sessions
        ADD COLUMN roll_number VARCHAR(64) DEFAULT NULL
      `);
      console.log(' geo_sessions.roll_number added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log(' geo_sessions.roll_number already exists\n');
      else throw err;
    }

    console.log(' Adding geofence columns to exams table...');
    try {
      await db.query(`
        ALTER TABLE exams
        ADD COLUMN geofence_lat    DECIMAL(10,7) DEFAULT NULL,
        ADD COLUMN geofence_lng    DECIMAL(10,7) DEFAULT NULL,
        ADD COLUMN geofence_radius INT           DEFAULT 500
      `);
      console.log(' exams geofence columns added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log(' exams geofence columns already exist\n');
      else throw err;
    }

    // FIX 9: exams.proctor (for exam cards left panel)
    console.log(' Adding exams.proctor column...');
    try {
      await db.query(`
        ALTER TABLE exams
        ADD COLUMN proctor VARCHAR(255) DEFAULT NULL
      `);
      console.log(' exams.proctor added\n');
    } catch (err) {
      if (err.code === 'ER_DUP_FIELDNAME') console.log(' exams.proctor already exists\n');
      else throw err;
    }

    // FIX 10: proctoring_flags table (for Flag button in detail panel)
    console.log(' Creating proctoring_flags table...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS proctoring_flags (
        id            INT          NOT NULL AUTO_INCREMENT,
        assignment_id INT          DEFAULT NULL,
        student_id    VARCHAR(64)  DEFAULT NULL,
        exam_id       INT          DEFAULT NULL,
        flagged_by    VARCHAR(255) DEFAULT NULL,
        reason        TEXT,
        flagged_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_student_exam (student_id, exam_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('proctoring_flags table ready\n');

    // ── Summary ───────────────────────────────────────────────────────────────
    console.log(' Migration completed successfully!\n');
    console.log('Schema changes applied:');
    console.log('  - audit_logs.user_id            → VARCHAR(255)');
    console.log('  - audit_logs.entity_id           → VARCHAR(100)');
    console.log('  - geo_sessions.last_ping_at      → ensured');
    console.log('  - geo_sessions.location_changed  → TINYINT(1) DEFAULT 0  [NEW]');
    console.log('  - geo_sessions.exam_name         → VARCHAR(255)           [NEW]');
    console.log('  - geo_sessions.student_name      → VARCHAR(255)           [NEW]');
    console.log('  - geo_sessions.roll_number       → VARCHAR(64)            [NEW]');
    console.log('  - exams.geofence_lat/lng/radius  → DECIMAL/INT            [NEW]');
    console.log('  - exams.proctor                  → VARCHAR(255)           [NEW]');
    console.log('  - proctoring_flags               → table created          [NEW]');

    process.exit(0);
  } catch (err) {
    console.error(' Migration failed:', err.message);
    console.error(err);
    process.exit(1);
  }
}

applyMigration();
