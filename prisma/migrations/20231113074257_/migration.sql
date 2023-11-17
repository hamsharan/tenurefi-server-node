/*
  Warnings:

  - Made the column `budget` on table `Wallet` required. This step will fail if there are existing NULL values in that column.
  - Made the column `rounding` on table `Wallet` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Wallet" ALTER COLUMN "budget" SET NOT NULL,
ALTER COLUMN "budget" SET DEFAULT 0,
ALTER COLUMN "rounding" SET NOT NULL,
ALTER COLUMN "rounding" SET DEFAULT 0;
