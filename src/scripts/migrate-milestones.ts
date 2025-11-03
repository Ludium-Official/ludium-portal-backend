import "dotenv/config";
import { sql } from "drizzle-orm";
import { drizzle as drizzleDb1 } from "drizzle-orm/postgres-js";
import { drizzle as drizzleDb2 } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { applicationsTable } from "../db/schemas/applications";
import { milestonesTable } from "../db/schemas/milestones";
import { programsTable } from "../db/schemas/programs";
import { usersTable } from "../db/schemas/users";
import { applicationsV2Table } from "../db/schemas/v2/applications";
import {
  type NewMilestoneV2,
  milestonesV2Table,
} from "../db/schemas/v2/milestones";
import { programsV2Table } from "../db/schemas/v2/programs";
import { usersV2Table } from "../db/schemas/v2/users";

type MilestoneStatusV2 = "draft" | "under_review" | "in_progress" | "completed";

/**
 * V1 status를 V2 status로 매핑
 */
function mapStatus(v1Status: string): MilestoneStatusV2 {
  const statusMap: Record<string, MilestoneStatusV2> = {
    draft: "draft",
    pending: "under_review",
    submitted: "in_progress",
    completed: "completed",
    rejected: "draft", // rejected는 draft로 리셋
  };

  return statusMap[v1Status] || "draft";
}

