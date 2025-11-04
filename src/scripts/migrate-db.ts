import { exec } from 'node:child_process';
import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import { promisify } from 'node:util';
import postgres from 'postgres';
import 'dotenv/config';

const execAsync = promisify(exec);

interface DBConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  dbname: string;
}

/**
 * PostgreSQL connection URL을 파싱하여 개별 구성 요소로 분리
 * 예: postgresql://user:password@host:port/dbname
 */
function parseDBUrl(dbUrl: string): DBConfig {
  try {
    const url = new URL(dbUrl);

    // 비밀번호에 특수문자가 있을 수 있으므로 decodeURIComponent 사용
    const password = url.password ? decodeURIComponent(url.password) : '';
    const username = url.username ? decodeURIComponent(url.username) : '';

    return {
      host: url.hostname,
      port: url.port || '5432',
      user: username,
      password,
      dbname: url.pathname.replace('/', ''),
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Invalid DB_URL format: ${dbUrl}. Expected format: postgresql://user:password@host:port/dbname. Error: ${errorMessage}`,
    );
  }
}

/**
 * Production DB에서 덤프 파일 생성
 *
 * 업계 표준 관행:
 * - 프로덕션 → 개발/스테이징 환경: 데이터만 복원 (--no-role, --no-owner, --no-privileges)
 *   → 개발 환경의 유저/권한/보안 설정 유지
 * - 프로덕션 → 프로덕션 (재해 복구): 전체 복원 (역할/유저/권한 포함)
 *   → 동일한 환경으로 완전 복구
 *
 * 현재 스크립트는 프로덕션 → 개발 환경 복원용이므로 데이터만 덤프합니다.
 */
async function dumpProdDB(config: DBConfig, dumpFile: string): Promise<void> {
  // readonly 사용자를 위해 필요한 옵션들:
  // --no-owner: 소유자 정보 제외 (권한 없어도 가능)
  // --no-privileges: 권한 정보 제외 (권한 없어도 가능)
  // -n public -n drizzle: 특정 스키마만 덤프 (스키마 권한 문제 방지)
  // 참고: pg_dump에는 --no-role 옵션이 없습니다.
  //       역할/유저 정보는 덤프에 포함될 수 있지만, -n 옵션으로 스키마만 지정하면
  //       스키마 내 객체만 덤프되며, 복원 시 --no-owner로 소유자 변경은 무시됩니다.
  // 필요한 권한:
  // 1. 스키마 USAGE: GRANT USAGE ON SCHEMA public TO ludium_readonly;
  // 2. 시퀀스 SELECT/USAGE: GRANT SELECT, USAGE ON ALL SEQUENCES IN SCHEMA public TO ludium_readonly;
  // 3. 테이블 SELECT: GRANT SELECT ON ALL TABLES IN SCHEMA public TO ludium_readonly;
  const command = `pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.dbname} -F c -f ${dumpFile} --no-owner --no-privileges -n public -n drizzle`;
  console.log(`Dumping Prod DB to ${dumpFile}...`);
  console.log(
    `Command: pg_dump -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.dbname} --no-owner --no-privileges -n public -n drizzle`,
  );

  try {
    // PGPASSWORD와 PGPORT 환경 변수 설정 (보안을 위해 비밀번호는 로그에 출력하지 않음)
    const env = {
      ...process.env,
      PGPASSWORD: config.password,
      PGHOST: config.host,
      PGPORT: config.port,
      PGUSER: config.user,
    };
    const { stderr } = await execAsync(command, { env });
    if (stderr && !stderr.includes('WARNING')) {
      console.warn('Dump stderr:', stderr);
    }
    console.log('✅ Dump completed successfully!');
  } catch (error) {
    console.error('❌ Dump failed:', error);
    throw error;
  }
}

/**
 * 테이블별 레코드 수 비교하여 데이터 무결성 검증
 */
interface TableInfo {
  schema: string;
  tableName: string;
  prodCount: number;
  devCount: number;
  match: boolean;
}

interface TableListResult {
  table_schema: string;
  table_name: string;
}

