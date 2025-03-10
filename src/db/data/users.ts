import type { NewUser } from '@/db/schemas/users';

export const users: NewUser[] = [
  {
    firstName: 'Admin',
    lastName: 'Admin',
    email: 'admin@example.com',
    role: 'admin',
  },
  {
    firstName: 'User',
    lastName: 'User',
    email: 'user@example.com',
    role: 'user',
  },
];
