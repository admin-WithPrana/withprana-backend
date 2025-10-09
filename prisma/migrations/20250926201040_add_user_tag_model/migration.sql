-- AlterTable
ALTER TABLE "public"."otps" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "public"."policy" (
    "id" TEXT NOT NULL,
    "type" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "policy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onboarding_questions" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "onboarding_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onboarding_options" (
    "id" TEXT NOT NULL,
    "option" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "questionId" TEXT NOT NULL,

    CONSTRAINT "onboarding_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."onboarding_option_tags" (
    "id" TEXT NOT NULL,
    "optionId" TEXT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_option_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."user_tags" (
    "id" TEXT NOT NULL,
    "userId" BIGINT NOT NULL,
    "tagId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "policy_type_key" ON "public"."policy"("type");

-- CreateIndex
CREATE INDEX "policy_type_active_isDeleted_idx" ON "public"."policy"("type", "active", "isDeleted");

-- CreateIndex
CREATE INDEX "policy_type_idx" ON "public"."policy"("type");

-- CreateIndex
CREATE INDEX "onboarding_questions_active_isDeleted_idx" ON "public"."onboarding_questions"("active", "isDeleted");

-- CreateIndex
CREATE INDEX "onboarding_options_questionId_idx" ON "public"."onboarding_options"("questionId");

-- CreateIndex
CREATE INDEX "onboarding_option_tags_optionId_idx" ON "public"."onboarding_option_tags"("optionId");

-- CreateIndex
CREATE INDEX "onboarding_option_tags_tagId_idx" ON "public"."onboarding_option_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "onboarding_option_tags_optionId_tagId_key" ON "public"."onboarding_option_tags"("optionId", "tagId");

-- CreateIndex
CREATE INDEX "user_tags_userId_idx" ON "public"."user_tags"("userId");

-- CreateIndex
CREATE INDEX "user_tags_tagId_idx" ON "public"."user_tags"("tagId");

-- CreateIndex
CREATE UNIQUE INDEX "user_tags_userId_tagId_key" ON "public"."user_tags"("userId", "tagId");

-- AddForeignKey
ALTER TABLE "public"."onboarding_options" ADD CONSTRAINT "onboarding_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "public"."onboarding_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onboarding_option_tags" ADD CONSTRAINT "onboarding_option_tags_optionId_fkey" FOREIGN KEY ("optionId") REFERENCES "public"."onboarding_options"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."onboarding_option_tags" ADD CONSTRAINT "onboarding_option_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_tags" ADD CONSTRAINT "user_tags_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."user_tags" ADD CONSTRAINT "user_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "public"."tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;
