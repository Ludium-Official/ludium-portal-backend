import { notificationsTable } from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { Args, Context, Root } from '@/types';
import { requireUser, requireUserForSubscription, validAndNotEmptyArray } from '@/utils';
import { and, asc, count, desc, eq, inArray, isNull, or, sql } from 'drizzle-orm';

export async function getNotificationsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const user = await requireUserForSubscription(ctx);

  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;
  const sort = args.pagination?.sort || 'desc';
  const filter = args.pagination?.filter || [];

  const filterPromises = filter.map(async (f) => {
    switch (f.field) {
      case 'tab':
        switch (f.value) {
          case 'all':
            return undefined;
          case 'reclaim':
            return and(
              inArray(notificationsTable.type, ['program', 'milestone', 'application']),
              eq(notificationsTable.action, 'completed'),
              sql`${notificationsTable.metadata}->>'reason' = 'deadline_passed'`,
            );
          case 'investment_condition':
            return and(
              eq(notificationsTable.type, 'program'),
              eq(notificationsTable.action, 'invited'),
              sql`${notificationsTable.metadata}->>'tier' IS NOT NULL`,
            );
          case 'progress':
            return or(
              and(
                eq(notificationsTable.type, 'program'),
                inArray(notificationsTable.action, ['accepted', 'rejected']),
              ),
              and(
                eq(notificationsTable.type, 'application'),
                inArray(notificationsTable.action, [
                  'accepted',
                  'rejected',
                  'submitted',
                  'created',
                ]),
              ),
              and(
                eq(notificationsTable.type, 'milestone'),
                inArray(notificationsTable.action, ['accepted', 'submitted', 'created']),
              ),
            );
          default:
            return undefined;
        }
      case 'unread':
        return f.value === 'true' ? isNull(notificationsTable.readAt) : undefined;
      default:
        return undefined;
    }
  });

  const filterConditions = (await Promise.all(filterPromises)).filter(Boolean);

  const baseConditions = [eq(notificationsTable.recipientId, user.id)];

  const hasUnreadFilter = filter.some((f) => f.field === 'unread');
  if (!hasUnreadFilter) {
  }

  const allConditions = [...baseConditions, ...filterConditions];

  const data = await ctx.db
    .select()
    .from(notificationsTable)
    .where(and(...allConditions))
    .limit(limit)
    .offset(offset)
    .orderBy(
      sort === 'asc' ? asc(notificationsTable.createdAt) : desc(notificationsTable.createdAt),
    );

  if (!validAndNotEmptyArray(data)) {
    return {
      data: [],
      count: 0,
    };
  }

  const [totalCount] = await ctx.db
    .select({ count: count() })
    .from(notificationsTable)
    .where(and(...allConditions));

  return {
    data,
    count: totalCount.count,
  };
}

export async function getNotificationsCountResolver(_root: Root, _args: Args, ctx: Context) {
  const user = await requireUserForSubscription(ctx);

  const [result] = await ctx.db
    .select({ count: count() })
    .from(notificationsTable)
    .where(and(eq(notificationsTable.recipientId, user.id), isNull(notificationsTable.readAt)));

  return result?.count ?? 0;
}

export async function markNotificationAsReadResolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  const user = requireUser(ctx);
  await ctx.db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.id, args.id), eq(notificationsTable.recipientId, user.id)))
    .returning();

  await ctx.server.pubsub.publish('notifications');
  await ctx.server.pubsub.publish('notificationsCount');

  return true;
}

export async function markAllNotificationsAsReadResolver(_root: Root, _args: Args, ctx: Context) {
  const user = requireUser(ctx);
  await ctx.db
    .update(notificationsTable)
    .set({ readAt: new Date() })
    .where(and(eq(notificationsTable.recipientId, user.id), isNull(notificationsTable.readAt)));

  await ctx.server.pubsub.publish('notifications');
  await ctx.server.pubsub.publish('notificationsCount');

  return true;
}
