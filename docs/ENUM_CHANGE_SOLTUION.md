```sql
-- 0) 혹시 모르니 트랜잭션 안에서 진행하려면 BEGIN/COMMIT으로 감싸세요.
-- BEGIN;

-- 1) 예전 enum 이름 변경
ALTER TYPE application_status_v2 RENAME TO application_status_v2_old;

-- 2) 새 enum 정의
CREATE TYPE application_status_v2 AS ENUM (
  'submitted',          -- 신청서 제출 완료
  'pending_signature',  -- 계약서 서명 요청 대기
  'in_progress',        -- 계약 생성/진행 중
  'completed'           -- 마일스톤 완료 및 종료
);

-- 3) applications_v2 테이블에 임시 컬럼 추가 (새 enum 타입 사용)
ALTER TABLE applications_v2
  ADD COLUMN status_tmp application_status_v2;

-- 4) 기존 값 -> 새 값으로 매핑
UPDATE applications_v2
SET status_tmp = CASE status::text
  WHEN 'applied'  THEN 'submitted'
  WHEN 'submitted' THEN 'submitted'
  WHEN 'pending'  THEN 'submitted'
  WHEN 'hired'    THEN 'pending_signature'  -- 필요에 따라 'in_progress' 등으로 조정 가능
  WHEN 'completed' THEN 'completed'
  WHEN 'rejected' THEN 'submitted'          -- 거절된 건 추가 메모(rejected_reason)로 유지
  ELSE 'submitted'                          -- 예외 값은 기본값으로
END::application_status_v2;

-- 5) 기존 status 컬럼 제거 후, 임시 컬럼 이름을 status로 변경
ALTER TABLE applications_v2 DROP COLUMN status;
ALTER TABLE applications_v2 RENAME COLUMN status_tmp TO status;

-- 6) 옛 enum 타입 제거
DROP TYPE application_status_v2_old;

-- 7) (선택) status 기본값 재설정이 필요하면 여기서 지정
ALTER TABLE applications_v2
  ALTER COLUMN status SET DEFAULT 'submitted';

-- COMMIT;
```