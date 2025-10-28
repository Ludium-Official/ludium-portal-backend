# 테스트 구조 분리 가이드

## 🎯 핵심 원칙

**"테스트 타입에 따라 명확히 분리하세요!"**

V2 아키텍처의 테스트는 **단위 테스트(Unit)**와 **통합 테스트(Integration)**로 엄격하게 분리되어 관리됩니다.

## 📁 디렉토리 구조 (NON-NEGOTIABLE)

```
src/graphql/v2/tests/
├── unit/                           # 단위 테스트 (Unit Tests)
│   ├── users.test.ts              # Resolver 함수 직접 호출
│   ├── programs.test.ts           # Resolver 함수 직접 호출
│   └── ...
├── integration/                     # 통합 테스트 (Integration Tests)
│   ├── users.integration.test.ts  # GraphQL API 호출
│   ├── programs.integration.test.ts # GraphQL API 호출
│   └── ...
├── fixtures/                       # 공통 테스트 데이터
│   ├── users.ts
│   ├── programs.ts
│   └── ...
├── mocks/                          # Mock 구현 (필요시)
│   └── ...
├── utils/                          # 테스트 유틸리티
│   └── ...
└── helper.ts                       # 공통 헬퍼 함수
```

### 디렉토리 역할

| 디렉토리 | 역할 | 비고 |
|---------|------|------|
| `unit/` | Resolver 함수의 비즈니스 로직 검증 | Mock 사용, 빠른 실행 |
| `integration/` | End-to-end GraphQL API 검증 | 실제 서버 기반, 전체 스택 |
| `fixtures/` | 재사용 가능한 테스트 데이터 | 중앙 집중식 관리 |
| `mocks/` | Mock 구현체 | 선택적 사용 |
| `utils/` | 테스트 유틸리티 함수 | 헬퍼 함수 확장 |

## 🔍 테스트 타입별 상세 가이드

### Unit Tests (`unit/`)

#### 목적
- **Resolver 함수의 비즈니스 로직** 검증
- 개별 함수의 동작 확인
- 빠른 피드백 제공

#### 특징
- Mock 컨텍스트 사용
- 데이터베이스 직접 접근 (실제 테스트 DB)
- Fastify 서버 인스턴스 불필요
- **빠른 실행 속도**

#### 예시

```typescript
// ❌ BAD: Integration test처럼 작성
import { createTestServer } from '../helper';

const server = await createTestServer();
const response = await server.inject({ ... });

// ✅ GOOD: Resolver 직접 호출
import { createUserV2Resolver } from '../../resolvers/users';

const mockContext = {
  db,
  server: mockServer,
  request: {} as FastifyRequest,
  reply: {} as FastifyReply,
} as unknown as Context;

const result = await createUserV2Resolver(
  {},
  { input: createUserInput },
  mockContext
);

expect(result.id).toBeDefined();
expect(result.email).toBe(createUserInput.email);
```

#### 파일명 규칙
```
{entity}.test.ts
```
예시: `users.test.ts`, `programs.test.ts`

---

### Integration Tests (`integration/`)

#### 목적
- **End-to-end GraphQL API** 검증
- 실제 Fastify 서버 전체 스택 테스트
- 인증/권한 플러그인 포함 테스트
- API 계약(Contract) 검증

#### 특징
- 실제 Fastify 서버 실행
- `server.inject()` 사용
- GraphQL 쿼리/뮤테이션 문자열 전송
- **느린 실행 속도**

#### 예시

```typescript
// ✅ GOOD: Integration test처럼 작성
import { createTestServer } from '../helper';

describe('Users V2 GraphQL API - Integration Tests', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();
  });

  it('should create a new user via mutation', async () => {
    const mutation = `
      mutation CreateUser($input: CreateUserV2Input!) {
        createUserV2(input: $input) {
          id
          email
          walletAddress
        }
      }
    `;

    const response = await server.inject({
      method: 'POST',
      url: '/graphql',
      payload: {
        query: mutation,
        variables: {
          input: {
            email: 'test@example.com',
            walletAddress: '0x123...',
            loginType: 'wallet',
          },
        },
      },
    });

    expect(response.statusCode).toBe(200);
    const result = JSON.parse(response.body);
    expect(result.data.createUserV2.id).toBeDefined();
  });
});
```

