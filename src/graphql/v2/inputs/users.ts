import builder from '@/graphql/builder';
import { LoginV2TypeEnum, UserV2RoleEnum } from '../types/users';

// Create User Input
export const CreateUserV2Input = builder.inputType('CreateUserV2Input', {
  fields: (t) => ({
    // Required fields
    loginType: t.field({
      type: LoginV2TypeEnum,
      required: true,
      description: 'User login type',
    }),
    walletAddress: t.string({
      required: true,
      description: 'User wallet address',
    }),

    // Optional fields
    email: t.string({
      description: 'User email address',
      validate: { email: true },
    }),
    role: t.field({
      type: UserV2RoleEnum,
      description: 'User role (defaults to user)',
    }),
    firstName: t.string({
      description: 'User first name',
    }),
    lastName: t.string({
      description: 'User last name',
    }),
    organizationName: t.string({
      description: 'User organization name',
    }),
    profileImage: t.string({
      description: 'User profile image URL',
    }),
    bio: t.string({
      description: 'User bio/description',
    }),
    skills: t.stringList({
      description: 'User skills array',
    }),
    links: t.stringList({
      description: 'User links array',
    }),
  }),
});

// Update User Input
export const UpdateUserV2Input = builder.inputType('UpdateUserV2Input', {
  fields: (t) => ({
    // ID is required for updates
    id: t.id({
      required: true,
      description: 'User ID to update',
    }),

    // Optional fields that can be updated
    email: t.string({
      description: 'User email address',
      validate: { email: true },
    }),
    walletAddress: t.string({
      description: 'User wallet address',
    }),
    firstName: t.string({
      description: 'User first name',
    }),
    lastName: t.string({
      description: 'User last name',
    }),
    organizationName: t.string({
      description: 'User organization name',
    }),
    profileImage: t.string({
      description: 'User profile image URL',
    }),
    bio: t.string({
      description: 'User bio/description',
    }),
    skills: t.stringList({
      description: 'User skills array',
    }),
    links: t.stringList({
      description: 'User links array',
    }),
    role: t.field({
      type: UserV2RoleEnum,
      description: 'User role',
    }),
  }),
});
