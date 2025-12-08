-- Step 1: Add a temporary UUID column to programs_v2 table
ALTER TABLE "programs_v2" ADD COLUMN "id_uuid" uuid;

-- Step 2: Generate and map UUIDs for existing integer IDs
UPDATE "programs_v2" 
SET "id_uuid" = gen_random_uuid()
WHERE "id_uuid" IS NULL;

-- Step 3: Add temporary program_id_uuid columns to referencing tables
ALTER TABLE "applications_v2" ADD COLUMN "program_id_uuid" uuid;
ALTER TABLE "milestones_v2" ADD COLUMN "program_id_uuid" uuid;
ALTER TABLE "onchain_contract_info" ADD COLUMN "program_id_uuid" uuid;
ALTER TABLE "onchain_program_info" ADD COLUMN "program_id_uuid" uuid;
ALTER TABLE "contracts" ADD COLUMN "program_id_uuid" uuid;

-- Step 4: Map referencing tables' program_id to the new UUIDs
UPDATE "applications_v2" a
SET "program_id_uuid" = p."id_uuid"
FROM "programs_v2" p
WHERE a."program_id" = p."id";

UPDATE "milestones_v2" m
SET "program_id_uuid" = p."id_uuid"
FROM "programs_v2" p
WHERE m."program_id" = p."id";

UPDATE "onchain_contract_info" o
SET "program_id_uuid" = p."id_uuid"
FROM "programs_v2" p
WHERE o."program_id" = p."id";

UPDATE "onchain_program_info" o
SET "program_id_uuid" = p."id_uuid"
FROM "programs_v2" p
WHERE o."program_id" = p."id";

UPDATE "contracts" c
SET "program_id_uuid" = p."id_uuid"
FROM "programs_v2" p
WHERE c."program_id" = p."id";

-- Step 5: Drop foreign key constraints
ALTER TABLE "applications_v2" DROP CONSTRAINT IF EXISTS "applications_v2_program_id_programs_v2_id_fk";
ALTER TABLE "milestones_v2" DROP CONSTRAINT IF EXISTS "milestones_v2_program_id_programs_v2_id_fk";
ALTER TABLE "onchain_contract_info" DROP CONSTRAINT IF EXISTS "onchain_contract_info_program_id_programs_v2_id_fk";
ALTER TABLE "onchain_program_info" DROP CONSTRAINT IF EXISTS "onchain_program_info_program_id_programs_v2_id_fk";
ALTER TABLE "contracts" DROP CONSTRAINT IF EXISTS "contracts_program_id_programs_v2_id_fk";

-- Step 6: Drop old integer columns
ALTER TABLE "programs_v2" DROP COLUMN "id" CASCADE;
ALTER TABLE "applications_v2" DROP COLUMN "program_id";
ALTER TABLE "milestones_v2" DROP COLUMN "program_id";
ALTER TABLE "onchain_contract_info" DROP COLUMN "program_id";
ALTER TABLE "onchain_program_info" DROP COLUMN "program_id";
ALTER TABLE "contracts" DROP COLUMN "program_id";

-- Step 7: Rename temporary UUID columns to original names
ALTER TABLE "programs_v2" RENAME COLUMN "id_uuid" TO "id";
ALTER TABLE "applications_v2" RENAME COLUMN "program_id_uuid" TO "program_id";
ALTER TABLE "milestones_v2" RENAME COLUMN "program_id_uuid" TO "program_id";
ALTER TABLE "onchain_contract_info" RENAME COLUMN "program_id_uuid" TO "program_id";
ALTER TABLE "onchain_program_info" RENAME COLUMN "program_id_uuid" TO "program_id";
ALTER TABLE "contracts" RENAME COLUMN "program_id_uuid" TO "program_id";

-- Step 8: Set id as PRIMARY KEY in programs_v2
ALTER TABLE "programs_v2" ALTER COLUMN "id" SET NOT NULL;
ALTER TABLE "programs_v2" ADD PRIMARY KEY ("id");
ALTER TABLE "programs_v2" ALTER COLUMN "id" SET DEFAULT gen_random_uuid();

-- Step 9: Set program_id as NOT NULL in referencing tables
ALTER TABLE "applications_v2" ALTER COLUMN "program_id" SET NOT NULL;
ALTER TABLE "milestones_v2" ALTER COLUMN "program_id" SET NOT NULL;
ALTER TABLE "onchain_contract_info" ALTER COLUMN "program_id" SET NOT NULL;
ALTER TABLE "onchain_program_info" ALTER COLUMN "program_id" SET NOT NULL;
ALTER TABLE "contracts" ALTER COLUMN "program_id" SET NOT NULL;

-- Step 10: Add foreign key constraints again
ALTER TABLE "applications_v2" ADD CONSTRAINT "applications_v2_program_id_programs_v2_id_fk" 
  FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "milestones_v2" ADD CONSTRAINT "milestones_v2_program_id_programs_v2_id_fk" 
  FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "onchain_contract_info" ADD CONSTRAINT "onchain_contract_info_program_id_programs_v2_id_fk" 
  FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "onchain_program_info" ADD CONSTRAINT "onchain_program_info_program_id_programs_v2_id_fk" 
  FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_program_id_programs_v2_id_fk" 
  FOREIGN KEY ("program_id") REFERENCES "public"."programs_v2"("id") ON DELETE CASCADE ON UPDATE NO ACTION;