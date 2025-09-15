import type { InvestmentTerm as DBInvestmentTerm } from '@/db/schemas';
import { investmentsTable } from '@/db/schemas';
import builder from '@/graphql/builder';
import {
  createInvestmentTermResolver,
  deleteInvestmentTermResolver,
  getInvestmentTermResolver,
  getInvestmentTermsByApplicationIdResolver,
  updateInvestmentTermResolver,
} from '@/graphql/resolvers/investment-terms';
import { and, eq, sql } from 'drizzle-orm';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const InvestmentTermType = builder.objectRef<DBInvestmentTerm>('InvestmentTerm').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    applicationId: t.exposeID('applicationId'),
    title: t.exposeString('title'),
    description: t.exposeString('description', { nullable: true }),
    price: t.exposeString('price'),
    purchaseLimit: t.exposeInt('purchaseLimit', { nullable: true }),
    currentPurchases: t.field({
      type: 'Int',
      nullable: true,
      resolve: async (term, _args, ctx) => {
        // Count investments for this specific term
        const [result] = await ctx.db
          .select({
            count: sql<number>`COUNT(*)::int`,
          })
          .from(investmentsTable)
          .where(
            and(
              eq(investmentsTable.investmentTermId, term.id),
              eq(investmentsTable.status, 'confirmed'),
            ),
          );
        return result?.count || 0;
      },
    }),
    remainingPurchases: t.field({
      type: 'Int',
      nullable: true,
      resolve: async (term, _args, ctx) => {
        if (!term.purchaseLimit) return null;

        // Count investments for this specific term
        const [result] = await ctx.db
          .select({
            count: sql<number>`COUNT(*)::int`,
          })
          .from(investmentsTable)
          .where(
            and(
              eq(investmentsTable.investmentTermId, term.id),
              eq(investmentsTable.status, 'confirmed'),
            ),
          );

        const currentPurchases = result?.count || 0;
        return Math.max(0, term.purchaseLimit - currentPurchases);
      },
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (term) => term.createdAt,
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (term) => term.updatedAt,
    }),
  }),
});

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const CreateInvestmentTermInput = builder.inputType('CreateInvestmentTermInput', {
  fields: (t) => ({
    title: t.string({ required: true }),
    description: t.string(),
    price: t.string({ required: true }),
    purchaseLimit: t.int(),
  }),
});

export const UpdateInvestmentTermInput = builder.inputType('UpdateInvestmentTermInput', {
  fields: (t) => ({
    id: t.string({ required: true }),
    title: t.string(),
    description: t.string(),
    price: t.string(),
    purchaseLimit: t.int(),
  }),
});

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */
builder.queryFields((t) => ({
  investmentTerm: t.field({
    type: InvestmentTermType,
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: getInvestmentTermResolver,
  }),
  investmentTermsByApplicationId: t.field({
    type: [InvestmentTermType],
    args: {
      applicationId: t.arg.id({ required: true }),
    },
    resolve: getInvestmentTermsByApplicationIdResolver,
  }),
}));

builder.mutationFields((t) => ({
  createInvestmentTerm: t.field({
    type: InvestmentTermType,
    authScopes: { user: true },
    args: {
      applicationId: t.arg.id({ required: true }),
      input: t.arg({ type: CreateInvestmentTermInput, required: true }),
    },
    resolve: createInvestmentTermResolver,
  }),
  updateInvestmentTerm: t.field({
    type: InvestmentTermType,
    authScopes: { user: true },
    args: {
      input: t.arg({ type: UpdateInvestmentTermInput, required: true }),
    },
    resolve: updateInvestmentTermResolver,
  }),
  deleteInvestmentTerm: t.field({
    type: 'Boolean',
    authScopes: { user: true },
    args: {
      id: t.arg.id({ required: true }),
    },
    resolve: deleteInvestmentTermResolver,
  }),
}));
