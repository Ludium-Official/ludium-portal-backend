import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createApplications } from './data/applications';
import { links, programLinks } from './data/links';
import { createMilestones } from './data/milestones';
import { keywords, programKeywords, programs } from './data/programs';
import { users } from './data/users';
import {
  applicationsTable,
  keywordsTable,
  linksTable,
  milestonesTable,
  programUserRolesTable,
  programsTable,
  programsToKeywordsTable,
  programsToLinksTable,
  usersTable,
} from './schemas';

// Define role types for program roles
type ProgramRoleType = 'sponsor' | 'validator' | 'builder';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://ludium:ludium@localhost:5435/ludium?search_path=public';

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL is not defined in environment variables.');
  process.exit(1);
}

async function seed() {
  try {
    const client = postgres(DATABASE_URL);
    const db = drizzle(client);
    console.log('🌱 Starting seed...');

    console.log('👤 Adding users...');
    const insertedUsers = await db
      .insert(usersTable)
      .values(users)
      .returning()
      .onConflictDoNothing();
    console.log(`✅ Added ${insertedUsers.length} users`);

    const userIds = insertedUsers.map((user) => user.id);

    // Manually set the first user as admin
    if (insertedUsers.length > 0) {
      await db
        .update(usersTable)
        .set({ isAdmin: true })
        .where(eq(usersTable.id, insertedUsers[0].id));
      console.log('✅ Set first user as admin');
    }

    // Add keywords
    if (keywords.length > 0) {
      console.log('🏷️ Adding keywords...');
      const keywordValues = keywords.map((name) => ({ name }));

      const insertedKeywords = await db
        .insert(keywordsTable)
        .values(keywordValues)
        .returning()
        .onConflictDoNothing();
      console.log(`✅ Added ${insertedKeywords.length} keywords`);

      // Create a map of keyword names to IDs
      const keywordMap: { [key: string]: string } = {};
      for (const keyword of insertedKeywords) {
        keywordMap[keyword.name] = keyword.id;
      }

      // Add programs
      if (userIds.length > 0) {
        console.log('📝 Adding programs...');

        // Distribute programs between sponsors (userIds[1] and userIds[4])
        // and assign validators (userIds[2] and userIds[4])
        const programsWithUsers = programs.map((program, index) => {
          const creatorId = index % 2 === 0 ? userIds[1] : userIds[4]; // Sponsors
          const validatorId = index % 2 === 0 ? userIds[2] : userIds[4]; // Validators

          return {
            ...program,
            creatorId,
            validatorId,
          };
        });

        const insertedPrograms = await db
          .insert(programsTable)
          .values(programsWithUsers)
          .returning()
          .onConflictDoNothing();
        console.log(`✅ Added ${insertedPrograms.length} programs`);

        // Add program-specific roles
        if (insertedPrograms.length > 0) {
          console.log('👥 Adding program-specific roles...');

          const programRoles = [];

          // For each program, add sponsor and validator roles
          for (const program of insertedPrograms) {
            // Creator is sponsor (auto-confirmed)
            programRoles.push({
              programId: program.id,
              userId: program.creatorId,
              roleType: 'sponsor' as ProgramRoleType,
            });

            // Make sure validatorId is not null
            if (program.validatorId) {
              // Validator needs confirmation
              programRoles.push({
                programId: program.id,
                userId: program.validatorId,
                roleType: 'validator' as ProgramRoleType,
              });
            }
          }

          if (programRoles.length > 0) {
            const insertedProgramRoles = await db
              .insert(programUserRolesTable)
              .values(programRoles)
              .returning()
              .onConflictDoNothing();
            console.log(`✅ Added ${insertedProgramRoles.length} program-specific roles`);
          }
        }

        // Add program-keyword relationships
        if (insertedPrograms.length > 0) {
          console.log('🔄 Adding program-keyword relationships...');

          const programKeywordValues = [];

          for (const mapping of programKeywords) {
            const programId = insertedPrograms[mapping.programIndex].id;

            for (const keywordName of mapping.keywords) {
              const keywordId = keywordMap[keywordName];
              if (keywordId) {
                programKeywordValues.push({
                  programId,
                  keywordId,
                });
              }
            }
          }

          if (programKeywordValues.length > 0) {
            const insertedProgramKeywords = await db
              .insert(programsToKeywordsTable)
              .values(programKeywordValues)
              .returning()
              .onConflictDoNothing();
            console.log(`✅ Added ${insertedProgramKeywords.length} program-keyword relationships`);
          }

          // Add links
          if (links.length > 0) {
            console.log('🔗 Adding links...');
            const insertedLinks = await db
              .insert(linksTable)
              .values(links)
              .returning()
              .onConflictDoNothing();
            console.log(`✅ Added ${insertedLinks.length} links`);

            // Create program-link relationships
            console.log('🔄 Adding program-link relationships...');
            const programLinkValues = [];

            for (const mapping of programLinks) {
              const programId = insertedPrograms[mapping.programIndex].id;

              for (const linkIndex of mapping.linkIndices) {
                const linkId = insertedLinks[linkIndex].id;
                programLinkValues.push({
                  programId,
                  linkId,
                });
              }
            }

            if (programLinkValues.length > 0) {
              const insertedProgramLinks = await db
                .insert(programsToLinksTable)
                .values(programLinkValues)
                .returning()
                .onConflictDoNothing();
              console.log(`✅ Added ${insertedProgramLinks.length} program-link relationships`);
            }
          }
        }

        // Add applications for programs
        if (insertedPrograms.length > 0) {
          console.log('📋 Adding applications...');
          const programIds = insertedPrograms.map((program) => program.id);
          const applications = createApplications(programIds, userIds);

          const insertedApplications = await db
            .insert(applicationsTable)
            .values(applications)
            .returning()
            .onConflictDoNothing();
          console.log(`✅ Added ${insertedApplications.length} applications`);

          // Add builder roles for approved applications
          const approvedApplications = insertedApplications.filter(
            (app) => app.status === 'approved',
          );
          if (approvedApplications.length > 0) {
            console.log('👷 Adding builder roles for approved applications...');

            const builderRoles = approvedApplications.map((app) => ({
              programId: app.programId,
              userId: app.applicantId,
              roleType: 'builder' as ProgramRoleType,
            }));

            if (builderRoles.length > 0) {
              const insertedBuilderRoles = await db
                .insert(programUserRolesTable)
                .values(builderRoles)
                .returning()
                .onConflictDoNothing();
              console.log(`✅ Added ${insertedBuilderRoles.length} builder roles`);
            }
          }

          // Add milestones for each application
          if (insertedApplications.length > 0) {
            console.log('🏆 Adding milestones for applications...');
            const applicationIds = insertedApplications.map((application) => application.id);
            const milestones = createMilestones(applicationIds);

            const insertedMilestones = await db
              .insert(milestonesTable)
              .values(milestones)
              .returning()
              .onConflictDoNothing();
            console.log(`✅ Added ${insertedMilestones.length} milestones`);
          }
        }
      }
    }

    console.log('✅ Database successfully seeded!');
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
}

seed();
