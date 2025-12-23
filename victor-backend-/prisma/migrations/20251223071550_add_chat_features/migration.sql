/*
  Warnings:

  - You are about to drop the `Review` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `Wishlist` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "MessageStatus" AS ENUM ('SENT', 'SEEN');

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_productId_fkey";

-- DropForeignKey
ALTER TABLE "Review" DROP CONSTRAINT "Review_userId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_productId_fkey";

-- DropForeignKey
ALTER TABLE "Wishlist" DROP CONSTRAINT "Wishlist_userId_fkey";

-- AlterTable
ALTER TABLE "UserMessage" ADD COLUMN     "contactMessageId" TEXT,
ADD COLUMN     "seenAt" TIMESTAMP(3),
ADD COLUMN     "status" "MessageStatus" NOT NULL DEFAULT 'SENT';

-- DropTable
DROP TABLE "Review";

-- DropTable
DROP TABLE "Wishlist";

-- CreateIndex
CREATE INDEX "UserMessage_contactMessageId_idx" ON "UserMessage"("contactMessageId");

-- CreateIndex
CREATE INDEX "UserMessage_status_idx" ON "UserMessage"("status");
