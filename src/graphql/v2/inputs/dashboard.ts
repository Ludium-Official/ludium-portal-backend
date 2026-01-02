import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  HiringActivityProgramStatusFilterEnum,
  JobActivityProgramStatusFilterEnum,
} from '../types/dashboard';

export const HiringActivityProgramsInput = builder.inputType('HiringActivityProgramsInput', {
  fields: (t) => ({
    status: t.field({
      type: HiringActivityProgramStatusFilterEnum,
      required: false,
      description: 'Filter by program status: ALL, OPEN, ONGOING, or COMPLETED',
    }),
    search: t.string({
      required: false,
      description: 'Search by program title',
    }),
    pagination: t.field({
      type: PaginationInput,
      required: false,
      description: 'Pagination options',
    }),
  }),
});

export const JobActivityProgramsInput = builder.inputType('JobActivityProgramsInput', {
  fields: (t) => ({
    status: t.field({
      type: JobActivityProgramStatusFilterEnum,
      required: false,
      description: 'Filter by program status: APPLIED, ONGOING, or COMPLETED',
    }),
    search: t.string({
      required: false,
      description: 'Search by program title',
    }),
    pagination: t.field({
      type: PaginationInput,
      required: false,
      description: 'Pagination options',
    }),
  }),
});

export const HiredBuildersInput = builder.inputType('HiredBuildersInput', {
  fields: (t) => ({
    programId: t.id({
      required: true,
      description: 'Program ID',
    }),
    pagination: t.field({
      type: PaginationInput,
      required: false,
      description: 'Pagination options for hired builders',
    }),
  }),
});

export const BuilderMilestonesInput = builder.inputType('BuilderMilestonesInput', {
  fields: (t) => ({
    programId: t.id({
      required: true,
      description: 'Program ID',
    }),
    pagination: t.field({
      type: PaginationInput,
      required: false,
      description: 'Pagination options for milestones',
    }),
  }),
});

export const MilestoneProgressInput = builder.inputType('MilestoneProgressInput', {
  fields: (t) => ({
    programId: t.id({
      required: true,
      description: 'Program ID',
    }),
  }),
});

export const UpcomingPaymentsInput = builder.inputType('UpcomingPaymentsInput', {
  fields: (t) => ({
    programId: t.id({
      required: true,
      description: 'Program ID',
    }),
  }),
});
