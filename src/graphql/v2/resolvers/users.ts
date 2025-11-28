import type { Args, Context, Root } from '@/types';
import type {
  CreateUserV2Input,
  UpdateProfileV2Input,
  UpdateUserV2Input,
  UserV2QueryFilterInput,
  UsersV2QueryInput,
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
export async function updateProfileV2Resolver(
  _root: Root,
  args: { input: typeof UpdateProfileV2Input.$inferInput },
  ctx: Context,
) {
  if (!ctx.userV2) {
    throw new Error('Unauthorized');
  }
  const userService = new UserV2Service(ctx.db, ctx.server);
  return userService.updateProfile(args.input, ctx.userV2.id);
}
