# GraphQL V2 Tests

## 디렉토리 구조

```
tests/
├── fixtures/           # 정적 테스트 데이터 (mock JSON, sample data)
├── integration/        # 통합 테스트 (단위 기능별)
├── e2e/               # End-to-End 테스트 (전체 시나리오)
└── helper.ts          # 테스트 헬퍼 함수
```

## 각 디렉토리의 역할

### `fixtures/`
- **용도**: 테스트에 사용할 정적 데이터 파일들을 저장
- **예시**: Mock API 응답, 샘플 JSON 데이터, 테스트용 이미지 등
- **특징**: 테스트 코드와 분리된 순수 데이터 파일

```typescript
// 사용 예시
import testData from './fixtures/user-data.json';

const mockUser = testData.users[0];
```

### `integration/`
- **용도**: 개별 기능/모듈별 통합 테스트
- **범위**: 단일 기능의 전체 플로우 테스트
- **예시**: 
  - `applications.integration.test.ts` - Application CRUD 테스트
  - `programs.integration.test.ts` - Program CRUD 테스트
  - `users.integration.test.ts` - User 인증/프로필 테스트

**특징**:
- 빠른 실행 (개별 기능만 테스트)
- 의존성 최소화
- 실패 시 문제 지점을 쉽게 파악

### `e2e/`
- **용도**: 전체 시스템 시나리오 테스트
- **범위**: 여러 모듈이 함께 동작하는 워크플로우
- **예시**: 
  - `contract-scenario.test.ts` - 컨트랙트 생성 전체 플로우
  
**특징**:
- 느린 실행 (전체 플로우 테스트)
- 실제 사용자 시나리오 검증
- 여러 모듈 간 상호작용 검증

### `helper.ts`
- **용도**: 공통 테스트 유틸리티
- **내용**: Test server 생성, 데이터베이스 초기화 등

## 테스트 실행

```bash
# 모든 테스트 실행
npm test

# 통합 테스트만 실행
npm test -- src/graphql/v2/tests/integration/

# E2E 테스트만 실행
npm test -- src/graphql/v2/tests/e2e/

# 특정 테스트 실행
npm test -- src/graphql/v2/tests/e2e/contract-scenario.test.ts
```

## 테스트 작성 가이드라인

### Integration Test 작성 시
1. 하나의 기능/모듈에 집중
2. Mock 데이터는 테스트 내부에서 직접 생성
3. 다른 모듈과의 통합은 최소화
4. 빠른 피드백을 위한 속도 우선

### E2E Test 작성 시
1. 실제 사용자 시나리오 재현
2. 전체 워크플로우 검증
3. Fixtures 디렉토리 활용 가능
4. 명확한 시나리오 설명 주석 작성

### Fixtures 사용 시
1. 가독성이 중요한 복잡한 데이터
2. 여러 테스트에서 재사용되는 데이터
3. 외부 API 응답 모킹 등
4. 반드시 읽기 전용으로만 사용

## 예시

### Integration Test 예시
```typescript
// integration/users.integration.test.ts
describe('User V2 API', () => {
  it('should create a user', async () => {
    // 단일 기능 테스트
    const user = await createUser({ ... });
    expect(user).toBeDefined();
  });
});
```

### E2E Test 예시
```typescript
// e2e/contract-scenario.test.ts
describe('E2E Contract Scenario', () => {
  it('should complete contract creation workflow', async () => {
    // 1. Sponsor creates program
    // 2. Builder applies
    // 3. Sponsor hires builder
    // 4. Create milestones
    // 5. Create contract
    // 전체 시나리오 검증
  });
});
```

## 베스트 프랙티스

1. **명확한 분리**: Integration과 E2E는 명확히 구분
2. **빠른 피드백**: Integration 테스트는 빠르게 실행되어야 함
3. **실제 시나리오**: E2E 테스트는 실제 사용자 플로우를 반영
4. **유지보수성**: 중복 코드는 helper.ts나 fixtures로 추출
5. **독립성**: 각 테스트는 독립적으로 실행 가능해야 함

