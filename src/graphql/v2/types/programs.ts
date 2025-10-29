import {
  type ProgramV2 as DBProgramV2,
  programStatusV2Values,
  programVisibilityV2Values,
} from '@/db/schemas/v2/programs';
import builder from '@/graphql/builder';

export const ProgramVisibilityEnum = builder.enumType('ProgramVisibilityV2', {
  values: programVisibilityV2Values,
});

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const ProgramV2StatusEnum = builder.enumType('ProgramStatusV2', {
  values: programStatusV2Values,
});

export const ProgramV2Ref = builder.objectRef<DBProgramV2>('ProgramV2');

export const ProgramV2Type = ProgramV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id'),
    title: t.exposeString('title'),
    description: t.exposeString('description'),
    skills: t.exposeStringList('skills'),
    deadline: t.field({
      type: 'DateTime',
      resolve: (program) => program.deadline,
    }),
    invitedMembers: t.exposeStringList('invitedMembers', { nullable: true }),
    status: t.field({
      type: ProgramV2StatusEnum,
      resolve: (program) => program.status,
    }),
    visibility: t.field({
      type: ProgramVisibilityEnum,
      resolve: (program) => program.visibility,
    }),
    networkId: t.exposeInt('networkId'),
    price: t.exposeString('price'),
    token_id: t.exposeInt('token_id'),
    createdAt: t.field({
      type: 'DateTime',
      resolve: (program) => program.createdAt,
    }),
    updatedAt: t.field({
      type: 'DateTime',
      resolve: (program) => program.updatedAt,
    }),
  }),
});

export const PaginatedProgramV2Type = builder
  .objectRef<{ data: DBProgramV2[]; count: number }>('PaginatedProgramsV2')
  .implement({
    fields: (t) => ({
      data: t.field({
        type: [ProgramV2Type],
        resolve: (parent) => parent.data,
      }),
      count: t.field({
        type: 'Int',
        resolve: (parent) => parent.count,
      }),
    }),
  });
