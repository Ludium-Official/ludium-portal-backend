import {
  type NewProgram,
  type Program,
  keywordsTable,
  programsTable,
  programsToKeywordsTable,
} from '@/db/schemas';
import type { CreateProgramInput, UpdateProgramInput } from '@/graphql/types/programs';
import type { Args, Context, Root } from '@/types';
import { eq, inArray } from 'drizzle-orm';

export async function getProgramsResolver(_root: Root, _args: Args, ctx: Context) {
  return ctx.db.select().from(programsTable);
}

export async function getProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [program] = await ctx.db.select().from(programsTable).where(eq(programsTable.id, args.id));
  return program;
}

export async function getProgramKeywordsResolver(_root: Root, args: { id: string }, ctx: Context) {
  // First get the junction records
  const keywordRelations = await ctx.db
    .select()
    .from(programsToKeywordsTable)
    .where(eq(programsToKeywordsTable.programId, args.id));

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

export async function createProgramResolver(
  _root: Root,
  args: { input: typeof CreateProgramInput.$inferInput },
  ctx: Context,
) {
  const { keywords, links, ...inputData } = args.input;

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
    creatorId: ctx.user.id,
    links:
      links?.map((link) => ({
        url: link.url || '',
        title: link.title || '',
      })) || null,
    status: 'draft',
  };

  // Now insert with proper typing
  const [program] = await ctx.db.insert(programsTable).values(insertData).returning();

  // Handle keywords
  if (keywords?.length) {
    await Promise.all(
      keywords.map((keywordId) =>
        ctx.db
          .insert(programsToKeywordsTable)
          .values({
            programId: program.id,
            keywordId,
          })
          .onConflictDoNothing(),
      ),
    );
  }

  return program;
}

export async function updateProgramResolver(
  _root: Root,
  args: { input: typeof UpdateProgramInput.$inferInput },
  ctx: Context,
) {
  const { keywords, links, ...inputData } = args.input;

  // Remove null values and prepare data
  const programData = Object.fromEntries(Object.entries(inputData).filter(([_, v]) => v !== null));

  // Transform links if present
  const updateData: Partial<Program> = { ...programData };
  if (links) {
    updateData.links = links.map((link) => ({
      url: link.url ?? '',
      title: link.title ?? '',
    }));
  }

  const [program] = await ctx.db
    .update(programsTable)
    .set(updateData)
    .where(eq(programsTable.id, args.input.id))
    .returning();

  return program;
}

export async function deleteProgramResolver(_root: Root, args: { id: string }, ctx: Context) {
  await ctx.db.delete(programsTable).where(eq(programsTable.id, args.id));
  return true;
}
