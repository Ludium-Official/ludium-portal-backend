import type { Args, Context, Root } from '@/types';
import type {
  CreateUserV2Input,
  UpdateProfileSectionV2Input,
  UpdateUserV2Input,
  UserV2QueryFilterInput,
  UsersV2QueryInput,
  RequestEmailVerificationV2Input,
  UpdateAboutSectionV2Input,
  UpdateExpertiseSectionV2Input,
  CreateEducationV2Input,
  CreateWorkExperienceV2Input,
  UpdateWorkExperienceV2Input,
  UpdateEducationV2Input,
} from '../inputs/users';
import { UserV2Service } from '../services';

export async function getUserV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.getById(args.id);
}

export async function getUsersV2Resolver(
  _root: Root,
  args: { query?: typeof UsersV2QueryInput.$inferInput | null },
  ctx: Context,
) {
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.getMany(args.query);
}

export async function queryUsersV2Resolver(
  _root: Root,
  args: { filter?: (typeof UserV2QueryFilterInput.$inferInput)[] | null },
  ctx: Context,
) {
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.queryUsers(args);
}

export async function loginV2Resolver(
  _root: Root,
  args: {
    walletAddress: string;
    loginType: string;
    email?: string | null;
  },
  ctx: Context,
): Promise<string> {
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.login(args);
}

export async function createUserV2Resolver(
  _root: Root,
  args: { input: typeof CreateUserV2Input.$inferInput },
  ctx: Context,
) {
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.create(args.input);
}

export async function updateUserV2Resolver(
  _root: Root,
  args: { input: typeof UpdateUserV2Input.$inferInput },
  ctx: Context,
) {
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.update(args.input);
}

export async function deleteUserV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.delete(args.id);
}

// Get user from context (authenticated user)
export async function getProfileV2Resolver(_root: Root, _args: Args, ctx: Context) {
  // ctx.user is already set by auth plugin from JWT token
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  return ctx.userV2;
}

/**
 * Update current authenticated user's profile
 * Uses the user from JWT token context
 */
export async function updateProfileSectionV2Resolver(
  _root: Root,
  args: { input: typeof UpdateProfileSectionV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.updateProfileSection(args.input, ctx.userV2.id);
}

export async function requestEmailVerificationV2Resolver(
  _root: Root,
  args: { input: typeof RequestEmailVerificationV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.requestEmailVerification(args.input.email, ctx.userV2.id);
}

export async function verifyEmailV2Resolver(
  _root: Root,
  args: { email: string; verificationCode: string },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.verifyEmail(args.email, args.verificationCode, ctx.userV2.id);
}

export async function updateAboutSectionV2Resolver(
  _root: Root,
  args: { input: typeof UpdateAboutSectionV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.updateAboutSection(args.input, ctx.userV2.id);
}

export async function updateExpertiseSectionV2Resolver(
  _root: Root,
  args: { input: typeof UpdateExpertiseSectionV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.updateExpertiseSection(args.input, ctx.userV2.id);
}

export async function createWorkExperienceV2Resolver(
  _root: Root,
  args: { input: typeof CreateWorkExperienceV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.createWorkExperience(args.input, ctx.userV2.id);
}

export async function updateWorkExperienceV2Resolver(
  _root: Root,
  args: { input: typeof UpdateWorkExperienceV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.updateWorkExperience(args.input, ctx.userV2.id);
}

export async function deleteWorkExperienceV2Resolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.deleteWorkExperience(args.id, ctx.userV2.id);
}

// Education 개별 Resolvers
export async function createEducationV2Resolver(
  _root: Root,
  args: { input: typeof CreateEducationV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.createEducation(args.input, ctx.userV2.id);
}

export async function updateEducationV2Resolver(
  _root: Root,
  args: { input: typeof UpdateEducationV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.updateEducation(args.input, ctx.userV2.id);
}

export async function deleteEducationV2Resolver(_root: Root, args: { id: string }, ctx: Context) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.deleteEducation(args.id, ctx.userV2.id);
}
