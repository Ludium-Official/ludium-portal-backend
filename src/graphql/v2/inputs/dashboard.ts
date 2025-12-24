import builder from '@/graphql/builder';
import { PaginationInput } from '@/graphql/types/common';
import {
  HiringActivityProgramStatusFilterEnum,
  JobActivityProgramStatusFilterEnum,
} from '../types/dashboard';

export const HiringActivityV2Input = builder.inputType('HiringActivityV2Input', {
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

export const JobActivityV2Input = builder.inputType('JobActivityV2Input', {
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

export const ProgramOverviewV2Input = builder.inputType('ProgramOverviewV2Input', {
  fields: (t) => ({
    programId: t.id({
      required: true,
      description: 'Program ID',
    }),
    pagination: t.field({
      type: PaginationInput,
      required: false,
      description: 'Pagination options for hired builders or milestones',
    }),
  }),
});
