CREATE TABLE "DestinationMapping" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "courier" "CourierCode" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'ID',
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "subdistrict" TEXT,
    "postalCode" TEXT,
    "providerCode" TEXT NOT NULL,
    "label" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DestinationMapping_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DestinationMapping_merchantId_courier_providerCode_key" ON "DestinationMapping"("merchantId", "courier", "providerCode");
CREATE INDEX "DestinationMapping_merchantId_courier_postalCode_isActive_idx" ON "DestinationMapping"("merchantId", "courier", "postalCode", "isActive");
CREATE INDEX "DestinationMapping_merchantId_courier_city_isActive_idx" ON "DestinationMapping"("merchantId", "courier", "city", "isActive");

ALTER TABLE "DestinationMapping" ADD CONSTRAINT "DestinationMapping_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "Merchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
