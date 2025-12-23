import builder from '@/graphql/builder';

export const CreatePortfolioV2Input = builder.inputType('CreatePortfolioV2Input', {
  fields: (t) => ({
    title: t.string({
      required: true,
      description: 'Portfolio title (required)',
    }),
    isLudiumProject: t.boolean({
      description: 'Whether this is a Ludium project',
    }),
    role: t.string({
      description: 'Role in the project (e.g., "Frontend Developer")',
    }),
    description: t.string({
      description: 'Portfolio description (max 1000 characters)',
      validate: { maxLength: 1000 },
    }),
    images: t.field({
      type: ['Upload'],
      description: 'Array of image files to upload',
    }),
  }),
});

export const UpdatePortfolioV2Input = builder.inputType('UpdatePortfolioV2Input', {
  fields: (t) => ({
    id: t.id({
      required: true,
      description: 'Portfolio ID to update',
    }),
    title: t.string({
      required: true,
      description: 'Portfolio title (required)',
    }),
    isLudiumProject: t.boolean({
      description: 'Whether this is a Ludium project',
    }),
    role: t.string({
      description: 'Role in the project (e.g., "Frontend Developer")',
    }),
    description: t.string({
      description: 'Portfolio description (max 1000 characters)',
      validate: { maxLength: 1000 },
    }),
    images: t.field({
      type: ['Upload'],
      description: 'Array of image files to upload (replaces existing images)',
    }),
  }),
});
