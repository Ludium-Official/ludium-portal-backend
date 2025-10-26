import { defineConfig, defaultExclude } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    exclude: [...defaultExclude, '**/build/**'],
    // 하나의 테스트 파일이 데이터베이스에 대한 작업을 완전히 마칠 때까지 다른 테스트 파일이 실행되는 것을 막아주므로, 각 테스트는 독립적인 환경에서 실행되는 것처럼 보장받게 됩니다.
    fileParallelism: false,
  },
});
