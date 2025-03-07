## Development

- Copy the `.env.example` file and paste the necessary values into the `.env`
  file.
- For local development, use a local database (you can set up one using Docker
  and the `npm run db:up` command).
- Follow naming conventions stated below.
- The project uses the husky `pre-commit` script, which runs the linter on every
  commit. If you commit and encounter lint errors, you should fix them first,
  then run `git add .` and commit again.
- If you want to add a package or make a change to db schema, first contact
  @lxhan.
- Always create PR to the `dev` branch first.

> [!NOTE]
> npm scripts will only work on *nix systems. For Windows, you should use WSL.

## Naming convention

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