#### 파일명 규칙

```
{entity}.integration.test.ts
```
예시: `users.integration.test.ts`

---

## 🚫 피해야 할 행동

### ❌ BAD: 단위 테스트에 서버 인스턴스 사용

```typescript
// src/graphql/v2/tests/unit/users.test.ts

import { createTestServer } from '../helper';  // ❌ WRONG!

describe('Users V2 Resolvers', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();  // ❌ Integration처럼 작성
  });

  it('should get user', async () => {
    // ❌ Resolver를 직접 호출해야 하는데 API 호출 사용
  });
});
```

### ❌ BAD: 통합 테스트에 Resolver 직접 호출

```typescript
// src/graphql/v2/tests/integration/users.integration.test.ts

import { getUserV2Resolver } from '../../resolvers/users';  // ❌ WRONG!

describe('Users V2 Integration Tests', () => {
  it('should get user', async () => {
    const result = await getUserV2Resolver({}, { id: '1' }, mockContext);  // ❌ Unit처럼 작성
  });
});
```

### ❌ BAD: 테스트 파일 경로 혼용

```typescript
// ❌ unit/과 integration/에 같은 파일명
src/graphql/v2/tests/unit/users.test.ts
src/graphql/v2/tests/integration/users.test.ts  // ❌ 혼란 발생!

// ✅ 올바른 방법
src/graphql/v2/tests/unit/users.test.ts
src/graphql/v2/tests/integration/users.integration.test.ts  // ✅ 명확함
```

---

## ✅ 올바른 실행 방법

### 전체 테스트 실행

```bash
# 모든 테스트 실행
npm test -- src/graphql/v2/tests/
```

### 타입별 테스트 실행

```bash
# 단위 테스트만 실행 (빠름)
npm test -- src/graphql/v2/tests/unit/

# 통합 테스트만 실행 (느림)
npm test -- src/graphql/v2/tests/integration/
```

### 특정 파일만 실행

```bash
# 특정 단위 테스트
npm test -- src/graphql/v2/tests/unit/users.test.ts

# 특정 통합 테스트
npm test -- src/graphql/v2/tests/integration/users.integration.test.ts
```

---

## 📋 체크리스트

### 새 테스트 파일 작성 시

#### Unit Test 체크리스트

- [ ] `src/graphql/v2/tests/unit/` 디렉토리에 파일 생성
- [ ] 파일명이 `{entity}.test.ts` 형식인가?
- [ ] Resolver 함수를 직접 import 및 호출하는가?
- [ ] Mock context를 사용하는가?
- [ ] `createTestServer()`를 사용하지 않는가?
- [ ] 빠르게 실행되는가? (< 1초 per test)

#### Integration Test 체크리스트

- [ ] `src/graphql/v2/tests/integration/` 디렉토리에 파일 생성
- [ ] 파일명이 `{entity}.integration.test.ts` 형식인가?
- [ ] `createTestServer()`를 사용하는가?
- [ ] `server.inject()`로 GraphQL 요청을 보내는가?
- [ ] GraphQL 쿼리/뮤테이션 문자열을 사용하는가?
- [ ] 실제 HTTP 응답을 검증하는가?

---

## 🎓 용도별 가이드

### 언제 Unit Test를 작성해야 하는가?

#### ✅ 작성해야 할 경우

1. **Resolver 함수의 비즈니스 로직** 검증
2. **에러 핸들링** 로직 테스트
3. **데이터 변환/파싱** 로직 검증
4. **특정 엣지 케이스** 테스트
5. **빠른 피드백**이 필요한 경우

#### 예시 시나리오

```typescript
// ✅ Valid: 유효하지 않은 입력 처리
it('should throw error for invalid email', async () => {
  const input = { email: 'invalid-email', ... };
  await expect(
    createUserV2Resolver({}, { input }, mockContext)
  ).rejects.toThrow('Invalid email');
});

// ✅ Valid: 데이터 변환 로직
it('should transform user data correctly', async () => {
  const result = await updateUserV2Resolver({}, { input }, mockContext);
  expect(result.updatedAt).toBeDefined();
  expect(result.updatedAt).not.toEqual(input.updatedAt);
});
```

