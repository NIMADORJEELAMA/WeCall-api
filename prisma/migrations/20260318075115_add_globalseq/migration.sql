-- CreateTable
CREATE TABLE "GlobalSequence" (
    "id" TEXT NOT NULL DEFAULT 'order_seq',
    "lastNumber" INTEGER NOT NULL DEFAULT 0,
    "lastDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GlobalSequence_pkey" PRIMARY KEY ("id")
);
