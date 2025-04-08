import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createApplications } from './data/applications';
import { links, programLinks } from './data/links';
import { createMilestones } from './data/milestones';
import { keywords, programKeywords, programs } from './data/programs';
import { createUserRoles, roles, users } from './data/users';
import { applicationsTable } from './schemas/applications';
import { keywordsTable } from './schemas/keywords';
import { linksTable } from './schemas/links';
import { milestonesTable } from './schemas/milestones';
import { programsTable, programsToKeywordsTable, programsToLinksTable } from './schemas/programs';
import { rolesTable } from './schemas/roles';
import { usersTable, usersToRolesTable } from './schemas/users';

const DATABASE_URL =
  process.env.DATABASE_URL || 'postgresql://ludium:ludium@localhost:5435/ludium?search_path=public';

async function seed() {
  try {
    const client = postgres(DATABASE_URL);
    const db = drizzle(client);
    console.log('🌱 Starting seed...');

    console.log('👑 Adding roles...');
    const insertedRoles = await db
      .insert(rolesTable)
      .values(roles)
      .returning()
      .onConflictDoNothing();

    const roleIds: { [key: string]: string } = {};
    for (const role of insertedRoles) {
      roleIds[role.name] = role.id;
    }
    console.log(`✅ Added ${insertedRoles.length} roles`);

    console.log('👤 Adding users...');
    const insertedUsers = await db
      .insert(usersTable)
      .values(users)
      .returning()
      .onConflictDoNothing();
    console.log(`✅ Added ${insertedUsers.length} users`);

    const userIds = insertedUsers.map((user) => user.id);

    if (userIds.length > 0 && Object.keys(roleIds).length > 0) {
      console.log('🔗 Creating user roles...');
      const userRoles = createUserRoles(userIds, roleIds);

      const insertedUserRoles = await db
        .insert(usersToRolesTable)
        .values(userRoles)
        .returning()
        .onConflictDoNothing();
      console.log(`✅ Created ${insertedUserRoles.length} user roles`);
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
