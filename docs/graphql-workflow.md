# GraphQL 워크플로우 가이드

> **목표**: GraphQL이 처음인 개발자도 이해할 수 있는 완전한 워크플로우 문서

## 📋 목차

1. [GraphQL이란?](#graphql이란)
2. [전체 아키텍처 개요](#전체-아키텍처-개요)
3. [프론트엔드에서 백엔드까지 전체 흐름](#프론트엔드에서-백엔드까지-전체-흐름)
4. [단계별 상세 처리 과정](#단계별-상세-처리-과정)
5. [실제 코드 예시](#실제-코드-예시)
6. [디버깅과 로깅](#디버깅과-로깅)
7. [공동개발 가이드](#공동개발-가이드)

---

## GraphQL이란?

### 🎯 **간단한 설명**

GraphQL은 **API를 위한 쿼리 언어**입니다. 클라이언트가 정확히 필요한 데이터만 요청할 수 있게 해줍니다.

### 📊 **REST vs GraphQL 비교**

| REST API                        | GraphQL                      |
| ------------------------------- | ---------------------------- |
| 여러 엔드포인트                 | 단일 엔드포인트              |
| 고정된 응답 구조                | 요청에 따른 유연한 응답      |
| Over-fetching (불필요한 데이터) | 정확한 데이터만 요청         |
| Under-fetching (부족한 데이터)  | 한 번의 요청으로 모든 데이터 |

### 🔍 **GraphQL 예시**

```graphql
# 요청 (Query)
query GetProgram {
  programV2(id: "1") {
    id
    title
    description
    skills
  }
}

# 응답 (Response)
{
  "data": {
    "programV2": {
      "id": "1",
      "title": "Web3 Development Program",
      "description": "A comprehensive program...",
      "skills": ["solidity", "react", "web3"]
    }
  }
}
```

---

## 전체 아키텍처 개요

```mermaid
graph TB
    A[프론트엔드<br/>React/Vue/Angular] --> B[HTTP POST<br/>/graphql]
    B --> C[Fastify 서버]
    C --> D[인증 처리<br/>JWT]
    D --> E[Mercurius<br/>GraphQL 엔진]
    E --> F[스키마 검증]
    F --> G[권한 검증<br/>ScopeAuth]
    G --> H[Resolver 실행]
    H --> I[데이터베이스<br/>PostgreSQL]
    I --> J[응답 생성]
    J --> K[HTTP 응답]
    K --> A
```

### 🏗️ **주요 컴포넌트**

1. **프론트엔드**: React, Vue, Angular 등
2. **HTTP 클라이언트**: Apollo Client, urql, fetch 등
3. **Fastify 서버**: Node.js 웹 프레임워크
4. **Mercurius**: GraphQL 서버 플러그인
5. **Pothos**: GraphQL 스키마 빌더
6. **PostgreSQL**: 데이터베이스
7. **Drizzle ORM**: 데이터베이스 ORM

---

## 프론트엔드에서 백엔드까지 전체 흐름

### 🚀 **1단계: 프론트엔드 요청 생성**

```javascript
// 프론트엔드 코드 (React 예시)
import { useQuery } from '@apollo/client';
import { gql } from '@apollo/client';

const GET_PROGRAM = gql`
  query programV2($id: ID!) {
    programV2(id: $id) {
      id
      title
      description
      skills
      status
    }
  }
`;

function ProgramComponent({ programId }) {
  const { data, loading, error } = useQuery(GET_PROGRAM, {
    variables: { id: programId }
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>{data.programV2.title}</h1>
      <p>{data.programV2.description}</p>
      <ul>
        {data.programV2.skills.map(skill => (
          <li key={skill}>{skill}</li>
        ))}
      </ul>
    </div>
  );
}
```

### 🌐 **2단계: HTTP 요청 전송**

```javascript
// 실제 HTTP 요청 (Apollo Client 내부)
fetch('http://localhost:3000/graphql', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  },
  body: JSON.stringify({
    query: `
      query programV2($id: ID!) {
        programV2(id: $id) {
          id
          title
          description
          skills
          status
        }
      }
    `,
    variables: { id: "1" }
  })
});
```

---

## 단계별 상세 처리 과정

### 🔧 **3단계: Fastify 서버 요청 수신**

```typescript
// src/config/server.ts
const server = Fastify({
  logger: {
    redact: ['req.headers.authorization'], // 보안을 위해 토큰 숨김
    serializers: {
      req(req) {
        return {
          method: req.method,        // "POST"
          url: req.url,             // "/graphql"
          headers: req.headers,     // 요청 헤더들
          hostname: req.hostname,   // "localhost"
          remoteAddress: req.ip,    // 클라이언트 IP
        };
      },
    },
  },
});

// 로깅 출력 예시:
// {
//   "level": 30,
//   "time": 1703123456789,
//   "method": "POST",
//   "url": "/graphql",
//   "headers": {
//     "content-type": "application/json",
//     "authorization": "[REDACTED]"
//   },
//   "hostname": "localhost",
//   "remoteAddress": "127.0.0.1"
// }
```

### 🔐 **4단계: 인증 처리**

```typescript
// src/config/server.ts
server.addHook('preHandler', (request, _reply, next) => {
  request.jwt = server.jwt; // JWT 인스턴스를 요청에 추가
  next();
});

// src/plugins/auth.ts에서 인증 처리
export const authHandler: AuthHandler = {
  isUser: (request) => {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (!token) return false;

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!);
      request.auth = decoded as RequestAuth;
      return true;
    } catch {
      return false;
    }
  },
  // ... 기타 인증 메서드들
};

// 로깅 출력:
// "🔐 Processing authentication for request"
// "✅ User authenticated successfully" 또는 "❌ Authentication failed"
```

### 📝 **5단계: GraphQL 파싱 및 검증**

```typescript
// Mercurius가 GraphQL 요청을 파싱
// 로깅 출력:
// "📝 Parsing GraphQL query: programV2"
// "🔍 Query variables: { id: '1' }"
// "📋 Query operation type: query"
// "🔍 Validating GraphQL query against schema"
// "✅ Query validation passed"
```

### 🛡️ **6단계: 권한 검증**

```typescript
// src/graphql/builder.ts
const builder = new SchemaBuilder<{
  Context: Context;
  AuthScopes: {
    user: boolean;
    admin: boolean;
    programSponsor: { programId: string };
    // ... 기타 권한들
  };
}>({
  plugins: [ScopeAuthPlugin, ValidationPlugin],
  scopeAuth: {
    authScopes: async (context) => ({
      user: context.server.auth.isUser(context.request),
      admin: context.server.auth.isAdmin(context.request),
      programSponsor: async ({ programId }) => {
        return await context.server.auth.isProgramSponsor(context.request, programId);
      },
    }),
  },
});

// 로깅 출력:
// "🔐 Checking user authentication"
// "✅ User has 'user' scope"
// "❌ User does not have 'admin' scope"
// "🔍 Checking programSponsor scope for programId: 1"
```

### 🚀 **7단계: Resolver 실행**

```typescript
// src/graphql/v2/queries/programs.ts
builder.queryFields((t) => ({
  programV2: t.field({
    type: ProgramV2Type,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getProgramV2Resolver, // 실제 resolver 함수 호출
  }),
}));

// 로깅 출력:
// "🚀 Executing resolver: getProgramV2Resolver"
// "📥 Resolver arguments: { id: '1' }"
// "🔍 Resolver context: { db, auth, ... }"
```

### 🗄️ **8단계: 데이터베이스 쿼리 실행**

```typescript
// src/graphql/v2/resolvers/programs.ts
export async function getProgramV2Resolver(
  _root: unknown,
  args: { id: string },
  ctx: Context
) {
  const startTime = Date.now();

  ctx.server.log.info(`🚀 Starting programV2 query for id: ${args.id}`);

  try {
    // 로깅 출력:
    // "🗄️ Executing database query"
    // "📝 SQL Query: SELECT * FROM programs_v2 WHERE id = $1"
    // "📊 Query parameters: [1]"

    const [program] = await ctx.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, parseInt(args.id)));

    const duration = Date.now() - startTime;

    if (!program) {
      ctx.server.log.warn(`❌ Program not found with id: ${args.id}`);
      throw new Error('Program not found');
    }

    ctx.server.log.info(`✅ ProgramV2 query completed in ${duration}ms`);
    return program;

  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ ProgramV2 query failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}
```

### 🔍 **9단계: GraphQL 필드 해결**

```typescript
// src/graphql/v2/types/programs.ts
export const ProgramV2Type = ProgramV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description'),
    skills: t.exposeStringList('skills'),
    status: t.field({
      type: ProgramV2StatusEnum,
      resolve: (program) => program.status,
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (program) => program.createdAt,
    }),
    // ... 기타 필드들
  }),
});

// 로깅 출력:
// "🔍 Resolving field: id"
// "📤 Field value: '1'"
// "🔍 Resolving field: title"
// "📤 Field value: 'Web3 Development Program'"
// "🔍 Resolving field: skills"
// "📤 Field value: ['solidity', 'react', 'web3']"
// "🔍 Resolving field: status"
// "📤 Field value: 'open'"
```

### 📤 **10단계: 응답 생성 및 전송**

```typescript
// Mercurius가 최종 응답을 생성
// 로깅 출력:
// "📤 Generating GraphQL response"
// "✅ Response generated successfully"
// "📊 Response size: 1.2KB"

// HTTP 응답:
// {
//   "level": 30,
//   "time": 1703123456790,
//   "method": "POST",
//   "url": "/graphql",
//   "statusCode": 200,
//   "responseTime": 45.2
// }
```

---

## 실제 코드 예시

### 📁 **프로젝트 구조**

```
src/
├── graphql/
│   ├── builder.ts              # GraphQL 스키마 빌더 설정
│   ├── types/
│   │   └── programs.ts         # GraphQL 타입 정의
│   ├── queries/
│   │   └── programs.ts         # Query 정의
│   ├── mutations/
│   │   └── programs.ts         # Mutation 정의
│   └── resolvers/
│       └── programs.ts         # 실제 비즈니스 로직
├── db/
│   ├── schemas/
│   │   └── programs_v2.ts      # 데이터베이스 스키마
│   └── migrations/             # 데이터베이스 마이그레이션
└── config/
    └── server.ts               # Fastify 서버 설정
```

### 🔧 **GraphQL 타입 정의**

```typescript
// src/graphql/v2/types/programs.ts
import builder from '@/graphql/builder';
import { programsV2Table } from '@/db/schemas/v2/programsV2';

// Enum 타입 정의
export const ProgramV2StatusEnum = builder.enumType('ProgramStatusV2', {
  values: ['open', 'closed', 'draft', 'under_review'] as const,
});

// Object 타입 정의
export const ProgramV2Type = builder.objectRef<ProgramV2>('ProgramV2');

ProgramV2Type.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description'),
    skills: t.exposeStringList('skills'),
    status: t.field({
      type: ProgramV2StatusEnum,
      resolve: (program) => program.status,
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (program) => program.createdAt,
    }),
  }),
});
```

### 🔍 **Query 정의**

```typescript
// src/graphql/v2/queries/programs.ts
import builder from '@/graphql/builder';
import { getProgramV2Resolver } from '@/graphql/v2/resolvers/programs';
import { ProgramV2Type } from '../types/programs';

builder.queryFields((t) => ({
  programV2: t.field({
    type: ProgramV2Type,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getProgramV2Resolver,
  }),
}));
```

### 🚀 **Resolver 구현**

```typescript
// src/graphql/v2/resolvers/programs.ts
import { programsV2Table } from '@/db/schemas/v2/programsV2';
import { eq } from 'drizzle-orm';
import type { Context } from '@/types';

export async function getProgramV2Resolver(
  _root: unknown,
  args: { id: string },
  ctx: Context
) {
  const startTime = Date.now();

  ctx.server.log.info(`🚀 Starting programV2 query for id: ${args.id}`);

  try {
    const [program] = await ctx.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, parseInt(args.id)));

    const duration = Date.now() - startTime;

    if (!program) {
      ctx.server.log.warn(`❌ Program not found with id: ${args.id}`);
      throw new Error('Program not found');
    }

    ctx.server.log.info(`✅ ProgramV2 query completed in ${duration}ms`);
    return program;

  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ ProgramV2 query failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}
```

---

## 디버깅과 로깅

### 🔍 **로깅 레벨 설정**

```typescript
// src/config/server.ts
const server = Fastify({
  logger: {
    level: process.env.NODE_ENV === 'development' ? 'debug' : 'info',
    redact: ['req.headers.authorization'],
    serializers: {
      req(req) {
        return {
          method: req.method,
          url: req.url,
          headers: req.headers,
          hostname: req.hostname,
          remoteAddress: req.ip,
        };
      },
    },
  },
});
```

### 📊 **성능 모니터링**

```typescript
// Resolver에서 성능 측정
export async function getProgramV2Resolver(
  _root: unknown,
  args: { id: string },
  ctx: Context
) {
  const startTime = Date.now();

  try {
    // 실제 로직 실행
    const result = await someAsyncOperation();

    const duration = Date.now() - startTime;
    ctx.server.log.info(`✅ Query completed in ${duration}ms`);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    ctx.server.log.error(`❌ Query failed after ${duration}ms: ${error.message}`);
    throw error;
  }
}
```

### 🐛 **에러 처리**

```typescript
// GraphQL 에러 처리
export async function getProgramV2Resolver(
  _root: unknown,
  args: { id: string },
  ctx: Context
) {
  try {
    // ID 검증
    if (!args.id || isNaN(parseInt(args.id))) {
      throw new Error('Invalid program ID');
    }

    const program = await ctx.db
      .select()
      .from(programsV2Table)
      .where(eq(programsV2Table.id, parseInt(args.id)));

    if (!program) {
      throw new Error('Program not found');
    }

    return program;
  } catch (error) {
    // 에러 로깅
    ctx.server.log.error(`ProgramV2 query error: ${error.message}`);

    // GraphQL 에러로 변환
    throw new Error(`Failed to fetch program: ${error.message}`);
  }
}
```

---

## 공동개발 가이드

### 👥 **팀 역할 분담**

| 역할                  | 담당 영역       | 주요 작업                        |
| --------------------- | --------------- | -------------------------------- |
| **프론트엔드 개발자** | 클라이언트 코드 | GraphQL 쿼리 작성, UI 구현       |
| **백엔드 개발자**     | 서버 코드       | Resolver 구현, 데이터베이스 설계 |
| **풀스택 개발자**     | 전체 시스템     | GraphQL 스키마 설계, API 통합    |

### 📋 **개발 워크플로우**

#### 1. **스키마 우선 설계 (Schema-First)**

```graphql
# 먼저 GraphQL 스키마를 설계
type ProgramV2 {
  id: ID!
  title: String!
  description: String!
  skills: [String!]!
  status: ProgramStatusV2!
  createdAt: DateTime!
}

enum ProgramStatusV2 {
  OPEN
  CLOSED
  DRAFT
  UNDER_REVIEW
}

type Query {
  programV2(id: ID!): ProgramV2
  programsV2(pagination: PaginationInput): PaginatedProgramsV2
}
```

#### 2. **백엔드 구현**

```typescript
// 1. 데이터베이스 스키마 정의
// src/db/schemas/v2/programsV2.ts
export const programsV2Table = pgTable('programs_v2', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 256 }).notNull(),
  description: text('description').notNull(),
  skills: text('skills').array().notNull(),
  status: programStatusV2Enum('status').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// 2. GraphQL 타입 정의
// src/graphql/v2/types/programs.ts
export const ProgramV2Type = builder.objectRef<ProgramV2>('ProgramV2');

// 3. Resolver 구현
// src/graphql/v2/resolvers/programs.ts
export async function getProgramV2Resolver(/* ... */) {
  // 비즈니스 로직 구현
}
```

#### 3. **프론트엔드 구현**

```typescript
// 1. GraphQL 쿼리 정의
const GET_PROGRAM = gql`
  query programV2($id: ID!) {
    programV2(id: $id) {
      id
      title
      description
      skills
      status
    }
  }
`;

// 2. 컴포넌트에서 사용
function ProgramComponent({ programId }) {
  const { data, loading, error } = useQuery(GET_PROGRAM, {
    variables: { id: programId }
  });

  // UI 렌더링
}
```

### 🧪 **테스트 전략**

#### 1. **백엔드 테스트**

```typescript
// src/graphql/v2/tests/programs.test.ts
import { describe, it, expect } from 'vitest';
import { getProgramV2Resolver } from '../resolvers/programs';

describe('ProgramV2 Resolver', () => {
  it('should return program by id', async () => {
    const mockContext = {
      db: mockDb,
      server: { log: mockLogger },
    };

    const result = await getProgramV2Resolver(
      null,
      { id: '1' },
      mockContext
    );

    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });
});
```

#### 2. **프론트엔드 테스트**

```typescript
// components/__tests__/ProgramComponent.test.tsx
import { render, screen } from '@testing-library/react';
import { MockedProvider } from '@apollo/client/testing';
import { GET_PROGRAM } from '../queries';
import ProgramComponent from '../ProgramComponent';

const mocks = [
  {
    request: {
      query: GET_PROGRAM,
      variables: { id: '1' },
    },
    result: {
      data: {
        programV2: {
          id: '1',
          title: 'Test Program',
          description: 'Test Description',
          skills: ['react', 'typescript'],
          status: 'open',
        },
      },
    },
  },
];

test('renders program information', async () => {
  render(
    <MockedProvider mocks={mocks} addTypename={false}>
      <ProgramComponent programId="1" />
    </MockedProvider>
  );

  expect(await screen.findByText('Test Program')).toBeInTheDocument();
});
```

### 📚 **문서화 가이드**

#### 1. **GraphQL 스키마 문서화**

```typescript
// src/graphql/v2/types/programs.ts
export const ProgramV2Type = builder.objectRef<ProgramV2>('ProgramV2');

ProgramV2Type.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: '프로그램의 고유 식별자',
    }),
    title: t.exposeString('title', {
      description: '프로그램 제목',
    }),
    description: t.exposeString('description', {
      description: '프로그램 상세 설명',
    }),
    skills: t.exposeStringList('skills', {
      description: '프로그램에 필요한 기술 스택 목록',
    }),
    status: t.field({
      type: ProgramV2StatusEnum,
      description: '프로그램 현재 상태',
      resolve: (program) => program.status,
    }),
  }),
});
```

#### 2. **API 사용 예시**

````markdown
# ProgramV2 API 사용 가이드

## 단일 프로그램 조회

### GraphQL Query
```graphql
query programV2($id: ID!) {
  programV2(id: $id) {
    id
    title
    description
    skills
    status
    createdAt
  }
}
````

### Variables

```json
{
  "id": "1"
}
```

### Response

```json
{
  "data": {
    "programV2": {
      "id": "1",
      "title": "Web3 Development Program",
      "description": "A comprehensive program...",
      "skills": ["solidity", "react", "web3"],
      "status": "open",
      "createdAt": "2024-01-15T10:30:00Z"
    }
  }
}
```

````

### 🔧 **개발 도구**

#### 1. **GraphQL Playground**

```typescript
// src/config/server.ts
import mercurius from 'mercurius';

await server.register(mercurius, {
  schema: schema,
  resolvers: resolvers,
  graphiql: process.env.NODE_ENV === 'development', // 개발 환경에서만 활성화
});
````

#### 2. **스키마 생성**

```bash
# GraphQL 스키마 파일 생성
npm run build
# src/graphql/schema.graphql 파일이 생성됨
```

#### 3. **타입 생성**

```bash
# 프론트엔드용 TypeScript 타입 생성
npx graphql-codegen --config codegen.yml
```

---

## 🎯 요약

### ✅ **핵심 포인트**

1. **GraphQL은 단일 엔드포인트**로 모든 데이터 요청을 처리
2. **스키마 우선 설계**로 프론트엔드와 백엔드 간 명확한 계약
3. **타입 안전성**으로 런타임 에러 방지
4. **유연한 데이터 요청**으로 성능 최적화
5. **강력한 도구 생태계**로 개발 생산성 향상

### 🚀 **다음 단계**

1. **GraphQL Playground**에서 쿼리 테스트
2. **스키마 문서화** 업데이트
3. **테스트 코드** 작성
4. **성능 모니터링** 설정
5. **에러 처리** 개선

### 📞 **도움이 필요할 때**

- **GraphQL 공식 문서**: https://graphql.org/
- **Apollo Client 문서**: https://www.apollographql.com/docs/react/
- **Pothos 문서**: https://pothos-graphql.dev/
- **프로젝트 내 예시**: `samples/v2/` 디렉토리 참조

---

_이 문서는 GraphQL 초보자도 쉽게 이해하고 공동개발에 참여할 수 있도록 작성되었습니다. 추가 질문이나 개선 사항이 있으면 언제든 문의해주세요!_ 🎉
