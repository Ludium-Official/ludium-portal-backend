# User V2 GraphQL API Samples

이 디렉토리는 User V2 API를 테스트하기 위한 샘플 GraphQL 쿼리와 뮤테이션을 포함합니다.

## 📁 파일 구조

### Login (로그인)

**V1 API:**

- `login-mutation.graphql` - 로그인/회원가입 mutation (자동으로 계정 생성 또는 업데이트)
- `login-variables.json` - 입력 변수 예시
- `login-response.json` - 예상 응답 (JWT 토큰)

**V2 API (신규):**

- `loginv2-mutation.graphql` - V2 로그인/회원가입 mutation
- `loginv2-variables.json` - 입력 변수 예시
- `loginv2-response.json` - 예상 응답 (JWT 토큰 + role 포함)

### Create User (사용자 생성) - V2 API

- `create-user-mutation.graphql` - 사용자 생성 mutation
- `create-user-variables.json` - 입력 변수 예시
- `create-user-response.json` - 예상 응답

### Query Single User (단일 사용자 조회) - V2 API

- `user-query.graphql` - ID로 단일 사용자 조회
- `user-query-variables.json` - 입력 변수 예시
- `user-response.json` - 예상 응답

### Query Multiple Users (사용자 목록 조회) - V2 API

- `users-query.graphql` - 페이지네이션된 사용자 목록 조회
- `users-query-variables.json` - 입력 변수 예시
- `users-response.json` - 예상 응답

## 🚀 사용 방법

### 1. GraphQL Playground 또는 클라이언트 사용

서버를 실행한 후 `http://localhost:4000/graphql`로 접속합니다.

```bash
npm run dev
```

### 2. Login 테스트 (추천 ⭐)

**⭐ V2 API를 사용하는 것을 추천합니다!**

Login mutation은 다음과 같이 동작합니다:

- 사용자가 **없으면 자동으로 생성**
- 사용자가 **있으면 정보 업데이트**
- **JWT 토큰 반환** (이후 인증에 사용)

#### **V2 API (최신 - 추천)**

**Mutation:**

```graphql
mutation loginV2(
  $email: String
  $walletAddress: String!
  $loginType: LoginTypeEnum!
) {
  loginV2(email: $email, walletAddress: $walletAddress, loginType: $loginType)
}
```

**Variables:**

```json
{
  "email": "developer@example.com",
  "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
  "loginType": "wallet"
}
```

**Response:**

```json
{
  "data": {
    "loginV2": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJwYXlsb2FkIjp7ImlkIjoxLCJlbWFpbCI6ImRldmVsb3BlckBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIn0sImlhdCI6MTcyOTY3NDAwMCwiZXhwIjoxNzMwMjc4ODAwfQ.xxx"
  }
}
```

**V2의 장점:**

- ✅ JWT payload에 **role(역할) 정보 포함**
- ✅ `users_v2` 테이블 사용 (확장된 필드)
- ✅ Enum 타입으로 타입 안전성 향상

#### **V1 API (레거시)**

```graphql
mutation login($email: String, $walletAddress: String!, $loginType: String!) {
  login(email: $email, walletAddress: $walletAddress, loginType: $loginType)
}
```

응답은 **JWT 토큰 문자열**입니다. 이 토큰을 다음과 같이 사용합니다:

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 3. Create User 테스트 (V2 API)

**Mutation:**

```graphql
mutation createUserV2($input: CreateUserV2Input!) {
  createUserV2(input: $input) {
    id
    role
    loginType
    walletAddress
    email
    firstName
    lastName
    organizationName
    profileImage
    bio
    skills
    links
    createdAt
    updatedAt
  }
}
```

**Variables:**

```json
{
  "input": {
    "loginType": "wallet",
    "walletAddress": "0x1234567890abcdef1234567890abcdef12345678",
    "email": "developer@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "organizationName": "Web3 Builders",
    "profileImage": "https://example.com/profile/john-doe.jpg",
    "bio": "Full-stack Web3 developer with 5 years of experience",
    "skills": ["solidity", "react", "typescript", "web3", "ethereum"],
    "links": ["https://github.com/johndoe", "https://twitter.com/johndoe"]
  }
}
```

### 4. Query User by ID 테스트 (V2 API)

**Query:**

