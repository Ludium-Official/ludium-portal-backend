import {
  applicationsTable,
  milestonesTable,
  programUserRolesTable,
  programsTable,
} from '@/db/schemas';
import type { DB } from '@/types/common';
import { and, eq } from 'drizzle-orm';

export async function isInSameScope(params: {
  db: DB;
  scope:
    | 'program_creator'
    | 'program_validator'
    | 'application_builder'
    | 'application_validator'
    | 'milestone_builder'
    | 'milestone_validator';
  userId: string;
  entityId: string;
}) {
  const { scope: entity, userId, entityId, db } = params;
  switch (entity) {
    case 'program_creator': {
      const [program] = await db
        .select({ creatorId: programsTable.creatorId })
        .from(programsTable)
        .where(eq(programsTable.id, entityId));

      if (program.creatorId !== userId) {
        return false;
      }
      return true;
    }
    case 'program_validator': {
      const [validatorRole] = await db
        .select()
        .from(programUserRolesTable)
        .where(
          and(
            eq(programUserRolesTable.programId, entityId),
            eq(programUserRolesTable.userId, userId),
            eq(programUserRolesTable.roleType, 'validator'),
          ),
        );

      if (!validatorRole) {
        return false;
      }
      return true;
    }
    case 'application_validator': {
      // get program by application id
      const [application] = await db
        .select({ programId: applicationsTable.programId })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, entityId));

      const [validatorRole] = await db
        .select()
        .from(programUserRolesTable)
        .where(
          and(
            eq(programUserRolesTable.programId, application.programId),
            eq(programUserRolesTable.userId, userId),
            eq(programUserRolesTable.roleType, 'validator'),
          ),
        );

      if (!validatorRole) {
        return false;
      }
      return true;
    }
    case 'application_builder': {
      const [application] = await db
        .select({ applicantId: applicationsTable.applicantId })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, entityId));

      if (application.applicantId !== userId) {
        return false;
      }
      return true;
    }
    case 'milestone_builder': {
      // get application by milestone id
      const [milestone] = await db
        .select({ applicationId: milestonesTable.applicationId })
        .from(milestonesTable)
        .where(eq(milestonesTable.id, entityId));

      const [application] = await db
        .select({ applicantId: applicationsTable.applicantId })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, milestone.applicationId));

      if (application.applicantId !== userId) {
        return false;
      }
      return true;
    }
    case 'milestone_validator': {
      // get program by milestone id
      const [milestone] = await db
        .select({ applicationId: milestonesTable.applicationId })
        .from(milestonesTable)
        .where(eq(milestonesTable.id, entityId));

      const [application] = await db
        .select({ programId: applicationsTable.programId })
        .from(applicationsTable)
        .where(eq(applicationsTable.id, milestone.applicationId));

      const [validatorRole] = await db
        .select()
        .from(programUserRolesTable)
        .where(
          and(
            eq(programUserRolesTable.programId, application.programId),
            eq(programUserRolesTable.userId, userId),
            eq(programUserRolesTable.roleType, 'validator'),
          ),
        );

      if (!validatorRole) {
        return false;
      }
      return true;
    }
    default: {
      throw new Error('Invalid entity');
    }
  }
}
