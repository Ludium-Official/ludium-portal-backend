# Cursor AI Agent for Ludium Backend

## 🎯 Project Overview

This is the official backend API for the Ludium Portal, a global platform for Web3 builders. The project provides a robust, scalable, and secure GraphQL API to support our frontend application and open-source contributors.

**Key Context:**

- Monolithic API architecture (not microservices)
- Primary interface: GraphQL API at `/graphql` endpoint
- REST endpoints only for specific cases (webhooks, health checks)
- Transitioning to open-source model - clarity and documentation are paramount

## 🏗️ Architecture & Technology Stack

### Core Technologies:

- **Language:** TypeScript with strict typing
- **Framework:** Fastify (high-performance Node.js framework)
- **Database:** PostgreSQL with Drizzle ORM
- **GraphQL:** Mercurius (Fastify plugin) + Pothos (code-first schema builder)
- **Authentication:** JWT-based with Argon2 password hashing
- **Containerization:** Docker and Docker Compose

### Data Flow:

1. GraphQL requests → `/graphql` endpoint
2. Fastify server processes through plugins (auth, file uploads)
3. GraphQL resolvers handle business logic
4. Drizzle ORM interacts with PostgreSQL

## 📁 Key Directories & Workflow

### Database Changes (First Step):

- **`src/db/schemas/`** - Drizzle ORM schema definitions
- **`src/db/migrations/`** - Auto-generated SQL migrations (DO NOT EDIT)

### API Changes (First Step):

- **`src/graphql/types/`** - Pothos schema definitions (GraphQL types, queries, mutations)
- **`src/graphql/resolvers/`** - Business logic implementation
- **`src/graphql/schema.graphql`** - Auto-generated (DO NOT EDIT)

### Other Important Directories:

- **`src/plugins/`** - Core Fastify plugins (auth, database connection)
- **`src/utils/`** - Utility functions for complex business logic

## 🔧 Coding Standards & Conventions

### TypeScript/General:

- **Formatting:** Use Biome (`npm run check` before committing)
- **Naming Conventions:**
  - Interfaces, Types, Classes: `PascalCase`
  - Files: `kebab-case`
  - Constants: `UPPER_SNAKE_CASE`
  - Enums: `PascalCase` for enum, `UPPER_SNAKE_CASE` for members
  - Variables, Functions: `camelCase`
- **Imports:** ALWAYS use absolute path aliases (`@/db/schemas`) - NEVER relative paths
- **Comments:** Explain "why" (business logic) not just "what"

### Database (Drizzle ORM):

- **Schema Files:** Each table gets its own file in `src/db/schemas/`
- **Table Naming:** `camelCase` + `Table` (e.g., `usersTable`, `programsTable`)
- **Migrations:** NEVER modify schema directly - update schema files, then run `npm run db:gen`

### GraphQL:

- **Schema Builder:** Use Pothos for code-first, type-safe approach
- **Naming:** Follow GraphQL conventions (camelCase for fields, PascalCase for types)
- **Error Handling:** Include proper error handling in resolvers
- **Documentation:** Add JSDoc comments for complex resolvers

## 🚀 Common Development Tasks

### Adding a New GraphQL Query/Mutation (Example: `programs_v2`)

This project follows a **domain-centric structure** where API definitions (`types`) are separated from their business logic (`resolvers`).

1.  **Define the API Specification (`/graphql/types/`)**

    - Open the relevant file, e.g., `src/graphql/types/programs-v2.ts`.
    - **Define Object Types:** Create the GraphQL object shape using `builder.objectRef`, e.g., `ProgramV2Type`. This defines what the client can query.
    - **Define Input Types:** If your mutation needs arguments, define them using `builder.inputType`, e.g., `CreateProgramV2Input`.
    - **Add Queries/Mutations:** In the _same file_, use `builder.queryFields` or `builder.mutationFields` to expose the new API endpoint.
    - **Connect to Resolver:** In the field definition, use the `resolve` property to link to the resolver function that will contain the business logic (e.g., `resolve: getProgramV2Resolver`).

2.  **Implement the Business Logic (`/graphql/resolvers/`)**

    - Open the corresponding resolver file, e.g., `src/graphql/resolvers/programs-v2.ts`.
    - Create an `async` function with the exact name you used in the `resolve` property (e.g., `export async function getProgramV2Resolver(...)`).
    - Inside this function, implement the actual logic: database queries (with Drizzle), data transformation, permission checks, etc.

3.  **Important Notes:**
    - **`src/graphql/builder.ts` is for global setup only.** Do NOT add domain-specific queries or mutations there.
    - This separation ensures that `types` files describe **what** the API looks like, and `resolvers` files describe **how** it works.

### Modifying Database Schema:

1. **Update Schema:** Modify appropriate file in `src/db/schemas/`
2. **Generate Migration:** Run `npm run db:gen`
3. **Review:** Check generated `.sql` file in `src/db/migrations/`

### Code Refactoring:

- Extract complex business logic from resolvers to `src/utils/`
- Maintain separation of concerns (resolvers = API, utils = business logic)
- Ensure strong typing and clear naming

## 🚨 Critical Constraints & Non-Negotiables

### NEVER Access These Files:

- `.env*` files
- `.gcp.json`
- `docker-compose.yml`
- `*.sql` files in migrations
- `src/graphql/schema.graphql`

### Dependencies:

- Do NOT add third-party libraries without explicit instruction
- Keep dependency tree lean and secure

### Code Quality:

- All code MUST pass Biome checks (`npm run check`)
- Do NOT manually edit auto-generated files
- Use absolute imports exclusively

## 📋 Development Checklist

### Before Making Changes:

- [ ] Understand the monolithic architecture
- [ ] Identify correct directory for changes (types vs resolvers vs schemas)
- [ ] Check existing patterns in similar files
- [ ] Plan for proper error handling

### Database Changes:

- [ ] Update schema file in `src/db/schemas/`
- [ ] Run `npm run db:gen` for migration
- [ ] Review generated migration file
- [ ] Test database operations

### GraphQL Changes:

- [ ] Define types in `src/graphql/types/`
- [ ] Implement resolvers in `src/graphql/resolvers/`
- [ ] Add proper error handling
- [ ] Include JSDoc documentation
- [ ] Test with GraphQL playground

### Code Quality:

- [ ] Use absolute imports (`@/` prefix)
- [ ] Follow naming conventions
- [ ] Add meaningful comments
- [ ] Run `npm run check` before committing
- [ ] Extract complex logic to utils when appropriate

## 🎨 Best Practices

### Error Handling:

```typescript
try {
  const result = await ctx.db.select()...;
  ctx.server.log.info({ msg: "Operation completed", result });
} catch (error) {
  ctx.server.log.error({
    msg: "Database operation failed",
    error: error.message,
    operation: "operation_name"
  });
  throw new Error("User-friendly error message");
}
```

### Logging:

- Use Fastify logger (`ctx.server.log`) instead of `console.log`
- Include structured logging with metadata
- Use appropriate log levels (info, warn, error, debug)

### GraphQL Resolvers:

- Keep resolvers focused on API concerns
- Extract business logic to utility functions
- Include proper TypeScript types
- Handle errors gracefully

## 🔍 Performance Considerations

- Use transactions for multi-step database operations
- Consider timeout scenarios for long-running queries
- Include query execution time logging
- Monitor database connection pool status
- Track response times and error ratesw

Remember: This is an open-source project transitioning to community contributions. Code clarity, documentation, and adherence to standards are paramount for all work.
