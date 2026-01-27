import builder from '@/graphql/builder';

export const GetNotificationsV2Input = builder.inputType('GetNotificationsV2Input', {
  fields: (t) => ({
    limit: t.int({ required: false, defaultValue: 10 }),
    offset: t.int({ required: false, defaultValue: 0 }),
    unreadOnly: t.boolean({ required: false, defaultValue: false }),
    type: t.string({ required: false }),
  }),
});
