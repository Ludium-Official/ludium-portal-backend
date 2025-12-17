import { filesTable } from '@/db/schemas';
import { emailVerificationsV2Table } from '@/db/schemas/v2/email-verifications';
import { educationsV2Table } from '@/db/schemas/v2/user-educations';
import { languagesV2Table, type NewLanguageV2 } from '@/db/schemas/v2/user-language';
import { workExperiencesV2Table } from '@/db/schemas/v2/user-work-experiences';
import { usersV2Table } from '@/db/schemas/v2/users';
import type { NewUserV2, UserV2 } from '@/db/schemas/v2/users';
import type {
  CreateUserV2Input,
  UpdateUserV2Input,
  UserV2QueryFilterInput,
  UsersV2QueryInput,
  UpdateProfileSectionV2Input,
  UpdateAboutSectionV2Input,
  UpdateExpertiseSectionV2Input,
  UpdateWorkExperienceSectionV2Input,
  UpdateEducationSectionV2Input,
} from '@/graphql/v2/inputs/users';
import type { Context } from '@/types';
import { and, asc, count, desc, eq, ilike, isNotNull, isNull, or } from 'drizzle-orm';
import { randomInt } from 'node:crypto';

type LoginType = 'google' | 'wallet' | 'farcaster';
type UserRole = 'user' | 'admin';

