# GraphQL API Examples for Program V2

This document provides example GraphQL queries and mutations for managing `ProgramV2` entities. You can run these in a GraphQL playground (like GraphiQL or Apollo Sandbox) which is likely available at your GraphQL endpoint (e.g., `http://localhost:3000/graphiql`) when the server is running.

---

## 1. Create a Program

Creates a new program.

### Mutation

```graphql
mutation CreateProgram($input: CreateProgramV2Input!) {
  createProgramV2(input: $input) {
    id
    title
    description
    status
  }
}
```

### Variables

```json
{
  "input": {
    "title": "Test Program via API",
    "description": "This is a test program created via an API example.",
    "skills": ["graphql", "typescript"],
    "deadline": "2025-10-21T12:00:00.000Z",
    "visibility": "public",
    "network": "mainnet",
    "price": "2000",
    "currency": "USDC",
    "status": "open"
  }
}
```

> **Note:** The `deadline` should be a valid ISO 8601 date string in the future.

---

## 2. Get a Program

Fetches a program by its unique ID.

### Query

```graphql
query GetProgram($id: ID!) {
  programV2(id: $id) {
    id
    title
    description
  }
}
```

### Variables

```json
{
  "id": "YOUR_PROGRAM_ID"
}
```

---

## 3. Update a Program

Updates an existing program.

### Mutation

```graphql
mutation UpdateProgram($id: ID!, $input: UpdateProgramV2Input!) {
  updateProgramV2(id: $id, input: $input) {
    id
    title
    description
    status
  }
}
```

### Variables

```json
{
  "id": "YOUR_PROGRAM_ID",
  "input": {
    "title": "Updated Title via API",
    "description": "The description has been updated.",
    "status": "closed"
  }
}
```

---

## 4. Delete a Program

Deletes a program by its ID.

### Mutation

```graphql
mutation DeleteProgram($id: ID!) {
  deleteProgramV2(id: $id) {
    id
    title
  }
}
```

### Variables

```json
{
  "id": "YOUR_PROGRAM_ID"
}
```
