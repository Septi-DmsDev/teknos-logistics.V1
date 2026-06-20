ALTER TABLE "DestinationMapping" ADD COLUMN "sourceKey" TEXT;

DROP INDEX IF EXISTS "DestinationMapping_merchantId_courier_providerCode_key";
CREATE UNIQUE INDEX "DestinationMapping_merchantId_courier_sourceKey_key" ON "DestinationMapping"("merchantId", "courier", "sourceKey");
CREATE INDEX "DestinationMapping_merchantId_courier_providerCode_idx" ON "DestinationMapping"("merchantId", "courier", "providerCode");
