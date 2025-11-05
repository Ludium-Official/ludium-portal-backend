import 'dotenv-expand/config';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

/**
 * Manually apply migration 0017 and add it to the migration table
 */
async function applyMigration17() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL environment variable is not set');
    process.exit(1);
  }
  const sql = postgres(databaseUrl);

  try {
    console.log('🔍 Checking migration 0017 status...\n');

    // Check if migration 0017 is already applied
    const existing = await sql`
      SELECT id, hash FROM drizzle.__drizzle_migrations 
      WHERE hash LIKE '%0017%'
      ORDER BY id DESC
      LIMIT 1
    `;

    if (existing.length > 0) {
      console.log(`✅ Migration 0017 is already recorded (id=${existing[0].id})`);
      return;
    }

    // Check if the column is already nullable
    const columnInfo = await sql`
      SELECT is_nullable 
      FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'contracts' 
      AND column_name = 'onchain_contract_id'
    `;

    if (columnInfo.length === 0) {
      console.log('❌ contracts table or onchain_contract_id column not found');
      return;
    }

    const isNullable = columnInfo[0].is_nullable === 'YES';

    if (isNullable) {
      console.log('✅ Column onchain_contract_id is already nullable');
    } else {
      console.log(
        '📝 Applying migration: ALTER TABLE contracts ALTER COLUMN onchain_contract_id DROP NOT NULL',
      );
      await sql`ALTER TABLE "contracts" ALTER COLUMN "onchain_contract_id" DROP NOT NULL`;
      console.log('✅ Migration SQL applied successfully');
    }

    // Read the migration file to get the hash
    const migrationFile = join(process.cwd(), 'src/db/migrations/0017_lovely_wolfpack.sql');
    const migrationContent = readFileSync(migrationFile, 'utf-8');

    // Drizzle calculates hash from file content
    const crypto = await import('node:crypto');
    const hash = crypto.createHash('sha256').update(migrationContent).digest('hex');

    // Get the next ID
    const maxIdResult = await sql`SELECT MAX(id) as max_id FROM drizzle.__drizzle_migrations`;
    const nextId = (Number(maxIdResult[0]?.max_id) || 0) + 1;

    // Add migration record (created_at is bigint timestamp in milliseconds)
    const createdAt = Date.now();
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (id, hash, created_at)
      VALUES (${nextId}, ${hash}, ${createdAt})
    `;

    console.log(`✅ Migration record added with id=${nextId}, hash=${hash.substring(0, 16)}...`);
    console.log('🎉 Migration 0017 applied successfully!');
  } catch (error) {
    console.error('❌ Error applying migration:', error);
    throw error;
  } finally {
    await sql.end();
  }
}

applyMigration17()
  .then(() => {
    console.log('\n✅ Script completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script failed:', error);
    process.exit(1);
  });
