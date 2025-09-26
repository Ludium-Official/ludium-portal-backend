# Ludium Backend Architecture Overview

## System Overview

The Ludium Backend is a modern GraphQL API built with TypeScript, Fastify, and PostgreSQL. It serves as the backend for the Ludium platform, which manages educational programs, applications, milestones, and investment workflows in a decentralized learning ecosystem.

### Key Features
- **GraphQL API** with real-time subscriptions
- **Role-based access control** with granular permissions
- **Investment and funding management** for educational programs
- **Milestone tracking** and validation system
- **File storage** integration with Google Cloud Storage
- **JWT-based authentication** with Argon2 password hashing

## Technology Stack

```mermaid
graph TB
    subgraph "Runtime & Framework"
        A[Node.js 22] --> B[Fastify 5.x]
        B --> C[TypeScript 5.x]
    end
    
    subgraph "GraphQL Layer"
        D[Mercurius] --> E[Pothos Schema Builder]
        E --> F[GraphQL Subscriptions]
    end
    
    subgraph "Database Layer"
        G[PostgreSQL 16] --> H[Drizzle ORM]
        H --> I[Drizzle Kit Migrations]
    end
    
    subgraph "External Services"
        J[Google Cloud Storage]
        K[JWT Authentication]
        L[Argon2 Hashing]
    end
    
    subgraph "Development Tools"
        M[Biome Linter/Formatter]
        N[Docker & Docker Compose]
        O[TSX Development Server]
    end
```

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web Frontend]
        MOBILE[Mobile App]
        API_CLIENT[API Clients]
    end
    
    subgraph "API Gateway Layer"
        FASTIFY[Fastify Server]
        CORS[CORS Plugin]
        HELMET[Security Headers]
    end
    
    subgraph "GraphQL Layer"
        MERCURIUS[Mercurius GraphQL]
        SCHEMA[Pothos Schema Builder]
        RESOLVERS[GraphQL Resolvers]
        SUBSCRIPTIONS[Real-time Subscriptions]
    end
    
    subgraph "Business Logic Layer"
        AUTH[Authentication Service]
        RBAC[Role-Based Access Control]
        PROGRAM_LOGIC[Program Management]
        INVESTMENT_LOGIC[Investment Logic]
        MILESTONE_LOGIC[Milestone Tracking]
    end
    
    subgraph "Data Access Layer"
        DRIZZLE[Drizzle ORM]
        DB_UTILS[Database Utilities]
        MIGRATIONS[Database Migrations]
    end
    
    subgraph "External Services"
        GCS[Google Cloud Storage]
        POSTGRES[(PostgreSQL Database)]
    end
    
    WEB --> FASTIFY
    MOBILE --> FASTIFY
    API_CLIENT --> FASTIFY
    
    FASTIFY --> MERCURIUS
    MERCURIUS --> SCHEMA
    SCHEMA --> RESOLVERS
    RESOLVERS --> AUTH
    RESOLVERS --> RBAC
    RESOLVERS --> PROGRAM_LOGIC
    RESOLVERS --> INVESTMENT_LOGIC
    RESOLVERS --> MILESTONE_LOGIC
    
    AUTH --> DRIZZLE
    RBAC --> DRIZZLE
    PROGRAM_LOGIC --> DRIZZLE
    INVESTMENT_LOGIC --> DRIZZLE
    MILESTONE_LOGIC --> DRIZZLE
    
    DRIZZLE --> POSTGRES
    RESOLVERS --> GCS
