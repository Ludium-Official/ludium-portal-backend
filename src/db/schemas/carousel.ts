import { boolean, integer, pgEnum, pgTable, timestamp, unique, uuid } from 'drizzle-orm/pg-core';
import { usersTable } from './users';

export const carouselItemTypes = ['program', 'post'] as const;
export const carouselItemTypeEnum = pgEnum('carousel_item_type', carouselItemTypes);

export const carouselItemsTable = pgTable(
  'carousel_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    itemType: carouselItemTypeEnum('item_type').notNull(),
    itemId: uuid('item_id').notNull(), // References either programs.id or posts.id
    displayOrder: integer('display_order').notNull(), // 1-5 for carousel ordering
    isActive: boolean('is_active').notNull().default(true),
    createdBy: uuid('created_by')
      .references(() => usersTable.id)
      .notNull(),
    createdAt: timestamp('created_at', { mode: 'date' }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { mode: 'date' })
      .defaultNow()
      .notNull()
      .$onUpdateFn(() => new Date()),
  },
  (t) => [
    // Ensure unique display order for active items
    unique().on(t.displayOrder, t.isActive),
    // Ensure each item can only appear once in active carousel
    unique().on(t.itemType, t.itemId, t.isActive),
  ],
);

// Types
export type CarouselItem = typeof carouselItemsTable.$inferSelect;
export type NewCarouselItem = typeof carouselItemsTable.$inferInsert;
export type CarouselItemUpdate = Omit<CarouselItem, 'id' | 'createdAt' | 'updatedAt' | 'itemId'>;
export type CarouselItemType = (typeof carouselItemTypes)[number];
