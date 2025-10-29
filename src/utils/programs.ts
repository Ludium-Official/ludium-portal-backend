import { programsTable } from '@/db/schemas';
import { applicationsTable, programUserRolesTable } from '@/db/schemas';
import type { DB } from '@/types';
import BigNumber from 'bignumber.js';
import { and, eq, inArray } from 'drizzle-orm';

export async function hasPrivateProgramAccess(
  programId: string,
  userId: string | null,
  db: DB,
): Promise<boolean> {
  if (!userId) return false;

  // Check if user is creator or has a role in the program
  const [program] = await db.select().from(programsTable).where(eq(programsTable.id, programId));
  if (!program) return false;

  if (program.sponsorId === userId) {
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
    .select({ visibility: programsTable.visibility, sponsorId: programsTable.sponsorId })
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
    .select({ visibility: programsTable.visibility, sponsorId: programsTable.sponsorId })
    .from(programsTable)
    .where(eq(programsTable.id, programId));

  if (!program) {
    return { canApply: false, reason: 'Program not found' };
  }

  // Check if user is the program creator
  if (program.sponsorId === userId) {
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

// Calculate total allocated funds across all accepted applications for a program
export async function calculateAllocatedFunds(programId: string, db: DB): Promise<BigNumber> {
  const applications = await db
    .select({ price: applicationsTable.price })
    .from(applicationsTable)
    .where(
      and(
        eq(applicationsTable.programId, programId),
        inArray(applicationsTable.status, ['accepted', 'completed', 'submitted']),
      ),
    );

  return applications.reduce((sum, app) => sum.plus(new BigNumber(app.price)), new BigNumber(0));
}

// Check if program should be marked as completed based on actual completion criteria
export async function checkAndUpdateProgramStatus(programId: string, db: DB): Promise<boolean> {
  const [program] = await db
    .select({
      price: programsTable.price,
      status: programsTable.status,
      deadline: programsTable.deadline,
    })
    .from(programsTable)
    .where(eq(programsTable.id, programId));

  if (
    !program ||
    program.status === 'completed' ||
    program.status === 'cancelled' ||
    program.status === 'closed'
  ) {
    return false;
  }

  // Program should only be marked as completed when:
  // 1. Deadline has passed, OR
  // 2. All applications are in 'completed' status

  // Check if deadline has passed
  if (program.deadline && new Date() > new Date(program.deadline)) {
    await db
      .update(programsTable)
      .set({ status: 'completed' })
      .where(eq(programsTable.id, programId));
    return true;
  }

  // Check if all applications are completed
  const applications = await db
    .select({ status: applicationsTable.status })
    .from(applicationsTable)
    .where(eq(applicationsTable.programId, programId));

  if (applications.length > 0) {
    const allCompleted = applications.every((app) => app.status === 'completed');
    if (allCompleted) {
      await db
        .update(programsTable)
        .set({ status: 'completed' })
        .where(eq(programsTable.id, programId));
      return true;
    }
  }

  return false;
}