async function migrateMilestones() {
  console.log("Starting milestone migration...");

  const db1Url = process.env.PROD_DB_URL;
  const db2Url = process.env.DEV_DB_URL;

  if (!db1Url || !db2Url) {
    console.error(
      "Error: Please define PROD_DB_URL and DEV_DB_URL in your .env file."
    );
    process.exit(1);
  }

  const client1 = postgres(db1Url);
  const db1 = drizzleDb1(client1);

  const client2 = postgres(db2Url);
  const db2 = drizzleDb2(client2);

  try {
    // V1 milestones 조회
    console.log("Fetching milestones from V1 database...");
    const v1Milestones = await db1
      .select({
        id: milestonesTable.id,
        applicationId: milestonesTable.applicationId,
        title: milestonesTable.title,
        description: milestonesTable.description,
        summary: milestonesTable.summary,
        price: milestonesTable.price,
        status: milestonesTable.status,
        file: milestonesTable.file,
        deadline: milestonesTable.deadline,
        createdAt: milestonesTable.createdAt,
        updatedAt: milestonesTable.updatedAt,
      })
      .from(milestonesTable);

    console.log(`Found ${v1Milestones.length} milestones to migrate.`);

    if (v1Milestones.length === 0) {
      console.log("No milestones to migrate.");
      return;
    }

    // V1 applications 조회 (application -> applicant_id 매핑용)
    console.log("Fetching V1 applications...");
    const v1Applications = await db1
      .select({
        id: applicationsTable.id,
        applicantId: applicationsTable.applicantId,
        programId: applicationsTable.programId,
        name: applicationsTable.name,
      })
      .from(applicationsTable);

    // V2 데이터 조회
    console.log("Fetching V2 reference data...");
    const v2Applications = await db2.select().from(applicationsV2Table);
    const v2Programs = await db2.select().from(programsV2Table);
    const v2Users = await db2.select().from(usersV2Table);

    // V1 programs 조회 (program name으로 매핑용)
    const v1Programs = await db1
      .select({
        id: programsTable.id,
        name: programsTable.name,
        type: programsTable.type,
      })
      .from(programsTable);

    // V1 users 조회 (walletAddress 매핑용)
    const v1Users = await db1
      .select({
        id: usersTable.id,
        walletAddress: usersTable.walletAddress,
      })
      .from(usersTable);

    // 매핑 테이블 생성
    // V1 application id -> V1 applicant id (빌더)
    const v1ApplicationIdToApplicantId = new Map<string, string>();
    for (const application of v1Applications) {
      v1ApplicationIdToApplicantId.set(application.id, application.applicantId);
    }

    // V1 application id -> V2 application id
    // V2 applications는 이미 마이그레이션되어 있다고 가정
    // V1 application의 programId와 applicantId로 매칭할 수 있음
    const v1ApplicationIdToV2ApplicationId = new Map<string, number>();
    const testApplicationIds = new Map<string, string>();
    const fundingApplicationIds = new Map<string, string>();
    for (const v1App of v1Applications) {
      // 테스트 데이터로 보이는 어플리케이션은 제외
      const testProgramIds = [
        "d6ebc523-f7e8-4f11-b576-db9276df9a93",
        "03cd7445-41f3-4e2b-b9cb-95457a3f600b",
        "313c8840-2ca5-4045-90c1-1c236cd66258",
      ];
      if (testProgramIds.includes(v1App.programId)) {
        console.log("Test application was skipped: ", v1App.id, v1App.name);
        testApplicationIds.set(v1App.id, v1App.name);
        continue;
      }

      // V1 program name 찾기
      const v1Program = v1Programs.find((p) => p.id === v1App.programId);

      if (v1Program?.type === "funding") {
        console.log("Funding program was skipped: ", v1App.id, v1App.name);
        fundingApplicationIds.set(v1App.id, v1App.name);
        continue;
      }

      // TEST START
      if (v1App.id === "8edf758e-c468-4085-8bda-145de6769e8b") {
        console.log("1. Something wrong...");
      }

      if (!v1Program) {
        console.log("1. Not found: ", v1App.id, v1App.name);
        continue;
      }

      // V2 program id 찾기
      const v2Program = v2Programs.find((p) => p.title === v1Program.name);
      if (!v2Program) {
        console.log("2. Not found: ", v1Program.name);
        continue;
      }

      // TEST START
      if (v1App.id === "8edf758e-c468-4085-8bda-145de6769e8b") {
        console.log("Something wrong...");
      }

      // V1 applicant wallet address 찾기
      const v1Applicant = v1Users.find((u) => u.id === v1App.applicantId);
      if (!v1Applicant?.walletAddress) {
        console.log("3. Not found: ", v1App.applicantId);
        continue;
      }

      // V2 user id 찾기
      const v2User = v2Users.find(
        (u) => u.walletAddress === v1Applicant.walletAddress
      );
      if (!v2User) {
        console.log("4. Not found: ", v1Applicant.walletAddress);
        continue;
      }

      // V2 application 찾기 (programId와 applicantId로)
      const v2App = v2Applications.find((a) => a.title === v1App.name);
      if (v2App) {
        v1ApplicationIdToV2ApplicationId.set(v1App.id, v2App.id);
      } else {
        console.log(
          "5. Not found: ",
          v1App.id,
          v1App.name,
          v2Program.title,
          v2User.id
        );
      }
    }

    // V1 applicant id -> walletAddress -> V2 user id
    const v1UserIdToWalletAddress = new Map<string, string>();
    for (const user of v1Users) {
      if (user.walletAddress) {
        v1UserIdToWalletAddress.set(user.id, user.walletAddress);
      }
    }

    const walletAddressToV2UserId = new Map<string, number>();
    for (const user of v2Users) {
      walletAddressToV2UserId.set(user.walletAddress, user.id);
    }

    // V1 program id -> program name
    const v1ProgramIdToName = new Map<string, string>();
    for (const program of v1Programs) {
      v1ProgramIdToName.set(program.id, program.name);
    }

    // program name -> V2 program id
    const programNameToV2Id = new Map<string, number>();
    for (const program of v2Programs) {
      programNameToV2Id.set(program.title, program.id);
    }

    // V2 application id -> V2 program id
    const v2ApplicationIdToProgramId = new Map<number, number>();
    for (const app of v2Applications) {
      v2ApplicationIdToProgramId.set(app.id, app.programId);
    }

    console.log(
      `Found ${v2Applications.length} V2 applications, ${v2Programs.length} V2 programs, ${v2Users.length} V2 users.`
    );
    console.log(
      `Mapped ${v1ApplicationIdToV2ApplicationId.size} V1 applications to V2 applications.`
    );

    // 기존 데이터 삭제 옵션
    const clearExistingData = process.env.CLEAR_EXISTING_MILESTONES === "true";
    if (clearExistingData) {
      console.log("Clearing existing milestones_v2 data...");
      await db2.execute(
        sql`TRUNCATE TABLE ${milestonesV2Table} RESTART IDENTITY CASCADE`
      );
      console.log("✅ Existing data cleared.");
    }

    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (const v1Milestone of v1Milestones) {
      if (testApplicationIds.has(v1Milestone.applicationId)) {
        console.log(
          `✅ Test application was skipped: (${testApplicationIds.get(
            v1Milestone.applicationId
          )}), Skipping milestone ${v1Milestone.id} (${v1Milestone.title})`
        );
        skippedCount++;
        continue;
      }

      if (fundingApplicationIds.has(v1Milestone.applicationId)) {
        console.log(
          `✅ Funding application was skipped: (${fundingApplicationIds.get(
            v1Milestone.applicationId
          )}), Skipping milestone ${v1Milestone.id} (${v1Milestone.title})`
        );
        skippedCount++;
        continue;
      }

      try {
        // V2 application id 찾기
        const v2ApplicationId = v1ApplicationIdToV2ApplicationId.get(
          v1Milestone.applicationId
        );
        if (!v2ApplicationId) {
          console.warn(
            `⚠️  V2 application not found for V1 application ${v1Milestone.applicationId}: ${v1Milestone.id} (${v1Milestone.title}) Skipping milestone`
          );
          skippedCount++;
          continue;
        }

        // V2 program id 찾기 (V2 application에서)
        const v2ProgramId = v2ApplicationIdToProgramId.get(v2ApplicationId);
        if (!v2ProgramId) {
          console.warn(
            `⚠️  V2 program not found for V2 application ${v2ApplicationId}. Skipping milestone ${v1Milestone.id}.`
          );
          skippedCount++;
          continue;
        }

        // sponsor_id 찾기: V1 application의 applicantId -> V2 user id
        const v1ApplicantId = v1ApplicationIdToApplicantId.get(
          v1Milestone.applicationId
        );
        if (!v1ApplicantId) {
          console.warn(
            `⚠️  V1 applicant not found for application ${v1Milestone.applicationId}. Skipping milestone ${v1Milestone.id}.`
          );
          skippedCount++;
          continue;
        }

        const walletAddress = v1UserIdToWalletAddress.get(v1ApplicantId);
        if (!walletAddress) {
          console.warn(
            `⚠️  Wallet address not found for V1 applicant ${v1ApplicantId}. Skipping milestone ${v1Milestone.id}.`
          );
          skippedCount++;
          continue;
        }

        const v2SponsorId = walletAddressToV2UserId.get(walletAddress);
        if (!v2SponsorId) {
          console.warn(
            `⚠️  V2 user not found for wallet address ${walletAddress}. Skipping milestone ${v1Milestone.id}.`
          );
          skippedCount++;
          continue;
        }

        // description 생성: description + summary 통합
        const descriptionParts = [v1Milestone.description, v1Milestone.summary]
          .filter(Boolean)
          .join("\n\n");
        const description = descriptionParts || "";

        // files 배열 생성 (file이 있으면 배열로)
        const files = v1Milestone.file ? [v1Milestone.file] : [];

        const newMilestone: NewMilestoneV2 = {
          programId: v2ProgramId,
          applicantId: v2SponsorId,
          title: v1Milestone.title,
          description,
          payout: v1Milestone.price,
          deadline: v1Milestone.deadline,
          files,
          status: mapStatus(v1Milestone.status || "draft"),
          createdAt: v1Milestone.createdAt,
          updatedAt: v1Milestone.updatedAt,
        };

        await db2.insert(milestonesV2Table).values(newMilestone);
        migratedCount++;
        // console.log(
        //   `✅ Successfully migrated milestone: ${v1Milestone.title} (id: ${v1Milestone.id})`,
        // );
      } catch (error) {
        failedCount++;
        console.error(
          `❌ Failed to migrate milestone: ${v1Milestone.id} (${v1Milestone.title})`,
          error
        );
      }
    }

    console.log("----------------------------------------");
    console.log(
      `Migration complete. Migrated ${migratedCount} out of ${v1Milestones.length} milestones.`
    );
    console.log(`Milestones skipped: ${skippedCount}`);
    if (failedCount > 0) {
      console.log(`Failed to migrate: ${failedCount}`);
    }
    console.log("----------------------------------------");
  } catch (error) {
    console.error("An error occurred during migration:", error);
    throw error;
  } finally {
    console.log("Closing database connections...");
    await client1.end();
    await client2.end();
    console.log("Connections closed.");
  }
}

migrateMilestones();
