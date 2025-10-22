import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // 테스트 격리 설정
    isolate: true, // 각 테스트 파일을 별도 프로세스에서 실행
    pool: 'forks', // fork 모드로 실행하여 완전한 격리
    poolOptions: {
      forks: {
        singleFork: false, // 각 테스트 파일마다 별도 fork
        isolate: true, // 각 테스트 파일을 완전히 격리
      },
    },
    // 테스트 타임아웃 설정
    testTimeout: 30000,
    // 병렬 실행 설정
    maxConcurrency: 1, // 순차 실행으로 데이터베이스 충돌 방지
    // 각 테스트 파일을 별도 워커에서 실행
    fileParallelism: false,
    // 테스트 순서 보장
    sequence: {
      concurrent: false,
    },
  },
});
