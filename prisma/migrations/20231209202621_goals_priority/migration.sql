/*
  Warnings:

  - Added the required column `priority` to the `SavingGoal` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "SavingGoal" ADD COLUMN     "priority" INTEGER NOT NULL;