/**
 * 데이터베이스에서 public과 drizzle 스키마의 테이블 목록 조회
 */
async function getTableList(client: postgres.Sql): Promise<TableListResult[]> {
  const result = await client.unsafe<TableListResult[]>(
    `SELECT table_schema, table_name 
     FROM information_schema.tables 
     WHERE table_schema IN ('public', 'drizzle')
     AND table_type = 'BASE TABLE'
     ORDER BY table_schema, table_name`,
  );
  return result;
}

async function verifyDataIntegrity(prodConfig: DBConfig, devConfig: DBConfig): Promise<void> {
  console.log('\n========================================');
  console.log('Data Integrity Verification');
  console.log('========================================');
  console.log('Discovering tables and comparing record counts...\n');

  // 프로덕션 DB 연결
  const prodUrl = `postgresql://${prodConfig.user}:${prodConfig.password}@${prodConfig.host}:${prodConfig.port}/${prodConfig.dbname}`;
  const prodClient = postgres(prodUrl);

  // 개발 DB 연결
  const devUrl = `postgresql://${devConfig.user}:${devConfig.password}@${devConfig.host}:${devConfig.port}/${devConfig.dbname}`;
  const devClient = postgres(devUrl);

  try {
    // 프로덕션 DB에서 테이블 목록 조회
    const prodTables = await getTableList(prodClient);
    console.log(`Found ${prodTables.length} tables in production database.`);

    // 개발 DB에서 테이블 목록 조회
    const devTables = await getTableList(devClient);
    console.log(`Found ${devTables.length} tables in dev database.\n`);

    // 두 DB의 테이블 목록 합치기 (union)
    const allTables = new Map<string, { schema: string; name: string }>();
    for (const table of prodTables) {
      allTables.set(`${table.table_schema}.${table.table_name}`, {
        schema: table.table_schema,
        name: table.table_name,
      });
    }
    for (const table of devTables) {
      const key = `${table.table_schema}.${table.table_name}`;
      if (!allTables.has(key)) {
        allTables.set(key, {
          schema: table.table_schema,
          name: table.table_name,
        });
      }
    }

    const results: TableInfo[] = [];
    let allMatch = true;
    let totalMismatches = 0;
    let skippedTables = 0;

    for (const [, table] of allTables.entries()) {
      try {
        // 프로덕션 DB 레코드 수 조회
        let prodCount = 0;
        const prodTableExists = prodTables.some(
          (t) => t.table_schema === table.schema && t.table_name === table.name,
        );
        if (prodTableExists) {
          const prodResult = await prodClient.unsafe(
            `SELECT COUNT(*) as count FROM "${table.schema}"."${table.name}"`,
          );
          prodCount = Number.parseInt(prodResult[0].count as string, 10);
        }

        // 개발 DB 레코드 수 조회
        let devCount = 0;
        const devTableExists = devTables.some(
          (t) => t.table_schema === table.schema && t.table_name === table.name,
        );
        if (devTableExists) {
          const devResult = await devClient.unsafe(
            `SELECT COUNT(*) as count FROM "${table.schema}"."${table.name}"`,
          );
          devCount = Number.parseInt(devResult[0].count as string, 10);
        }

        // 두 DB 모두에 테이블이 있어야 비교 가능
        if (!prodTableExists || !devTableExists) {
          results.push({
            schema: table.schema,
            tableName: table.name,
            prodCount: prodTableExists ? prodCount : -1,
            devCount: devTableExists ? devCount : -1,
            match: false,
          });
          skippedTables++;
          continue;
        }

        const match = prodCount === devCount;
        if (!match) {
          allMatch = false;
          totalMismatches++;
        }

        results.push({
          schema: table.schema,
          tableName: table.name,
          prodCount,
          devCount,
          match,
        });
      } catch (error) {
        // 테이블 접근 권한이 없을 수 있음
        console.warn(
          `⚠️  Warning: Could not verify table "${table.schema}"."${table.name}":`,
          error instanceof Error ? error.message : String(error),
        );
        results.push({
          schema: table.schema,
          tableName: table.name,
          prodCount: -1,
          devCount: -1,
          match: false,
        });
        skippedTables++;
      }
    }

    // 결과 출력
    console.log('Schema.Table                  | Production | Dev    | Status');
    console.log('------------------------------|------------|--------|---------');
    for (const result of results) {
      const fullTableName = `${result.schema}.${result.tableName}`;
      if (result.prodCount === -1 || result.devCount === -1) {
        const prodCountStr = result.prodCount === -1 ? 'N/A' : result.prodCount.toString();
        const devCountStr = result.devCount === -1 ? 'N/A' : result.devCount.toString();
        console.log(
          `${fullTableName.padEnd(29)} | ${prodCountStr.padStart(10)} | ${devCountStr.padStart(6)} | ⚠️  SKIP`,
        );
      } else {
        const status = result.match ? '✅ MATCH' : '❌ MISMATCH';
        console.log(
          `${fullTableName.padEnd(29)} | ${result.prodCount.toString().padStart(10)} | ${result.devCount.toString().padStart(6)} | ${status}`,
        );
      }
    }

    console.log('========================================');
    const totalTables = results.length;
    const verifiedTables = totalTables - skippedTables;
    if (allMatch && totalMismatches === 0 && skippedTables === 0) {
      console.log(`✅ All ${verifiedTables} tables match! Data integrity verified.`);
    } else {
      if (totalMismatches > 0) {
        console.log(`❌ Found ${totalMismatches} table(s) with mismatched record counts.`);
      }
      if (skippedTables > 0) {
        console.log(`⚠️  Skipped ${skippedTables} table(s) (not present in both databases).`);
      }
      console.log('   Please review the tables above and investigate the differences.');
    }
    console.log('========================================\n');
  } finally {
    await prodClient.end();
    await devClient.end();
  }
}

