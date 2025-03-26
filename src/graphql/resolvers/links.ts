import {
  linksTable,
  milestonesToLinksTable,
  programsToLinksTable,
  usersToLinksTable,
} from '@/db/schemas';
import type { Context, Root } from '@/types';
import { eq, inArray } from 'drizzle-orm';

export async function getLinksByUserIdResolver(
  _root: Root,
  args: { userId: string },
  ctx: Context,
) {
  const userLinks = await ctx.db
    .select()
    .from(usersToLinksTable)
    .where(eq(usersToLinksTable.userId, args.userId));

  if (!userLinks.length) return [];

  return ctx.db
    .select()
    .from(linksTable)
    .where(
      inArray(
        linksTable.id,
        userLinks.map((rel) => rel.linkId),
      ),
    );
}

export async function getLinksByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  const programLinks = await ctx.db
    .select()
    .from(programsToLinksTable)
    .where(eq(programsToLinksTable.programId, args.programId));

  if (!programLinks.length) return [];

  return ctx.db
    .select()
    .from(linksTable)
    .where(
      inArray(
        linksTable.id,
        programLinks.map((rel) => rel.linkId),
      ),
    );
}

export async function getLinksByMilestoneIdResolver(
  _root: Root,
  args: { milestoneId: string },
  ctx: Context,
) {
  const milestoneLinks = await ctx.db
    .select()
    .from(milestonesToLinksTable)
    .where(eq(milestonesToLinksTable.milestoneId, args.milestoneId));

  if (!milestoneLinks.length) return [];

  return ctx.db
    .select()
    .from(linksTable)
    .where(
      inArray(
        linksTable.id,
        milestoneLinks.map((rel) => rel.linkId),
      ),
    );
}
