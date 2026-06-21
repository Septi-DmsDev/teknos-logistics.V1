CREATE TABLE "ProviderOriginCatalog" (
    "id" TEXT NOT NULL,
    "courier" "CourierCode" NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'ID',
    "province" TEXT,
    "city" TEXT,
    "district" TEXT,
    "subdistrict" TEXT,
    "postalCode" TEXT,
    "providerCode" TEXT NOT NULL,
    "branchCode" TEXT,
    "label" TEXT,
    "sourceKey" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderOriginCatalog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProviderOriginCatalog_courier_sourceKey_key" ON "ProviderOriginCatalog"("courier", "sourceKey");
CREATE INDEX "ProviderOriginCatalog_courier_providerCode_idx" ON "ProviderOriginCatalog"("courier", "providerCode");
CREATE INDEX "ProviderOriginCatalog_courier_city_isActive_idx" ON "ProviderOriginCatalog"("courier", "city", "isActive");
CREATE INDEX "ProviderOriginCatalog_courier_district_isActive_idx" ON "ProviderOriginCatalog"("courier", "district", "isActive");
CREATE INDEX "ProviderOriginCatalog_courier_postalCode_isActive_idx" ON "ProviderOriginCatalog"("courier", "postalCode", "isActive");
