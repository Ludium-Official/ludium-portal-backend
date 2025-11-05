# 마이그레이션 동기화 에러 원인 분석

## 문제 상황

Drizzle 마이그레이션 시스템에서 `duplicate key value violates unique constraint "__drizzle_migrations_pkey"` 에러가 발생하는 원인과 해결 방법을 설명합니다.

## Drizzle 마이그레이션 추적 방식

Drizzle은 다음과 같이 마이그레이션을 추적합니다:

1. **파일 시스템**: `src/db/migrations/` 디렉토리의 SQL 파일들
2. **저널 파일**: `src/db/migrations/meta/_journal.json` - 마이그레이션 메타데이터
3. **데이터베이스**: `drizzle.__drizzle_migrations` 테이블 - 적용된 마이그레이션 기록

### 마이그레이션 ID 할당 방식

- **파일 시스템**: `idx` (0부터 시작하는 인덱스)
- **데이터베이스**: `id` (1부터 시작하는 자동 증가 시퀀스)

⚠️ **주의**: `idx`와 `id`는 다릅니다!
- `idx = 0` → DB `id = 1`
- `idx = 1` → DB `id = 2`
- ...

## 동기화 에러 발생 원인

### 1. **Git 브랜치 병합 충돌**

```bash
# 시나리오:
# - 브랜치 A: 마이그레이션 0012 생성 (DB id=13)
# - 브랜치 B: 마이그레이션 0013 생성 (DB id=13)
# - 병합 시: 두 마이그레이션이 모두 존재하지만 DB에는 id=13이 하나만 존재
```

**증상**: 마이그레이션 파일은 존재하지만 DB에 기록이 없거나, DB ID가 중복

### 2. **마이그레이션 파일 수동 변경/삭제**

```bash
# 잘못된 작업:
# - 마이그레이션 파일을 Git에서 삭제
# - 마이그레이션 파일을 수동으로 수정
# - 마이그레이션 파일을 다른 위치로 이동
```

**증상**: 파일 시스템의 마이그레이션 해시와 DB의 해시가 불일치

### 3. **여러 환경 간 동기화 문제**

```bash
# 시나리오:
# - 개발 환경 A: 마이그레이션 0017 적용 (DB id=18)
# - 개발 환경 B: 마이그레이션 0017 파일만 있고 적용 안됨
# - 환경 B에서 migrate 실행 시: id=18을 사용하려 하지만 이미 존재
```

**증상**: 다른 환경에서 이미 적용된 마이그레이션이 현재 환경에는 기록되지 않음

### 4. **마이그레이션 중단/롤백**

```bash
# 시나리오:
# - 마이그레이션 적용 중 네트워크 오류
# - 마이그레이션 일부만 적용되고 중단
# - DB에 부분적으로 기록됨
```

**증상**: DB에 마이그레이션 기록은 있지만 실제 스키마 변경은 부분적

### 5. **Drizzle의 ID 시퀀스 문제**

Drizzle은 마이그레이션을 적용할 때:
1. 파일 시스템의 마이그레이션 파일을 순차적으로 읽음
2. 각 마이그레이션의 해시를 계산
3. DB의 `__drizzle_migrations` 테이블에서 마지막 `id`를 조회
4. 다음 `id = max(id) + 1`을 사용하여 새 레코드 삽입

**문제**: 만약 마이그레이션 파일과 DB 상태가 불일치하면:
- 파일 시스템에는 18개 마이그레이션 (0000-0017)
- DB에는 17개 기록 (id 1-17)
- Drizzle이 0017을 적용하려 할 때 `id = 17 + 1 = 18`을 사용
- 하지만 어떤 이유로 중간에 이미 id=12가 존재한다고 판단하면 충돌 발생

## 해결 방법

### 즉시 해결 (이미 적용됨)

```bash
# 1. 마이그레이션 상태 확인
npm run check:migrations

# 2. 누락된 마이그레이션 수동 적용
npm run apply:migration-17
```

### 예방 방법

1. **마이그레이션 파일을 절대 수동으로 변경/삭제하지 않기**
   ```bash
   # ❌ 나쁜 예
   rm src/db/migrations/0017_*.sql
   
   # ✅ 좋은 예
   # 마이그레이션은 항상 `npm run db:gen`으로 생성
   ```

2. **Git 브랜치 병합 시 주의**
   ```bash
   # 병합 전 확인
   git pull origin main
   npm run db:migrate  # 현재 브랜치의 마이그레이션 적용
   
   # 병합 후 확인
   git merge main
   npm run check:migrations  # 동기화 확인
   npm run db:migrate  # 누락된 마이그레이션 적용
   ```

3. **팀 협업 시 통일된 워크플로우**
   ```bash
   # 새로운 기능 브랜치 생성 전
   git checkout main
   git pull origin main
   npm run db:migrate  # 최신 마이그레이션 적용
   
   # 브랜치 생성 후 작업
   git checkout -b feature/new-feature
   # 스키마 변경
   npm run db:gen
   # 마이그레이션 파일 커밋
   git add src/db/migrations/
   git commit -m "Add migration for new feature"
   ```

4. **환경별 마이그레이션 상태 확인**
   ```bash
   # 배포 전 확인
   npm run check:migrations
   
   # 프로덕션 배포 전
   # - 로컬에서 모든 마이그레이션 적용 확인
   # - 프로덕션 DB와 동기화 확인
   ```

## Drizzle 마이그레이션 추적의 한계

Drizzle의 마이그레이션 시스템은:
- ✅ 파일 기반 추적 (Git과 잘 맞음)
- ✅ 해시 기반 중복 방지
- ❌ 하지만 파일 시스템과 DB 간 동기화는 자동으로 보장되지 않음

따라서:
- 마이그레이션 파일은 Git으로 관리되어야 함
- 모든 환경에서 동일한 마이그레이션 파일을 사용해야 함
- 마이그레이션 적용 전 항상 동기화 상태를 확인해야 함

## 참고

- [Drizzle Migration Docs](https://orm.drizzle.team/docs/migrations)
- 프로젝트 내 `src/scripts/check-migrations.ts` - 마이그레이션 상태 확인 스크립트
- 프로젝트 내 `src/scripts/apply-migration-17.ts` - 특정 마이그레이션 수동 적용 예시

