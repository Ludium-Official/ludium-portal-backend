# GraphQL V2 Application Samples

This directory contains sample GraphQL queries, mutations, variables, and expected responses for the Applications V2 API.

## Files Overview

### Queries

- `application-query.graphql` - Get a single application by ID
- `my-applications-query.graphql` - Get all applications submitted by the current user (requires auth)
- `applications-by-program-query.graphql` - Get all applications for a specific program (only by program creator, requires auth)

### Mutations

- `create-application-mutation.graphql` - Create a new application for a program (requires auth)
- `update-application-mutation.graphql` - Update application content (only by applicant, requires auth)
- `review-application-accept-mutation.graphql` - Accept an application (only by program creator, requires auth)
- `review-application-reject-mutation.graphql` - Reject an application (only by program creator, requires auth)
- `pick-application-mutation.graphql` - Mark application as picked/unpicked (bookmark, only by program creator, requires auth)
- `delete-application-mutation.graphql` - Delete an application (only by applicant, requires auth)

### Variables

- `application-variables.json` - Variables for single application query
- `my-applications-variables.json` - Variables for my applications query
- `applications-by-program-variables.json` - Variables for applications by program query
- `create-application-variables.json` - Variables for create application mutation
- `update-application-variables.json` - Variables for update application mutation
- `review-application-accept-variables.json` - Variables for accept application mutation
- `review-application-reject-variables.json` - Variables for reject application mutation
- `pick-application-variables.json` - Variables for pick application mutation
- `delete-application-variables.json` - Variables for delete application mutation

### Responses

- `application-response.json` - Expected response for single application query
- `my-applications-response.json` - Expected response for my applications query
- `applications-by-program-response.json` - Expected response for applications by program query
- `create-application-response.json` - Expected response for create application mutation
- `update-application-response.json` - Expected response for update application mutation
- `review-application-accept-response.json` - Expected response for accept application mutation
- `review-application-reject-response.json` - Expected response for reject application mutation
- `pick-application-response.json` - Expected response for pick application mutation
- `delete-application-response.json` - Expected response for delete application mutation

## Application V2 Schema

### Fields

- `id: ID!` - Unique identifier
- `programId: ID!` - ID of the program this application is for
- `applicantId: ID!` - ID of the user who submitted this application
- `status: ApplicationStatusV2!` - Application status (applied, accepted, rejected, deleted)
- `content: String!` - Content of the application submitted by the applicant
- `rejectedReason: String` - Reason for rejection if the application was rejected
- `picked: Boolean!` - Whether this application has been picked (bookmark)
- `createdAt: DateTime!` - Creation timestamp
- `updatedAt: DateTime!` - Last update timestamp
- `program: ProgramV2!` - Related program (relation field)
- `applicant: UserV2!` - Related applicant user (relation field)

### Enums

#### ApplicationStatusV2

- `applied` - Application submitted
- `accepted` - Application accepted by program creator
- `rejected` - Application rejected by program creator
- `deleted` - Application deleted by applicant

## Permissions & Authorization

### Applicant Actions (who submitted the application)

- ✅ Create: Anyone authenticated can create an application for a program
- ✅ Update: Only the applicant can update their own application content
- ✅ Delete: Only the applicant can delete their own application

### Program Creator Actions

- ✅ Review: Program creator can accept or reject applications for their programs
- ✅ Pick: Program creator can mark applications as picked (bookmark favorite)
- ✅ View: Program creator can view all applications for their programs

### Public Actions

- ✅ View Single Application: Anyone can view a single application by ID (public)

## Usage Examples

### Get Single Application (Public)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{
    "query": "$(cat application-query.graphql)",
    "variables": "$(cat application-variables.json)"
  }'
```

### Get My Applications (Authenticated)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat my-applications-query.graphql)",
    "variables": "$(cat my-applications-variables.json)"
  }'
```

### Get Applications by Program (Program Creator Only)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat applications-by-program-query.graphql)",
    "variables": "$(cat applications-by-program-variables.json)"
  }'
```

### Create Application (Authenticated)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat create-application-mutation.graphql)",
    "variables": "$(cat create-application-variables.json)"
  }'
```

### Update Application (Applicant Only)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat update-application-mutation.graphql)",
    "variables": "$(cat update-application-variables.json)"
  }'
```

### Review Application - Accept (Program Creator Only)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat review-application-accept-mutation.graphql)",
    "variables": "$(cat review-application-accept-variables.json)"
  }'
```

### Review Application - Reject (Program Creator Only)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat review-application-reject-mutation.graphql)",
    "variables": "$(cat review-application-reject-variables.json)"
  }'
```

### Pick Application (Program Creator Only)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat pick-application-mutation.graphql)",
    "variables": "$(cat pick-application-variables.json)"
  }'
```

### Delete Application (Applicant Only)

```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "$(cat delete-application-mutation.graphql)",
    "variables": "$(cat delete-application-variables.json)"
  }'
```

## Differences from V1

The V2 API provides:

- ✅ Simplified permission model with clear separation of applicant and program creator actions
- ✅ Separate mutations for review (accept/reject) and pick (bookmark) operations
- ✅ Enhanced security: applicants can only modify their own applications, creators can only manage their programs
- ✅ Better field naming: consistent use of camelCase
- ✅ Paginated queries with standardized pagination response format
- ✅ Clear error messages and validation

## Workflow

### Typical Application Flow

1. **Apply**: Applicant creates an application for a program
   ```graphql
   mutation CreateApplicationV2($input: CreateApplicationV2Input!)
   ```

2. **Review**: Program creator reviews and decides (accept/reject)
   ```graphql
   mutation ReviewApplicationV2($id: ID!, $input: ReviewApplicationV2Input!)
   ```

3. **Pick** (Optional): Program creator bookmarks interesting applications
   ```graphql
   mutation PickApplicationV2($id: ID!, $input: PickApplicationV2Input!)
   ```

4. **Update** (Optional): Applicant can update their application content before review
   ```graphql
   mutation UpdateApplicationV2($id: ID!, $input: UpdateApplicationV2Input!)
   ```

5. **Delete** (Optional): Applicant can delete their application
   ```graphql
   mutation DeleteApplicationV2($id: ID!)
   ```

## Notes

- All authenticated operations require a valid JWT token in the Authorization header
- Applicant ID is automatically set from the authenticated user's ID (not provided in input)
- Applications are automatically set to `applied` status on creation
- Only program creators can view all applications for their programs
- Pagination is supported for list queries (default: page es 1, limit 10)

