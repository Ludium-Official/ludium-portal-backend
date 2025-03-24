# Ludium Backend API

A modern GraphQL API built with Fastify, PostgreSQL, and TypeScript for the Ludium platform.

## 🚀 Features

- **GraphQL API** using Mercurius and Pothos Schema Builder
- **PostgreSQL Database** with Drizzle ORM
- **Authentication** with JWT and Argon2 password hashing
- **Role-based Access Control**
- **File Storage** integration with Google Cloud Storage
- **Docker** support for development
- **TypeScript** for type safety
- **Biome** for code formatting and linting

## 📋 Prerequisites

- Node.js (v20 or higher)
- Docker and Docker Compose
- PostgreSQL (if running without Docker)
- Google Cloud Storage credentials (for file storage features)

## 🛠️ Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/Ludium-Official/ludium-portal-backend.git
   cd ludium-portal-backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create environment file:
   ```bash
   cp .env.example .env
   ```

4. Update the `.env` file with your configuration:
   ```env
   NODE_ENV=local
   PORT=4000
   JWT_SECRET=your_jwt_secret

   # Database
   DB_HOST=localhost
   DB_USERNAME=ludium
   DB_PASSWORD=ludium
   DB_NAME=ludium
   DATABASE_URL=postgresql://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOST}:5435/${DB_NAME}?search_path=public

   # Storage
   STORAGE_BUCKET=your_storage_bucket
   ```

## 🚀 Quick Start

1. Start the database:
   ```bash
   npm run db:up
   ```

2. Prepare the database (migrations and seed):
   ```bash
   npm run db:prepare
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The API will be available at `http://localhost:4000/graphql`

## 📚 Available Scripts

- `npm run dev` - Start development server with hot reload
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run check` - Run code quality checks
- `npm run db:up` - Start database container
- `npm run db:down` - Stop database container
- `npm run db:gen` - Generate database migrations
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed the database
- `npm run db:prepare` - Full database setup (up, generate, migrate, seed)
- `npm run db:clean` - Clean database data and migrations
- `npm run db:studio` - Open Drizzle Studio for database management

## 🏗️ Project Structure

```
src/
├── config/         # Configuration files
├── constants/      # Constant values
├── db/            # Database related files
│   ├── data/      # Seed data
│   ├── migrations/ # Database migrations
│   └── schemas/   # Database schemas
├── graphql/       # GraphQL related files
│   └── types/     # GraphQL type definitions
├── plugins/       # Fastify plugins
├── routes/        # REST API routes
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── main.ts        # Application entry point
```

## 🔒 Authentication

The API uses JWT for authentication. To authenticate:

1. Create a user account or use seeded accounts
2. Login to receive a JWT token
3. Include the token in the Authorization header:
   ```
   Authorization: Bearer <your_token>
   ```

## 👥 User Roles

The system supports four user roles:
- **Admin**: Full system access
- **Sponsor**: Can create and manage programs
- **Validator**: Can validate programs and create milestones
- **Builder**: Can apply to programs and complete milestones

## 🤝 Contributing

1. Create your feature branch (`git checkout -b feature/amazing-feature`)
2. Commit your changes (`git commit -m 'Add some amazing feature'`)
3. Push to the branch (`git push origin feature/amazing-feature`)
4. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 👥 Team

- [Alex Han] - Backend & DevOps - [GitHub Profile](https://github.com/lxhan)

## 🙏 Acknowledgments

- [Fastify](https://www.fastify.io/)
- [Drizzle ORM](https://orm.drizzle.team/)
- [Pothos GraphQL](https://pothos-graphql.dev/)
- [Mercurius](https://mercurius.dev/)


## 📝 Naming convention

### Types, interfaces and classes - Pascal case

```ts
interface User {}

type Session = {};

class User {
  constructor() {}
}
```

> [!NOTE]
> Prefer interfaces over types.

### Files - Kebab case

```sh
user.ts;
user-auth.ts;
```

### Constants - ALL CAPS

```ts
const SESSION_TIMEOUT = 50;
```

### Enums - Pascal case and members all caps

```ts
enum UserRoles {
  ADMIN = "admin",
  USER = "user",
}
```

### Constant values - lower case

```ts
const USER_ROLE = "admin";
```

### Variables and functions - Camel case

```ts
function getUser() {}
const userData = {};
```

### Use absolute path imports

```ts
// Good:
import config from "@/config/common";
import config from "@/config";

// Bad:
import config from "../../../config";
```

### GraphQL

- [GQL naming convention](https://www.apollographql.com/docs/technotes/TN0002-schema-naming-conventions)