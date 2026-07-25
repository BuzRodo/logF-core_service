-- CreateTable
CREATE TABLE "IncomingCall" (
    "id" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "rawPhone" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" TEXT,
    "saleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingCall_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "IncomingCall_receivedAt_idx" ON "IncomingCall"("receivedAt");

-- CreateIndex
CREATE INDEX "IncomingCall_phone_idx" ON "IncomingCall"("phone");

-- AddForeignKey
ALTER TABLE "IncomingCall" ADD CONSTRAINT "IncomingCall_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IncomingCall" ADD CONSTRAINT "IncomingCall_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE SET NULL ON UPDATE CASCADE;
