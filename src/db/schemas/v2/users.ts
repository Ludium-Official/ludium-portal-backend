import { pgEnum, pgTable, serial, text, timestamp, unique, varchar } from 'drizzle-orm/pg-core';

export const loginTypesV2 = ['google', 'wallet', 'farcaster'] as const;
export const loginTypesV2Enum = pgEnum('login_type', loginTypesV2);

export const userV2Roles = ['user', 'admin'] as const;
export const userV2RolesEnum = pgEnum('user_roles', userV2Roles);

export const usersV2Table = pgTable(
  'users_v2',
  {
    // 필수 필드
    id: serial('id').primaryKey(),
    role: userV2RolesEnum('role').default('user').notNull(),
    loginType: loginTypesV2Enum('login_type').notNull(),
    email: varchar('email', { length: 256 }),
    walletAddress: varchar('wallet_address', { length: 256 }).notNull(),

    // 유저 메타데이터
    firstName: varchar('first_name', { length: 256 }),
    lastName: varchar('last_name', { length: 256 }),
    organizationName: varchar('organization_name', { length: 256 }),
    profileImage: text('profile_image'),
    bio: text('bio'),
    skills: varchar('skills', { length: 256 }).array(),
    links: varchar('links', { length: 256 }).array(),

    // TODO: Ban management
    // banned: boolean("banned").default(false).notNull(),
    // bannedAt: timestamp("banned_at", { mode: "date" }),
    // bannedReason: text("banned_reason"),

    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (c) => [unique('email_wallet_unique').on(c.email, c.walletAddress)],
);

// Relations are defined in programsV2.ts to avoid circular dependencies
// See programV2Relations and userV2Relations exports in programsV2.ts

export type UserV2 = typeof usersV2Table.$inferSelect;
export type NewUserV2 = typeof usersV2Table.$inferInsert;
