import builder from '@/graphql/builder';
import { ProgramV2StatusEnum, ProgramVisibilityEnum } from '../types/programs';

export const CreateProgramV2Input = builder.inputType('CreateProgramV2Input', {
  fields: (t) => ({
    title: t.string({ required: true }),
    description: t.string({ required: true }),
    skills: t.stringList({ required: true }),
    deadline: t.field({ type: 'DateTime', required: true }),
    invitedMembers: t.stringList(),
    status: t.field({ type: ProgramV2StatusEnum, required: true }),
    visibility: t.field({ type: ProgramVisibilityEnum, required: true }),
    network: t.string({ required: true }),
    price: t.string({ required: true }),
    currency: t.string({ required: true }),
  }),
});

export const UpdateProgramV2Input = builder.inputType('UpdateProgramV2Input', {
  fields: (t) => ({
    title: t.string(),
    description: t.string(),
    skills: t.stringList(),
    deadline: t.field({ type: 'DateTime' }),
    invitedMembers: t.stringList(),
    status: t.field({ type: ProgramV2StatusEnum }),
    visibility: t.field({ type: ProgramVisibilityEnum }),
    network: t.string(),
    price: t.string(),
    currency: t.string(),
  }),
});
