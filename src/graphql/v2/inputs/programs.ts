import builder from '@/graphql/builder';
import { ProgramV2StatusEnum, ProgramVisibilityEnum } from '../types/programs';
import { OnchainProgramInfoForCreateWithProgramV2Input } from './onchain-program-info';

export const CreateProgramV2Input = builder.inputType('CreateProgramV2Input', {
  fields: (t) => ({
    title: t.string({ required: true }),
    description: t.string({ required: true }),
    skills: t.stringList({ required: true }),
    deadline: t.field({ type: 'DateTime', required: true }),
    invitedMembers: t.stringList(),
    status: t.field({ type: ProgramV2StatusEnum, required: true }),
    visibility: t.field({ type: ProgramVisibilityEnum, required: true }),
    networkId: t.int({ required: true }),
    price: t.string({ required: true }),
    token_id: t.int({ required: true }),
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
    networkId: t.int(),
    price: t.string(),
    token_id: t.int(),
  }),
});

export const CreateProgramWithOnchainV2Input = builder.inputType(
  'CreateProgramWithOnchainV2Input',
  {
    fields: (t) => ({
      program: t.field({ type: CreateProgramV2Input, required: true }),
      onchain: t.field({ type: OnchainProgramInfoForCreateWithProgramV2Input, required: true }),
    }),
  },
);