/**
 * Dev DB에 덤프 파일 복원
 */
async function restoreToDevDB(config: DBConfig, dumpFile: string): Promise<void> {
  // 1. Dev DB 드롭 & 재생성
  const dropCommand = `dropdb -h ${config.host} -p ${config.port} -U ${config.user} ${config.dbname}`;
  const createCommand = `createdb -h ${config.host} -p ${config.port} -U ${config.user} ${config.dbname}`;

  // 환경 변수 설정
  const env = {
    ...process.env,
    PGPASSWORD: config.password,
    PGHOST: config.host,
    PGPORT: config.port,
    PGUSER: config.user,
  };

  console.log('Dropping Dev DB...');
  try {
    await execAsync(dropCommand, { env });
    console.log('✅ Dev DB dropped successfully');
  } catch (_error) {
    // DB가 존재하지 않을 수도 있으므로 에러는 무시
    console.log('⚠️  Drop command completed (DB may not have existed)');
  }

  console.log('Creating Dev DB...');
  try {
    const { stderr } = await execAsync(createCommand, { env });
    if (stderr && !stderr.includes('already exists')) {
      console.warn('Create DB stderr:', stderr);
    }
    console.log('✅ Dev DB created successfully');
  } catch (error) {
    // DB가 이미 존재할 수도 있으므로 에러 확인 후 처리
    const errorMessage = error instanceof Error ? error.message : String(error);
    const stderrMessage =
      error instanceof Error && 'stderr' in error
        ? String((error as { stderr?: string }).stderr)
        : '';
    if (errorMessage.includes('already exists') || stderrMessage.includes('already exists')) {
      console.log('⚠️  Dev DB already exists, skipping creation');
    } else {
      // 다른 에러는 재던지기
      throw error;
    }
  }

  // 2. 덤프 파일 복원
  // --no-owner: 소유자 정보 무시 (프로덕션 DB의 소유자 정보를 복원하지 않음)
  // --no-privileges: 권한 정보 무시
  // 참고: --if-exists는 -c/--clean과 함께 사용해야 하므로 제외
  //       DB를 이미 드롭/재생성했으므로 빈 DB에 복원하므로 --if-exists는 불필요
  const restoreCommand = `pg_restore -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.dbname} -F c ${dumpFile} --no-owner --no-privileges`;
  console.log('Restoring to Dev DB...');
  console.log(
    `Command: pg_restore -h ${config.host} -p ${config.port} -U ${config.user} -d ${config.dbname} --no-owner --no-privileges`,
  );

  try {
    const { stderr } = await execAsync(restoreCommand, { env });
    // transaction_timeout, owner, role 관련 오류는 무시 (예상된 오류)
    if (stderr) {
      const errorLines = stderr.split('\n');
      const criticalErrors = errorLines.filter(
        (line) =>
          !line.includes('WARNING') &&
          !line.includes('transaction_timeout') &&
          !line.includes('does not exist') &&
          !line.includes('already exists') &&
          !line.includes('OWNER TO') &&
          !line.includes('CREATE ROLE') &&
          !line.includes('ALTER ROLE') &&
          !line.includes('could not execute query') && // pg_restore의 기본 에러 메시지
          line.trim().length > 0,
      );
      if (criticalErrors.length > 0) {
        console.warn('Restore warnings (non-critical errors ignored):');
        console.warn(criticalErrors.join('\n'));
      }
    }
    console.log('✅ Restore completed successfully!');
  } catch (error) {
    // pg_restore는 일부 오류에도 불구하고 성공할 수 있음 (exit code 1)
    // 하지만 실제로 복원이 완료되었는지 확인은 필요
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('errors ignored on restore')) {
      console.log('✅ Restore completed with some non-critical errors (ignored)');
    } else {
      console.error('❌ Restore failed:', error);
      throw error;
    }
  }
}

