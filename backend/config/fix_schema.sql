-- ============================================================
-- MIGRATION: Fix audit_logs and geo_sessions schema issues
-- ============================================================

USE neuro;

-- ══════════════════════════════════════════════════════════════
-- FIX 1: Change audit_logs.user_id from INT to VARCHAR(255)
-- This allows storing both numeric IDs and string IDs like 's_003'
-- ══════════════════════════════════════════════════════════════

-- First, drop the foreign key constraint if it exists
ALTER TABLE audit_logs 
MODIFY COLUMN user_id VARCHAR(255) NULL;

-- ══════════════════════════════════════════════════════════════
-- FIX 2: Ensure geo_sessions has last_ping_at column
-- Add it if it doesn't exist
-- ══════════════════════════════════════════════════════════════

ALTER TABLE geo_sessions 
ADD COLUMN IF NOT EXISTS last_ping_at DATETIME DEFAULT NULL;

-- ══════════════════════════════════════════════════════════════
-- FIX 3: Ensure entity_id in audit_logs is VARCHAR to support strings
-- ══════════════════════════════════════════════════════════════

ALTER TABLE audit_logs 
MODIFY COLUMN entity_id VARCHAR(100) NULL;

-- Verify changes
SELECT 'Schema migration complete ✓' AS result;

-- Show audit_logs structure
DESC audit_logs;

-- Show geo_sessions structure  
DESC geo_sessions;
