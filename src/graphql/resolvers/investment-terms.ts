import { applicationsTable, investmentTermsTable } from '@/db/schemas';
import type {
  CreateInvestmentTermInput,
  UpdateInvestmentTermInput,
} from '@/graphql/types/investment-terms';
import type { Context, Root } from '@/types';
import { requireUser } from '@/utils';
import { eq } from 'drizzle-orm';

export async function getInvestmentTermResolver(_root: Root, args: { id: string }, ctx: Context) {
  const [term] = await ctx.db
    .select()
    .from(investmentTermsTable)
    .where(eq(investmentTermsTable.id, args.id));

  if (!term) {
    throw new Error('Investment term not found');
  }

  return term;
}

export async function getInvestmentTermsByApplicationIdResolver(
  _root: Root,
  args: { applicationId: string },
  ctx: Context,
) {
  return ctx.db
    .select()
    .from(investmentTermsTable)
    .where(eq(investmentTermsTable.applicationId, args.applicationId));
}

export async function createInvestmentTermResolver(
  _root: Root,
  args: {
    applicationId: string;
    input: typeof CreateInvestmentTermInput.$inferInput;
  },
  ctx: Context,
) {
  const user = requireUser(ctx);

  // Verify the user owns the application
  const [application] = await ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, args.applicationId));

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.applicantId !== user.id) {
    throw new Error('You do not have permission to add investment terms to this application');
  }

  const [newTerm] = await ctx.db
    .insert(investmentTermsTable)
    .values({
      applicationId: args.applicationId,
      title: args.input.title,
      description: args.input.description,
      price: args.input.price,
      purchaseLimit: args.input.purchaseLimit,
    })
    .returning();

  return newTerm;
}

export async function updateInvestmentTermResolver(
  _root: Root,
  args: {
    input: typeof UpdateInvestmentTermInput.$inferInput;
  },
  ctx: Context,
) {
  const user = requireUser(ctx);

  // Get the investment term to check ownership
  const [termData] = await ctx.db
    .select()
    .from(investmentTermsTable)
    .where(eq(investmentTermsTable.id, args.input.id));

  if (!termData) {
    throw new Error('Investment term not found');
  }

  // Check application ownership
  const [application] = await ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, termData.applicationId));

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.applicantId !== user.id) {
    throw new Error('You do not have permission to update this investment term');
  }

  const updateData: Record<string, unknown> = {};
  if (args.input.title) {
    updateData.title = args.input.title;
  }
  if (args.input.description) {
    updateData.description = args.input.description;
  }
  if (args.input.price) {
    updateData.price = args.input.price;
  }
  if (args.input.purchaseLimit) {
    updateData.purchaseLimit = args.input.purchaseLimit;
  }

  const [updatedTerm] = await ctx.db
    .update(investmentTermsTable)
    .set(updateData)
    .where(eq(investmentTermsTable.id, args.input.id))
    .returning();

  return updatedTerm;
}

export async function deleteInvestmentTermResolver(
  _root: Root,
  args: { id: string },
  ctx: Context,
) {
  const user = requireUser(ctx);

  // Get the investment term to check ownership
  const [termData] = await ctx.db
    .select()
    .from(investmentTermsTable)
    .where(eq(investmentTermsTable.id, args.id));

  if (!termData) {
    throw new Error('Investment term not found');
  }

  // Check application ownership
  const [application] = await ctx.db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, termData.applicationId));

  if (!application) {
    throw new Error('Application not found');
  }

  if (application.applicantId !== user.id) {
    throw new Error('You do not have permission to delete this investment term');
  }

  await ctx.db.delete(investmentTermsTable).where(eq(investmentTermsTable.id, args.id));

  return true;
}
