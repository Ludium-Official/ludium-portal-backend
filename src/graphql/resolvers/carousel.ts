import { type CarouselItemUpdate, carouselItemsTable } from '@/db/schemas';
import { postsTable } from '@/db/schemas/posts';
import { programsTable } from '@/db/schemas/programs';
import type { CreateCarouselItemInput, UpdateCarouselItemInput } from '@/graphql/types/carousel';
import type { Args, Context, Root } from '@/types';
import { filterEmptyValues, requireUser } from '@/utils';
import { and, asc, eq, ne } from 'drizzle-orm';

export async function getCarouselItemsResolver(_root: Root, _args: Args, ctx: Context) {
  // Get active carousel items
  const carouselItems = await ctx.db
    .select()
    .from(carouselItemsTable)
    .where(eq(carouselItemsTable.isActive, true))
    .orderBy(asc(carouselItemsTable.displayOrder));

  // Fetch the actual programs and posts data
  const enrichedItems = await Promise.all(
    carouselItems.map(async (item) => {
      if (item.itemType === 'program') {
        const [program] = await ctx.db
          .select()
          .from(programsTable)
          .where(eq(programsTable.id, item.itemId));

        return program ? { ...item, data: program } : null;
      }

      if (item.itemType === 'post') {
        const [post] = await ctx.db.select().from(postsTable).where(eq(postsTable.id, item.itemId));

        return post ? { ...item, data: post } : null;
      }

      return null;
    }),
  );

  // Filter out items where the referenced program/post no longer exists
  return enrichedItems.filter((item): item is NonNullable<typeof item> => item !== null);
}

export async function createCarouselItemResolver(
  _root: Root,
  args: { input: typeof CreateCarouselItemInput.$inferInput },
  ctx: Context,
) {
  const user = requireUser(ctx);

  // Check if we've reached the maximum limit (5 items)
  const activeItems = await ctx.db
    .select()
    .from(carouselItemsTable)
    .where(eq(carouselItemsTable.isActive, true));

  if (activeItems.length >= 5) {
    throw new Error('Maximum number of carousel items (5) reached');
  }

  // Check if item already exists in active carousel
  const existingItem = await ctx.db
    .select()
    .from(carouselItemsTable)
    .where(
      and(
        eq(carouselItemsTable.itemType, args.input.itemType),
        eq(carouselItemsTable.itemId, args.input.itemId),
        eq(carouselItemsTable.isActive, true),
      ),
    );

  if (existingItem.length > 0) {
    throw new Error('This item is already in the active carousel');
  }

  // Validate displayOrder for active items to avoid unique constraint issues
  let finalDisplayOrder = args.input.displayOrder;
  if (args.input.isActive) {
    const existingDisplayOrder = activeItems.find(
      (item) => item.displayOrder === args.input.displayOrder,
    );

    if (existingDisplayOrder) {
      // Find the next available display order
      const usedOrders = activeItems.map((item) => item.displayOrder).sort((a, b) => a - b);
      finalDisplayOrder = 1;
      for (const order of usedOrders) {
        if (finalDisplayOrder === order) {
          finalDisplayOrder++;
        } else {
          break;
        }
      }
    }
  }

  // Verify the referenced item exists
  if (args.input.itemType === 'program') {
    const [program] = await ctx.db
      .select({ id: programsTable.id })
      .from(programsTable)
      .where(eq(programsTable.id, args.input.itemId));

    if (!program) {
      throw new Error('Referenced program does not exist');
    }
  } else if (args.input.itemType === 'post') {
    const [post] = await ctx.db
      .select({ id: postsTable.id })
      .from(postsTable)
      .where(eq(postsTable.id, args.input.itemId));

    if (!post) {
      throw new Error('Referenced post does not exist');
    }
  }

  const [carouselItem] = await ctx.db
    .insert(carouselItemsTable)
    .values({
      ...args.input,
      displayOrder: finalDisplayOrder,
      createdBy: user.id,
    })
    .returning();

  return carouselItem;
}

export async function updateCarouselItemResolver(
  _root: Root,
  args: { input: typeof UpdateCarouselItemInput.$inferInput },
  ctx: Context,
) {
  requireUser(ctx);

  // If updating isActive to true, check the limit
  if (args.input.isActive === true) {
    const activeItems = await ctx.db
      .select()
      .from(carouselItemsTable)
      .where(
        and(
          eq(carouselItemsTable.isActive, true),
          // Exclude the current item being updated
          ne(carouselItemsTable.id, args.input.id),
        ),
      );

    if (activeItems.length >= 5) {
      throw new Error('Maximum number of active carousel items (5) reached');
    }
  }

  const filteredData = filterEmptyValues<CarouselItemUpdate>(args.input);
  const [carouselItem] = await ctx.db
    .update(carouselItemsTable)
    .set(filteredData)
    .where(eq(carouselItemsTable.id, args.input.id))
    .returning();

  if (!carouselItem) {
    throw new Error('Carousel item not found');
  }

  return carouselItem;
}

export async function deleteCarouselItemResolver(_root: Root, args: { id: string }, ctx: Context) {
  requireUser(ctx);

  const [carouselItem] = await ctx.db
    .delete(carouselItemsTable)
    .where(eq(carouselItemsTable.id, args.id))
    .returning();

  if (!carouselItem) {
    throw new Error('Carousel item not found');
  }

  return carouselItem;
}

export async function reorderCarouselItemsResolver(
  _root: Root,
  args: { items: { id: string; displayOrder: number }[] },
  ctx: Context,
) {
  requireUser(ctx);

  const existingItems = await ctx.db
    .select()
    .from(carouselItemsTable)
    .where(eq(carouselItemsTable.isActive, true));

  const existingIds = new Set(existingItems.map((item) => item.id));

  for (const { id } of args.items) {
    if (!existingIds.has(id)) {
      throw new Error(`Carousel item with ID ${id} not found or not active`);
    }
  }

  const updates = await Promise.all(
    args.items.map(({ id, displayOrder }) =>
      ctx.db
        .update(carouselItemsTable)
        .set({ displayOrder })
        .where(eq(carouselItemsTable.id, id))
        .returning(),
    ),
  );

  return updates.flat();
}
