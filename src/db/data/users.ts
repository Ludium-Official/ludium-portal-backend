import type { NewRole, NewUser } from '@/db/schemas/users';

export const users: NewUser[] = [
  {
    firstName: 'Admin',
    lastName: 'Admin',
    email: 'admin@example.com',
    organizationName: 'Admin Organization',
    about: 'Admin user with full access',
    image: 'https://ui-avatars.com/api/?name=Admin&background=random',
    links: [
      { url: 'https://github.com/admin', title: 'GitHub' },
      { url: 'https://twitter.com/admin', title: 'Twitter' },
    ],
  },
  {
    firstName: 'Sponsor',
    lastName: 'User',
    email: '2458olympic@ptct.net',
    organizationName: 'Sponsor Organization',
    about: 'Sponsor user who provides opportunities',
    image: 'https://ui-avatars.com/api/?name=Sponsor&background=random',
    links: [{ url: 'https://github.com/sponsor', title: 'GitHub' }],
  },
  {
    firstName: 'Validator',
    lastName: 'User',
    email: 'peach6399@ptct.net',
    organizationName: 'Validator Organization',
    about: 'Validator user who validates postings',
    image: 'https://ui-avatars.com/api/?name=Validator&background=random',
    links: [],
  },
  {
    firstName: 'Builder',
    lastName: 'User',
    email: 'industrialolympe@ptct.net',
    organizationName: 'Builder Organization',
    about: 'Builder user who applies to postings',
    image: 'https://ui-avatars.com/api/?name=Builder&background=random',
    links: [
      { url: 'https://github.com/builder', title: 'GitHub' },
      { url: 'https://linkedin.com/in/builder', title: 'LinkedIn' },
    ],
  },
  {
    firstName: 'Multi',
    lastName: 'Role',
    email: 'brownberni@ptct.net',
    organizationName: 'Multi-Role Organization',
    about: 'User with multiple roles',
    image: 'https://ui-avatars.com/api/?name=Multi+Role&background=random',
    links: [{ url: 'https://github.com/multi', title: 'GitHub' }],
  },
];

export const roles: NewRole[] = [
  {
    name: 'admin',
    description: 'Administrator with full access to the platform',
  },
  {
    name: 'sponsor',
    description: 'Provides opportunities and jobs',
  },
  {
    name: 'validator',
    description: 'Validates sponsor postings and creates milestones',
  },
  {
    name: 'builder',
    description: 'Applies to postings and completes milestones',
  },
];

// Function to create user-role relationships
export function createUserRoles(userIds: string[], roleIds: { [key: string]: string }) {
  const userRoles = [];

  // Admin has admin role
  userRoles.push({
    userId: userIds[0],
    roleId: roleIds.admin,
  });

  // Sponsor has sponsor role
  userRoles.push({
    userId: userIds[1],
    roleId: roleIds.sponsor,
  });

  // Validator has validator role
  userRoles.push({
    userId: userIds[2],
    roleId: roleIds.validator,
  });

  // Builder has builder role
  userRoles.push({
    userId: userIds[3],
    roleId: roleIds.builder,
  });

  // Multi-Role has all roles
  userRoles.push({
    userId: userIds[4],
    roleId: roleIds.sponsor,
  });

  userRoles.push({
    userId: userIds[4],
    roleId: roleIds.validator,
  });

  userRoles.push({
    userId: userIds[4],
    roleId: roleIds.builder,
  });

  return userRoles;
}