---

### 언제 Integration Test를 작성해야 하는가?

#### ✅ 작성해야 할 경우

1. **GraphQL API 계약** 검증
2. **인증/권한** 플러그인 동작 확인
3. **End-to-end 시나리오** 테스트
4. **실제 API 응답 형식** 검증
5. **프론트엔드 통합 준비** 확인

#### 예시 시나리오

```typescript
// ✅ Valid: 인증이 필요한 API 테스트
it('should require authentication', async () => {
  const response = await server.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query: 'query { profileV2 { id } }' },
  });
  
  expect(response.statusCode).toBe(200);
  expect(result.errors).toBeDefined();
  expect(result.errors[0].message).toMatch(/unauthorized/i);
});

// ✅ Valid: 전체 플로우 테스트
it('should create and retrieve user', async () => {
  // Create
  const createMutation = `mutation { createUserV2(input: { ... }) { id } }`;
  const createResponse = await server.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query: createMutation },
  });
  const createdUserId = createResponse.data.createUserV2.id;
  
  // Retrieve
  const getQuery = `query { getUserV2(id: "${createdUserId}") { id email } }`;
  const queryResponse = await server.inject({
    method: 'POST',
    url: '/graphql',
    payload: { query: getQuery },
  });
  expect(queryResponse.data.getUserV2.id).toBe(createdUserId);
});
```

---

## 🔧 Helper Functions 가이드

### 공통 헬퍼 사용

```typescript
// src/graphql/v2/tests/helper.ts

export async function createTestServer(): Promise<FastifyInstance> {
  // Fastify 서버 생성 및 설정
  // Plugins 등록
  // DB 연결 설정
  // ...
  return server;
}
```

#### Unit Tests에서 사용

```typescript
// ❌ DON'T: Unit test에서 사용하지 않음
import { createTestServer } from '../helper';

// ✅ 단위 테스트는 Mock context 사용
const mockContext = {
  db,
  server: mockServer,
  // ...
};
```

#### Integration Tests에서 사용

```typescript
// ✅ DO: Integration test에서 사용
import { createTestServer } from '../helper';

describe('Users Integration Tests', () => {
  let server: FastifyInstance;

  beforeAll(async () => {
    server = await createTestServer();  // ✅ 사용!
  });
});
```

---

## 📊 테스트 비율 권장사항

### 이상적인 분포

```
Total: 100%
├── Unit Tests: 70-80%      # 빠른 피드백, 비즈니스 로직 검증
└── Integration Tests: 20-30% # API 계약, E2E 시나리오
```

### 이유

- **Unit Tests**: 코드 변경 시 즉각적인 피드백
- **Integration Tests**: API 계약 보장, 배포 전 확인

---

## 🚀 CI/CD 통합

### GitHub Actions 예시

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test -- src/graphql/v2/tests/unit/
  
  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test -- src/graphql/v2/tests/integration/
```

---

## 💡 핵심 Takeaway

### 1. 명확한 분리
- Unit: Resolver 로직 검증 ▶ Mock 사용
- Integration: API 전체 흐름 ▶ 서버 실행

### 2. 명명 규칙 준수
- Unit: `{entity}.test.ts`
- Integration: `{entity}.integration.test.ts`

### 3. Import 경로 주의
- Unit → `../../resolvers/...`
- Integration → `../helper`

### 4. 실행 전략
- 빠른 개발: Unit만 실행
- 배포 전: Integration 실행
- CI/CD: 둘 다 실행

---

## 🎯 규칙 준수 여부 확인

새 테스트 파일을 작성한 후 다음을 확인하세요:

```bash
# 1. 테스트 실행
npm test -- src/graphql/v2/tests/

# 2. 실행 시간 확인
# Unit: < 1초 per test
# Integration: < 5초 per test

# 3. 파일 위치 확인
ls -la src/graphql/v2/tests/unit/
ls -la src/graphql/v2/tests/integration/
```

---

**절대 두 가지를 혼용하지 마세요! 명확한 분리가 코드 품질과 개발 생산성을 보장합니다.**
