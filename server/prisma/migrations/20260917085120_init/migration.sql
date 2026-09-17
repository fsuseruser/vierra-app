-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TECHNICAL';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "googleConnectedAt" TIMESTAMP(3),
ADD COLUMN     "googleRefreshToken" TEXT,
ADD COLUMN     "supervisorId" TEXT;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
