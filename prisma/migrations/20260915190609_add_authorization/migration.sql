-- CreateEnum
CREATE TYPE "ReplyAuthorizationStatus" AS ENUM ('PENDING', 'PROCESSING', 'AVAILABLE', 'USED', 'FAILED', 'EXPIRED', 'REFUNDED');

-- CreateTable
CREATE TABLE "ReplyAuthorization" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "creatorId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "status" "ReplyAuthorizationStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usedAt" TIMESTAMP(3),

    CONSTRAINT "ReplyAuthorization_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReplyAuthorization_stripePaymentIntentId_key" ON "ReplyAuthorization"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "ReplyAuthorization_conversationId_status_idx" ON "ReplyAuthorization"("conversationId", "status");

-- CreateIndex
CREATE INDEX "ReplyAuthorization_creatorId_status_idx" ON "ReplyAuthorization"("creatorId", "status");

-- CreateIndex
CREATE INDEX "ReplyAuthorization_userId_status_idx" ON "ReplyAuthorization"("userId", "status");

-- CreateIndex
CREATE INDEX "ChatMessage_senderId_idx" ON "ChatMessage"("senderId");

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyAuthorization" ADD CONSTRAINT "ReplyAuthorization_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyAuthorization" ADD CONSTRAINT "ReplyAuthorization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReplyAuthorization" ADD CONSTRAINT "ReplyAuthorization_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