```

## Application Layers

### 1. Presentation Layer (GraphQL)
- **Location**: `src/graphql/`
- **Responsibility**: API contract definition and request handling
- **Components**:
  - Schema definitions (`types/`)
  - Resolvers (`resolvers/`)
  - Builder configuration

### 2. Business Logic Layer
- **Location**: `src/utils/`, `src/services/`
- **Responsibility**: Core business rules and domain logic
- **Components**:
  - Authentication logic
  - Authorization checks
  - Program management
  - Investment calculations
  - Milestone validation

### 3. Data Access Layer
- **Location**: `src/db/`
- **Responsibility**: Database operations and data modeling
- **Components**:
  - Schema definitions
  - Migrations
  - Seed data
  - Database utilities

### 4. Infrastructure Layer
- **Location**: `src/plugins/`, `src/config/`
- **Responsibility**: External integrations and system configuration
- **Components**:
  - Database connection
  - File storage
  - Authentication plugins
  - Environment configuration

## Database Architecture

```mermaid
erDiagram
    USERS {
        uuid id PK
        string first_name
        string last_name
        string email UK
        string wallet_address UK
        string organization_name
        string image
        text about
        string summary
        jsonb links
        string login_type
        enum role
        boolean banned
        timestamp banned_at
        text banned_reason
        timestamp created_at
        timestamp updated_at
    }
    
    PROGRAMS {
        uuid id PK
        uuid creator_id FK
        string name
        text description
        text summary
        jsonb metadata
        string total_budget
        enum type
        enum visibility
        enum status
        timestamp starts_at
        timestamp ends_at
        timestamp created_at
        timestamp updated_at
    }
    
    APPLICATIONS {
        uuid id PK
        uuid program_id FK
        uuid applicant_id FK
        enum status
        string name
        text content
        string summary
        jsonb metadata
        string price
        text rejection_reason
        string funding_target
        string wallet_address
        boolean funding_successful
        integer on_chain_project_id
        timestamp created_at
        timestamp updated_at
    }
    
    MILESTONES {
        uuid id PK
        uuid application_id FK
        string name
        text description
        string percentage
        enum status
        text rejection_reason
        timestamp due_date
        timestamp submitted_at
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }
    
    INVESTMENTS {
        uuid id PK
        uuid application_id FK
        uuid investor_id FK
        string amount
        enum status
        string tx_hash
        timestamp invested_at
        timestamp created_at
        timestamp updated_at
    }
    
    PROGRAM_USER_ROLES {
        uuid id PK
        uuid program_id FK
        uuid user_id FK
        enum role_type
        string max_investment_amount
        enum investment_tier
        timestamp created_at
        timestamp updated_at
    }
    
    COMMENTS {
        uuid id PK
        uuid author_id FK
        uuid parent_id FK
        string commentable_id
        string commentable_type
        text content
        timestamp created_at
    }
    
    POSTS {
        uuid id PK
        uuid author_id FK
        string title
        text content
        string summary
        jsonb metadata
        boolean published
        timestamp published_at
        timestamp created_at
        timestamp updated_at
    }
    
    USERS ||--o{ PROGRAMS : creates
    USERS ||--o{ APPLICATIONS : applies
    USERS ||--o{ INVESTMENTS : invests
    USERS ||--o{ COMMENTS : authors
    USERS ||--o{ POSTS : authors
    USERS ||--o{ PROGRAM_USER_ROLES : has_role
    
    PROGRAMS ||--o{ APPLICATIONS : accepts
    PROGRAMS ||--o{ PROGRAM_USER_ROLES : defines_roles
    
    APPLICATIONS ||--o{ MILESTONES : contains
    APPLICATIONS ||--o{ INVESTMENTS : receives
    
    COMMENTS ||--o{ COMMENTS : replies_to
```

## Authentication & Authorization

```mermaid
graph TB
    subgraph "Authentication Flow"
        LOGIN[User Login] --> VERIFY[Verify Credentials]
        VERIFY --> HASH[Argon2 Hash Check]
        HASH --> JWT[Generate JWT Token]
        JWT --> RESPONSE[Return Token]
    end
    
    subgraph "Authorization Layers"
        REQUEST[Incoming Request] --> AUTH_HOOK[Auth Hook]
        AUTH_HOOK --> TOKEN_VERIFY[JWT Verification]
        TOKEN_VERIFY --> USER_CONTEXT[Set User Context]
        USER_CONTEXT --> SCOPE_CHECK[Scope Authorization]
    end
    
    subgraph "Role System"
        ADMIN[Admin Role]
        SPONSOR[Sponsor Role]
        VALIDATOR[Validator Role]
        BUILDER[Builder Role]
        USER[User Role]
        
        ADMIN --> GLOBAL_ACCESS[Global System Access]
        SPONSOR --> PROGRAM_CREATE[Create Programs]
        VALIDATOR --> MILESTONE_VALIDATE[Validate Milestones]
        BUILDER --> PROGRAM_APPLY[Apply to Programs]
        USER --> BASIC_ACCESS[Basic Platform Access]
    end
    
    subgraph "Scope-Based Permissions"
        PROGRAM_SCOPE[Program Scope]
        APPLICATION_SCOPE[Application Scope]
        MILESTONE_SCOPE[Milestone Scope]
        
        PROGRAM_SCOPE --> PROGRAM_CREATOR[Program Creator]
        PROGRAM_SCOPE --> PROGRAM_VALIDATOR[Program Validator]
        PROGRAM_SCOPE --> PROGRAM_PARTICIPANT[Program Participant]
        
        APPLICATION_SCOPE --> APPLICATION_BUILDER[Application Builder]
        
        MILESTONE_SCOPE --> MILESTONE_BUILDER[Milestone Builder]
    end
```

### User Roles & Permissions

| Role | Global Permissions | Scoped Permissions |
|------|-------------------|-------------------|
| **Admin** | Full system access, user management | All program/application operations |
| **Sponsor** | Create programs, manage own programs | Program creator permissions |
| **Validator** | Validate programs and milestones | Program validator permissions |
| **Builder** | Apply to programs, submit milestones | Application builder permissions |
| **User** | Basic platform access | Read-only access to public content |

## GraphQL Schema Architecture

```mermaid
graph TB
    subgraph "Schema Building"
        BUILDER[Pothos Schema Builder] --> PLUGINS[Builder Plugins]
        PLUGINS --> SCOPE_AUTH[Scope Auth Plugin]
        PLUGINS --> VALIDATION[Validation Plugin]
        PLUGINS --> SUBSCRIPTIONS[Smart Subscriptions Plugin]
    end
    
    subgraph "Type System"
        SCALARS[Custom Scalars]
        ENUMS[Enums]
        OBJECTS[Object Types]
        INPUTS[Input Types]
        UNIONS[Union Types]
        
        SCALARS --> DATETIME[DateTime]
        SCALARS --> JSON[JSON]
        SCALARS --> UPLOAD[Upload]
        
        OBJECTS --> USER[User Type]
        OBJECTS --> PROGRAM[Program Type]
        OBJECTS --> APPLICATION[Application Type]
        OBJECTS --> MILESTONE[Milestone Type]
        OBJECTS --> INVESTMENT[Investment Type]
    end
    
    subgraph "Operations"
        QUERIES[Query Operations]
        MUTATIONS[Mutation Operations]
        SUBSCRIPTIONS_OPS[Subscription Operations]
        
        QUERIES --> USER_QUERIES[User Queries]
        QUERIES --> PROGRAM_QUERIES[Program Queries]
        QUERIES --> APPLICATION_QUERIES[Application Queries]
        
        MUTATIONS --> USER_MUTATIONS[User Mutations]
        MUTATIONS --> PROGRAM_MUTATIONS[Program Mutations]
        MUTATIONS --> APPLICATION_MUTATIONS[Application Mutations]
        
        SUBSCRIPTIONS_OPS --> NOTIFICATIONS[Notification Subscriptions]
    end
    
    subgraph "Resolvers"
        FIELD_RESOLVERS[Field Resolvers]
        ROOT_RESOLVERS[Root Resolvers]
        
        FIELD_RESOLVERS --> RELATIONSHIP_LOADING[Relationship Loading]
        ROOT_RESOLVERS --> DATA_FETCHING[Data Fetching Logic]
    end
```

## Plugin System

```mermaid
graph LR
    subgraph "Core Plugins"
        ENV[Environment Plugin]
        JWT[JWT Plugin]
        CORS[CORS Plugin]
        DB[Database Plugin]
    end
    
    subgraph "Custom Plugins"
        AUTH[Auth Plugin]
        ARGON2[Argon2 Plugin]
        FILE_MANAGER[File Manager Plugin]
        PUBSUB[PubSub Plugin]
        GQL_UPLOAD[GraphQL Upload Plugin]
    end
    
    subgraph "GraphQL Integration"
        MERCURIUS[Mercurius Plugin]
        SCHEMA_INTEGRATION[Schema Integration]
        CONTEXT[Context Building]
        SUBSCRIPTIONS[Subscription Support]
    end
    
    FASTIFY[Fastify Instance] --> ENV
    FASTIFY --> JWT
    FASTIFY --> CORS
    FASTIFY --> DB
    FASTIFY --> AUTH
    FASTIFY --> ARGON2
    FASTIFY --> FILE_MANAGER
    FASTIFY --> PUBSUB
    FASTIFY --> GQL_UPLOAD
    FASTIFY --> MERCURIUS
    
    AUTH --> JWT
    FILE_MANAGER --> GCS[Google Cloud Storage]
    PUBSUB --> SUBSCRIPTIONS
    MERCURIUS --> SCHEMA_INTEGRATION
    MERCURIUS --> CONTEXT
    MERCURIUS --> SUBSCRIPTIONS
```

### Plugin Descriptions

| Plugin | Purpose | Dependencies |
|--------|---------|--------------|
| **Environment** | Load and validate environment variables | `@fastify/env` |
| **JWT** | JWT token generation and verification | `@fastify/jwt` |
| **Database** | PostgreSQL connection and Drizzle ORM setup | `drizzle-orm`, `postgres` |
| **Auth** | Authentication hooks and role-based authorization | JWT Plugin |
| **Argon2** | Password hashing and verification | `@node-rs/argon2` |
| **File Manager** | File upload and storage management | Google Cloud Storage |
| **PubSub** | Real-time subscription management | `graphql-subscriptions` |
| **GraphQL Upload** | File upload support in GraphQL | `graphql-upload-minimal` |

## Data Flow

### Query Flow
```mermaid
sequenceDiagram
    participant Client
    participant Fastify
    participant Auth
    participant GraphQL
    participant Resolver
    participant Database
    
    Client->>Fastify: GraphQL Query
    Fastify->>Auth: Verify JWT Token
    Auth->>Fastify: User Context
    Fastify->>GraphQL: Execute Query
    GraphQL->>Resolver: Field Resolution
    Resolver->>Auth: Check Permissions
    Auth->>Resolver: Permission Result
    Resolver->>Database: Data Query
    Database->>Resolver: Query Result
    Resolver->>GraphQL: Resolved Data
    GraphQL->>Fastify: Response
    Fastify->>Client: JSON Response
```

### Mutation Flow
```mermaid
sequenceDiagram
    participant Client
    participant Fastify
    participant Auth
    participant GraphQL
    participant Resolver
    participant Database
    participant Storage
    
    Client->>Fastify: GraphQL Mutation
    Fastify->>Auth: Verify JWT Token
    Auth->>Fastify: User Context
    Fastify->>GraphQL: Execute Mutation
    GraphQL->>Resolver: Mutation Resolution
    Resolver->>Auth: Check Write Permissions
    Auth->>Resolver: Permission Result
    
    alt File Upload
        Resolver->>Storage: Upload File
        Storage->>Resolver: File URL
    end
    
    Resolver->>Database: Data Mutation
    Database->>Resolver: Mutation Result
    Resolver->>GraphQL: Resolved Data
    GraphQL->>Fastify: Response
    Fastify->>Client: JSON Response
```

### Subscription Flow
```mermaid
sequenceDiagram
    participant Client
    participant Fastify
    participant Auth
    participant GraphQL
    participant PubSub
    participant Database
    
    Client->>Fastify: GraphQL Subscription
    Fastify->>Auth: Verify JWT Token
    Auth->>Fastify: User Context
    Fastify->>GraphQL: Setup Subscription
    GraphQL->>PubSub: Subscribe to Events
    
    loop Event Occurrence
        Database->>PubSub: Data Change Event
        PubSub->>GraphQL: Publish Event
        GraphQL->>Auth: Check Subscription Permissions
        Auth->>GraphQL: Permission Result
        GraphQL->>Client: Real-time Update
    end
```

## Deployment Architecture

```mermaid
graph TB
    subgraph "Development Environment"
        DEV_DB[(PostgreSQL Container)]
        DEV_SERVER[Development Server]
        DEV_STORAGE[Local File Storage]
    end
    
    subgraph "Production Environment"
        LOAD_BALANCER[Load Balancer]
        
        subgraph "Application Tier"
            APP1[Ludium Backend Instance 1]
            APP2[Ludium Backend Instance 2]
            APP3[Ludium Backend Instance N]
        end
        
        subgraph "Database Tier"
            PROD_DB[(PostgreSQL Database)]
            DB_BACKUP[(Database Backups)]
        end
        
        subgraph "Storage Tier"
            GCS_BUCKET[Google Cloud Storage]
        end
        
        subgraph "Monitoring & Logging"
            LOGS[Application Logs]
            METRICS[Performance Metrics]
        end
    end
    
    subgraph "CI/CD Pipeline"
        GITHUB[GitHub Repository]
        ACTIONS[GitHub Actions]
        DOCKER_BUILD[Docker Build]
        DEPLOY[Deployment]
    end
    
    LOAD_BALANCER --> APP1
    LOAD_BALANCER --> APP2
    LOAD_BALANCER --> APP3
    
    APP1 --> PROD_DB
    APP2 --> PROD_DB
    APP3 --> PROD_DB
    
    APP1 --> GCS_BUCKET
    APP2 --> GCS_BUCKET
    APP3 --> GCS_BUCKET
    
    GITHUB --> ACTIONS
    ACTIONS --> DOCKER_BUILD
    DOCKER_BUILD --> DEPLOY
    DEPLOY --> LOAD_BALANCER
    
    PROD_DB --> DB_BACKUP
    APP1 --> LOGS
    APP1 --> METRICS
```
