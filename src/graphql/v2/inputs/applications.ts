import builder from '@/graphql/builder';
import { ApplicationStatusV2Enum } from '../types/applications';

// ============================================================================
// Mutation Inputs
// ============================================================================

/**
 * Input type for creating a new application
 */
export const CreateApplicationV2Input = builder.inputType('CreateApplicationV2Input', {
  fields: (t) => ({
    programId: t.id({
      required: true,
      description: 'ID of the program to apply for',
    }),
    status: t.field({
      type: ApplicationStatusV2Enum,
      description: 'Application status (defaults to applied)',
    }),
  }),
});

/**
 * Input type for updating an existing application by the applicant
 * This is for applicants to modify their application content
 */
export const UpdateApplicationV2Input = builder.inputType('UpdateApplicationV2Input', {
  fields: (t) => ({
    applicationContent: t.string({
      description: 'Updated application content',
    }),
  }),
});

/**
 * Input type for reviewing an application by the program creator
 * This is for program creators to accept or reject applications
 */
export const ReviewApplicationV2Input = builder.inputType('ReviewApplicationV2Input', {
  fields: (t) => ({
    status: t.field({
      type: ApplicationStatusV2Enum,
      required: true,
      description: 'Review decision: accepted or rejected',
    }),
    rejectedReason: t.string({
      description: 'Reason for rejection (required when status is rejected)',
    }),
  }),
});

/**
 * Input type for picking/unpicking an application by the program creator
 * This is for program creators to bookmark favorite applications
 */
export const PickApplicationV2Input = builder.inputType('PickApplicationV2Input', {
  fields: (t) => ({
    picked: t.boolean({
      required: true,
      description: 'Whether to mark this application as picked (bookmark)',
    }),
  }),
});

// ============================================================================
// Query Inputs
// ============================================================================

/**
 * Pagination and filtering input for applications queries
 */
export const ApplicationsV2QueryInput = builder.inputType('ApplicationsV2QueryInput', {
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
    applicantId: t.id({
      description: 'Filter by applicant ID',
    }),
    status: t.field({
      type: ApplicationStatusV2Enum,
      description: 'Filter by application status',
    }),
  }),
});

/**
 * Pagination input for applications by program queries
 */
export const ApplicationsByProgramV2QueryInput = builder.inputType(
  'ApplicationsByProgramV2QueryInput',
  {
    fields: (t) => ({
      programId: t.id({
        required: true,
        description: 'Program ID to get applications for',
      }),
      page: t.int({
        description: 'Page number (1-based)',
        defaultValue: 1,
      }),
      limit: t.int({
        description: 'Number of items per page',
        defaultValue: 10,
      }),
    }),
  },
);

/**
 * Pagination input for my applications queries
 */
export const MyApplicationsV2QueryInput = builder.inputType('MyApplicationsV2QueryInput', {
  fields: (t) => ({
    page: t.int({
      description: 'Page number (1-based)',
      defaultValue: 1,
    }),
    limit: t.int({
      description: 'Number of items per page',
      defaultValue: 10,
    }),
  }),
});
