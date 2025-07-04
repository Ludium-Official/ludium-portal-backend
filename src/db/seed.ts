import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { createApplications } from './data/applications';
import { comments } from './data/comments';
import { programLinks } from './data/links';
import { postKeywords, posts } from './data/posts';
import { keywords, programKeywords, programs } from './data/programs';
import { users } from './data/users';
import {
  applicationsTable,
  commentsTable,
  keywordsTable,
  linksTable,
  milestonesTable,
  postsTable,
  postsToKeywordsTable,
  programUserRolesTable,
  programsTable,
  programsToKeywordsTable,
  programsToLinksTable,
  usersTable,
} from './schemas';

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
        .set({ role: 'admin' })
        .where(eq(usersTable.id, insertedUsers[0].id));
      console.log('✅ Set first user as admin');
    }

    // Add keywords
    console.log('🏷️ Adding keywords...');
    const keywordValues = keywords.map((name) => ({ name }));
    const insertedKeywords = await db
      .insert(keywordsTable)
      .values(keywordValues)
      .returning()
      .onConflictDoNothing();
    console.log(`✅ Added ${insertedKeywords.length} keywords`);

    // Create keyword map for easier reference later
    const keywordMap: Record<string, string> = {};
    for (const keyword of insertedKeywords) {
      keywordMap[keyword.name] = keyword.id;
    }

    // Add programs
    if (userIds.length > 0) {
      console.log('📚 Adding programs...');

      // Distribute programs between different sponsors
      const programsWithSponsors = programs.map((program, index) => {
        // Use different users as sponsors (cycling through userIds)
        const sponsorId = userIds[index % userIds.length];

        return {
          ...program,
          creatorId: sponsorId, // Use creatorId instead of sponsorId
        };
      });

      const insertedPrograms = await db
        .insert(programsTable)
        .values(programsWithSponsors)
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
      }

      // Add program user roles
      if (insertedPrograms.length > 0 && userIds.length > 2) {
        console.log('👥 Adding program user roles...');

        const programUserRoleValues = [];

        // For each program, add sample roles
        for (const [index, program] of insertedPrograms.entries()) {
          // Skip the first user (admin) and add roles to different users
          const validatorId = userIds[(index + 1) % userIds.length];
          const builderId = userIds[(index + 2) % userIds.length];

          programUserRoleValues.push(
            {
              programId: program.id,
              userId: validatorId,
              roleType: 'validator' as const, // Use roleType instead of role
              isApproved: true,
            },
            {
              programId: program.id,
              userId: builderId,
              roleType: 'builder' as const, // Use roleType instead of role
              isApproved: true,
            },
          );
        }

        if (programUserRoleValues.length > 0) {
          const insertedRoles = await db
            .insert(programUserRolesTable)
            .values(programUserRoleValues)
            .returning()
            .onConflictDoNothing();
          console.log(`✅ Added ${insertedRoles.length} program user roles`);
        }
      }

      // Add program links - Direct insertion approach
      if (insertedPrograms.length > 0) {
        console.log('🔗 Adding program links...');

        // First, create links directly in the links table
        const linksToAdd = [];
        const programLinksMap = new Map();

        for (const mapping of programLinks) {
          if (mapping.programIndex < insertedPrograms.length) {
            const programId = insertedPrograms[mapping.programIndex].id;

            // Store program ID with its link indices for later correlation
            if (!programLinksMap.has(programId)) {
              programLinksMap.set(programId, []);
            }

            // Add each link to be created
            for (const linkIndex of mapping.linkIndices) {
              linksToAdd.push({
                url: `https://example.com/link-${linkIndex}`,
                title: `Link ${linkIndex} for Program ${mapping.programIndex}`,
                programIndex: mapping.programIndex,
                linkIndex,
              });
            }
          }
        }

        if (linksToAdd.length > 0) {
          // Insert all links first
          const insertedLinks = await db
            .insert(linksTable)
            .values(linksToAdd.map(({ url, title }) => ({ url, title })))
            .returning()
            .onConflictDoNothing();

          console.log(`✅ Added ${insertedLinks.length} links`);

          // Now create the program-to-link relationships
          const programToLinkValues = [];

          for (let i = 0; i < insertedLinks.length; i++) {
            const linkData = linksToAdd[i];
            const programId = insertedPrograms[linkData.programIndex].id;
            const linkId = insertedLinks[i].id;

            programToLinkValues.push({
              programId,
              linkId,
            });
          }

          if (programToLinkValues.length > 0) {
            const insertedProgramLinks = await db
              .insert(programsToLinksTable)
              .values(programToLinkValues)
              .returning()
              .onConflictDoNothing();
            console.log(`✅ Added ${insertedProgramLinks.length} program links`);
          }
        }
      }

      // Add user links
      if (userIds.length > 0) {
        console.log('🔗 Adding user links...');

        const userLinksValues: {
          userId: string;
          url: string;
          title: string;
        }[] = [];

        for (const [index, user] of users.entries()) {
          if (index < insertedUsers.length && user.links && user.links.length > 0) {
            const userId = insertedUsers[index].id;

            for (const link of user.links) {
              userLinksValues.push({
                userId,
                url: link.url,
                title: link.title,
              });
            }
          }
        }

        if (userLinksValues.length > 0) {
          const insertedUserLinks = await db
            .insert(linksTable)
            .values(userLinksValues)
            .returning()
            .onConflictDoNothing();
          console.log(`✅ Added ${insertedUserLinks.length} user links`);
        }
      }

      // Add applications
      if (insertedPrograms.length > 0 && userIds.length > 0) {
        console.log('📝 Adding applications...');

        const applications = createApplications(insertedPrograms, userIds);

        if (applications.length > 0) {
          // Insert applications with explicit IDs
          const insertedApplications = await db
            .insert(applicationsTable)
            .values(applications)
            .returning()
            .onConflictDoNothing();
          console.log(`✅ Added ${insertedApplications.length} applications`);

          // Add milestones directly using the inserted applications
          if (insertedApplications.length > 0) {
            console.log('🏆 Adding milestones...');

            // Create milestones for each application
            const milestonesData = [];

            for (const application of insertedApplications) {
              // First milestone - Planning phase
              milestonesData.push({
                applicationId: application.id,
                title: 'Planning and Requirements',
                description: 'Define project requirements, create detailed plan and architecture',
                price: '2',
                currency: 'ETH',
                status: 'pending' as const,
              });

              // Second milestone - Development
              milestonesData.push({
                applicationId: application.id,
                title: 'Development',
                description: 'Implementation of core functionality based on approved plans',
                price: '5',
                currency: 'ETH',
                status: 'pending' as const,
              });

              // Third milestone - Testing & Delivery
              milestonesData.push({
                applicationId: application.id,
                title: 'Testing and Delivery',
                description: 'Final testing, bug fixes, and project delivery',
                price: '3',
                currency: 'ETH',
                status: 'pending' as const,
              });
            }

            if (milestonesData.length > 0) {
              const insertedMilestones = await db
                .insert(milestonesTable)
                .values(milestonesData)
                .returning()
                .onConflictDoNothing();
              console.log(`✅ Added ${insertedMilestones.length} milestones`);
            }
          }
        }
      }

      // Add posts
      if (userIds.length > 0) {
        console.log('📄 Adding posts...');

        // Distribute posts between different authors
        const postsWithAuthors = posts.map((post, index) => {
          // Use different users as authors (cycling through userIds)
          const authorId = userIds[index % userIds.length];

          return {
            ...post,
            authorId,
          };
        });

        const insertedPosts = await db
          .insert(postsTable)
          .values(postsWithAuthors)
          .returning()
          .onConflictDoNothing();
        console.log(`✅ Added ${insertedPosts.length} posts`);

        // Add post-keyword relationships
        if (insertedPosts.length > 0) {
          console.log('🔄 Adding post-keyword relationships...');

          const postKeywordValues = [];

          for (const mapping of postKeywords) {
            const postId = insertedPosts[mapping.postIndex].id;

            for (const keywordName of mapping.keywords) {
              const keywordId = keywordMap[keywordName];
              if (keywordId) {
                postKeywordValues.push({
                  postId,
                  keywordId,
                });
              }
            }
          }

          if (postKeywordValues.length > 0) {
            const insertedPostKeywords = await db
              .insert(postsToKeywordsTable)
              .values(postKeywordValues)
              .returning()
              .onConflictDoNothing();
            console.log(`✅ Added ${insertedPostKeywords.length} post-keyword relationships`);
          }
        }

        // Add comments to posts
        if (insertedPosts.length > 0 && userIds.length > 0) {
          console.log('💬 Adding comments...');

          // First, create a map to store inserted comment IDs for establishing parent-child relationships
          const commentIdMap: Record<number, string> = {};

          // Process comments in two phases:
          // 1. First add all top-level comments (without parent)
          // 2. Then add all replies (with parent)

          // Process comments without parents first
          const topLevelComments = comments.filter((comment) => comment.parentIndex === undefined);
          const topLevelCommentValues = topLevelComments.map((comment, index) => {
            const commentableId = insertedPosts[comment.commentableIndex].id;
            const authorId = userIds[comment.authorIndex % userIds.length];

            return {
              commentableType: comment.commentableType,
              commentableId,
              authorId,
              content: comment.content,
              parentId: null,
              originalIndex: index,
            };
          });

          if (topLevelCommentValues.length > 0) {
            const insertedTopLevelComments = await db
              .insert(commentsTable)
              .values(topLevelCommentValues.map(({ originalIndex, ...rest }) => rest))
              .returning()
              .onConflictDoNothing();

            // Store the mapping of original indices to inserted IDs
            for (let i = 0; i < insertedTopLevelComments.length; i++) {
              const originalIndex = topLevelCommentValues[i].originalIndex;
              commentIdMap[originalIndex] = insertedTopLevelComments[i].id;
            }

            console.log(`✅ Added ${insertedTopLevelComments.length} top-level comments`);
          }

          // Now process child comments
          const childComments = comments.filter((comment) => comment.parentIndex !== undefined);
          const childCommentValues = childComments.map((comment) => {
            const commentableId = insertedPosts[comment.commentableIndex].id;
            const authorId = userIds[comment.authorIndex % userIds.length];
            const parentId =
              comment.parentIndex !== undefined ? commentIdMap[comment.parentIndex] : null;

            return {
              commentableType: comment.commentableType,
              commentableId,
              authorId,
              content: comment.content,
              parentId,
            };
          });

          if (childCommentValues.length > 0) {
            const insertedChildComments = await db
              .insert(commentsTable)
              .values(childCommentValues)
              .returning()
              .onConflictDoNothing();

            console.log(`✅ Added ${insertedChildComments.length} reply comments`);
          }
        }
      }
    }

    console.log('✅ Seed complete!');
    await client.end();
  } catch (error) {
    console.error('❌ Error in seed:', error);
    process.exit(1);
  }
}

seed();
