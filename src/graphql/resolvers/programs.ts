import {
  type NewProgram,
  type Program,
  keywordsTable,
  linksTable,
  programsTable,
  programsToKeywordsTable,
  programsToLinksTable,
} from '@/db/schemas';
import type { PaginationInput } from '@/graphql/types/common';
import type { CreateProgramInput, UpdateProgramInput } from '@/graphql/types/programs';
import type { Args, Context, Root } from '@/types';
import { filterEmptyValues, validAndNotEmptyArray } from '@/utils/common';
import { count, eq, inArray } from 'drizzle-orm';

export async function getProgramsResolver(
  _root: Root,
  args: { pagination?: typeof PaginationInput.$inferInput | null },
  ctx: Context,
) {
  const limit = args.pagination?.limit || 10;
  const offset = args.pagination?.offset || 0;

  const data = await ctx.db.select().from(programsTable).limit(limit).offset(offset);
  const totalCount = await ctx.db.select({ count: count() }).from(programsTable);

  if (!validAndNotEmptyArray(data) || !validAndNotEmptyArray(totalCount)) {
    throw new Error('No programs found');
  }

  return {
    data,
    count: totalCount[0].count,
  };
}

export async function getProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [program] = await ctx.db.select().from(programsTable).where(eq(programsTable.id, args.id));
  return program;
}

export async function getProgramKeywordsByProgramIdResolver(
  _root: Root,
  args: { programId: string },
  ctx: Context,
) {
  // First get the junction records
  const keywordRelations = await ctx.db
    .select()
    .from(programsToKeywordsTable)
    .where(eq(programsToKeywordsTable.programId, args.programId));

  if (!keywordRelations.length) return [];

  // Then get the actual keywords
  return ctx.db
    .select()
    .from(keywordsTable)
    .where(
      inArray(
        keywordsTable.id,
        keywordRelations.map((rel) => rel.keywordId),
      ),
    );
}

export async function getProgramKeywordsResolver(_root: Root, _args: Args, ctx: Context) {
  return ctx.db.select().from(keywordsTable);
}

export async function createProgramResolver(
  _root: Root,
  args: { input: typeof CreateProgramInput.$inferInput },
  ctx: Context,
) {
  const { keywords, links, ...inputData } = args.input;

  const user = ctx.server.auth.getUser(ctx.request);
  if (!user) {
    throw new Error('User not found');
  }

  // Create a properly typed object for the database insert
  const insertData: NewProgram = {
    name: inputData.name,
    summary: inputData.summary || null,
    description: inputData.description || null,
    price: inputData.price || '0',
    currency: inputData.currency || 'ETH',
    deadline: inputData.deadline
      ? new Date(inputData.deadline).toISOString()
      : new Date().toISOString(),
    creatorId: user.id,
    validatorId: inputData.validatorId || null,
    status: 'draft',
  };

  return ctx.db.transaction(async (t) => {
    const [program] = await t.insert(programsTable).values(insertData).returning();

    // Handle keywords
    if (keywords?.length) {
      await t
        .insert(programsToKeywordsTable)
        .values(
          keywords.map((keyword) => ({
            programId: program.id,
            keywordId: keyword,
          })),
        )
        .onConflictDoNothing();
    }

    if (links) {
      // insert links to links table and map to program
      const filteredLinks = links.filter((link) => link.url);
      const newLinks = await t
        .insert(linksTable)
        .values(
          filteredLinks.map((link) => ({
            url: link.url as string,
            title: link.title as string,
          })),
        )
        .returning();

      await t.insert(programsToLinksTable).values(
        newLinks.map((link) => ({
          programId: program.id,
          linkId: link.id,
        })),
      );
    }

    return program;
  });
}

export async function updateProgramResolver(
  _root: Root,
  args: { input: typeof UpdateProgramInput.$inferInput },
  ctx: Context,
) {
  const { keywords, links, ...inputData } = args.input;

  // Remove null values and prepare data
  const programData = filterEmptyValues<Program>(inputData);

  return ctx.db.transaction(async (t) => {
    // handle keywords
    if (keywords) {
      await t
        .delete(programsToKeywordsTable)
        .where(eq(programsToKeywordsTable.programId, args.input.id));
      await t
        .insert(programsToKeywordsTable)
        .values(keywords.map((keyword) => ({ programId: args.input.id, keywordId: keyword })))
        .onConflictDoNothing();
    }
    // Transform links if present
    const updateData: Partial<Program> = { ...programData };
    if (links) {
      // delete existing links
      await t.delete(programsToLinksTable).where(eq(programsToLinksTable.programId, args.input.id));

      // insert new links
      const newLinks = await t
        .insert(linksTable)
        .values(links.map((link) => ({ url: link.url as string, title: link.title as string })))
        .returning();
      await t.insert(programsToLinksTable).values(
        newLinks.map((link) => ({
          programId: args.input.id,
          linkId: link.id,
        })),
      );
    }

    const [program] = await ctx.db
      .update(programsTable)
      .set(updateData)
      .where(eq(programsTable.id, args.input.id))
      .returning();

    return program;
  });
}

export async function deleteProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  await ctx.db.delete(programsTable).where(eq(programsTable.id, args.id));
  return true;
}
