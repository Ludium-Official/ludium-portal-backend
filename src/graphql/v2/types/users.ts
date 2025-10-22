import { type UserV2 as DBUser, loginTypesV2, userV2Roles } from '@/db/schemas/v2/usersV2';
import builder from '@/graphql/builder';

// Enums
export const LoginTypeEnum = builder.enumType('LoginTypeEnum', {
  values: loginTypesV2,
});

export const UserRoleEnum = builder.enumType('UserRole', {
  values: userV2Roles,
});

// Object Type
export const User = builder.objectRef<DBUser>('User').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    role: t.expose('role', {
      type: UserRoleEnum,
    }),
    loginType: t.expose('loginType', {
      type: LoginTypeEnum,
    }),
    walletAddress: t.exposeString('walletAddress'),
    email: t.exposeString('email', {
      nullable: true,
    }),
    firstName: t.exposeString('firstName', {
      nullable: true,
    }),
    lastName: t.exposeString('lastName', {
      nullable: true,
    }),
    organizationName: t.exposeString('organizationName', {
      nullable: true,
    }),
    profileImage: t.exposeString('profileImage', {
      nullable: true,
    }),
    bio: t.exposeString('bio', {
      nullable: true,
    }),
    skills: t.exposeStringList('skills', {
      nullable: true,
    }),
    links: t.exposeStringList('links', {
      nullable: true,
    }),
  }),
});

// Pagination types
export const PaginatedUsersType = builder
  .objectRef<{ data: DBUser[]; count: number }>('PaginatedUsers')
  .implement({
    fields: (t) => ({
      data: t.field({ type: [User], resolve: (parent) => parent.data }),
      count: t.field({ type: 'Int', resolve: (parent) => parent.count }),
    }),
  });
