import type { Fee as DBFee } from '@/db/schemas';
import builder from '@/graphql/builder';
import { claimProgramFeesResolver, getClaimableFeesResolver } from '@/graphql/resolvers/fee-claims';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */

export const FeeClaimType = builder.objectRef<DBFee>('FeeClaim').implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    programId: t.exposeID('programId'),
    claimedBy: t.exposeID('claimedBy'),
    amount: t.exposeString('amount'),
    txHash: t.exposeString('txHash', { nullable: true }),
    status: t.exposeString('status'),
    claimedAt: t.field({
      type: 'DateTime',
      nullable: true,
      resolve: (fee) => fee.claimedAt,
    }),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (fee) => fee.createdAt,
    }),
  }),
});

export const ClaimableFeesType = builder
  .objectRef<{
    amount: string;
    canClaim: boolean;
    reason?: string;
    feePercentage?: number;
    pendingEndDate?: Date;
    claimedAt?: Date;
  }>('ClaimableFees')
  .implement({
    fields: (t) => ({
      amount: t.exposeString('amount'),
      canClaim: t.exposeBoolean('canClaim'),
      reason: t.exposeString('reason', { nullable: true }),
      feePercentage: t.exposeFloat('feePercentage', { nullable: true }),
      pendingEndDate: t.field({
        type: 'DateTime',
        nullable: true,
        resolve: (fee) => fee.pendingEndDate,
      }),
      claimedAt: t.field({
        type: 'DateTime',
        nullable: true,
        resolve: (fee) => fee.claimedAt,
      }),
    }),
  });

/* -------------------------------------------------------------------------- */
/*                            Queries and mutations                           */
/* -------------------------------------------------------------------------- */

builder.queryFields((t) => ({
  claimableFees: t.field({
    type: ClaimableFeesType,
    authScopes: { user: true },
    args: {
      programId: t.arg.id({ required: true }),
    },
    resolve: getClaimableFeesResolver,
  }),
}));

builder.mutationFields((t) => ({
  claimProgramFees: t.field({
    type: FeeClaimType,
    authScopes: { user: true },
    args: {
      programId: t.arg.id({ required: true }),
      txHash: t.arg.string({ required: true }),
    },
    resolve: claimProgramFeesResolver,
  }),
}));
