// src/scripts/sync-migration-hashes.ts
import 'dotenv-expand/config';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

async function syncMigrationHashes() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set');
    process.exit(1);
  }

  const sql = postgres(databaseUrl);
  const journalPath = join(process.cwd(), 'src/db/migrations/meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf-8'));

  try {
    console.log('🔄 Syncing migration hashes from files...\n');

    // 기존 기록 삭제
    await sql`DELETE FROM drizzle.__drizzle_migrations`;
    console.log('✅ Cleared existing migration records\n');

    // 각 마이그레이션 파일의 해시 계산 및 삽입
    for (let i = 0; i < journal.entries.length; i++) {
      const entry = journal.entries[i];
      const migrationFile = join(process.cwd(), 'src/db/migrations', `${entry.tag}.sql`);

      const content = readFileSync(migrationFile, 'utf-8');
      const hash = createHash('sha256').update(content).digest('hex');
      const id = i + 1; // DB ID는 1부터 시작

      await sql`
        INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
        VALUES (${id}, ${hash}, ${entry.when})
      `;

      console.log(`✅ ${entry.tag} (id=${id}, hash=${hash.substring(0, 16)}...)`);
    }

    console.log('\n✅ All migration hashes synced!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

syncMigrationHashes()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
