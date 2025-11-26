import builder from '@/graphql/builder';
import { MilestoneStatusV2Enum } from '../types/milestones';

// ============================================================================
// Mutation Inputs
// ============================================================================

/**
 * Input type for creating a new milestone
 */
export const CreateMilestoneV2Input = builder.inputType('CreateMilestoneV2Input', {
  fields: (t) => ({
    programId: t.id({
      required: true,
      description: 'ID of the program',
    }),
    applicationId: t.id({
      required: true,
      description: 'ID of the application',
    }),
    sponsorId: t.id({
      required: true,
      description: 'ID of the sponsor (user)',
    }),
    title: t.string({
      required: true,
      description: 'Milestone title',
    }),
    description: t.string({
      required: true,
      description: 'Milestone description',
    }),
    payout: t.string({
      required: true,
      description: 'Milestone payout amount',
    }),
    deadline: t.field({
      type: 'DateTime',
      required: true,
      description: 'Milestone deadline',
    }),
    files: t.stringList({
      description: 'Milestone files (URLs)',
    }),
    status: t.field({
      type: MilestoneStatusV2Enum,
      required: true,
      description: 'Milestone status',
    }),
  }),
});

/**
 * Input type for updating an existing milestone
 */
export const UpdateMilestoneV2Input = builder.inputType('UpdateMilestoneV2Input', {
  fields: (t) => ({
    title: t.string({
      description: 'Milestone title',
    }),
    description: t.string({
      description: 'Milestone description',
    }),
    payout: t.string({
      description: 'Milestone payout amount',
    }),
    deadline: t.field({
      type: 'DateTime',
      description: 'Milestone deadline',
    }),
    files: t.stringList({
      description: 'Milestone files (URLs)',
    }),
    status: t.field({
      type: MilestoneStatusV2Enum,
      description: 'Milestone status',
    }),
    payout_tx: t.string({
      description: 'Transaction hash for the milestone payout',
    }),
  }),
});

/**
 * Input type for updating milestone by relayer
 * Relayer can update payout_tx and status (to completed)
 */
export const UpdateMilestoneByRelayerV2Input = builder.inputType(
  'UpdateMilestoneByRelayerV2Input',
  {
    fields: (t) => ({
      payout_tx: t.string({
        required: true,
        description: 'Transaction hash for the milestone payout',
      }),
      status: t.field({
        type: MilestoneStatusV2Enum,
        description: 'Milestone status (typically set to completed when payout_tx is set)',
      }),
    }),
  },
);

// ============================================================================
// Query Inputs
// ============================================================================

/**
 * Pagination and filtering input for milestones queries
 */
export const MilestonesV2QueryInput = builder.inputType('MilestonesV2QueryInput', {
  fields: (t) => ({
    page: t.int({
      description: 'Page number (1-based)',
      defaultValue: 1,
    }),
    limit: t.int({
      description: 'Number of items per page',
      defaultValue: 10,
    }),
    programId: t.id({
      description: 'Filter by program ID',
    }),
    applicationId: t.id({
      description: 'Filter by application ID',
    }),
  }),
});
