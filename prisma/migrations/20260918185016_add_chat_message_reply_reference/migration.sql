-- DropIndex
DROP INDEX "ChatMessage_senderId_idx";

-- AlterTable
ALTER TABLE "ChatMessage" ADD COLUMN     "paidMessageId" TEXT,
ADD COLUMN     "replyToMessageId" TEXT;

-- CreateIndex
CREATE INDEX "ChatMessage_replyToMessageId_idx" ON "ChatMessage"("replyToMessageId");

-- CreateIndex
CREATE INDEX "ChatMessage_paidMessageId_idx" ON "ChatMessage"("paidMessageId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_replyToMessageId_fkey" FOREIGN KEY ("replyToMessageId") REFERENCES "ChatMessage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_paidMessageId_fkey" FOREIGN KEY ("paidMessageId") REFERENCES "Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;