```graphql
query userV2($id: ID!) {
  userV2(id: $id) {
    id
    role
    loginType
    walletAddress
    email
    firstName
    lastName
    organizationName
    profileImage
    bio
    skills
    links
    createdAt
    updatedAt
  }
}
```

**Variables:**

```json
{
  "id": "1"
}
```

### 5. Query Users with Pagination 테스트 (V2 API)

**Query:**

```graphql
query usersV2($query: UsersV2QueryInput) {
  usersV2(query: $query) {
    users {
      id
      role
      loginType
      walletAddress
      email
      firstName
      lastName
      organizationName
      skills
      createdAt
      updatedAt
    }
    totalCount
    totalPages
    currentPage
    hasNextPage
    hasPreviousPage
  }
}
```

**Variables (기본 페이지네이션):**

```json
{
  "query": {
    "page": 1,
    "limit": 10,
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

**Variables (검색 포함):**

```json
{
  "query": {
    "page": 1,
    "limit": 10,
    "search": "John",
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

**Variables (필터링 포함):**

```json
{
  "query": {
    "page": 1,
    "limit": 10,
    "role": "user",
    "loginType": "wallet",
    "sortBy": "createdAt",
    "sortOrder": "desc"
  }
}
```

## 📝 필드 설명

### CreateUserV2Input

| 필드               | 타입            | 필수 | 설명                                    |
| ------------------ | --------------- | ---- | --------------------------------------- |
| `loginType`        | `LoginTypeEnum` | ✅   | 로그인 타입 (google, wallet, farcaster) |
| `walletAddress`    | `String`        | ✅   | 사용자 지갑 주소                        |
| `email`            | `String`        | ❌   | 이메일 주소                             |
| `role`             | `UserRoleEnum`  | ❌   | 역할 (user, admin) - 기본값: user       |
| `firstName`        | `String`        | ❌   | 이름                                    |
| `lastName`         | `String`        | ❌   | 성                                      |
| `organizationName` | `String`        | ❌   | 소속 조직                               |
| `profileImage`     | `String`        | ❌   | 프로필 이미지 URL                       |
| `bio`              | `String`        | ❌   | 자기소개                                |
| `skills`           | `[String]`      | ❌   | 기술 스택 배열                          |
| `links`            | `[String]`      | ❌   | 외부 링크 배열                          |

### UsersV2QueryInput

| 필드        | 타입            | 필수 | 설명                                                        |
| ----------- | --------------- | ---- | ----------------------------------------------------------- |
| `page`      | `Int`           | ❌   | 페이지 번호 (기본값: 1)                                     |
| `limit`     | `Int`           | ❌   | 페이지당 항목 수 (기본값: 10)                               |
| `sortBy`    | `String`        | ❌   | 정렬 기준 (createdAt, updatedAt, firstName, lastName)       |
| `sortOrder` | `String`        | ❌   | 정렬 순서 (asc, desc)                                       |
| `search`    | `String`        | ❌   | 검색어 (walletAddress, email, firstName, lastName에서 검색) |
| `role`      | `UserRoleEnum`  | ❌   | 역할로 필터링                                               |
| `loginType` | `LoginTypeEnum` | ❌   | 로그인 타입으로 필터링                                      |
| `hasEmail`  | `Boolean`       | ❌   | 이메일 유무로 필터링                                        |

## 💡 팁

1. **검색 기능**: `search` 필드를 사용하면 여러 필드를 동시에 검색합니다 (walletAddress, email, firstName, lastName)

2. **필터 조합**: 여러 필터를 동시에 사용할 수 있습니다:

   ```json
   {
     "query": {
       "search": "developer",
       "role": "user",
       "loginType": "wallet",
       "hasEmail": true
     }
   }
   ```

3. **페이지네이션**: `hasNextPage`와 `hasPreviousPage`를 확인하여 다음/이전 페이지 존재 여부를 알 수 있습니다.

4. **필수 필드만 사용**: 사용자 생성 시 `loginType`과 `walletAddress`만 필수입니다:
   ```json
   {
     "input": {
       "loginType": "wallet",
       "walletAddress": "0x1234567890abcdef1234567890abcdef12345678"
     }
   }
   ```

## 🔗 관련 문서

- [GraphQL Workflow Guide](../../../docs/graphql-workflow.md)
- [Programs V2 Samples](../program/)
- [Architecture Overview](../../../docs/architecture-overview.md)
