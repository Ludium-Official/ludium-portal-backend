import buildServer from '@/config/server';
import { files } from './data/files';
import { createUserRoles, roles, users } from './data/users';
import { filesTable } from './schemas/files';
import { rolesTable, usersTable, usersToRolesTable } from './schemas/users';

async function seed() {
  try {
    const server = await buildServer();
    console.log('🌱 Starting seed...');

    console.log('👑 Adding roles...');
    const insertedRoles = await server.db
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
    const insertedUsers = await server.db
      .insert(usersTable)
      .values(users)
      .returning()
      .onConflictDoNothing();
    console.log(`✅ Added ${insertedUsers.length} users`);

    const userIds = insertedUsers.map((user) => user.id);

    if (userIds.length > 0 && Object.keys(roleIds).length > 0) {
      console.log('🔗 Creating user roles...');
      const userRoles = createUserRoles(userIds, roleIds);

      const insertedUserRoles = await server.db
        .insert(usersToRolesTable)
        .values(userRoles)
        .returning()
        .onConflictDoNothing();
      console.log(`✅ Created ${insertedUserRoles.length} user roles`);
    }

    if (userIds.length > 0) {
      console.log('📁 Adding files...');
      const filesWithUsers = files.map((file, index) => ({
        ...file,
        uploadedById: userIds[index % userIds.length],
      }));

      const insertedFiles = await server.db
        .insert(filesTable)
        .values(filesWithUsers)
        .returning()
        .onConflictDoNothing();
      console.log(`✅ Added ${insertedFiles.length} files`);

      console.log('✅ Files are already linked to users via uploadedById field');
    }

    console.log('✅ Database successfully seeded!');
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}

seed()
  .then(() => process.exit(0))
  .catch((error) => console.error('❌ Critical error:', error));
