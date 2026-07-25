-- AlterTable
ALTER TABLE "Sale" ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT;
