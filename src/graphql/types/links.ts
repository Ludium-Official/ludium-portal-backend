import type { Link as DBLink } from '@/db/schemas';
import builder from '@/graphql/builder';

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
export const Link = builder.objectRef<DBLink>('Link').implement({
  fields: (t) => ({
    url: t.exposeString('url'),
    title: t.exposeString('title'),
  }),
});

/* -------------------------------------------------------------------------- */
/*                                   Inputs                                   */
/* -------------------------------------------------------------------------- */
export const LinkInput = builder.inputType('LinkInput', {
  fields: (t) => ({
    url: t.string(),
    title: t.string(),
  }),
});
