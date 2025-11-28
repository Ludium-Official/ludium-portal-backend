# Frontend에서 V2 GraphQL Schema 사용하기

## 1. GraphQL Schema Introspection

현재 Backend는 이미 자동으로 GraphQL schema를 제공하고 있습니다:

```bash
# Development server 실행
npm run dev
```

GraphQL Playground 접속: `http://localhost:3000/graphql`

## 2. Frontend에서 Schema 생성

### Option 1: GraphQL Code Generator 사용 (추천)

```bash
# Frontend 프로젝트에서
npm install -D @graphql-codegen/cli @graphql-codegen/typescript @graphql-codegen/typescript-operations @graphql-codegen/typescript-react-apollo

# codegen.yml 설정
schema:
  - 'http://localhost:3000/graphql':
      headers:
        Authorization: 'Bearer YOUR_TOKEN' # 필요시

generates:
  ./src/generated/graphql.ts:
    plugins:
      - typescript
      - typescript-operations
      - typescript-react-apollo
    config:
      withHooks: true
      withComponent: false
```

```bash
# Schema 생성
npm run codegen
```

### Option 2: GraphQL Introspection 직접 사용

```typescript
// frontend/src/lib/graphql/client.ts
import { createClient } from '@urql/core';

export const graphqlClient = createClient({
  url: process.env.NEXT_PUBLIC_GRAPHQL_URL || 'http://localhost:3000/graphql',
});
```

## 3. V2 API 예제

### Auth 

```graphql
mutation loginV2(
  $email: String
  $walletAddress: String!
  $loginType: LoginTypeEnum!
) {
  loginV2(email: $email, walletAddress: $walletAddress, loginType: $loginType)
}

```

### Users V2

```graphql
# Query
query GetUsersV2 {
  usersV2(query: { page: 1, limit: 10 }) {
    users {
      id
      walletAddress
      email
      firstName
      lastName
    }
    totalCount
    currentPage
    totalPages
  }
}

# Mutation
mutation CreateUserV2($input: CreateUserV2Input!) {
  createUserV2(input: $input) {
    id
    walletAddress
    email
  }
}
```

### Programs V2

```graphql
# Query
query GetProgramsV2 {
  programsV2(pagination: { limit: 10, offset: 0 }) {
    data {
      id
      title
      description
      status
      visibility
    }
    count
  }
}

# Mutation
mutation CreateProgramV2($input: CreateProgramV2Input!) {
  createProgramV2(input: $input) {
    id
    title
    status
  }
}
```

### Applications V2

```graphql
mutation CreateApplicationV2($input: CreateApplicationV2Input!) {
  createApplicationV2(input: $input) {
    id
    status
    createdAt
  }
}
```

### Milestones V2

```graphql
mutation CreateMilestoneV2($input: CreateMilestoneV2Input!) {
  createMilestoneV2(input: $input) {
    id
    title
    description
    deadline
    payout
  }
}
```

## 4. Sample Files

Backend에 이미 sample files가 준비되어 있습니다:

- `samples/v2/user/*.graphql` - User V2 예제
- `samples/v2/program/*.graphql` - Program V2 예제

## 5. Next Steps

1. Frontend 프로젝트에서 GraphQL Code Generator 설정
2. Schema generation 실행
3. 생성된 타입과 hooks 사용
4. V1에서 V2로 migration 시작
