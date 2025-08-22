#!/usr/bin/env bun

/**
 * Migration Runner for Multi-Agent Observability System
 * 
 * Usage:
 *   bun run migrations/run_migrations.js             # Run all pending migrations
 *   bun run migrations/run_migrations.js 003         # Run specific migration
 *   bun run migrations/run_migrations.js --rollback  # Rollback last migration
 *   bun run migrations/run_migrations.js --seed      # Run test seeds
 */

import { Database } from 'bun:sqlite';
import { readdir, readFile } from 'fs/promises';
import { join } from 'path';

const db = new Database('events.db');

// Create migrations tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now') * 1000),
    filename TEXT NOT NULL
  )
`);

async function getAppliedMigrations() {
  const stmt = db.prepare('SELECT version FROM schema_migrations ORDER BY version');
  return stmt.all().map(row => row.version);
}

async function getMigrationFiles() {
  const migrationsDir = import.meta.dir;
  const files = await readdir(migrationsDir);
  
  return files
    .filter(file => file.match(/^\d+_.*\.sql$/))
    .sort()
    .map(file => ({
      version: file.split('_')[0],
      filename: file,
      path: join(migrationsDir, file)
    }));
}

async function runMigration(migration) {
  console.log(`Running migration ${migration.version}: ${migration.filename}`);
  
  try {
    const sql = await readFile(migration.path, 'utf8');
    
    // Extract only the forward migration SQL (before rollback comments)
    const forwardSql = sql.split('-- Rollback script')[0];
    
    // Clean up SQL by removing comment lines but preserving structure
    const cleanedSql = forwardSql
      .split('\n')
      .filter(line => {
        const trimmed = line.trim();
        return trimmed.length > 0 && !trimmed.startsWith('--');
      })
      .join('\n');
    
    // Split into individual statements and execute
    const statements = cleanedSql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    db.transaction(() => {
      for (const statement of statements) {
        db.exec(statement);
      }
      
      // Record migration as applied
      db.prepare('INSERT INTO schema_migrations (version, filename) VALUES (?, ?)')
        .run(migration.version, migration.filename);
    })();
    
    console.log(`✅ Migration ${migration.version} completed successfully`);
    
  } catch (error) {
    console.error(`❌ Migration ${migration.version} failed:`, error.message);
    throw error;
  }
}

async function rollbackMigration(migration) {
  console.log(`Rolling back migration ${migration.version}: ${migration.filename}`);
  
  try {
    const sql = await readFile(migration.path, 'utf8');
    
    // Extract rollback SQL (after "-- Rollback script" comment)
    const rollbackMatch = sql.match(/-- Rollback script[^\n]*\n([\s\S]*?)(?:\n-- |$)/);
    
    if (!rollbackMatch) {
      throw new Error('No rollback script found in migration file');
    }
    
    const rollbackSql = rollbackMatch[1];
    const statements = rollbackSql
      .split(';')
      .map(stmt => stmt.trim().replace(/^-- /, ''))
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    db.transaction(() => {
      for (const statement of statements) {
        db.exec(statement);
      }
      
      // Remove migration record
      db.prepare('DELETE FROM schema_migrations WHERE version = ?')
        .run(migration.version);
    })();
    
    console.log(`✅ Migration ${migration.version} rolled back successfully`);
    
  } catch (error) {
    console.error(`❌ Rollback ${migration.version} failed:`, error.message);
    throw error;
  }
}

async function runSeeds() {
  console.log('Running test seeds...');
  
  try {
    const seedsDir = join(import.meta.dir, '..', 'seeds');
    const seedFile = join(seedsDir, 'test_relationships.sql');
    const sql = await readFile(seedFile, 'utf8');
    
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
    
    db.transaction(() => {
      for (const statement of statements) {
        db.exec(statement);
      }
    })();
    
    console.log('✅ Test seeds completed successfully');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error.message);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  try {
    if (args.includes('--seed')) {
      await runSeeds();
      return;
    }
    
    const appliedMigrations = await getAppliedMigrations();
    const availableMigrations = await getMigrationFiles();
    
    console.log('Applied migrations:', appliedMigrations);
    console.log('Available migrations:', availableMigrations.map(m => m.version));
    
    if (args.includes('--rollback')) {
      // Rollback the last applied migration
      if (appliedMigrations.length === 0) {
        console.log('No migrations to rollback');
        return;
      }
      
      const lastMigration = appliedMigrations[appliedMigrations.length - 1];
      const migrationToRollback = availableMigrations.find(m => m.version === lastMigration);
      
      if (!migrationToRollback) {
        throw new Error(`Migration file not found for version ${lastMigration}`);
      }
      
      await rollbackMigration(migrationToRollback);
      return;
    }
    
    // Run specific migration or all pending
    const targetVersion = args[0];
    
    if (targetVersion) {
      // Run specific migration
      const migration = availableMigrations.find(m => m.version === targetVersion);
      
      if (!migration) {
        throw new Error(`Migration ${targetVersion} not found`);
      }
      
      if (appliedMigrations.includes(targetVersion)) {
        console.log(`Migration ${targetVersion} already applied`);
        return;
      }
      
      await runMigration(migration);
      
    } else {
      // Run all pending migrations
      const pendingMigrations = availableMigrations
        .filter(m => !appliedMigrations.includes(m.version));
      
      if (pendingMigrations.length === 0) {
        console.log('No pending migrations');
        return;
      }
      
      console.log(`Running ${pendingMigrations.length} pending migrations...`);
      
      for (const migration of pendingMigrations) {
        await runMigration(migration);
      }
    }
    
    console.log('\n📊 Current schema version:');
    const currentMigrations = await getAppliedMigrations();
    console.log(currentMigrations.join(', '));
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}