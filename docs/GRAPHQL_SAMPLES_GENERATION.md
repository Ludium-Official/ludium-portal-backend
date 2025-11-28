# GraphQL Samples 자동 생성 가이드

이 문서는 GraphQL query와 mutation 샘플 파일을 자동 생성하는 방법을 설명합니다.

## 🎯 목적

프론트엔드 개발자를 위해 모든 V2 GraphQL query와 mutation의 샘플 파일(.graphql, .json)을 자동으로 생성합니다.

## 📦 사용 방법

### 1. 스크립트 실행

```bash
npm run generate:samples
```

### 2. 생성되는 파일 위치

모든 샘플 파일은 `samples/v2/` 디렉토리 아래 도메인별로 생성됩니다:

```
samples/v2/
├── program/
│   ├── createprogramv2.graphql
│   ├── createprogramv2-variables.json
│   ├── createprogramwithonchainv2.graphql
│   ├── createprogramwithonchainv2-variables.json
│   └── ...
├── application/
│   ├── createapplicationv2.graphql
│   ├── createapplicationv2-variables.json
│   └── ...
├── user/
│   └── ...
└── ...
```

### 3. 생성되는 파일 종류

#### GraphQL Operation 파일 (.graphql)

각 query와 mutation에 대한 GraphQL operation 템플릿:

```graphql
mutation CreateProgramWithOnchainV2($input: CreateProgramWithOnchainV2Input!) {
  createProgramWithOnchainV2(input: $input) {
    program {
      id
      title
      description
      ...
    }
    onchain {
      id
      programId
      ...
    }
  }
}
```

#### Variables 파일 (.json)

각 mutation과 query의 입력 예제:

```json
{
  "input": {
    "program": {
      "title": "Example Program with Onchain Info",
      "description": "This program includes onchain information",
      ...
    },
    "onchain": {
      "smartContractId": 1,
      ...
    }
  }
}
```

## 🔧 스크립트 동작 방식

1. **GraphQL Schema Introspection**: GraphQL 스키마를 분석하여 모든 V2 query와 mutation을 추출합니다.

2. **도메인별 그룹화**: 
   - `program` - Program 관련 operations
   - `application` - Application 관련 operations
   - `user` - User 관련 operations
   - `milestone` - Milestone 관련 operations
   - `token` - Token 관련 operations
   - `network` - Network 관련 operations
   - `onchain` - Onchain 관련 operations
   - `smart-contract` - Smart Contract 관련 operations

3. **자동 필드 추출**: 반환 타입의 필드들을 자동으로 분석하여 포함합니다.

4. **예제 데이터 생성**: 입력 타입의 구조를 분석하여 적절한 예제 데이터를 생성합니다.

## 📋 프론트엔드 개발자를 위한 사용 가이드

### 1. 샘플 파일 참고

프론트엔드 개발자는 `samples/v2/` 디렉토리의 파일을 참고하여:

- 필요한 필드만 선택적으로 수정
- Variables를 실제 데이터로 교체
- GraphQL client에서 사용

### 2. GraphQL Playground에서 테스트

1. 서버 실행: `npm run dev`
2. GraphQL Playground 접속: `http://localhost:4000/graphql`
3. 샘플 파일 복사하여 테스트

### 3. GraphQL Code Generator 사용

프론트엔드 프로젝트에서 GraphQL Code Generator를 설정하여 TypeScript 타입과 hooks를 자동 생성할 수 있습니다.

자세한 내용은 [FRONTEND_INTEGRATION.md](./FRONTEND_INTEGRATION.md)를 참고하세요.

## 🔄 스크립트 업데이트

새로운 mutation이나 query를 추가한 후:

```bash
npm run generate:samples
```

실행하여 자동으로 샘플 파일을 생성하거나 업데이트할 수 있습니다.

## ⚠️ 주의사항

- 생성된 파일은 기본 템플릿입니다. 실제 사용 시 필요한 필드만 선택적으로 요청할 수 있습니다.
- Variables의 예제 값들은 참고용이며, 실제 환경에 맞게 수정해야 합니다.
- 생성된 파일을 수동으로 수정한 경우, 스크립트를 다시 실행하면 덮어씌워질 수 있습니다.

## 🎨 커스터마이징

스크립트를 수정하여 다음을 변경할 수 있습니다:

- 필드 선택 범위 조정
- 예제 데이터 패턴 변경
- 파일 이름 규칙 변경
- 도메인 분류 기준 변경

스크립트 위치: `scripts/generate-graphql-samples.ts`

