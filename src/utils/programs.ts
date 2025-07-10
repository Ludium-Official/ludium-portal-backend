import { programsTable } from '@/db/schemas';
import { programUserRolesTable } from '@/db/schemas';
import type { DB } from '@/types';
import { and, eq } from 'drizzle-orm';

export async function hasPrivateProgramAccess(
  programId: string,
  userId: string | null,
  db: DB,
): Promise<boolean> {
  if (!userId) return false;

  // Check if user is creator or has a role in the program
  const [program] = await db.select().from(programsTable).where(eq(programsTable.id, programId));
  if (!program) return false;

  if (program.creatorId === userId) {
    return true;
  }

  // Check if user has any role in the program
  const userRole = await db
    .select()
    .from(programUserRolesTable)
    .where(
      and(eq(programUserRolesTable.programId, programId), eq(programUserRolesTable.userId, userId)),
    );

  return userRole.length > 0;
}

/**
 * Check if a user can access a program based on its visibility rules:
 * - Public: Anyone can access
 * - Restricted: Anyone can access if they know the URL
 * - Private: Only invited users (creators, validators, builders) can access
 */
export async function canAccessProgram(
  programId: string,
  userId: string | null,
  db: DB,
): Promise<{ canAccess: boolean; reason?: string }> {
  const [program] = await db
    .select({ visibility: programsTable.visibility, creatorId: programsTable.creatorId })
    .from(programsTable)
    .where(eq(programsTable.id, programId));

  if (!program) {
    return { canAccess: false, reason: 'Program not found' };
  }

  // Public and restricted programs can be accessed by anyone
  if (program.visibility === 'public' || program.visibility === 'restricted') {
    return { canAccess: true };
  }

  // Private programs require specific access
  if (program.visibility === 'private') {
    if (!userId) {
      return { canAccess: false, reason: 'Authentication required for private programs' };
    }

    const hasAccess = await hasPrivateProgramAccess(programId, userId, db);
    return {
      canAccess: hasAccess,
      reason: hasAccess ? undefined : 'You do not have access to this private program',
    };
  }

  return { canAccess: false, reason: 'Invalid program visibility' };
}

/**
 * Check if a user can apply to a program based on visibility and role rules:
 * - Public: Anyone can apply
 * - Restricted: Anyone can apply if they know the URL
 * - Private: Only invited builders can apply
 */
export async function canApplyToProgram(
  programId: string,
  userId: string | null,
  db: DB,
): Promise<{ canApply: boolean; reason?: string }> {
  if (!userId) {
    return { canApply: false, reason: 'Authentication required to apply' };
  }

  const [program] = await db
    .select({ visibility: programsTable.visibility, creatorId: programsTable.creatorId })
    .from(programsTable)
    .where(eq(programsTable.id, programId));

  if (!program) {
    return { canApply: false, reason: 'Program not found' };
  }

  // Check if user is the program creator
  if (program.creatorId === userId) {
    return { canApply: false, reason: 'Program creators cannot apply to their own programs' };
  }

  // Public and restricted programs allow anyone to apply
  if (program.visibility === 'public' || program.visibility === 'restricted') {
    return { canApply: true };
  }

  // Private programs only allow invited builders to apply
  if (program.visibility === 'private') {
    const userRoles = await db
      .select()
      .from(programUserRolesTable)
      .where(
        and(
          eq(programUserRolesTable.programId, programId),
          eq(programUserRolesTable.userId, userId),
        ),
      );

    const hasBuilderRole = userRoles.some((role) => role.roleType === 'builder');
    const isValidator = userRoles.some((role) => role.roleType === 'validator');

    if (isValidator) {
      return { canApply: false, reason: 'Validators cannot apply to programs they validate' };
    }

    return {
      canApply: hasBuilderRole,
      reason: hasBuilderRole ? undefined : 'You must be invited to apply to this private program',
    };
  }

  return { canApply: false, reason: 'Invalid program visibility' };
}