interface PaginatedUsersV2Result {
  users: UserV2[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export class UserV2Service {
  constructor(
    private db: Context['db'],
    private server: Context['server'],
  ) {}

  async getById(id: string): Promise<UserV2> {
    const startTime = Date.now();
    this.server.log.info(`🚀 Starting UserV2Service.getById for id: ${id}`);

    try {
      const [user] = await this.db
        .select()
        .from(usersV2Table)
        .where(eq(usersV2Table.id, Number.parseInt(id)));

      const duration = Date.now() - startTime;

      if (!user) {
        this.server.log.warn(`❌ User not found with id: ${id}`);
        throw new Error('User not found');
      }

      this.server.log.info(`✅ UserV2Service.getById completed in ${duration}ms`);
      return user;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ UserV2Service.getById failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async getMany(
    query?: typeof UsersV2QueryInput.$inferInput | null,
  ): Promise<PaginatedUsersV2Result> {
    const startTime = Date.now();
    const page = query?.page ?? 1;
    const limit = query?.limit ?? 10;
    const sortBy = query?.sortBy ?? 'createdAt';
    const sortOrder = query?.sortOrder ?? 'desc';
    const search = query?.search;
    const role = query?.role;
    const loginType = query?.loginType;
    const hasEmail = query?.hasEmail;

    this.server.log.info(`🚀 Starting UserV2Service.getMany with params: ${JSON.stringify(query)}`);

    try {
      const whereConditions = [];
      if (search) {
        whereConditions.push(
          or(
            ilike(usersV2Table.walletAddress, `%${search}%`),
            ilike(usersV2Table.email, `%${search}%`),
            ilike(usersV2Table.nickname, `%${search}%`),
          ),
        );
      }
      if (role) {
        whereConditions.push(eq(usersV2Table.role, role as UserRole));
      }
      if (loginType) {
        whereConditions.push(eq(usersV2Table.loginType, loginType as LoginType));
      }
      if (hasEmail !== undefined && hasEmail !== null) {
        whereConditions.push(hasEmail ? isNotNull(usersV2Table.email) : isNull(usersV2Table.email));
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;

      const [totalResult] = await this.db
        .select({ count: count() })
        .from(usersV2Table)
        .where(whereClause);
      const totalCount = totalResult.count;
      const totalPages = Math.ceil(totalCount / limit);
      const offset = (page - 1) * limit;

      const sortColumn = (() => {
        switch (sortBy) {
          case 'nickname':
            return usersV2Table.nickname;
          case 'updatedAt':
            return usersV2Table.updatedAt;
          default:
            return usersV2Table.createdAt;
        }
      })();
      const sortClause = sortOrder === 'asc' ? asc(sortColumn) : desc(sortColumn);

      const users = await this.db
        .select()
        .from(usersV2Table)
        .where(whereClause)
        .orderBy(sortClause)
        .limit(limit)
        .offset(offset);
      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ UserV2Service.getMany completed in ${duration}ms - found ${users.length} users`,
      );

      return {
        users,
        totalCount,
        totalPages,
        currentPage: page,
        hasNextPage: page < totalPages,
        hasPreviousPage: page > 1,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ UserV2Service.getMany failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async queryUsers(args: {
    filter?: (typeof UserV2QueryFilterInput.$inferInput)[] | null;
  }): Promise<UserV2[]> {
    const startTime = Date.now();
    const filter = args.filter ?? [];
    this.server.log.info(
      `🚀 Starting UserV2Service.queryUsers with filters: ${JSON.stringify(filter)}`,
    );
    try {
      const whereConditions = [];
      for (const filterItem of filter) {
        const { field, value } = filterItem;
        if (value !== undefined && value !== null) {
          switch (field) {
            case 'walletAddress':
              whereConditions.push(eq(usersV2Table.walletAddress, value));
              break;
            case 'email':
              whereConditions.push(eq(usersV2Table.email, value));
              break;
            case 'role':
              whereConditions.push(eq(usersV2Table.role, value as UserRole));
              break;
            case 'loginType':
              whereConditions.push(eq(usersV2Table.loginType, value as LoginType));
              break;
            case 'nickname':
              whereConditions.push(eq(usersV2Table.nickname, value));
              break;
            default:
              this.server.log.warn(`Unknown filter field: ${field}`);
          }
        }
      }
      const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
      const users = await this.db
        .select()
        .from(usersV2Table)
        .where(whereClause)
        .orderBy(desc(usersV2Table.createdAt));
      const duration = Date.now() - startTime;
      this.server.log.info(
        `✅ UserV2Service.queryUsers completed in ${duration}ms - found ${users.length} users`,
      );
      return users;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error(
        `❌ UserV2Service.queryUsers failed after ${duration}ms: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      throw error;
    }
  }

  async login(args: {
    walletAddress: string;
    loginType: string;
    email?: string | null;
  }): Promise<string> {
    const startTime = Date.now();
    try {
      const { email, walletAddress, loginType } = args;
      this.server.log.info({
        msg: '🚀 Starting V2 login process in Service',
        email,
        walletAddress,
        loginType,
      });

      const [foundUser] = await this.db
        .select()
        .from(usersV2Table)
        .where(
          or(eq(usersV2Table.email, email ?? ''), eq(usersV2Table.walletAddress, walletAddress)),
        );
      let user: UserV2 | null = null;

      if (!foundUser) {
        const [newUser] = await this.db
          .insert(usersV2Table)
          .values({
            email: email ?? null,
            walletAddress,
            loginType: loginType as LoginType,
            role: 'user',
          })
          .returning();
        user = newUser;
      } else {
        if (email && foundUser.email && foundUser.email !== email) {
          throw new Error('This wallet is already associated with a different email address');
        }
        if (walletAddress && foundUser.walletAddress && foundUser.walletAddress !== walletAddress) {
          throw new Error(
            'This email is already associated with a different wallet address. Please log in with your original authentication method.',
          );
        }

        const updateData: Partial<NewUserV2> = {};
        let needsUpdate = false;

        if (!foundUser.email && email) {
          updateData.email = email;
          needsUpdate = true;
        }
        if (!foundUser.walletAddress && walletAddress) {
          updateData.walletAddress = walletAddress;
          needsUpdate = true;
        }
        if (foundUser.loginType !== loginType) {
          updateData.loginType = loginType as LoginType;
          needsUpdate = true;
        }

        if (needsUpdate) {
          this.server.log.info({ msg: 'Updating existing user', updateData });
          const [updatedUser] = await this.db
            .update(usersV2Table)
            .set(updateData)
            .where(eq(usersV2Table.id, foundUser.id))
            .returning();
          user = updatedUser;
        } else {
          user = foundUser;
        }
      }

      if (!user) {
        throw new Error('User creation/update failed - no user object available');
      }

      const token = this.server.jwt.sign(
        { payload: { id: user.id, email: user.email, role: user.role } },
        { expiresIn: '7d' },
      );
      const duration = Date.now() - startTime;
      this.server.log.info({
        msg: '✅ V2 login completed successfully in Service',
        duration: `${duration}ms`,
        userId: user.id,
      });
      return token;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.server.log.error({
        msg: '❌ V2 login failed in Service',
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async create(input: typeof CreateUserV2Input.$inferInput): Promise<UserV2> {
    const userData: NewUserV2 = {
      loginType: input.loginType as LoginType,
      walletAddress: input.walletAddress,
      email: input.email ?? null,
      role: (input.role ?? 'user') as UserRole,
      nickname: input.nickname ?? null,
      location: input.location ?? null,
      profileImage: input.profileImage ?? null,
      userRole: input.userRole ?? null,
      skills: input.skills ?? null,
    };
    const [newUser] = await this.db.insert(usersV2Table).values(userData).returning();
    return newUser;
  }

  async update(input: typeof UpdateUserV2Input.$inferInput): Promise<UserV2> {
    const [existingUser] = await this.db
      .select()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, Number.parseInt(input.id as string)));
    if (!existingUser) {
      throw new Error('User not found');
    }
    const updateData: Partial<Omit<NewUserV2, 'id'>> = {};
    if (input.email !== undefined) updateData.email = input.email ?? null;
    if (input.walletAddress !== undefined && input.walletAddress !== null) {
      updateData.walletAddress = input.walletAddress;
    }
    if (input.nickname !== undefined) updateData.nickname = input.nickname ?? null;
    if (input.location !== undefined) updateData.location = input.location ?? null;
    if (input.profileImage !== undefined) updateData.profileImage = input.profileImage ?? null;
    if (input.userRole !== undefined) updateData.userRole = input.userRole ?? null;
    if (input.skills !== undefined) updateData.skills = input.skills ?? null;
    if (input.role !== undefined) updateData.role = (input.role ?? 'user') as UserRole;

    const [updatedUser] = await this.db
      .update(usersV2Table)
      .set(updateData)
      .where(eq(usersV2Table.id, Number.parseInt(input.id as string)))
      .returning();
    return updatedUser;
  }

  async delete(id: string): Promise<boolean> {
    const [existingUser] = await this.db
      .select()
      .from(usersV2Table)
      .where(eq(usersV2Table.id, Number.parseInt(id)));
    if (!existingUser) {
      throw new Error('User not found');
    }
    await this.db.delete(usersV2Table).where(eq(usersV2Table.id, Number.parseInt(id)));
    return true;
  }

  private generateVerificationCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  async requestEmailVerification(email: string, userId: number): Promise<boolean> {
    try {
      // Check if email is already verified for this user
      const [existingVerification] = await this.db
        .select()
        .from(emailVerificationsV2Table)
        .where(
          and(
            eq(emailVerificationsV2Table.userId, userId),
            eq(emailVerificationsV2Table.email, email),
            eq(emailVerificationsV2Table.verified, true),
          ),
        )
        .limit(1);

      if (existingVerification) {
        throw new Error('Email is already verified');
      }

      // Generate verification code
      const verificationCode = this.generateVerificationCode();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Invalidate previous unverified codes for this email
      await this.db
        .update(emailVerificationsV2Table)
        .set({ verified: false })
        .where(
          and(
            eq(emailVerificationsV2Table.userId, userId),
            eq(emailVerificationsV2Table.email, email),
            eq(emailVerificationsV2Table.verified, false),
          ),
        );

      // Create new verification record
      await this.db.insert(emailVerificationsV2Table).values({
        userId,
        email,
        verificationCode,
        verified: false,
        expiresAt,
      });

      // Send email
      await this.server.emailService.sendVerificationEmail(email, verificationCode);

      this.server.log.info({
        msg: 'Email verification code sent',
        userId,
        email,
      });

      return true;
    } catch (error) {
      this.server.log.error({
        msg: 'Failed to request email verification',
        error: error instanceof Error ? error.message : String(error),
        userId,
        email,
      });
      throw error;
    }
  }

  async verifyEmail(email: string, verificationCode: string, userId: number): Promise<boolean> {
    try {
      const [verification] = await this.db
        .select()
        .from(emailVerificationsV2Table)
        .where(
          and(
            eq(emailVerificationsV2Table.userId, userId),
            eq(emailVerificationsV2Table.email, email),
            eq(emailVerificationsV2Table.verificationCode, verificationCode),
          ),
        )
        .orderBy(desc(emailVerificationsV2Table.createdAt))
        .limit(1);

      if (!verification) {
        throw new Error('Invalid verification code');
      }

      if (verification.verified) {
        throw new Error('Email is already verified');
      }

      if (verification.expiresAt < new Date()) {
        throw new Error('Verification code has expired');
      }

      // Mark as verified
      await this.db
        .update(emailVerificationsV2Table)
        .set({ verified: true })
        .where(eq(emailVerificationsV2Table.id, verification.id));

      this.server.log.info({
        msg: 'Email verified successfully',
        userId,
        email,
      });

      return true;
    } catch (error) {
      this.server.log.error({
        msg: 'Failed to verify email',
        error: error instanceof Error ? error.message : String(error),
        userId,
        email,
      });
      throw error;
    }
  }

  private async isEmailVerified(email: string, userId: number): Promise<boolean> {
    const [verification] = await this.db
      .select()
      .from(emailVerificationsV2Table)
      .where(
        and(
          eq(emailVerificationsV2Table.userId, userId),
          eq(emailVerificationsV2Table.email, email),
          eq(emailVerificationsV2Table.verified, true),
        ),
      )
      .limit(1);

    return !!verification;
  }

  async updateProfileSection(
    input: typeof UpdateProfileSectionV2Input.$inferInput,
    userId: number,
  ): Promise<UserV2> {
    try {
      const [existingUser] = await this.db
        .select()
        .from(usersV2Table)
        .where(eq(usersV2Table.id, userId));

      if (!existingUser) {
        throw new Error('User not found');
      }

      // Check if email is changed
      const emailChanged = existingUser.email !== input.email;

      // If email is changed, require verification
      if (emailChanged) {
        if (!input.verificationCode) {
          throw new Error('Email verification code is required when changing email');
        }

        const isVerified = await this.isEmailVerified(input.email, userId);
        if (!isVerified) {
          // Verify the code
          await this.verifyEmail(input.email, input.verificationCode, userId);
        }
      }

      const updateData: Partial<Omit<NewUserV2, 'id'>> = {
        nickname: input.nickname,
        email: input.email,
        location: input.location,
      };

      // Handle profile image upload
      if (input.profileImage) {
        // Delete existing profile image if exists
        if (existingUser.profileImage) {
          const urlPattern = /https:\/\/storage\.googleapis\.com\/[^/]+\/(.+)/;
          const match = existingUser.profileImage.match(urlPattern);
          if (match) {
            const filePath = match[1];
            const [existingFile] = await this.db
              .select()
              .from(filesTable)
              .where(eq(filesTable.path, filePath))
              .limit(1);

            if (existingFile) {
              await this.server.fileManager.deleteFile(existingFile.id);
            }
          }
        }

        const fileUrl = await this.server.fileManager.uploadFile({
          file: input.profileImage,
          userId: String(userId),
          directory: 'users',
        });
        updateData.profileImage = fileUrl;
      }

      const [updatedUser] = await this.db
        .update(usersV2Table)
        .set(updateData)
        .where(eq(usersV2Table.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error('Failed to update profile');
      }

      return updatedUser;
    } catch (error) {
      this.server.log.error({
        msg: 'Failed to update profile section',
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  async updateAboutSection(
    input: typeof UpdateAboutSectionV2Input.$inferInput,
    userId: number,
  ): Promise<UserV2> {
    try {
      if (input.about.length > 1000) {
        throw new Error('About section must be 1000 characters or less');
      }

      const [updatedUser] = await this.db
        .update(usersV2Table)
        .set({ about: input.about })
        .where(eq(usersV2Table.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error('User not found');
      }

      return updatedUser;
    } catch (error) {
      this.server.log.error({
        msg: 'Failed to update about section',
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  async updateExpertiseSection(
    input: typeof UpdateExpertiseSectionV2Input.$inferInput,
    userId: number,
  ): Promise<UserV2> {
    try {
      // Update user table
      const updateData: Partial<Omit<NewUserV2, 'id'>> = {
        userRole: input.role,
        skills: input.skills ?? null,
      };

      const [updatedUser] = await this.db
        .update(usersV2Table)
        .set(updateData)
        .where(eq(usersV2Table.id, userId))
        .returning();

      if (!updatedUser) {
        throw new Error('User not found');
      }

      // Update languages
      if (input.languages !== undefined) {
        // Delete existing languages
        await this.db.delete(languagesV2Table).where(eq(languagesV2Table.userId, userId));

        // Insert new languages
        if (input.languages != null && input.languages.length > 0) {
          const newLanguages: NewLanguageV2[] = input.languages.map((lang) => ({
            userId,
            language: lang.language,
            proficiency: lang.proficiency,
          }));
          await this.db.insert(languagesV2Table).values(newLanguages);
        }
      }

      return updatedUser;
    } catch (error) {
      this.server.log.error({
        msg: 'Failed to update expertise section',
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  async updateWorkExperienceSection(
    input: typeof UpdateWorkExperienceSectionV2Input.$inferInput,
    userId: number,
  ): Promise<UserV2> {
    try {
      // Get existing work experiences
      const existingExperiences = await this.db
        .select()
        .from(workExperiencesV2Table)
        .where(
          and(eq(workExperiencesV2Table.userId, userId), isNull(workExperiencesV2Table.deletedAt)),
        );

      const inputIds = new Set(
        input.workExperiences
          .map((exp) => (exp.id ? Number.parseInt(exp.id as string) : null))
          .filter((id): id is number => id !== null),
      );

      // Soft delete removed experiences
      const toDelete = existingExperiences.filter((exp) => !inputIds.has(exp.id));
      if (toDelete.length > 0) {
        await this.db
          .update(workExperiencesV2Table)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(workExperiencesV2Table.userId, userId),
              or(...toDelete.map((exp) => eq(workExperiencesV2Table.id, exp.id))),
            ),
          );
      }

      // Update or insert experiences
      for (const exp of input.workExperiences) {
        if (exp.id) {
          const expId = Number.parseInt(exp.id as string);
          // Update existing
          await this.db
            .update(workExperiencesV2Table)
            .set({
              company: exp.company,
              role: exp.role,
              employmentType: exp.employmentType,
              currentWork: exp.currentWork,
              startYear: exp.startYear,
              startMonth: exp.startMonth ?? null,
              endYear: exp.currentWork ? null : (exp.endYear ?? null),
              endMonth: exp.currentWork ? null : (exp.endMonth ?? null),
              deletedAt: null, // Restore if was deleted
            })
            .where(eq(workExperiencesV2Table.id, expId));
        } else {
          // Insert new
          await this.db.insert(workExperiencesV2Table).values({
            userId,
            company: exp.company,
            role: exp.role,
            employmentType: exp.employmentType,
            currentWork: exp.currentWork,
            startYear: exp.startYear,
            startMonth: exp.startMonth ?? null,
            endYear: exp.currentWork ? null : (exp.endYear ?? null),
            endMonth: exp.currentWork ? null : (exp.endMonth ?? null),
          });
        }
      }

      const [user] = await this.db.select().from(usersV2Table).where(eq(usersV2Table.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      this.server.log.error({
        msg: 'Failed to update work experience section',
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }

  async updateEducationSection(
    input: typeof UpdateEducationSectionV2Input.$inferInput,
    userId: number,
  ): Promise<UserV2> {
    try {
      // Get existing educations
      const existingEducations = await this.db
        .select()
        .from(educationsV2Table)
        .where(and(eq(educationsV2Table.userId, userId), isNull(educationsV2Table.deletedAt)));

      const inputIds = new Set(
        input.educations
          .map((edu) => (edu.id ? Number.parseInt(edu.id as string) : null))
          .filter((id): id is number => id !== null),
      );

      // Soft delete removed educations
      const toDelete = existingEducations.filter((edu) => !inputIds.has(edu.id));
      if (toDelete.length > 0) {
        await this.db
          .update(educationsV2Table)
          .set({ deletedAt: new Date() })
          .where(
            and(
              eq(educationsV2Table.userId, userId),
              or(...toDelete.map((edu) => eq(educationsV2Table.id, edu.id))),
            ),
          );
      }

      // Update or insert educations
      for (const edu of input.educations) {
        if (edu.id) {
          const eduId = Number.parseInt(edu.id as string);
          // Update existing
          await this.db
            .update(educationsV2Table)
            .set({
              school: edu.school,
              degree: edu.degree ?? null,
              study: edu.study ?? null,
              attendedStartDate: edu.attendedStartDate ?? null,
              attendedEndDate: edu.attendedEndDate ?? null,
              deletedAt: null, // Restore if was deleted
            })
            .where(eq(educationsV2Table.id, eduId));
        } else {
          // Insert new
          await this.db.insert(educationsV2Table).values({
            userId,
            school: edu.school,
            degree: edu.degree ?? null,
            study: edu.study ?? null,
            attendedStartDate: edu.attendedStartDate ?? null,
            attendedEndDate: edu.attendedEndDate ?? null,
          });
        }
      }

      const [user] = await this.db.select().from(usersV2Table).where(eq(usersV2Table.id, userId));

      if (!user) {
        throw new Error('User not found');
      }

      return user;
    } catch (error) {
      this.server.log.error({
        msg: 'Failed to update education section',
        error: error instanceof Error ? error.message : String(error),
        userId,
      });
      throw error;
    }
  }
}
