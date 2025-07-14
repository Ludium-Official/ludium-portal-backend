import { type User, usersTable } from '@/db/schemas';
import type { Context } from '@/types';
import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';

export function requireUser(ctx: Context): User {
  if (!ctx.user) {
    throw new Error('Authentication required');
  }
  return ctx.user;
}

export function filterEmptyValues<T>(obj: Record<string, unknown>): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([_, value]) => value !== undefined),
  ) as Partial<T>;
}

export function validAndNotEmptyArray<T>(arr: T[]): boolean {
  return Array.isArray(arr) && arr.length > 0;
}

export async function getUserById(ctx: Context, id: string): Promise<User | null> {
  const [user] = await ctx.db.select().from(usersTable).where(eq(usersTable.id, id));
  return user || null;
}

/**
 * Calculate milestone amount from percentage of application price
 */
export function calculateMilestoneAmount(
  percentage: string | number,
  applicationPrice: string,
): string {
  const percentageNum = new BigNumber(percentage);
  const appPrice = new BigNumber(applicationPrice);
  return percentageNum.multipliedBy(appPrice).dividedBy(100).toString();
}

/**
 * Validate that milestone percentages sum to 100%
 */
export function validateMilestonePercentages(
  milestones: { percentage: string | number }[],
): boolean {
  const totalPercentage = milestones.reduce((sum, milestone) => {
    return sum.plus(new BigNumber(milestone.percentage));
  }, new BigNumber(0));

  return totalPercentage.isEqualTo(100);
}

/**
 * Calculate total milestone amounts for an application
 */
export function calculateMilestoneTotalAmount(
  milestones: { percentage: string | number }[],
  applicationPrice: string,
): string {
  return milestones
    .reduce((sum, milestone) => {
      const milestoneAmount = calculateMilestoneAmount(milestone.percentage, applicationPrice);
      return sum.plus(new BigNumber(milestoneAmount));
    }, new BigNumber(0))
    .toString();
}
