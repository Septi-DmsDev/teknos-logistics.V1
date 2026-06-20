CREATE TABLE "OriginMapping" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "originId" TEXT NOT NULL,
    "courier" "CourierCode" NOT NULL,
    "providerCode" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OriginMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OriginMapping_originId_courier_key" ON "OriginMapping"("originId", "courier");
CREATE INDEX "OriginMapping_merchantId_courier_isActive_idx" ON "OriginMapping"("merchantId", "courier", "isActive");

ALTER TABLE "OriginMapping" ADD CONSTRAINT "OriginMapping_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OriginMapping" ADD CONSTRAINT "OriginMapping_originId_fkey" FOREIGN KEY ("originId") REFERENCES "Origin"("id") ON DELETE CASCADE ON UPDATE CASCADE;
