import type { Context, Root } from '@/types';
import type {
  CreateUserV2Input,
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
