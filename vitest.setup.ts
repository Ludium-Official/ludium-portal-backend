import 'dotenv/config';

// 테스트 환경 설정
process.env.NODE_ENV = 'test';

// 데이터베이스 URL 확인
if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL environment variable is required for tests.');
  console.error(
    'Please set DATABASE_URL in your .env file or environment variables.'
  );
  throw new Error('DATABASE_URL environment variable is required for tests.');
}

console.log('🚀 Vitest setup completed!');
