/*
  Warnings:

  - You are about to drop the column `supplierId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `supplierId` on the `SubOrder` table. All the data in the column will be lost.
  - You are about to drop the `Supplier` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Product" DROP CONSTRAINT "Product_supplierId_fkey";

-- DropForeignKey
ALTER TABLE "SubOrder" DROP CONSTRAINT "SubOrder_supplierId_fkey";

-- DropIndex
DROP INDEX "Product_supplierId_idx";

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "supplierId";

-- AlterTable
ALTER TABLE "SubOrder" DROP COLUMN "supplierId";

-- DropTable
DROP TABLE "Supplier";