async function main() {
  const dumpFile = process.env.DUMP_FILE || 'prod_dump.dump';

  // Production DB URL 환경 변수 확인
  const prodDbUrl = process.env.PROD_DB_URL;
  if (!prodDbUrl) {
    console.error('❌ Error: PROD_DB_URL environment variable is not set.');
    console.error('   Please define PROD_DB_URL in your .env file.');
    console.error('   Format: postgresql://user:password@host:port/dbname');
    process.exit(1);
  }

  // Dev DB URL 환경 변수 확인
  const devDbUrl = process.env.DEV_DB_URL;
  if (!devDbUrl) {
    console.error('❌ Error: DEV_DB_URL environment variable is not set.');
    console.error('   Please define DEV_DB_URL in your .env file.');
    console.error('   Format: postgresql://user:password@host:port/dbname');
    process.exit(1);
  }

  try {
    // DB URL 파싱
    const prodConfig = parseDBUrl(prodDbUrl);
    const devConfig = parseDBUrl(devDbUrl);

    console.log('========================================');
    console.log('Database Dump & Restore Script');
    console.log('========================================');
    console.log(
      `Source DB: ${prodConfig.user}@${prodConfig.host}:${prodConfig.port}/${prodConfig.dbname}`,
    );
    console.log(
      `Target DB: ${devConfig.user}@${devConfig.host}:${devConfig.port}/${devConfig.dbname}`,
    );
    console.log(`Dump File: ${dumpFile}`);
    // 디버깅: 비밀번호 길이만 확인 (보안)
    console.log(
      `Password length: Source=${prodConfig.password.length}, Target=${devConfig.password.length}`,
    );
    console.log('========================================\n');

    const rl = readline.createInterface({ input, output });
    const answer = await rl.question(
      'Are you sure you want to dump and restore the database? (y/n): ',
    );
    rl.close();

    if (answer.toLowerCase() !== 'y') {
      console.log('Aborting...');
      process.exit(0);
    }

    // Production DB 덤프
    await dumpProdDB(prodConfig, dumpFile);
    console.log('');

    // Dev DB에 복원
    await restoreToDevDB(devConfig, dumpFile);
    console.log('');

    // 데이터 무결성 검증 (테이블 목록 자동 조회)
    await verifyDataIntegrity(prodConfig, devConfig);

    console.log('========================================');
    console.log('✅ All operations completed successfully!');
    console.log('========================================');
    console.log(`Dump file saved at: ${dumpFile}`);
    console.log('You can now test your migrations on the restored dev database.');
  } catch (error) {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  }
}

main();
