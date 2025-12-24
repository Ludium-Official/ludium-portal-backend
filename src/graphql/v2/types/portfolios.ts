import type { PortfolioV2 as DBPortfolio } from '@/db/schemas/v2/portfolios';
import builder from '@/graphql/builder';

export const PortfolioV2Ref = builder.objectRef<DBPortfolio>('PortfolioV2');

export const PortfolioV2Type = PortfolioV2Ref.implement({
  fields: (t) => ({
    id: t.exposeID('id', {
      description: 'Portfolio unique identifier',
    }),
    title: t.exposeString('title', {
      description: 'Portfolio title',
    }),
    isLudiumProject: t.exposeBoolean('isLudiumProject', {
      description: 'Whether this is a Ludium project',
    }),
    role: t.exposeString('role', {
      nullable: true,
      description: 'Role in the project',
    }),
    description: t.exposeString('description', {
      nullable: true,
      description: 'Portfolio description (max 1000 characters)',
    }),
    images: t.exposeStringList('images', {
      nullable: true,
      description: 'Array of image URLs',
    }),
    createdAt: t.field({
      type: 'String',
      resolve: (parent) => parent.createdAt.toISOString(),
      description: 'Portfolio creation timestamp',
    }),
    updatedAt: t.field({
      type: 'String',
      resolve: (parent) => parent.updatedAt.toISOString(),
      description: 'Portfolio last update timestamp',
    }),
  }),
});
