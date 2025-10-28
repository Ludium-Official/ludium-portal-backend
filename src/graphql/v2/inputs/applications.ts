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
    applicantId: t.id({
      required: true,
      description: 'ID of the applicant (user)',
    }),
    status: t.field({
      type: ApplicationStatusV2Enum,
      description: 'Application status (defaults to pending)',
    }),
  }),
});

/**
 * Input type for updating an existing application
 */
export const UpdateApplicationV2Input = builder.inputType('UpdateApplicationV2Input', {
  fields: (t) => ({
    status: t.field({
      type: ApplicationStatusV2Enum,
      required: true,
      description: 'New application status',
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
