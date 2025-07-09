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
