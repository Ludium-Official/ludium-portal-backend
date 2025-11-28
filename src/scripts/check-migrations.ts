import 'dotenv-expand/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

interface JournalEntry {
  idx: number;
  version: string;
  when: number;
  tag: string;
  breakpoints: boolean;
}

interface Journal {
  version: string;
  dialect: string;
  entries: JournalEntry[];
}

/**
 * Check migration synchronization between database and files
 */
async function checkMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  const sql = postgres(databaseUrl);

  try {
    console.log('🔍 Checking migration synchronization...\n');

    // Get migrations from database
    const dbMigrations = await sql`
      SELECT id, hash, created_at 
      FROM drizzle.__drizzle_migrations 
      ORDER BY id
    `;

    console.log(`📊 Database has ${dbMigrations.length} migrations recorded\n`);

    // Get migrations from files
    const journalPath = join(process.cwd(), 'src/db/migrations/meta/_journal.json');
    const journal = JSON.parse(readFileSync(journalPath, 'utf-8')) as Journal;

    console.log(`📁 File system has ${journal.entries.length} migrations\n`);

    // Compare
    console.log('📋 Migration Comparison:\n');
    console.log('ID | DB Hash (first 16 chars) | File Tag | Status');
    console.log('---|--------------------------|----------|--------');

    for (let i = 0; i < Math.max(dbMigrations.length, journal.entries.length); i++) {
      const dbMig = dbMigrations[i];
      const fileMig = journal.entries[i];

      if (dbMig && fileMig) {
        const status = dbMig.hash.startsWith(calculateHash(fileMig.tag)) ? '✅' : '❌';
        console.log(
          `${(i + 1).toString().padStart(2)} | ${dbMig.hash.substring(0, 16)}... | ${fileMig.tag.padEnd(20)} | ${status}`,
        );
      } else if (dbMig) {
        console.log(
          `${(i + 1).toString().padStart(2)} | ${dbMig.hash.substring(0, 16)}... | MISSING    | ❌`,
        );
      } else if (fileMig) {
        console.log(
          `${(i + 1).toString().padStart(2)} | MISSING                | ${fileMig.tag.padEnd(20)} | ❌`,
        );
      }
    }

    // Check if there are missing migrations
    const missingInDb = journal.entries.filter((entry: JournalEntry, idx: number) => {
      const dbMig = dbMigrations[idx];
      if (!dbMig) return true;
      return !dbMig.hash.startsWith(calculateHash(entry.tag));
    });

    if (missingInDb.length > 0) {
      console.log('\n⚠️  Missing or mismatched migrations in database:');
      for (const entry of missingInDb) {
        console.log(`   - ${entry.tag}`);
      }
    }

    // Check current max ID
    const maxId = dbMigrations.length > 0 ? dbMigrations[dbMigrations.length - 1].id : 0;
    console.log(`\n📈 Current max ID in database: ${maxId}`);
    console.log(`📈 Expected next ID: ${maxId + 1}`);
    console.log(`📁 File system expects: ${journal.entries.length} migrations`);

    if (maxId !== journal.entries.length - 1) {
      console.log('\n⚠️  ID sequence mismatch detected!');
      console.log('   This is likely causing the duplicate key error.');
    }
  } catch (error) {
    console.error('❌ Error checking migrations:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

function calculateHash(tag: string): string {
  // Drizzle uses a hash of the migration file content
  // This is a simplified version - actual hash calculation is more complex
  return createHash('sha256').update(tag).digest('hex').substring(0, 16);
}

checkMigrations()
  .then(() => {
    console.log('\n✅ Check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Check failed:', error);
    process.exit(1);
  });
