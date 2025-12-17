import type { Context } from '@/types';
import { languagesV2Table, type LanguageV2 } from '@/db/schemas/v2/user-language';
import {
  workExperiencesV2Table,
  type WorkExperienceV2,
} from '@/db/schemas/v2/user-work-experiences';
import { educationsV2Table, type EducationV2 } from '@/db/schemas/v2/user-educations';
import { and, inArray, isNull } from 'drizzle-orm';
import DataLoader from 'dataloader';

/**
 * Languages DataLoader
 * 배치로 사용자들의 언어 정보를 가져옵니다
 */
export function createLanguagesLoader(ctx: Context) {
  return new DataLoader<number, LanguageV2[]>(
    async (userIds) => {
      if (userIds.length === 0) return [];

      const allLanguages = await ctx.db
        .select()
        .from(languagesV2Table)
        .where(inArray(languagesV2Table.userId, [...new Set(userIds)]));

      // userId별로 그룹화
      const languagesByUserId = new Map<number, LanguageV2[]>();
      for (const language of allLanguages) {
        const existing = languagesByUserId.get(language.userId) || [];
        existing.push(language);
        languagesByUserId.set(language.userId, existing);
      }

      // userId 순서대로 반환 (빈 배열이라도 반환)
      return userIds.map((userId) => languagesByUserId.get(userId) || []);
    },
    {
      cache: true,
    },
  );
}

/**
 * Work Experiences DataLoader
 * 배치로 사용자들의 경력 정보를 가져옵니다
 */
export function createWorkExperiencesLoader(ctx: Context) {
  return new DataLoader<number, WorkExperienceV2[]>(
    async (userIds) => {
      if (userIds.length === 0) return [];

      const allExperiences = await ctx.db
        .select()
        .from(workExperiencesV2Table)
        .where(
          and(
            inArray(workExperiencesV2Table.userId, [...new Set(userIds)]),
            isNull(workExperiencesV2Table.deletedAt),
          ),
        );

      // userId별로 그룹화
      const experiencesByUserId = new Map<number, WorkExperienceV2[]>();
      for (const experience of allExperiences) {
        const existing = experiencesByUserId.get(experience.userId) || [];
        existing.push(experience);
        experiencesByUserId.set(experience.userId, existing);
      }

      // userId 순서대로 반환
      return userIds.map((userId) => experiencesByUserId.get(userId) || []);
    },
    {
      cache: true,
    },
  );
}

/**
 * Educations DataLoader
 * 배치로 사용자들의 학력 정보를 가져옵니다
 */
export function createEducationsLoader(ctx: Context) {
  return new DataLoader<number, EducationV2[]>(
    async (userIds) => {
      if (userIds.length === 0) return [];

      const allEducations = await ctx.db
        .select()
        .from(educationsV2Table)
        .where(
          and(
            inArray(educationsV2Table.userId, [...new Set(userIds)]),
            isNull(educationsV2Table.deletedAt),
          ),
        );

      // userId별로 그룹화
      const educationsByUserId = new Map<number, EducationV2[]>();
      for (const education of allEducations) {
        const existing = educationsByUserId.get(education.userId) || [];
        existing.push(education);
        educationsByUserId.set(education.userId, existing);
      }

      // userId 순서대로 반환
      return userIds.map((userId) => educationsByUserId.get(userId) || []);
    },
    {
      cache: true,
    },
  );
}

