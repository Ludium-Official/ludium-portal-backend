# V1과 V2 스키마 공존 전략

## 🎯 핵심 원칙

**"프론트">엔드에게 모든 파일을 바꾸라고 하지 마세요!"**

V1과 V2는 같은 GraphQL endpoint에서 공존하며, 프론트엔드 ":중 선택 가능합니다.

## 📋 현재 상황

### Backend
```
src/graphql/types/        # V1 쿼리
src/graphql/v2/types/     # V2 쿼리
```

같은 `builder`를 사용하므로 **동일한 endpoint** `/graphql`에서 모두 사용 가능

### Frontend
프론트ريد는 **원하는 쿼리**를 선택해서 사용

```graphql
# V1 쿼리 사용
query {
  programs { ... }  # V1
}

# V2 쿼리 사용
query {
  programsV2 { ... }  # V2
}
```

## ✅ 올바른 마이그레이션 프로세스

### 1. 백엔드: V1과 V2 둘 다 제공

```typescript
// ✅ 둘 다 유지
builder.queryFields((t) => ({
  programs: t.field({ ... }),      // V1 (기존 코드 그대로)
  programsV2: t.field({ ... }),    // V2 (새로운 쿼리)
}));
```

### 2. 프론트엔드: 점진적으로 마이그레이션

```typescript
// Before: V1 사용
const { data } = useQuery(PROGRAMS_QUERY);

// After: V2 사용 (필요할 때만 변경)
const { data } = useQuery(PROGRAMS_V2_QUERY);
```

**중요**: 한 번에 모든 파일을 바꾸지 않아도 됩니다!

## 🔄 실제 작업 프로세스

### 시나리오: Program 쿼리를 V2로 마이그레이션

#### Step 1: 백엔드에서 V2 추가
```typescript
// ✅ V1은 그대로 유지
builder.queryFields((t) => ({
  programs: t.field({ ... }),      // V1
}));

// ✅ V2 추가
builder.queryFields((t) => ({
  programsV2: t.field({ ... }),    // V2
}));
```

#### Step 2: 프론트엔드에 선택권 제공
```bash
# 프론트엔드가 둘 다 사용 가능
queries/programs.graphql      # V1
queries/programsV2.graphql    # V2
```

#### Step 3: 프론트엔드가 자유롭게 선택
- 기존 V1: 계속 사용 가능
- 새 기능: V2 사용
- 점진적: V1 → V2 천천히 전환

#### Step 4: V1 Deprecated 알림 (선택)
```graphql
"""
@deprecated Use programsV2 instead
"""
programs: [Program]
```

## ⚠️ 피해야 할 일

### ❌ 나쁜 방법
```bash
# 백엔드: V1 삭제
# 프론트엔드: 모든 *.graphql 파일 변경 요구
```

이렇게 하면:
- 프론트엔드 전체 기능 고장
- 대량의 코드 변경 필요
- 서비스 중단 가능

### ✅ 좋은 방법
```bash
# 백엔드: V1 + V2 둘 다 유지
# 프론트엔드: 필요할 때만 V2 사용
```

이렇게 하면:
- 기존 기능 정상 동작
- 새로운 기능만 V2 사용
- 점진적 마이그레이션

## 📊 예시: profile 쿼리

### Backend 현재 상태
```typescript
// V1 profile 삭제됨
// V2 profile만 존재
profile: t.field({ type: UserV2Type, ... })
```

### 문제점
프론트엔드가 V1 profile을 사용 중이라면 → 에러 발생!

### 해결 방법

#### 옵션 1: V1 profile 복원 (호환성 유지)
```typescript
// V1과 V2 둘 다 제공
builder.queryFields((t) => ({
  // V1 - 기존 코드 호환
  profile: t.field({ 
    type: User,      // V1 타입
    resolve: getProfileResolver 
  }),
  // V2 - 새로운 쿼리
  profileV2: t.field({ 
    type: UserV2Type, 
    resolve: getProfileV2Resolver 
  }),
}));
```

프론트엔드:
- 기존 코드: `profile` 계속 사용 가능
- 새 코드: `profileV2` 사용

#### 옵션 2: 프론트엔드 단독 변경
- 백엔드: V2만 제공
- 프론트엔드: profile → profileV2 변경
- 장점: 깔끔
- 단점: Breaking Change

## 🎯 추천 전략

### 단기적으로
```typescript
// ✅ 둘 다 제공
profile: User        # V1
profileV2: UserV2    # V2
```

### 장기적으로
```typescript
// V1 deprecated 경고 추가
/**
 * @deprecated Use profileV2 instead
 */
profile: User
```

### 최종적으로
```typescript
// V1 삭제 (프론트엔드 모두 마이그레이션 완료 후)
profileV2: UserV2    # V2만 유지
```

## 💡 핵심 Takeaway

1. **백엔드**: V1 + V2 둘 다 제공
2. **프론트엔드**: 필요할 때만 V2 사용
3. **마이그레이션**: 점진적으로 진행
4. **Deprecation**: 충분한 시간 후 V1 제거

**절대 프론트엔드에게 "모든 파일을 바꿔라"고 하지 마세요!**

