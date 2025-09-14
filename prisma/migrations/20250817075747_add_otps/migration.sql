-- CreateTable
CREATE TABLE "public"."otps" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "otpcode" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "isvalid" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "otps_pkey" PRIMARY KEY ("id")
);
