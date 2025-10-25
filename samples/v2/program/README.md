# GraphQL V2 Samples

This directory contains sample GraphQL queries, mutations, variables, and expected responses for the Programs V2 API.

## Files Overview

### Queries

- `program-query.graphql` - Get a single program by ID
- `programs-query.graphql` - Get paginated list of programs

### Mutations

- `create-program-mutation.graphql` - Create a new program
- `update-program-mutation.graphql` - Update an existing program
- `delete-program-mutation.graphql` - Delete a program

### Variables

- `program-query-variables.json` - Variables for single program query
- `programs-query-variables.json` - Variables for programs list query
- `create-program-variables.json` - Variables for create program mutation
- `update-program-variables.json` - Variables for update program mutation
- `delete-program-variables.json` - Variables for delete program mutation

### Responses

- `program-response.json` - Expected response for single program query
- `programs-response.json` - Expected response for programs list query
- `create-program-response.json` - Expected response for create program mutation
- `update-program-response.json` - Expected response for update program mutation
- `delete-program-response.json` - Expected response for delete program mutation

## Program V2 Schema

### Fields

- `id: ID!` - Unique identifier
- `title: String!` - Program title
- `description: String!` - Program description
- `skills: [String!]!` - Required skills array
- `deadline: DateTime!` - Program deadline
- `invitedMembers: [String!]` - Invited member emails (optional)
- `status: ProgramStatusV2!` - Program status (open, closed, draft, under_review)
- `visibility: ProgramVisibilityV2!` - Program visibility (public, private, unlisted)
- `network: String!` - Blockchain network
- `price: String!` - Program price
- `currency: String!` - Price currency
- `createdAt: DateTime!` - Creation timestamp
- `updatedAt: DateTime!` - Last update timestamp

### Enums

#### ProgramStatusV2

- `open` - Program is open for applications
- `closed` - Program is closed
- `draft` - Program is in draft state
- `under_review` - Program is under review

#### ProgramVisibilityV2

- `public` - Publicly visible
- `private` - Private to invited members only
- `unlisted` - Not listed but accessible via direct link

## Usage Examples

### Get Single Program

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "$(cat program-query.graphql)",
    "variables": "$(cat program-query-variables.json)"
  }'
```

### Get Programs List

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "$(cat programs-query.graphql)",
    "variables": "$(cat programs-query-variables.json)"
  }'
```

### Create Program

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "$(cat create-program-mutation.graphql)",
    "variables": "$(cat create-program-variables.json)"
  }'
```

## Differences from V1

The V2 API is simplified compared to V1:

- Removed complex relationships (applications, milestones, supporters)
- Focused on core program data
- Simplified field structure
- New status and visibility enums
- Streamlined input/output types
